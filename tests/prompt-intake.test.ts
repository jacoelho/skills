import type { On } from 'claude-code'
import { type Engine, describe, expect, mock, test } from 'claude-code/testing'

import { AnalysisError, MAX_ANALYSED_CHARS, MAX_QUESTIONS, parseAnalysis, render, splitPastes } from '../hooks/prompt-intake/intake'

const words = (n: number) => Array.from({ length: n }, (_, i) => `w${i}`).join(' ')
const BODY = 'deploy the service somewhere sensible'
const ASK = `intake: ${BODY}`
const SHORT = 'fix the typo in the README'
const SESSION_MODEL = 'claude-fable-5-1'
const COMPOSER = { origin: { kind: 'composer' }, wait: false } as const
// A pasted log far larger than anything intake may send to its model.
const LOG = ['```', ...Array.from({ length: 2000 }, (_, i) => `2026-11-11T10:00:${String(i % 60).padStart(2, '0')}Z ERROR worker ${i}: connection reset`), '```'].join('\n')

const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const reply = (o: unknown) => ({ isAnswered: true, text: JSON.stringify(o), usage })
const ambiguous = (...questions: string[]) =>
  reply({
    ambiguities: questions.map(q => ({ question: q, header: 'Clarify', options: ['One', 'Two'] })),
    goal: 'Deploy the service.',
    facts: ['The service is ready.'],
    asks: ['Deploy it'],
  })
const RESOLVED = reply({
  ambiguities: [],
  goal: 'Deploy the service.',
  facts: ['The service is ready.'],
  asks: ['Deploy it to staging'],
  unsorted: ['Mentions lunch'],
})

type Opts = {
  // Answer per question; throwing means the person dismissed the dialog.
  answer?: (question: string) => string
  // Model replies by call; past the end, every call answers `last`.
  last?: unknown
  fillRefusal?: 'dialog'
  // What the box holds at each read; past the end, the last entry.
  draft?: string | string[]
}

// Stands in for the engine beneath the mod; records what it was asked.
function engine(on: On, replies: unknown[], opts: Opts = {}) {
  const seen = {
    prompts: [] as string[],
    maxTokens: [] as (number | undefined)[],
    models: [] as string[],
    efforts: [] as (string | undefined)[],
    shown: [] as string[][],
    questions: [] as string[],
    filled: [] as string[],
    entered: [] as string[],
    status: [] as (string | undefined)[],
    // Timers fire only when a test advances this clock.
    clock: mock.clock(on),
  }
  on('prompt.submit', (_, e) => {
    seen.entered.push(e.text)
    return { text: e.text }
  })
  on('model.complete', (_, e) => {
    seen.prompts.push(String((e as { prompt: unknown }).prompt))
    seen.maxTokens.push((e as { maxTokens?: number }).maxTokens)
    seen.models.push((e as { model: string }).model)
    seen.efforts.push((e as { effort?: string }).effort)
    const r = replies[seen.prompts.length - 1] ?? opts.last
    return { value: r ?? { isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded', usage } } as never
  })
  on('tool.call', { tool: 'AskUserQuestion' }, (_, e) => {
    const asked = (e as unknown as { questions: { question: string; options: { label: string }[] }[] }).questions[0]!
    const q = asked.question
    seen.questions.push(q)
    seen.shown.push(asked.options.map(o => o.label))
    if (!opts.answer) throw new Error('dismissed')
    return { result: { questions: [], answers: { [q]: opts.answer(q) } } } as never
  })
  const drafts = Array.isArray(opts.draft) ? opts.draft : [opts.draft ?? '']
  let reads = 0
  on('prompt.read', () => ({ value: { text: drafts[Math.min(reads++, drafts.length - 1)], cursor: 0 } }) as never)
  on('prompt.fill', (_, e) => {
    seen.filled.push(e.text)
    return opts.fillRefusal ? { isFilled: false, refusal: opts.fillRefusal } : { isFilled: true }
  })
  on('ui.status', (_, e) => {
    seen.status.push((e as { text?: string }).text)
    return { value: undefined } as never
  })
  on('ui.toast', () => ({ value: undefined }) as never)
  on('session.model', () => ({ value: SESSION_MODEL }) as never)
  return seen
}

const submit = ($: Engine, text: string, extra: object = {}) =>
  $.prompt.submit({ text, ...COMPOSER, ...extra } as never)

describe('opting in', () => {
  test('without the marker, a message of any length reaches Claude unchanged', async ($, on) => {
    const seen = engine(on, [], { last: RESOLVED })
    const long = `${words(5000)}\n${LOG}`
    await submit($, long)
    await submit($, `Intake: ${BODY}`)
    await submit($, `please intake: ${BODY}`)
    expect(seen.entered).toEqual([long, `Intake: ${BODY}`, `please intake: ${BODY}`])
    expect(seen.prompts.length).toBe(0)
  })

  test('with the marker, even a short message is held and sorted without the marker', async ($, on) => {
    const seen = engine(on, [], { last: RESOLVED })
    const r = await submit($, `  intake: ${SHORT}`)
    expect(r).toEqual(expect.objectContaining({ drop: expect.any(String) }))
    expect(seen.entered).toEqual([])
    expect(seen.prompts.length).toBe(1)
    expect(seen.prompts[0]).toContain(SHORT)
    expect(seen.prompts[0]).not.toContain('intake:')
  })

  test('a bare marker sends nothing', async ($, on) => {
    const seen = engine(on, [])
    const r = await submit($, 'intake:  \n')
    expect(r).toEqual(expect.objectContaining({ drop: expect.any(String) }))
    expect(seen.entered).toEqual([])
    expect(seen.prompts.length).toBe(0)
  })

  test('slash commands, hidden prompts and other sessions pass through untouched', async ($, on) => {
    const seen = engine(on, [])
    await submit($, ASK, { command: { name: 'review', args: ASK } })
    await submit($, ASK, { isMeta: true })
    await submit($, ASK, { origin: { kind: 'peer' } })
    await submit($, ASK, { origin: { kind: 'bridge' } })
    expect(seen.entered).toEqual([ASK, ASK, ASK, ASK])
    expect(seen.prompts.length).toBe(0)
  })

  test('with attachments, the message is sent as typed without the marker', async ($, on) => {
    const seen = engine(on, [])
    await submit($, ASK, { attachments: [{ id: 'a', type: 'image' }] })
    expect(seen.entered).toEqual([BODY])
    expect(seen.prompts.length).toBe(0)
  })
})

describe('large pastes', () => {
  test('a fenced paste never reaches the model and comes back byte for byte where the model placed it', async ($, on) => {
    const placed = reply({ ambiguities: [], goal: 'Fix the worker.', facts: ['Worker log:\n[[paste-1]]'], asks: ['Find why connections reset'] })
    const seen = engine(on, [placed])
    await submit($, `intake: ${BODY}\n${LOG}\nwhy does this keep happening?`)
    expect(seen.prompts.length).toBe(1)
    expect(seen.prompts[0]).toContain('[[paste-1]]')
    expect(seen.prompts[0]).not.toContain('connection reset')
    expect(seen.prompts[0]).toContain('why does this keep happening?')
    expect(seen.prompts[0]!.length).toBeLessThan(2000)
    expect(seen.filled[0]).toBe(
      ['Goal', 'Fix the worker.', '', 'Facts', `- Worker log:\n${LOG}`, '', 'Asks', '1. Find why connections reset'].join('\n'),
    )
  })

  test('a paste the model did not place is appended, never lost', async ($, on) => {
    const seen = engine(on, [RESOLVED])
    await submit($, `intake: ${BODY}\n${LOG}`)
    expect(seen.filled[0]!.endsWith(`\n\nPasted\n${LOG}`)).toBe(true)
  })

  test('a placeholder the model repeats is restored once and points back after that', async ($, on) => {
    const twice = reply({ goal: 'g', facts: ['Log: [[paste-1]]'], asks: ['Explain [[paste-1]]'] })
    const seen = engine(on, [twice])
    await submit($, `intake: ${BODY}\n${LOG}`)
    const clean = seen.filled[0]!
    expect(clean.split('connection reset').length - 1).toBe(2000)
    expect(clean).toContain('- Log: \n```')
    expect(clean).toContain('1. Explain (paste 1 above)')
  })

  test('tilde fences, longer fences holding shorter ones, and an unclosed fence are each one paste', () => {
    const tilde = '~~~\na\n~~~'
    const nested = '````md\n```\ninner\n```\n````'
    const open = '```\nrest of the message\nis pasted'
    const split = splitPastes(`one\n${tilde}\ntwo\n${nested}\nthree\n${open}`)
    expect(split.prose).toBe('one\n[[paste-1]]\ntwo\n[[paste-2]]\nthree\n[[paste-3]]')
    expect(split.pastes.map(p => p.text)).toEqual([tilde, nested, open])
  })
})

describe('size cap', () => {
  test(`up to ${MAX_ANALYSED_CHARS} characters of prose is sorted; one more is sent as typed without a model call`, async ($, on) => {
    const seen = engine(on, [], { last: RESOLVED })
    const at = 'x'.repeat(MAX_ANALYSED_CHARS)
    await submit($, `intake: ${at}`)
    expect(seen.prompts.length).toBe(1)

    await submit($, `intake: ${at}y`)
    expect(seen.prompts.length).toBe(1)
    expect(seen.entered).toEqual([`${at}y`])
  })

  test('pastes do not count toward the cap', async ($, on) => {
    const seen = engine(on, [], { last: RESOLVED })
    await submit($, `intake: ${BODY}\n${LOG}\n${LOG}`)
    expect(seen.prompts.length).toBe(1)
    expect(seen.entered).toEqual([])
  })
})

describe('clarifying', () => {
  test(`asks at most ${MAX_QUESTIONS} questions and sends every answer back in one more call`, async ($, on) => {
    const seen = engine(on, [ambiguous('Q1?', 'Q2?', 'Q3?', 'Q4?', 'Q5?'), RESOLVED], { answer: q => `A-${q}` })
    await submit($, ASK)
    expect(seen.questions).toEqual(['Q1?', 'Q2?', 'Q3?', 'Q4?'])
    const second = seen.prompts[1]!
    for (const q of ['Q1?', 'Q2?', 'Q3?', 'Q4?']) expect(second).toContain(`Q: ${q}\nA: A-${q}`)
    expect(second).not.toContain('Q5?')
  })

  test('a message costs at most two model calls; questions still open are kept, flagged, not asked', async ($, on) => {
    const seen = engine(on, [ambiguous('Q1?'), ambiguous('Q2?', 'Q3?')], { answer: q => `A-${q}` })
    const r = await submit($, ASK)
    expect(seen.prompts.length).toBe(2)
    expect(seen.questions).toEqual(['Q1?'])
    const clean = seen.filled[0]!
    const facts = clean.slice(clean.indexOf('Facts'), clean.indexOf('Asks'))
    for (const q of ['Q2?', 'Q3?']) expect(facts).toContain(`[unresolved] ${q}`)
    expect(r).toEqual(expect.objectContaining({ drop: expect.stringContaining('clean version') }))
  })

  test("by default every call uses the session's model at low effort with a reply cap of at most 4096", async ($, on) => {
    const seen = engine(on, [ambiguous('Q1?'), RESOLVED], { answer: () => 'One' })
    await submit($, ASK)
    expect(seen.models).toEqual([SESSION_MODEL, SESSION_MODEL])
    expect(seen.efforts).toEqual(['low', 'low'])
    for (const m of seen.maxTokens) expect(m).toBeLessThanOrEqual(4096)
  })

  test('only the call after the answers is told it is the final pass', async ($, on) => {
    const seen = engine(on, [ambiguous('Q1?'), RESOLVED], { answer: () => 'One' })
    await submit($, ASK)
    expect(seen.prompts[0]).not.toContain('final pass')
    expect(seen.prompts[1]).toContain('final pass')
  })

  test('intake_effort sets the effort of every call and gives thinking a larger reply cap', { options: { intake_effort: 'high' } }, async ($, on) => {
    const seen = engine(on, [ambiguous('Q1?'), RESOLVED], { answer: () => 'One' })
    await submit($, ASK)
    expect(seen.efforts).toEqual(['high', 'high'])
    for (const m of seen.maxTokens) expect(m).toBeGreaterThanOrEqual(16384)
  })

  test('an intake_effort that is no level falls back to low', { options: { intake_effort: 'turbo' } }, async ($, on) => {
    const seen = engine(on, [RESOLVED])
    await submit($, ASK)
    expect(seen.efforts).toEqual(['low'])
  })

  test("the model's pick is offered first, marked, and answered without the mark", async ($, on) => {
    const picked = reply({
      ambiguities: [{ question: 'Where?', header: 'Target', options: ['Prod', 'Staging', 'Both'], recommended: 'Staging' }],
      goal: 'Deploy.',
    })
    const seen = engine(on, [picked, RESOLVED], { answer: () => 'Staging (Recommended)' })
    await submit($, ASK)
    expect(seen.shown).toEqual([['Staging (Recommended)', 'Prod', 'Both']])
    expect(seen.prompts[1]).toContain('Q: Where?\nA: Staging\n')
  })

  test('a typed "Other" answer is passed on as typed', async ($, on) => {
    const seen = engine(on, [ambiguous('Where?'), RESOLVED], { answer: () => 'Both, staging first' })
    await submit($, ASK)
    expect(seen.prompts[1]).toContain('A: Both, staging first')
  })
})

describe('handing back the clean version', () => {
  test('drops the original and fills the clean version', async ($, on) => {
    const seen = engine(on, [ambiguous('Where?'), RESOLVED], { answer: () => 'One' })
    await submit($, ASK)
    expect(seen.entered).toEqual([])
    expect(seen.filled).toEqual([
      ['Goal', 'Deploy the service.', '', 'Facts', '- The service is ready.', '- [unsorted] Mentions lunch', '', 'Asks', '1. Deploy it to staging'].join('\n'),
    ])
  })

  test('keeps what the person typed while intake ran', async ($, on) => {
    const seen = engine(on, [RESOLVED], { draft: 'also check the logs' })
    await submit($, ASK)
    expect(seen.filled[0]).toContain('Deploy it to staging')
    expect(seen.filled[0]).toContain('also check the logs')
  })

  test('a question the model could not give options for ends up flagged, keeping earlier answers', async ($, on) => {
    const unaskable = reply({ ambiguities: [{ question: 'Which port?', options: [] }], goal: 'Deploy.', asks: ['Deploy it to staging'] })
    const seen = engine(on, [ambiguous('Where?'), unaskable], { answer: () => 'One' })
    await submit($, ASK)
    expect(seen.questions).toEqual(['Where?'])
    expect(seen.filled[0]).toContain('[unresolved] Which port?')
    expect(seen.filled[0]).toContain('Deploy it to staging')
  })

  test('the submitted text still showing in the box is not kept as a draft', async ($, on) => {
    const seen = engine(on, [RESOLVED], { draft: ASK })
    await submit($, ASK)
    expect(seen.filled[0]).not.toContain(BODY)
  })

  test('if the drop puts the original back in the box, the clean version is filled again', async ($, on) => {
    const seen = engine(on, [RESOLVED], { draft: ['', ASK] })
    await submit($, ASK)
    await seen.clock.advance(1000)
    expect(seen.filled.length).toBe(2)
    expect(seen.filled[1]).toBe(seen.filled[0])
  })

  test('an edit made after the fill is not overwritten by the refill check', async ($, on) => {
    const seen = engine(on, [RESOLVED], { draft: ['', 'my own edit'] })
    await submit($, ASK)
    await seen.clock.advance(1000)
    expect(seen.filled.length).toBe(1)
  })

  test('the clean version, sent next, reaches Claude as is', async ($, on) => {
    const seen = engine(on, [], { last: RESOLVED })
    await submit($, ASK)
    const edited = `${seen.filled[0]!}\nand tag the release`
    await submit($, edited)
    expect(seen.entered).toEqual([edited])
    expect(seen.prompts.length).toBe(1)
  })

  test('when the box cannot take the text, the message is sent without the marker', async ($, on) => {
    const seen = engine(on, [], { last: RESOLVED, fillRefusal: 'dialog' })
    await submit($, ASK)
    expect(seen.entered).toEqual([BODY])
  })
})

describe('failures put the message back without the marker and send nothing', () => {
  test('a dismissed question, even mid-round; Enter then sends it as typed', async ($, on) => {
    let asked = 0
    const seen = engine(on, [], {
      last: ambiguous('Q1?', 'Q2?', 'Q3?'),
      answer: q => {
        if (++asked === 2) throw new Error('dismissed')
        return `A-${q}`
      },
    })
    const r = await submit($, ASK)
    expect(r).toEqual(expect.objectContaining({ drop: expect.stringContaining('cancelled') }))
    expect(seen.filled).toEqual([BODY])
    expect(seen.entered).toEqual([])
    await submit($, seen.filled[0]!)
    expect(seen.entered).toEqual([BODY])
    expect(seen.prompts.length).toBe(1)
  })

  for (const [name, replies] of [
    ['a rate limit', [{ isAnswered: false, reason: 'api-error', status: 429, error: 'rate_limit', usage }]],
    ['an overloaded API', []],
    ['a timeout', [{ isAnswered: false, reason: 'aborted', usage }]],
    ['a reply that is not JSON', [{ isAnswered: true, text: 'Sure! Here is the summary.', usage }]],
    ['a reply with no goal', [reply({ facts: [] })]],
    ['a failure in the second call', [ambiguous('Q1?')]],
  ] as const) {
    test(`${name}; Enter then sends it as typed with no further model call`, async ($, on) => {
      const seen = engine(on, [...replies], { answer: () => 'One' })
      const r = await submit($, ASK)
      expect(r).toEqual(expect.objectContaining({ drop: expect.stringContaining('model') }))
      expect(seen.filled).toEqual([BODY])
      expect(seen.entered).toEqual([])
      expect(seen.status.at(-1)).toBeUndefined()
      const calls = seen.prompts.length
      await submit($, seen.filled[0]!)
      expect(seen.entered).toEqual([BODY])
      expect(seen.prompts.length).toBe(calls)
    })
  }
})

describe('parsing the model reply', () => {
  const ok = { goal: 'g', facts: ['f'], asks: ['a'] }

  test('accepts JSON wrapped in prose or a fence', () => {
    expect(parseAnalysis(`Here:\n\`\`\`json\n${JSON.stringify(ok)}\n\`\`\``).sorted.goal).toBe('g')
  })

  test('missing lists mean none', () => {
    expect(parseAnalysis('{"goal":"g"}')).toEqual({ ambiguities: [], unaskable: [], sorted: { goal: 'g', facts: [], asks: [], unsorted: [] } })
  })

  test('refuses any shape that would silently lose content', () => {
    for (const bad of [
      'no braces',
      '{not json}',
      '{"goal":"  "}',
      '{"goal":"g","facts":"Uses Postgres 14"}',
      '{"goal":"g","unsorted":[{"text":"lunch"}]}',
      '{"goal":"g","ambiguities":[{"question":" ","options":["a","b"]}]}',
    ]) {
      expect(() => parseAnalysis(bad)).toThrow(AnalysisError)
    }
  })

  test('a question with fewer than 2 options is kept to flag, not asked', () => {
    const a = parseAnalysis('{"goal":"g","ambiguities":[{"question":"Which DB?","options":["only one"]},{"question":"Port?"}]}')
    expect(a.ambiguities).toEqual([])
    expect(a.unaskable).toEqual(['Which DB?', 'Port?'])
  })

  test('caps options at 4 and headers at 12 characters, defaulting a missing header', () => {
    const a = parseAnalysis(
      '{"goal":"g","ambiguities":[{"question":"Q?","header":"A very long header","options":["1","2","3","4","5"]},{"question":"R?","options":["x","y"]}]}',
    ).ambiguities
    expect(a).toEqual([
      { question: 'Q?', header: 'A very long ', options: ['1', '2', '3', '4'], recommended: false },
      { question: 'R?', header: 'Clarify', options: ['x', 'y'], recommended: false },
    ])
  })
})

test('a recommendation naming an offered option moves it first; any other is dropped', () => {
  const a = parseAnalysis(
    JSON.stringify({
      goal: 'g',
      ambiguities: [
        { question: 'A?', options: ['red', 'green', 'blue'], recommended: ' blue ' },
        { question: 'B?', options: ['1', '2', '3', '4', '5'], recommended: '5' },
        { question: 'C?', options: ['red', 'green'], recommended: 'Red' },
        { question: 'D?', options: ['red', 'green'], recommended: 1 },
      ],
    }),
  ).ambiguities
  expect(a.map(x => [x.options, x.recommended])).toEqual([
    [['blue', 'red', 'green'], true],
    [['1', '2', '3', '4'], false],
    [['red', 'green'], false],
    [['red', 'green'], false],
  ])
})

test('render puts flagged items under Facts and marks empty sections', () => {
  expect(render({ goal: 'g', facts: [], asks: [], unsorted: [] }, [])).toBe('Goal\ng\n\nFacts\n- none\n\nAsks\n- none')
  expect(
    render({ goal: 'g', facts: ['f1'], asks: ['a1', 'a2'], unsorted: ['u'] }, ['q?']),
  ).toBe('Goal\ng\n\nFacts\n- f1\n- [unsorted] u\n- [unresolved] q?\n\nAsks\n1. a1\n2. a2')
})
