import type { EngineInterface, Register } from 'claude-code'

import {
  type Ambiguity,
  type Answer,
  type Sorted,
  MAX_QUESTION_ROUNDS,
  QUESTIONS_PER_ROUND,
  SYSTEM,
  analysisPrompt,
  decide,
  parseAnalysis,
  render,
} from './intake'

const MODEL = 'sonnet'
const MODEL_TIMEOUT_MS = 90_000
// After the drop, re-check that the box still holds what was filled.
const REFILL_CHECK_MS = 300

type Outcome =
  | { kind: 'clean'; text: string }
  | { kind: 'cancelled' }
  | { kind: 'failed'; reason: string }

async function analyse($: EngineInterface, message: string, answers: readonly Answer[]) {
  const r = await $.model.complete({
    model: MODEL,
    system: SYSTEM,
    prompt: analysisPrompt(message, answers),
    maxTokens: 8000,
    timeoutMs: MODEL_TIMEOUT_MS,
  })
  if (!r.isAnswered) {
    const detail = r.reason === 'api-error' ? `api-error ${r.status ?? 'no response'} ${r.error}` : r.reason
    throw new Error(`model call failed: ${detail}`)
  }
  try {
    return parseAnalysis(r.text)
  } catch (err) {
    throw new Error(`model reply unusable: ${(err as Error).message}`)
  }
}

async function intake($: EngineInterface, message: string, signal: AbortSignal): Promise<Outcome> {
  const answers: Answer[] = []
  let sorted: Sorted | undefined
  let open: Ambiguity[] = []

  // One analysis per question round, plus the one that reads the last answers.
  for (let round = 0; round <= MAX_QUESTION_ROUNDS; round++) {
    $.ui.status(round === 0 ? 'prompt-intake: sorting your message' : 'prompt-intake: checking answers')
    try {
      const analysis = await analyse($, message, answers)
      sorted = analysis.sorted
      open = analysis.ambiguities
    } catch (err) {
      return { kind: 'failed', reason: (err as Error).message }
    } finally {
      $.ui.status(undefined)
    }
    if (signal.aborted) return { kind: 'cancelled' }
    if (open.length === 0 || round === MAX_QUESTION_ROUNDS) break

    for (const a of open.slice(0, QUESTIONS_PER_ROUND)) {
      try {
        const answer = await $.ui.ask(a.question, { options: a.options, header: a.header })
        answers.push({ question: a.question, answer })
      } catch {
        // Dismissed dialog: the person backed out of the intake.
        return { kind: 'cancelled' }
      }
    }
  }

  // sorted is set: the loop runs at least once and returns on every failure.
  return { kind: 'clean', text: render(sorted as Sorted, open) }
}

export const register: Register = on => {
  // Set only once a clean version is in the box: the person's next submission
  // is their reviewed version (edited or not) and goes through untouched.
  let isReviewPending = false
  // One intake at a time: a second would race the first for the prompt box.
  let isBusy = false

  on('prompt.submit', async ($, e, next) => {
    // Only text the person typed at the terminal: a bridge client cannot see
    // the terminal's prompt box the clean version is handed back in.
    if (e.origin.kind !== 'composer' || e.isMeta) return next(e)

    const decision = decide(e.text)
    const typed = decision.kind === 'raw' ? { ...e, text: decision.text } : e

    if (isReviewPending) {
      isReviewPending = false
      return next(typed)
    }
    // Slash commands take no rewrite; attachments would be lost by drop and refill.
    if (e.command || e.attachments?.length || decision.kind === 'pass') return next(e)
    if (decision.kind === 'raw') {
      return decision.text === '' ? { drop: 'prompt-intake: nothing after raw: to send.' } : next(typed)
    }
    if (isBusy) {
      $.ui.toast('prompt-intake: another message is in intake; sent this one as typed')
      return next(e)
    }

    isBusy = true
    let outcome: Outcome
    try {
      outcome = await intake($, e.text, next.signal)
    } finally {
      isBusy = false
    }
    // Interrupted: the dispatch already went on without this hook.
    if (next.signal.aborted) return { drop: 'prompt-intake: interrupted.' }

    const boxText = outcome.kind === 'clean' ? outcome.text : e.text
    // Keep anything typed while intake ran.
    const draft = (await $.prompt.read()).text
    const fillText = draft.trim() === '' ? boxText : `${boxText}\n\n${draft}`
    const filled = await $.prompt.fill({ text: fillText, cursor: 0 })

    if (!filled.isFilled) {
      // No box to hand the text back to: never lose the message, send the original.
      $.ui.toast(`prompt-intake: could not fill the prompt box (${filled.refusal ?? 'refused'}); sent your original`)
      return next(e)
    }

    $.clock.after(REFILL_CHECK_MS, async () => {
      const box = await $.prompt.read()
      if (box.text === '') await $.prompt.fill({ text: fillText, cursor: 0 })
    })

    switch (outcome.kind) {
      case 'clean':
        isReviewPending = true
        return { drop: 'prompt-intake: clean version is in the prompt box. Edit if needed, press Enter to send.' }
      case 'cancelled':
        return { drop: 'prompt-intake: cancelled. Your original is back in the prompt box; start it with raw: to skip intake.' }
      case 'failed':
        return { drop: `prompt-intake: ${outcome.reason}. Your original is back in the prompt box; start it with raw: to skip intake.` }
    }
  })
}
