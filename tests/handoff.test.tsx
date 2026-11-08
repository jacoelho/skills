import type { On, PluginOptions, SessionMessage } from 'claude-code'
import { type Engine, expect, mock, test } from 'claude-code/testing'

import { redact } from '../hooks/handoff/handoff'

// The engine stands beneath the plugin in these tests: each `on` here answers
// a call the plugin makes, from memory.

const HOME = '/Users/test'
const CWD = `${HOME}/proj`
const THRESHOLD = 400_000
const BUNDLED = '/hooks/handoff/prompts/handoff.md'
const SECRET = 'sk-abcdefghijklmnopqrstuvwxyz'
const HANDOFF = '# Handoff: Fix the parser\n\nContinue work in `~/proj`.\n\n## Next steps\n1. Run the tests.'
const CORE: SessionMessage = { role: 'user', text: 'CORE SUMMARY', toolUses: [] }
const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 }
const answered = (text: string) => ({ isAnswered: true, text, usage })
const apiError = { isAnswered: false, reason: 'api-error', status: 529, error: 'overloaded', usage }
const BAND = { plugin: 'jacoelho', component: 'AbovePrompt', props: { isWorking: false, hasSurvey: false, maxRows: 10, bodyColumns: 120, scroll: { offset: 0, bodyRows: 10 }, view: {} } } as const
const SURFACES = ['terminal', 'desktop'] as const

type Rig = {
  files: Record<string, string>
  forks: string[]
  cores: { trigger: string; instructions?: string }[]
  toasts: string[]
  commands: string[]
  copies: string[]
  // Stands for /clear waiting for the session to go idle.
  idle: Promise<void>
  threshold: { value: number }
  submits: { text: string; asUser?: boolean }[]
  tokens: { value: number }
  fork: { reply: unknown }
  clock: ReturnType<typeof mock.clock>
}

function rig(on: On, tokens = 0): Rig {
  const r: Rig = {
    // The bundled prompt is read through $.fs like any file; this fixture stands in for it.
    files: { [BUNDLED]: 'Handoff for {{cwd}}.' },
    forks: [],
    cores: [],
    toasts: [],
    commands: [],
    copies: [],
    idle: Promise.resolve(),
    threshold: { value: THRESHOLD },
    submits: [],
    tokens: { value: tokens },
    fork: { reply: answered(HANDOFF) },
    clock: mock.clock(on, { now: Date.UTC(2026, 10, 8, 12, 0, 0) }),
  }
  const key = (path: string) => (path.endsWith(BUNDLED) ? BUNDLED : path)
  on('session.start', async (_, e) => ({ cwd: e.cwd }) as never)
  on('command.register', async () => ({ value: undefined }) as never)
  on('env.get', async () => ({ value: HOME }) as never)
  on('session.model', async () => ({ value: 'claude-opus-5-5' }) as never)
  on('session.cwd', async () => ({ value: CWD }) as never)
  on('session.usage', async (_, e) => {
    const breakdown = (e as { breakdown?: string }).breakdown
      ? { autoCompactThreshold: r.threshold.value, rawMaxTokens: r.threshold.value, isAutoCompactEnabled: true }
      : undefined
    return { value: { startedAt: 0, context: { tokens: r.tokens.value, window: 1_000_000, breakdown } } } as never
  })
  on('model.fork', async (_, e) => {
    r.forks.push((e as { prompt: string }).prompt)
    return { value: r.fork.reply } as never
  })
  on('fs.exists', async (_, e) => ({ value: key((e as { path: string }).path) in r.files }) as never)
  on('fs.read', async (_, e) => {
    const p = key((e as { path: string }).path)
    if (!(p in r.files)) throw new Error(`ENOENT: ${p}`)
    return { value: r.files[p] } as never
  })
  on('fs.write', async (_, e) => {
    const { path, text } = e as { path: string; text: string }
    r.files[path] = text
    return { value: undefined } as never
  })
  on('process.run', async () => ({ value: { exitCode: 0, stdout: '', stderr: '' } }) as never)
  on('ui.toast', async (_, e) => {
    r.toasts.push((e as { text: string }).text)
    return { value: undefined } as never
  })
  on('ui.log', async () => ({ value: undefined }) as never)
  on('ui.copy', async (_, e) => {
    r.copies.push((e as { text: string }).text)
    return { value: { isCopied: true } } as never
  })
  on('classic.ConfigChange', async () => ({}) as never)
  on('turn.complete', async () => ({ text: '' }) as never)
  on('command.run', async (_, e) => {
    r.commands.push(e.command)
    await r.idle
    return { text: '' } as never
  })
  on('prompt.submit', async (_, e) => {
    r.submits.push({ text: e.text, asUser: (e.origin as { asUser?: boolean }).asUser })
    return { text: '' } as never
  })
  on('session.compact', async (_, e) => {
    r.cores.push({ trigger: e.trigger, instructions: e.instructions })
    return { messages: [CORE] }
  })
  on('ui.render', { component: 'AbovePrompt' }, async ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>REST</Text>
  })
  return r
}

async function start($: Engine) {
  await $.session.start({ source: 'startup', cwd: CWD, surface: 'terminal', isInteractive: true } as never)
}

async function turnAt($: Engine, r: Rig, tokens: number) {
  r.tokens.value = tokens
  await $.turn.complete({ answer: '' } as never)
}

const mount = ($: Engine, surface: (typeof SURFACES)[number]) => $.ui.mount({ ...BAND, surface })

const OLD: SessionMessage[] = [{ role: 'user', text: 'old turn', toolUses: [] }]

const raise = ($: Engine, trigger: 'auto' | 'manual' | 'precompute' | 'plugin', agentId?: string, messages = OLD) =>
  $.session.compact({ trigger, agentId, messages } as never)

const saved = (r: Rig) => Object.entries(r.files).filter(([k]) => k.startsWith(`${HOME}/.claude/handoffs/`) && k.endsWith('.md'))
const logText = (r: Rig) => r.files[`${HOME}/.claude/handoffs/handoff.log`] ?? ''

for (const surface of SURFACES) {
  test(`offer appears at 70% of the auto-compact threshold by default (${surface})`, async ($, on) => {
    const r = rig(on)
    await start($)

    // 70% of 400k is 280k: one token under shows nothing.
    await turnAt($, r, 279_999)
    let v = await mount($, surface)
    expect(await v.find({ key: 'handoff-write' }), 'no offer at 279,999').toBeUndefined()
    expect(await v.find({ type: 'Text', text: /REST/ }), 'other bands still draw').toBeDefined()

    await turnAt($, r, 280_000)
    v = await mount($, surface)
    expect(await v.find({ key: 'handoff-write' }), 'offer at 280,000').toBeDefined()
    expect((await v.find({ type: 'Text', text: /Context at/ }))?.text).toContain('280k of 400k')
  })
}

test('handoff_offer_at 50 offers at 200k', { options: { handoff_offer_at: 50 } satisfies PluginOptions }, async ($, on) => {
  const r = rig(on)
  await start($)
  await turnAt($, r, 199_999)
  expect(await (await mount($, 'terminal')).find({ key: 'handoff-write' }), 'none at 199,999').toBeUndefined()
  await turnAt($, r, 200_000)
  expect(await (await mount($, 'terminal')).find({ key: 'handoff-write' }), 'offer at 200,000').toBeDefined()
})

test('handoff_offer_at 0 never offers', { options: { handoff_offer_at: 0 } }, async ($, on) => {
  const r = rig(on)
  await start($)
  await turnAt($, r, 399_999)
  expect(await (await mount($, 'terminal')).find({ key: 'handoff-write' })).toBeUndefined()
})

test('a settings change re-reads the auto-compact threshold', async ($, on) => {
  const r = rig(on)
  await start($)
  await turnAt($, r, 150_000)
  expect(await (await mount($, 'terminal')).find({ key: 'handoff-write' }), 'none: 150k is under 70% of 400k').toBeUndefined()

  // /autocompact 200k: 70% is now 140k.
  r.threshold.value = 200_000
  await $.classic.ConfigChange({ source: 'user_settings' } as never)
  await turnAt($, r, 150_000)
  expect(await (await mount($, 'terminal')).find({ key: 'handoff-write' }), 'offer once the threshold is re-read').toBeDefined()
})

test('Not now keeps the offer away until the count drops under the offer point', async ($, on) => {
  const r = rig(on)
  await start($)
  await turnAt($, r, 300_000)
  await (await mount($, 'terminal')).press({ key: 'handoff-dismiss' })

  await turnAt($, r, 350_000)
  expect(await (await mount($, 'terminal')).find({ key: 'handoff-write' }), 'still snoozed at 350k').toBeUndefined()

  // A compaction brings the count down; crossing the point again offers again.
  await turnAt($, r, 100_000)
  await turnAt($, r, 290_000)
  expect(await (await mount($, 'terminal')).find({ key: 'handoff-write' }), 'offered again at 290k').toBeDefined()
})

for (const surface of SURFACES) {
  test(`Write handoff forks with the rendered prompt and saves a redacted file (${surface})`, async ($, on) => {
    const r = rig(on)
    r.fork.reply = answered(`\`\`\`markdown\n${HANDOFF}\nkey ${SECRET}\n\`\`\``)
    await start($)
    await turnAt($, r, 300_000)
    await (await mount($, surface)).press({ key: 'handoff-write' })

    expect(r.forks, 'one fork, with {{cwd}} filled in under ~').toEqual(['Handoff for ~/proj.'])
    const files = saved(r)
    expect(files.length, 'one handoff saved').toBe(1)
    const [path, text] = files[0] as [string, string]
    expect(path).toBe(`${HOME}/.claude/handoffs/2026-11-08-120000-fix-the-parser.md`)
    expect(text, 'fence removed').toBe(`${HANDOFF}\nkey <secret removed>\n`)
    expect(logText(r)).toContain(`ok ${path}`)

    const v = await mount($, surface)
    expect((await v.find({ type: 'Text', text: /Handoff saved to/ }))?.text).toContain(path)
    expect(await v.find({ key: 'handoff-continue' })).toBeDefined()
  })
}

test('/handoff writes the handoff without an offer', async ($, on) => {
  const r = rig(on)
  await start($)
  await turnAt($, r, 10_000)
  await $.command.run({ command: 'handoff', args: '' } as never)
  await r.clock.settle()
  expect(r.forks.length).toBe(1)
  expect(await (await mount($, 'terminal')).find({ key: 'handoff-continue' })).toBeDefined()
})

test(
  'an unknown placeholder fails before any model call, naming the file and the placeholder',
  { options: { handoff_prompt_file: '~/my-prompt.md' } },
  async ($, on) => {
    const r = rig(on)
    r.files[`${HOME}/my-prompt.md`] = 'Continue in {{cwdd}}.'
    await start($)
    await turnAt($, r, 300_000)
    await (await mount($, 'terminal')).press({ key: 'handoff-write' })

    expect(r.forks, 'no fork').toEqual([])
    const error = (await (await mount($, 'terminal')).find({ type: 'Text', text: /did not finish/ }))?.text ?? ''
    expect(error).toContain(`${HOME}/my-prompt.md`)
    expect(error).toContain('{{cwdd}}')
  },
)

test('a missing prompt file fails with its path', { options: { handoff_prompt_file: '/nope/prompt.md' } }, async ($, on) => {
  const r = rig(on)
  await start($)
  await turnAt($, r, 300_000)
  await (await mount($, 'terminal')).press({ key: 'handoff-write' })
  expect(r.forks).toEqual([])
  expect((await (await mount($, 'terminal')).find({ type: 'Text', text: /did not finish/ }))?.text).toContain('/nope/prompt.md')
})

test('a failed fork shows why and Try again recovers', async ($, on) => {
  const r = rig(on)
  r.fork.reply = apiError
  await start($)
  await turnAt($, r, 300_000)
  await (await mount($, 'terminal')).press({ key: 'handoff-write' })

  let v = await mount($, 'terminal')
  expect((await v.find({ type: 'Text', text: /did not finish/ }))?.text).toContain('HTTP 529')
  expect(saved(r), 'nothing saved').toEqual([])
  expect(logText(r)).toContain('failed: the model call failed (HTTP 529)')

  r.fork.reply = answered(HANDOFF)
  await v.press({ key: 'handoff-retry' })
  v = await mount($, 'terminal')
  expect(await v.find({ key: 'handoff-continue' })).toBeDefined()
  expect(saved(r).length).toBe(1)
})

test('Continue fresh clears the conversation, then sends the saved handoff as the first prompt', async ($, on) => {
  const r = rig(on)
  await start($)
  await turnAt($, r, 300_000)
  await (await mount($, 'terminal')).press({ key: 'handoff-write' })
  const [path] = saved(r)[0] as [string, string]
  await (await mount($, 'terminal')).press({ key: 'handoff-continue' })
  await r.clock.settle()

  expect(r.commands, '/clear ran once').toEqual(['clear'])
  expect(r.submits.length, 'one prompt submitted').toBe(1)
  expect(r.submits[0]?.text).toContain(HANDOFF)
  expect(r.submits[0]?.text).toContain(path)
  expect(r.submits[0]?.asUser).toBe(true)
  expect(r.cores, 'no compaction').toEqual([])
  expect(await (await mount($, 'terminal')).find({ key: 'handoff-continue' }), 'band closed').toBeUndefined()
})

test('while /clear waits, the band shows it is clearing and offers no second Continue', async ($, on) => {
  const r = rig(on)
  let idle: () => void = () => undefined
  r.idle = new Promise<void>(resolve => (idle = resolve))
  await start($)
  await turnAt($, r, 300_000)
  await (await mount($, 'terminal')).press({ key: 'handoff-write' })
  const pressed = (await mount($, 'terminal')).press({ key: 'handoff-continue' })
  await r.clock.settle()

  const v = await mount($, 'terminal')
  expect(await v.find({ key: 'handoff-continue' }), 'no second Continue').toBeUndefined()
  expect((await v.find({ type: 'Text', text: /Clearing/ }))?.text).toContain('.claude/handoffs/')

  idle()
  await pressed
  await r.clock.settle()
  expect(r.commands).toEqual(['clear'])
  expect(r.submits.length).toBe(1)
})

test('a failed /clear puts the handoff back with the reason', async ($, on) => {
  const r = rig(on)
  r.idle = Promise.reject(new Error('a turn is running'))
  r.idle.catch(() => undefined)
  await start($)
  await turnAt($, r, 300_000)
  await (await mount($, 'terminal')).press({ key: 'handoff-write' })
  await (await mount($, 'terminal')).press({ key: 'handoff-continue' })

  const v = await mount($, 'terminal')
  expect(await v.find({ key: 'handoff-continue' }), 'Continue offered again').toBeDefined()
  // The test engine reports a thrown hook in its own words; the band shows whatever /clear rejected with.
  expect((await v.find({ type: 'Text', text: /Could not clear the conversation: / }))).toBeDefined()
  expect(r.submits).toEqual([])
})

test('Continue fresh is not offered while a turn runs', async ($, on) => {
  const r = rig(on)
  await start($)
  await turnAt($, r, 300_000)
  await (await mount($, 'terminal')).press({ key: 'handoff-write' })
  const v = await $.ui.mount({ ...BAND, surface: 'terminal', props: { ...BAND.props, isWorking: true } })
  expect(await v.find({ key: 'handoff-continue' })).toBeUndefined()
  expect(await v.find({ key: 'handoff-copy' }), 'Copy stays').toBeDefined()
})

for (const surface of SURFACES) {
  test(`Copy puts the saved handoff on the pressing surface's clipboard (${surface})`, async ($, on) => {
    const r = rig(on)
    await start($)
    await turnAt($, r, 300_000)
    await (await mount($, surface)).press({ key: 'handoff-write' })
    await (await mount($, surface)).press({ key: 'handoff-copy' })
    expect(r.copies).toEqual([`${HANDOFF}\n`])
    expect((await (await mount($, surface)).find({ type: 'Text', text: /Copied/ }))?.text).toBe('Copied.')
  })
}

test('core mode leaves every compaction to Claude Code', async ($, on) => {
  const r = rig(on)
  await start($)
  const result = await raise($, 'auto')
  expect(result.messages).toEqual([CORE])
  expect(r.cores).toEqual([{ trigger: 'auto', instructions: undefined }])
  expect(r.forks).toEqual([])
})

test('handoff mode replaces an auto compaction with the handoff, keeping what the last request did not carry', { options: { handoff_on_compact: 'handoff' } }, async ($, on) => {
  const r = rig(on)
  await start($)
  await turnAt($, r, 10_000)
  // The fork re-sends the last request: it saw the first two messages, not the
  // reply that request produced, nor the prompt submitted after it.
  const reply: SessionMessage = { role: 'assistant', text: 'I pushed the fix.', toolUses: [], handle: 'h2' }
  const prompt: SessionMessage = { role: 'user', text: 'now tag a release', toolUses: [], handle: 'h3' }
  const result = await raise($, 'auto', undefined, [
    { role: 'user', text: 'fix the parser', toolUses: [], handle: 'h0' },
    { role: 'assistant', text: 'Looking.', toolUses: [], handle: 'h1' },
    { role: 'user', text: 'go on', toolUses: [], handle: 'h1b' },
    reply,
    prompt,
  ])

  expect(r.cores, 'core compaction never ran').toEqual([])
  const [path] = saved(r)[0] as [string, string]
  const [seed, ...kept] = result.messages ?? []
  expect(seed?.role).toBe('user')
  expect(seed?.text).toContain(HANDOFF)
  expect(seed?.text).toContain(path)
  expect(kept, 'the unsent tail follows the seed, handles intact').toEqual([reply, prompt])
})

test('handoff mode falls back to Claude Code when the fork fails', { options: { handoff_on_compact: 'handoff' } }, async ($, on) => {
  const r = rig(on)
  r.fork.reply = apiError
  await start($)
  const result = await raise($, 'manual')
  expect(result.messages).toEqual([CORE])
  expect(r.cores.map(c => c.trigger)).toEqual(['manual'])
  expect(logText(r)).toContain('compaction (manual) left to Claude Code: the model call failed (HTTP 529)')
})

for (const [name, trigger, agentId] of [
  ['a subagent compaction', 'auto', 'agent-1'],
  ['a precompute', 'precompute', undefined],
] as const) {
  test(`handoff mode leaves ${name} to Claude Code without forking`, { options: { handoff_on_compact: 'handoff' } }, async ($, on) => {
    const r = rig(on)
    await start($)
    const result = await raise($, trigger, agentId)
    expect(result.messages).toEqual([CORE])
    expect(r.forks).toEqual([])
  })
}

test('redact removes common token formats and keeps the text around them', () => {
  const cases: [string, string][] = [
    ['key sk-ant-api03-abcdefghijklmnop end', 'key <secret removed> end'],
    ['stripe sk_live_abcdefghijklmnop1234', 'stripe <secret removed>'],
    ['gh gho_abcdefghijklmnopqrstuvwxyz', 'gh <secret removed>'],
    ['gl glpat-abcdefghijklmnopqrst', 'gl <secret removed>'],
    ['slack xoxe-1234567890-abc', 'slack <secret removed>'],
    ['aws AKIAABCDEFGHIJKLMNOP', 'aws <secret removed>'],
    ['jwt eyJhbGciOiJIUzI1.eyJzdWIiOiIxMjM0.SflKxwRJSMeKKF2QT4fw', 'jwt <secret removed>'],
    ['Authorization: Bearer abc+def/ghijklmnopqrstuvwx==', 'Authorization: Bearer <secret removed>'],
    ['-----BEGIN RSA PRIVATE KEY-----\nMIIE\n-----END RSA PRIVATE KEY-----\nafter', '<secret removed>\nafter'],
    ['keys live in ~/.zshrc', 'keys live in ~/.zshrc'],
  ]
  for (const [input, expected] of cases) expect(redact(input), input).toBe(expected)
})
