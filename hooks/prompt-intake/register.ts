import type { EngineInterface, ModelEffort, Register } from 'claude-code'

import {
  type Analysis,
  type Answer,
  type Split,
  MAX_ANALYSED_CHARS,
  MAX_QUESTIONS,
  REPLY_CAP,
  SYSTEM,
  analysisPrompt,
  answerText,
  decide,
  optionLabels,
  parseAnalysis,
  render,
} from './intake'

const MODEL_TIMEOUT_MS = 90_000
// After the drop, re-check that the box still holds what was filled.
const REFILL_CHECK_MS = 300
const BACK_IN_BOX = 'Your message is back in the prompt box without the marker; press Enter to send it as typed.'

type Outcome =
  | { kind: 'clean'; text: string }
  | { kind: 'cancelled' }
  | { kind: 'failed'; reason: string }

// What both calls of one intake share. `$` stays a parameter: the engine
// refuses a module that puts it in an object.
type Call = { model: string; effort: ModelEffort; prose: string }

// One model call with its status line; every failure comes back as a reason.
async function analyse($: EngineInterface, c: Call, answers: readonly Answer[], status: string): Promise<Analysis | { failed: string }> {
  $.ui.status(`prompt-intake: ${status}`)
  try {
    const r = await $.model.complete({
      model: c.model,
      system: SYSTEM,
      prompt: analysisPrompt(c.prose, answers),
      // Thinking counts toward maxTokens: without a level the model's own default
      // could spend the cap before the JSON is written.
      effort: c.effort,
      // The reply holds the prose, never the pastes, and prose is capped.
      maxTokens: REPLY_CAP[c.effort],
      timeoutMs: MODEL_TIMEOUT_MS,
    })
    if (!r.isAnswered) {
      const detail = r.reason === 'api-error' ? `api-error ${r.status ?? 'no response'} ${r.error}` : r.reason
      return { failed: `model call failed: ${detail}` }
    }
    try {
      return parseAnalysis(r.text)
    } catch (err) {
      return { failed: `model reply unusable: ${(err as Error).message}` }
    }
  } finally {
    $.ui.status(undefined)
  }
}

const clean = (a: Analysis, split: Split): Outcome => ({
  kind: 'clean',
  text: render(a.sorted, [...a.ambiguities.map(q => q.question), ...a.unaskable], split.pastes),
})

// Sort, ask one set of questions, then sort again with the answers.
async function intake($: EngineInterface, effort: ModelEffort, split: Split, signal: AbortSignal): Promise<Outcome> {
  // Opt-in, so the person chose to spend the session's own model on it.
  const call: Call = { model: await $.session.model(), effort, prose: split.prose }
  const first = await analyse($, call, [], 'sorting your message')
  if ('failed' in first) return { kind: 'failed', reason: first.failed }
  if (signal.aborted) return { kind: 'cancelled' }
  if (first.ambiguities.length === 0) return clean(first, split)

  const answers: Answer[] = []
  for (const a of first.ambiguities.slice(0, MAX_QUESTIONS)) {
    if (signal.aborted) return { kind: 'cancelled' }
    try {
      const chosen = await $.ui.ask(a.question, { options: optionLabels(a), header: a.header })
      answers.push({ question: a.question, answer: answerText(a, chosen) })
    } catch {
      // Dismissed dialog: the person backed out of the intake.
      return { kind: 'cancelled' }
    }
  }

  const last = await analyse($, call, answers, 'checking answers')
  if ('failed' in last) return { kind: 'failed', reason: last.failed }
  if (signal.aborted) return { kind: 'cancelled' }
  return clean(last, split)
}

export const register: Register = (on, options) => {
  // The engine checks the value against plugin.json's options and fills in
  // the default before the module loads.
  const effort = options.intake_effort as ModelEffort
  // One message in intake at a time: a second would race the first for the box.
  let busy = false

  on('prompt.submit', async ($, e, next) => {
    // Only text the person typed at the terminal: a bridge client cannot see
    // the terminal's prompt box the clean version is handed back in.
    if (e.origin.kind !== 'composer' || e.isMeta || e.command) return next(e)

    const decision = decide(e.text)
    if (decision.kind === 'pass') return next(e)
    if (decision.kind === 'empty') return { drop: 'prompt-intake: nothing after intake: to sort.' }
    const sendAsTyped = (why: string) => {
      $.ui.toast(`prompt-intake: ${why}; sent as typed`)
      return next({ ...e, text: decision.text })
    }
    // Attachments would be lost by drop and refill.
    if (e.attachments?.length) return sendAsTyped('messages with attachments cannot be sorted')
    if (decision.kind === 'too-large') {
      return sendAsTyped(`${decision.chars} characters outside code fences is over the ${MAX_ANALYSED_CHARS} intake sorts`)
    }
    if (busy) return sendAsTyped('another message is in intake')

    busy = true
    let outcome: Outcome
    try {
      outcome = await intake($, effort, decision.split, next.signal)
    } finally {
      busy = false
    }
    // Abandoned (Esc, or a hook above settled first): the original was not
    // sent, so it goes back in the box like any other cancel.
    if (next.signal.aborted) outcome = { kind: 'cancelled' }

    const boxText = outcome.kind === 'clean' ? outcome.text : decision.text
    // Keep anything typed while intake ran; the submitted text itself, if the
    // box still shows it, is not a draft.
    const original = e.text.trim()
    const draft = (await $.prompt.read()).text
    const isDraft = draft.trim() !== '' && draft.trim() !== original
    const fillText = isDraft ? `${boxText}\n\n${draft}` : boxText
    const filled = await $.prompt.fill({ text: fillText, cursor: 0 })

    if (!filled.isFilled) {
      // No box to hand the text back to: never lose the message.
      return sendAsTyped(`could not fill the prompt box (${filled.refusal ?? 'refused'})`)
    }

    // If the drop cleared the box or put the original back, fill again; any
    // other text is the person's own edit and stays.
    $.clock.after(REFILL_CHECK_MS, async () => {
      const box = (await $.prompt.read()).text.trim()
      if (box === '' || box === original) {
        await $.prompt.fill({ text: fillText, cursor: 0 })
      }
    })

    switch (outcome.kind) {
      case 'clean':
        return { drop: 'prompt-intake: clean version is in the prompt box. Edit if needed, press Enter to send.' }
      case 'cancelled':
        return { drop: `prompt-intake: cancelled. ${BACK_IN_BOX}` }
      case 'failed':
        return { drop: `prompt-intake: ${outcome.reason}. ${BACK_IN_BOX}` }
    }
  })
}
