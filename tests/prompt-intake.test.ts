import type { On } from 'claude-code'
import { type Engine, describe, expect, mock, test } from 'claude-code/testing'

import { AnalysisError, decide, parseAnalysis, render } from '../hooks/prompt-intake/intake'

const words = (n: number, sep = ' ') => Array.from({ length: n }, (_, i) => `w${i}`).join(sep)
const LONG = `${words(160)} deploy it somewhere`
const SHORT = 'fix the typo in the README'
const COMPOSER = { origin: { kind: 'composer' }, wait: false } as const

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
    const r = replies[seen.prompts.length - 1] ?? opts.last
    return { value: r ?? { isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded', usage } } as never
  })
  on('tool.call', { tool: 'AskUserQuestion' }, (_, e) => {
    const q = (e as unknown as { questions: { question: string }[] }).questions[0]!.question
    seen.questions.push(q)
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
  return seen
}

const submit = ($: Engine, text: string, extra: object = COMPOSER) =>
  $.prompt.submit({ text, ...COMPOSER, ...extra } as never)

describe('when a message is intercepted', () => {
  test('exactly 150 words reaches Claude unchanged; 151 is held', async ($, on) => {
    const seen = engine(on, [], { last: RESOLVED })
    await submit($, words(150))
    expect(seen.entered).toEqual([words(150)])
    expect(seen.prompts.length).toBe(0)

    const r = await submit($, words(151))
    expect(r).toEqual(expect.objectContaining({ drop: expect.any(String) }))
    expect(seen.entered).toEqual([words(150)])
    expect(seen.prompts.length).toBe(1)
  })

  test('words are counted across any whitespace', () => {
    for (const sep of ['\n', '\t', '  ']) {
      expect(decide(words(150, sep)).kind).toBe('pass')
      expect(decide(`  ${words(151, sep)}\n`).kind).toBe('intercept')
    }
  })

  test('slash commands, hidden prompts and attachments pass through', async ($, on) => {
    const seen = engine(on, [])
    await submit($, LONG, { command: { name: 'review', args: LONG } })
    await submit($, LONG, { isMeta: true })
    await submit($, LONG, { attachments: [{ id: 'a', type: 'image' }] })
    expect(seen.prompts.length).toBe(0)
    expect(seen.filled).toEqual([])
  })

  test('messages from other sessions and remote clients pass through', async ($, on) => {
    const seen = engine(on, [])
    await submit($, LONG, { origin: { kind: 'peer' } })
    await submit($, LONG, { origin: { kind: 'bridge' } })
    expect(seen.entered).toEqual([LONG, LONG])
    expect(seen.prompts.length).toBe(0)
  })
})

describe('raw: bypass', () => {
  test('sends the text after the prefix without intake, whatever its length', async ($, on) => {
    const seen = engine(on, [])
    await submit($, `raw: ${LONG}`)
    await submit($, `  raw:\n${SHORT}`)
    expect(seen.entered).toEqual([LONG, SHORT])
    expect(seen.prompts.length).toBe(0)
  })

  test('only the lowercase prefix counts, so a sentence starting "Raw:" is kept whole', () => {
    expect(decide('Raw: the numbers look off')).toEqual({ kind: 'pass' })
  })

  test('a bare prefix sends nothing', async ($, on) => {
    const seen = engine(on, [])
    const r = await submit($, 'raw:')
    expect(r).toEqual(expect.objectContaining({ drop: expect.any(String) }))
    expect(seen.entered).toEqual([])
  })
})

describe('clarifying', () => {
  test('asks at most 3 questions a round and sends every answer back with the message', async ($, on) => {
    const seen = engine(on, [ambiguous('Q1?', 'Q2?', 'Q3?', 'Q4?', 'Q5?'), RESOLVED], { answer: q => `A-${q}` })
    await submit($, LONG)
    expect(seen.questions).toEqual(['Q1?', 'Q2?', 'Q3?'])
    const second = seen.prompts[1]!
    for (const q of ['Q1?', 'Q2?', 'Q3?']) expect(second).toContain(`Q: ${q}\nA: A-${q}`)
    expect(second).not.toContain('Q4?')
  })

  test('answers accumulate across rounds and every call carries the original', async ($, on) => {
    const seen = engine(on, [ambiguous('Q1?'), ambiguous('Q2?'), RESOLVED], { answer: q => `A-${q}` })
    await submit($, LONG)
    expect(seen.prompts.length).toBe(3)
    for (const p of seen.prompts) expect(p).toContain(LONG)
    expect(seen.prompts[2]).toContain('A: A-Q1?')
    expect(seen.prompts[2]).toContain('A: A-Q2?')
  })

  test('a typed "Other" answer is passed on as typed', async ($, on) => {
    const seen = engine(on, [ambiguous('Where?'), RESOLVED], { answer: () => 'Both, staging first' })
    await submit($, LONG)
    expect(seen.prompts[1]).toContain('A: Both, staging first')
  })

  test('after 5 question rounds the remaining questions are kept, flagged, not asked', async ($, on) => {
    let n = 0
    const fresh = () => ambiguous(...[1, 2, 3, 4].map(() => `Q${++n}?`))
    const seen = engine(on, Array.from({ length: 10 }, fresh), { answer: q => `A-${q}` })
    const r = await submit($, LONG)
    expect(seen.questions.length).toBe(15)
    expect(seen.prompts.length).toBe(6)
    const clean = seen.filled[0]!
    const facts = clean.slice(clean.indexOf('Facts'), clean.indexOf('Asks'))
    for (const q of ['Q21?', 'Q22?', 'Q23?', 'Q24?']) expect(facts).toContain(`[unresolved] ${q}`)
    expect(r).toEqual(expect.objectContaining({ drop: expect.stringContaining('clean version') }))
  })
})

describe('handing back the clean version', () => {
  test('drops the original and fills the clean version', async ($, on) => {
    const seen = engine(on, [ambiguous('Where?'), RESOLVED], { answer: () => 'One' })
    await submit($, LONG)
    expect(seen.entered).toEqual([])
    expect(seen.filled).toEqual([
      ['Goal', 'Deploy the service.', '', 'Facts', '- The service is ready.', '- [unsorted] Mentions lunch', '', 'Asks', '1. Deploy it to staging'].join('\n'),
    ])
  })

  test('keeps what the person typed while intake ran', async ($, on) => {
    const seen = engine(on, [RESOLVED], { draft: 'also check the logs' })
    await submit($, LONG)
    expect(seen.filled[0]).toContain('Deploy it to staging')
    expect(seen.filled[0]).toContain('also check the logs')
  })

  test('a question the model could not give options for ends up flagged, keeping earlier answers', async ($, on) => {
    const unaskable = reply({ ambiguities: [{ question: 'Which port?', options: [] }], goal: 'Deploy.', asks: ['Deploy it to staging'] })
    const seen = engine(on, [ambiguous('Where?'), unaskable], { answer: () => 'One' })
    await submit($, LONG)
    expect(seen.questions).toEqual(['Where?'])
    expect(seen.filled[0]).toContain('[unresolved] Which port?')
    expect(seen.filled[0]).toContain('Deploy it to staging')
  })

  test('the submitted text still showing in the box is not kept as a draft', async ($, on) => {
    const seen = engine(on, [RESOLVED], { draft: LONG })
    await submit($, LONG)
    expect(seen.filled[0]).not.toContain(LONG)
  })

  test('if the drop puts the original back in the box, the clean version is filled again', async ($, on) => {
    const seen = engine(on, [RESOLVED], { draft: ['', LONG] })
    await submit($, LONG)
    await seen.clock.advance(1000)
    expect(seen.filled.length).toBe(2)
    expect(seen.filled[1]).toBe(seen.filled[0])
  })

  test('an edit made after the fill is not overwritten by the refill check', async ($, on) => {
    const seen = engine(on, [RESOLVED], { draft: ['', 'my own edit'] })
    await submit($, LONG)
    await seen.clock.advance(1000)
    expect(seen.filled.length).toBe(1)
  })

  test('the next submission is sent as is, once', async ($, on) => {
    const seen = engine(on, [], { last: RESOLVED })
    await submit($, LONG)
    const edited = `${seen.filled[0]!}\n${words(160)}`
    await submit($, edited)
    expect(seen.entered).toEqual([edited])
    await submit($, LONG)
    expect(seen.entered).toEqual([edited])
    expect(seen.prompts.length).toBe(2)
  })

  test('the pending review is used by the next person submission of any kind, not by other sessions', async ($, on) => {
    const seen = engine(on, [], { last: RESOLVED })
    await submit($, LONG)
    await submit($, LONG, { origin: { kind: 'peer' } })
    await submit($, LONG, { isMeta: true })
    await submit($, SHORT, { attachments: [{ id: 'a', type: 'image' }] })
    await submit($, LONG)
    expect(seen.prompts.length).toBe(2)
  })

  test('when the box cannot take the text, the original is sent and no review is pending', async ($, on) => {
    const seen = engine(on, [], { last: RESOLVED, fillRefusal: 'dialog' })
    await submit($, LONG)
    expect(seen.entered).toEqual([LONG])
    await submit($, `${LONG} again`)
    expect(seen.prompts.length).toBe(2)
  })
})

describe('failures put the original back and send nothing', () => {
  test('a dismissed question, even mid-round, and the next message is intercepted again', async ($, on) => {
    let asked = 0
    const seen = engine(on, [], {
      last: ambiguous('Q1?', 'Q2?', 'Q3?'),
      answer: q => {
        if (++asked === 2) throw new Error('dismissed')
        return `A-${q}`
      },
    })
    const r = await submit($, LONG)
    expect(r).toEqual(expect.objectContaining({ drop: expect.stringContaining('cancelled') }))
    expect(seen.filled).toEqual([LONG])
    expect(seen.entered).toEqual([])
    const again = await submit($, LONG)
    expect(again).toEqual(expect.objectContaining({ drop: expect.any(String) }))
    expect(seen.entered).toEqual([])
  })

  for (const [name, replies] of [
    ['an API error', []],
    ['a timeout', [{ isAnswered: false, reason: 'aborted', usage }]],
    ['a reply that is not JSON', [{ isAnswered: true, text: 'Sure! Here is the summary.', usage }]],
    ['a reply with no goal', [reply({ facts: [] })]],
    ['a failure in a later round', [ambiguous('Q1?')]],
  ] as const) {
    test(name, async ($, on) => {
      const seen = engine(on, [...replies], { answer: () => 'One' })
      const r = await submit($, LONG)
      expect(r).toEqual(expect.objectContaining({ drop: expect.stringContaining('model') }))
      expect(seen.filled).toEqual([LONG])
      expect(seen.entered).toEqual([])
      expect(seen.status.at(-1)).toBeUndefined()
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
      { question: 'Q?', header: 'A very long ', options: ['1', '2', '3', '4'] },
      { question: 'R?', header: 'Clarify', options: ['x', 'y'] },
    ])
  })
})

test('render puts flagged items under Facts and marks empty sections', () => {
  expect(render({ goal: 'g', facts: [], asks: [], unsorted: [] }, [])).toBe('Goal\ng\n\nFacts\n- none\n\nAsks\n- none')
  expect(
    render({ goal: 'g', facts: ['f1'], asks: ['a1', 'a2'], unsorted: ['u'] }, ['q?']),
  ).toBe('Goal\ng\n\nFacts\n- f1\n- [unsorted] u\n- [unresolved] q?\n\nAsks\n1. a1\n2. a2')
})
