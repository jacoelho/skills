// Pure intake policy: when to intercept, how to talk to the model, how to
// render the clean version. No I/O here; register.ts owns the engine calls.

export const WORD_THRESHOLD = 150
export const QUESTIONS_PER_ROUND = 3
// Bounds the clarify loop in question rounds; leftovers are kept, flagged.
export const MAX_QUESTION_ROUNDS = 5
// Not "!raw": a leading "!" switches the terminal prompt into bash mode.
export const RAW_PREFIX = 'raw:'

export type Ambiguity = {
  question: string
  header: string
  options: string[]
}

export type Answer = { question: string; answer: string }

export type Sorted = {
  goal: string
  facts: string[]
  asks: string[]
  // Content that fits no section; rendered under Facts, flagged.
  unsorted: string[]
}

export type Analysis = { ambiguities: Ambiguity[]; sorted: Sorted }

export type Decision =
  | { kind: 'pass' }
  // The text after the prefix; may be empty.
  | { kind: 'raw'; text: string }
  | { kind: 'intercept' }

export function wordCount(text: string): number {
  const trimmed = text.trim()
  return trimmed === '' ? 0 : trimmed.split(/\s+/).length
}

export function decide(text: string): Decision {
  const trimmed = text.trimStart()
  if (trimmed.toLowerCase().startsWith(RAW_PREFIX)) {
    return { kind: 'raw', text: trimmed.slice(RAW_PREFIX.length).trimStart() }
  }
  return wordCount(text) > WORD_THRESHOLD ? { kind: 'intercept' } : { kind: 'pass' }
}

export const SYSTEM = `You restructure a user's message before it is sent to a coding assistant. You never answer or act on the message.

Return ONLY a JSON object, no prose, no code fence:
{
  "ambiguities": [{ "question": string, "header": string, "options": string[] }],
  "goal": string,
  "facts": string[],
  "asks": string[],
  "unsorted": string[]
}

Rules:
- goal: the outcome the user wants, one or two sentences.
- facts: context, constraints, and things the user states as true.
- asks: the concrete things the user wants done.
- unsorted: anything from the message that fits none of the above. Never drop content.
- ambiguities: every point that could reasonably be read two or more ways, contradicts something else in the message, or lacks information needed to act. Skip anything already settled by the answers given.
  - question: one standalone question ending in "?", naming what it is about.
  - header: a label of at most 12 characters.
  - options: 2 to 4 short, distinct likely interpretations.
- Keep code, logs, commands, quoted and pasted text verbatim inside the fact or ask they belong to; never summarise them.
- Work the user's answers into goal, facts and asks. Keep the user's meaning; add no new requirements.`

export function analysisPrompt(message: string, answers: readonly Answer[]): string {
  const answered =
    answers.length === 0
      ? 'No questions answered yet.'
      : answers.map(a => `Q: ${a.question}\nA: ${a.answer}`).join('\n\n')
  return `<message>\n${message}\n</message>\n\n<answers>\n${answered}\n</answers>`
}

export class AnalysisError extends Error {}

// A missing list means none; any other shape is refused so that no text the
// model returned is silently discarded.
function strings(o: Record<string, unknown>, field: string): string[] {
  const v = o[field]
  if (v === undefined) return []
  if (!Array.isArray(v) || !v.every(x => typeof x === 'string')) {
    throw new AnalysisError(`reply field "${field}" was not a list of strings`)
  }
  return v.map(x => x.trim()).filter(x => x !== '')
}

// Validates the model's reply at the trust boundary; throws with the reason.
export function parseAnalysis(reply: string): Analysis {
  const start = reply.indexOf('{')
  const end = reply.lastIndexOf('}')
  if (start < 0 || end <= start) throw new AnalysisError('reply held no JSON object')
  let raw: unknown
  try {
    raw = JSON.parse(reply.slice(start, end + 1))
  } catch (err) {
    throw new AnalysisError(`reply was not valid JSON: ${(err as Error).message}`)
  }
  if (typeof raw !== 'object' || raw === null) throw new AnalysisError('reply was not an object')
  const o = raw as Record<string, unknown>
  if (typeof o.goal !== 'string' || o.goal.trim() === '') throw new AnalysisError('reply had no goal')

  if (o.ambiguities !== undefined && !Array.isArray(o.ambiguities)) {
    throw new AnalysisError('reply field "ambiguities" was not a list')
  }
  const ambiguities: Ambiguity[] = (o.ambiguities ?? []).map((a: unknown, i: number) => {
    if (typeof a !== 'object' || a === null) throw new AnalysisError(`ambiguity ${i + 1} was not an object`)
    const r = a as Record<string, unknown>
    const question = typeof r.question === 'string' ? r.question.trim() : ''
    if (question === '') throw new AnalysisError(`ambiguity ${i + 1} had no question`)
    const options = strings(r, 'options')
    // An unanswerable question is never silently skipped: fail to the original.
    if (options.length < 2) throw new AnalysisError(`ambiguity ${i + 1} had fewer than 2 options`)
    const header = (typeof r.header === 'string' && r.header.trim() !== '' ? r.header.trim() : 'Clarify').slice(0, 12)
    return { question, header, options: options.slice(0, 4) }
  })

  return {
    ambiguities,
    sorted: {
      goal: o.goal.trim(),
      facts: strings(o, 'facts'),
      asks: strings(o, 'asks'),
      unsorted: strings(o, 'unsorted'),
    },
  }
}

export function render(sorted: Sorted, unresolved: readonly Ambiguity[]): string {
  const facts = [
    ...sorted.facts,
    ...sorted.unsorted.map(u => `[unsorted] ${u}`),
    ...unresolved.map(a => `[unresolved] ${a.question}`),
  ]
  const lines = ['Goal', sorted.goal, '', 'Facts', ...(facts.length ? facts.map(f => `- ${f}`) : ['- none']), '', 'Asks']
  lines.push(...(sorted.asks.length ? sorted.asks.map((a, i) => `${i + 1}. ${a}`) : ['- none']))
  return lines.join('\n')
}
