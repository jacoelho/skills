import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

// Run with: node --test tests/workflows/*.check.mjs
// Drives workflows/spec-implement.js with scripted agents: these tests check orchestration (order,
// gates, waves, attempts, the single record writer, resume and stops), not the quality of the work.

const SOURCE = readFileSync(new URL('../../workflows/spec-implement.js', import.meta.url), 'utf8').replace('export const meta', 'const meta')
const inputOf = (prompt) => JSON.parse(prompt.split('INPUT (JSON):\n')[1])

const unit = (id, o = {}) => ({ id, kind: 'impl', after: [], owner: 'booking/', edits: ['booking/'], state: 'pending', blockedReason: '', ...o })
const change = (id, units, o = {}) => ({ id, title: id, kind: 'feature', requirements: [`REQ-${id}`], accepted: false, units, ...o })
const basicPlan = (o = {}) => ({
  record: 'specs/booking.implementation.md', status: 'planning', lifecycle: 'anchored', methodLoaded: true, needsApproval: false, contractChanged: false, verify: 'make test', specBlocked: [],
  changes: [change('C-1', [unit('U-1.1', { kind: 'tests', edits: ['booking/cancel_test.go'] }), unit('U-1.2', { after: ['U-1.1'] })])],
  ...o,
})

async function run(s = {}) {
  const calls = []
  const records = []
  const logs = []
  let inFlight = []
  let maxInFlight = 0
  const agent = async (prompt, o) => {
    calls.push({ label: o.label, prompt, model: o.model })
    if (o.label.startsWith('record')) records.push(inputOf(prompt))
    const L = o.label
    if (s.agent) { const r = s.agent(L, prompt, o); if (r !== undefined) return r }
    if (L === 'plan' || L === 'resume') return structuredClone(s.plan ?? basicPlan())
    if (L.startsWith('record')) return s.recordDead ? null : { written: true }
    if (L.startsWith('hash')) return { changed: !!s.hashChanged, files: s.hashChanged ? ['specs/booking.md'] : [] }
    if (L.startsWith('tests')) return { outcome: 'done', summary: 'tests', decisions: [], returned: [], output: '' }
    if (L.startsWith('red')) return { tests: s.redTests ?? [{ name: 'TestCancel', reason: s.redReason ?? 'assertion' }], output: '' }
    if (L.startsWith('unit')) {
      const u = inputOf(prompt).unit
      inFlight.push(u)
      maxInFlight = Math.max(maxInFlight, inFlight.length)
      const key = (o) => o.replace(/\/+$/, '')
      if (inFlight.filter((x) => key(x.owner) === key(u.owner)).length > 1) throw new Error(`two units of ${u.owner} in flight`)
      const paths = inFlight.flatMap((x) => x.edits)
      if (paths.length !== new Set(paths).size) throw new Error(`overlapping edits in flight: ${paths.join(', ')}`)
      await new Promise((r) => setTimeout(r, 1))
      inFlight = inFlight.filter((x) => x !== u)
      const outcome = s.unitOutcome ? s.unitOutcome(u.id, L, o.model) : 'done'
      return { outcome, summary: u.id, decisions: [], returned: outcome === 'returned' ? ['needs a new seam'] : [], output: outcome === 'failed' ? 'boom' : '' }
    }
    if (L.startsWith('verify')) return s.verifyDead ? null : { passed: s.verifyPasses ?? true, output: '' }
    if (L.startsWith('fix')) return { outcome: 'done', summary: 'fix', decisions: [], returned: [], output: '' }
    if (L.startsWith('conform')) return { findings: s.findings ? s.findings(L) : [] }
    if (L === 'close') return { closed: true, discarded: false, summary: 'closed' }
    throw new Error(`unexpected agent ${L}`)
  }
  const parallel = (ts) => Promise.all(ts.map((t) => t().catch(() => null)))
  const budget = s.budget ?? { total: null, spent: () => 0, remaining: () => Infinity }
  const main = new Function('args', 'agent', 'parallel', 'phase', 'log', 'budget', `return (async () => {${SOURCE}\n})()`)
  const out = await main('args' in s ? s.args : { contracts: ['specs/booking.md'] }, agent, parallel, () => {}, (m) => logs.push(m), budget)
  return { out, calls, records, labels: calls.map((c) => c.label), logs, maxInFlight }
}

describe('refusals start no agents', () => {
  for (const [name, args, reason] of [
    ['help', 'help', 'help'],
    ['nothing to do', {}, 'no-input'],
    ['contracts and record together', { contracts: ['a.md'], record: 'a.implementation.md' }, 'both-inputs'],
    ['unknown option', { contracts: ['a.md'], parallel: 2 }, 'unknown-option'],
    ['concurrency out of range', { contracts: ['a.md'], concurrency: 0 }, 'bad-option'],
    ['unknown gate', { contracts: ['a.md'], gates: ['merge'] }, 'bad-option'],
    ['unknown model role', { contracts: ['a.md'], models: { critic: 'opus' } }, 'bad-option'],
    ['unsubstituted plugin setting', { contracts: ['a.md'], models: { planner: '${user_config.implement_model_planner}' } }, 'bad-option'],
    ['bad json', '{nope', 'bad-args'],
  ]) {
    test(name, async () => {
      const { out, calls } = await run({ args })
      assert.equal(out.started, false)
      assert.equal(out.reason, reason)
      assert.equal(calls.length, 0)
    })
  }

  test('a bare record path resumes, a bare contract path plans', async () => {
    assert.equal((await run({ args: 'specs/booking.implementation.md' })).labels[0], 'resume')
    assert.equal((await run({ args: 'specs/booking.md' })).labels[0], 'plan')
  })
})

describe('plan gate', () => {
  test('stops after planning when the design adds a seam', async () => {
    const { out, labels } = await run({ plan: basicPlan({ needsApproval: true }) })
    assert.equal(out.stopKind, 'plan-ready')
    assert.deepEqual(labels, ['plan'])
  })

  test('carries on when the design adds nothing', async () => {
    const { out } = await run()
    assert.equal(out.stopKind, 'done')
  })

  test('carries on unattended with no gates', async () => {
    const { out } = await run({ plan: basicPlan({ needsApproval: true }), args: { contracts: ['a.md'], gates: [] } })
    assert.equal(out.stopKind, 'done')
  })

  test('a re-plan after a contract change stops for approval again when it adds a seam', async () => {
    const { out, records } = await run({ args: { record: 'r.implementation.md' }, plan: basicPlan({ status: 'approved', needsApproval: true, contractChanged: true }) })
    assert.equal(out.stopKind, 'plan-ready')
    assert.equal(records.at(-1).status, 'planning')
  })

  test('resuming the record approves the plan', async () => {
    const { out, labels } = await run({ args: { record: 'specs/booking.implementation.md' }, plan: basicPlan({ needsApproval: true, status: 'approved' }) })
    assert.equal(out.stopKind, 'done')
    assert.equal(labels[0], 'resume')
  })
})

describe('one change end to end', () => {
  test('runs tests before code, then checks, conformance and close', async () => {
    const { out, labels } = await run()
    assert.equal(out.stopKind, 'done')
    const order = ['plan', 'tests U-1.1', 'red C-1', 'record: C-1 tests', 'unit U-1.2', 'verify C-1', 'conform C-1', 'close']
    let at = -1
    for (const l of order) { const i = labels.indexOf(l, at + 1); assert.ok(i > at, `${l} out of order in ${labels.join(', ')}`); at = i }
  })
})

describe('the record has one writer', () => {
  test('every agent that is not the planner or record writer is told not to write the record', async () => {
    const { calls } = await run()
    for (const c of calls.filter((c) => !['plan', 'resume', 'close'].includes(c.label) && !c.label.startsWith('record'))) {
      assert.ok(c.prompt.includes('never write it'), `${c.label} may write the record`)
    }
  })

  test('the record is written after each wave, never during one', async () => {
    const { labels } = await run()
    const unitAt = labels.indexOf('unit U-1.2')
    assert.ok(labels[unitAt + 1].startsWith('record'), labels.join(', '))
  })
})

describe('waves', () => {
  const plan = basicPlan({
    changes: [change('C-1', [
      unit('U-T', { kind: 'tests' }),
      unit('U-a1', { after: ['U-T'], owner: 'a/', edits: ['a/one.go'] }),
      unit('U-a2', { after: ['U-T'], owner: 'a/', edits: ['a/two.go'] }),
      unit('U-b', { after: ['U-T'], owner: 'b/', edits: ['b/'] }),
      unit('U-c', { after: ['U-T'], owner: 'c/', edits: ['b/shared.go'] }),
      unit('U-d', { after: ['U-T'], owner: 'd/', edits: ['d/'] }),
    ])],
  })

  test('units of one module never run together, nor units with overlapping edits', async () => {
    const { out, labels } = await run({ plan })
    assert.equal(out.stopKind, 'done')
    for (const id of ['U-a1', 'U-a2', 'U-b', 'U-c', 'U-d']) assert.ok(labels.includes(`unit ${id}`), id)
  })

  test('a wave never exceeds concurrency', async () => {
    const { maxInFlight } = await run({ plan, args: { contracts: ['a.md'], concurrency: 2 } })
    assert.ok(maxInFlight <= 2, `max in flight ${maxInFlight}`)
  })
})

describe('attempts and blocking', () => {
  test('a failing unit escalates to the planner model, then blocks, and its dependants never run', async () => {
    const plan = basicPlan({ changes: [change('C-1', [unit('U-T', { kind: 'tests' }), unit('U-1', { after: ['U-T'] }), unit('U-2', { after: ['U-1'], owner: 'x/', edits: ['x/'] })])] })
    const { out, calls, labels } = await run({ plan, unitOutcome: (id) => (id === 'U-1' ? 'failed' : 'done') })
    assert.equal(out.stopKind, 'blocked')
    const tries = calls.filter((c) => c.label.startsWith('unit U-1'))
    assert.deepEqual(tries.map((c) => c.model), ['sonnet', 'sonnet', 'opus'])
    assert.ok(!labels.some((l) => l.startsWith('unit U-2')))
    assert.match(out.units.find((u) => u.id === 'U-1').blockedReason, /failed 3 attempts/)
  })

  test('a unit that returns a decision blocks at once', async () => {
    const { out, calls } = await run({ unitOutcome: () => 'returned' })
    assert.equal(out.stopKind, 'blocked')
    assert.equal(calls.filter((c) => c.label.startsWith('unit')).length, 1)
    assert.match(out.next, /needs a new seam/)
  })

  test('tests that fail to build are not red: implementation never starts', async () => {
    const { out, labels } = await run({ redReason: 'build' })
    assert.equal(out.stopKind, 'blocked')
    assert.ok(!labels.some((l) => l.startsWith('unit')))
  })

  test('when every test passes before implementation, implementation never starts', async () => {
    const { out, labels } = await run({ redReason: 'passed' })
    assert.equal(out.stopKind, 'blocked')
    assert.ok(!labels.some((l) => l.startsWith('unit')))
    assert.match(out.units.find((u) => u.id === 'U-1.1').blockedReason, /already-satisfied .* weak-test/)
  })

  test('some tests passing before implementation is reported, not blocking', async () => {
    const { out, records } = await run({ redTests: [{ name: 'TestA', reason: 'assertion' }, { name: 'TestB', reason: 'passed' }] })
    assert.equal(out.stopKind, 'done')
    assert.ok(records.some((r) => r.notes.some((n) => n.includes('TestB'))))
  })

  test('units are told not to run repository-wide checks or rewrite files outside their paths', async () => {
    const { calls } = await run()
    const brief = calls.find((c) => c.label === 'unit U-1.2').prompt
    assert.match(brief, /never the repository-wide checks/)
    assert.match(brief, /never run a tool that rewrites files outside your edit paths/)
  })

  test('module owners match with or without a trailing slash', async () => {
    const plan = basicPlan({ changes: [change('C-1', [unit('U-T', { kind: 'tests' }), unit('U-1', { after: ['U-T'], owner: 'pay', edits: ['pay/a.go'] }), unit('U-2', { after: ['U-T'], owner: 'pay/', edits: ['pay/b.go'] })])] })
    const { out } = await run({ plan })
    assert.equal(out.stopKind, 'done')
  })
})

describe('the record', () => {
  for (const [contract, record] of [
    ['specs/stock/contract.md', 'specs/stock/stock.implementation.md'],
    ['specs/booking.md', 'specs/booking.implementation.md'],
    ['booking.md', 'booking.implementation.md'],
  ]) {
    test(`a plan for ${contract} is recorded at ${record}`, async () => {
      const { calls } = await run({ args: { contracts: [contract] } })
      assert.equal(inputOf(calls.find((c) => c.label === 'plan').prompt).record, record)
    })
  }

  test('each red test and its failure reach the record', async () => {
    const { records } = await run({ redTests: [{ name: 'TestCancel', reason: 'assertion' }, { name: 'TestRefund', reason: 'not-implemented' }] })
    const notes = records.flatMap((r) => r.notes).join('\n')
    assert.match(notes, /TestCancel \(assertion\)/)
    assert.match(notes, /TestRefund \(not-implemented\)/)
  })
})

describe('agent count', () => {
  test('one change is not reviewed twice: no whole-stack check after its own', async () => {
    const { labels } = await run()
    assert.ok(labels.includes('conform C-1'))
    assert.ok(!labels.includes('conform stack'))
  })

  test('a planner that already wrote approved costs no extra record write', async () => {
    const { labels } = await run({ plan: basicPlan({ status: 'approved' }) })
    assert.ok(!labels.includes('record: approved'))
    const planning = await run()
    assert.ok(planning.labels.includes('record: approved'))
  })

  test('runners and the record writer are not told to load the method', async () => {
    const { calls } = await run()
    for (const c of calls) {
      const loads = /Invoke the Skill tool/.test(c.prompt)
      const mechanical = /^(record|verify|red|hash)/.test(c.label)
      assert.equal(loads, !mechanical, c.label)
    }
  })

  test('items a finished unit returns still reach the record', async () => {
    const agent = (L) => (L === 'tests U-1.1' ? { outcome: 'done', summary: 'tests', decisions: [], returned: ['stub panics abort the run'], output: '' } : undefined)
    const { records } = await run({ agent })
    assert.match(records.flatMap((r) => r.notes).join('\n'), /returned: stub panics abort the run/)
  })
})

describe('conformance scope', () => {
  test('a feature change without a tests unit is a planning defect, stopped before any work', async () => {
    const plan = basicPlan({ changes: [change('C-1', [unit('U-1.1')])] })
    const { out, labels } = await run({ plan })
    assert.equal(out.stopKind, 'error')
    assert.match(out.next, /C-1 have no tests unit/)
    assert.deepEqual(labels, ['plan'])
  })

  test('a change\'s planned scope is its own edit paths, the stack\'s every change\'s', async () => {
    const plan = basicPlan({ changes: [
      change('C-1', [unit('U-1.1', { kind: 'tests', edits: ['a/a_test.go'] }), unit('U-1.2', { after: ['U-1.1'], owner: 'a/', edits: ['a/a.go'] })]),
      change('C-2', [unit('U-2.1', { kind: 'tests', edits: ['b/b_test.go'] })]),
    ] })
    const { calls } = await run({ plan })
    const paths = (l) => inputOf(calls.find((c) => c.label === l).prompt).paths.sort()
    assert.deepEqual(paths('conform C-1'), ['a/a.go', 'a/a_test.go'])
    assert.deepEqual(paths('conform C-2'), ['b/b_test.go'])
    assert.deepEqual(paths('conform stack'), ['a/a.go', 'a/a_test.go', 'b/b_test.go'])
  })

  test('a prefactor without tests is done once checks and conformance pass', async () => {
    const plan = basicPlan({ changes: [change('C-0', [unit('U-0.1')], { kind: 'prefactor', requirements: [] })] })
    const { out, labels } = await run({ plan })
    assert.equal(out.stopKind, 'done')
    assert.ok(!labels.some((l) => l.startsWith('red')))
  })
})

describe('stops', () => {
  test('a planner that could not load the method stops the run before any change', async () => {
    const { out, labels } = await run({ plan: basicPlan({ methodLoaded: false }) })
    assert.equal(out.stopKind, 'error')
    assert.match(out.next, /could not load/)
    assert.deepEqual(labels, ['plan'])
  })

  test('a finding that would edit the record goes to the user, not to a fix unit', async () => {
    const findings = (l) => (l === 'conform C-1' ? [{ summary: 'evidence', location: 'x', kind: 'unit', owner: 'stock/', edits: ['specs/booking.implementation.md'] }] : [])
    const { out, labels } = await run({ findings })
    assert.equal(out.stopKind, 'blocked')
    assert.ok(!labels.some((l) => l.startsWith('unit C-1-F')))
  })

  test('failing checks get fixes with the unit attempt policy, then stop', async () => {
    const { out, calls } = await run({ verifyPasses: false })
    assert.equal(out.stopKind, 'verify-failing')
    assert.deepEqual(calls.filter((c) => c.label.startsWith('fix')).map((c) => c.model), ['sonnet', 'sonnet', 'opus'])
  })

  test('with maxAttempts 1, one implementer fix comes before the planner fix', async () => {
    const { calls } = await run({ verifyPasses: false, args: { contracts: ['a.md'], maxAttempts: 1 } })
    assert.deepEqual(calls.filter((c) => c.label.startsWith('fix')).map((c) => c.model), ['sonnet', 'opus'])
  })

  for (const [name, s, kind] of [
    ['blocked', { unitOutcome: () => 'returned' }, 'blocked'],
    ['verify failing', { verifyPasses: false }, 'verify-failing'],
  ]) {
    test(`a ${name} stop writes status blocked to the record before returning`, async () => {
      const { out, records } = await run(s)
      assert.equal(out.stopKind, kind)
      assert.equal(records.at(-1).status, 'blocked')
    })
  }

  test('a verify runner that returns nothing is an error stop, with no fix attempts', async () => {
    const { out, labels } = await run({ verifyDead: true })
    assert.equal(out.stopKind, 'error')
    assert.match(out.next, /repository checks for C-1 returned no result/)
    assert.ok(!labels.some((l) => l.startsWith('fix')))
  })

  test('no check command stops before any work, so no runner can report unrun checks', async () => {
    const { out, labels } = await run({ plan: basicPlan({ verify: ' ' }) })
    assert.equal(out.stopKind, 'error')
    assert.match(out.next, /No repository check command/)
    assert.deepEqual(labels, ['plan'])
  })

  test('the record writer runs on its own role model', async () => {
    const { calls } = await run({ args: { contracts: ['a.md'], models: { recorder: 'opus' } } })
    assert.ok(calls.filter((c) => c.label.startsWith('record')).every((c) => c.model === 'opus'))
  })

  test('inherit runs a role on the session model', async () => {
    const { calls } = await run({ args: { contracts: ['a.md'], models: { recorder: 'inherit' } } })
    const records = calls.filter((c) => c.label.startsWith('record'))
    assert.ok(records.length && records.every((c) => c.model === undefined))
    assert.equal(calls.find((c) => c.label === 'plan').model, 'opus')
  })

  test('plugin settings start at the workflow defaults and every choice is accepted', async () => {
    const config = JSON.parse(readFileSync(new URL('../../.claude-plugin/plugin.json', import.meta.url), 'utf8')).userConfig
    const role = { planner: 'planner', testWriter: 'test_writer', implementer: 'implementer', runner: 'runner', reviewer: 'reviewer', recorder: 'recorder' }
    const { calls } = await run({ args: { contracts: ['a.md'] } })
    const used = { planner: 'plan', testWriter: 'tests', implementer: 'unit', runner: 'verify', reviewer: 'conform', recorder: 'record' }
    for (const [r, key] of Object.entries(role)) {
      const o = config[`implement_model_${key}`]
      assert.ok(o, `no plugin setting for ${r}`)
      const c = calls.find((x) => x.label.startsWith(used[r]))
      assert.ok(c, `no ${r} call`)
      assert.equal(c.model, o.default, `${r} default`)
      for (const m of o.options) {
        const { out } = await run({ args: { contracts: ['a.md'], models: { [r]: m } } })
        assert.notEqual(out.reason, 'bad-option', `${r}: ${m}`)
      }
    }
  })

  test('a record writer that does not answer is an error stop, not an exception', async () => {
    const { out } = await run({ recordDead: true })
    assert.equal(out.stopKind, 'error')
    assert.match(out.next, /booking\.implementation\.md/)
  })

  test('a dependency on an unknown unit blocks with its id instead of hanging', async () => {
    const plan = basicPlan({ changes: [change('C-1', [unit('U-1.1', { kind: 'tests' }), unit('U-1.2', { after: ['U-9'] })])] })
    const { out } = await run({ plan })
    assert.equal(out.stopKind, 'blocked')
    assert.match(out.units.find((u) => u.id === 'U-1.2').blockedReason, /unknown unit U-9/)
  })

  test('a dependency on a unit of an earlier change resolves', async () => {
    const plan = basicPlan({ changes: [change('C-1', [unit('U-1', { kind: 'tests' })]), change('C-2', [unit('U-2', { kind: 'tests' }), unit('U-2.1', { after: ['U-1', 'U-2'] })])] })
    const { out, labels } = await run({ plan })
    assert.equal(out.stopKind, 'done')
    assert.ok(labels.includes('unit U-2.1'))
  })

  const twoChanges = () => basicPlan({ changes: [
    change('C-1', [unit('U-1.1', { kind: 'tests', edits: ['a/a_test.go'] }), unit('U-1.2', { after: ['U-1.1'], owner: 'a/', edits: ['a/a.go'] })]),
    change('C-2', [unit('U-2.1', { kind: 'tests', edits: ['b/b_test.go'] }), unit('U-2.2', { after: ['U-2.1'], owner: 'b/', edits: ['b/b.go'] })]),
  ] })

  test('a contract changed during the run stops before any work on the next change', async () => {
    const { out, labels } = await run({ plan: twoChanges(), hashChanged: true })
    assert.equal(out.stopKind, 'contract-changed')
    assert.ok(!labels.includes('hash C-1'), 'the planner just compared the hashes')
    assert.ok(labels.includes('hash C-2'))
    assert.ok(!labels.includes('tests U-2.1'))
  })

  test('every requirement blocked by a spec defect stops after planning', async () => {
    const { out, labels } = await run({ plan: basicPlan({ specBlocked: ['REQ-1'], changes: [] }) })
    assert.equal(out.stopKind, 'spec-blocked')
    assert.deepEqual(labels, ['plan'])
  })

  test('a low token target stops before a change', async () => {
    const { out, labels } = await run({ budget: { total: 100000, spent: () => 90000, remaining: () => 10000 } })
    assert.equal(out.stopKind, 'budget')
    assert.ok(!labels.some((l) => l.startsWith('tests')))
  })

  test('the change gate stops between changes', async () => {
    const plan = basicPlan({ changes: [change('C-1', [unit('U-1', { kind: 'tests' })]), change('C-2', [unit('U-2', { kind: 'tests' })])] })
    const { out, labels } = await run({ plan, args: { contracts: ['a.md'], gates: ['change'] } })
    assert.equal(out.stopKind, 'change-ready')
    assert.ok(!labels.some((l) => l.endsWith('C-2')))
  })
})

describe('conformance', () => {
  test('a unit-sized finding gets one fix round, then a second check', async () => {
    let first = true
    const findings = (l) => (l === 'conform C-1' && first ? (first = false, [{ summary: 'duplicated rule', location: 'a.go:1', kind: 'unit', owner: 'booking/', edits: ['booking/'] }]) : [])
    const { out, labels } = await run({ findings })
    assert.equal(out.stopKind, 'done')
    assert.ok(labels.includes('unit C-1-F1'))
    assert.ok(labels.includes('conform C-1 #2'))
  })

  test('a design change stops for the user without fix units', async () => {
    const findings = (l) => (l === 'conform C-1' ? [{ summary: 'new seam needed', location: 'a.go:1', kind: 'design-change', owner: '', edits: [] }] : [])
    const { out, labels } = await run({ findings })
    assert.equal(out.stopKind, 'blocked')
    assert.ok(!labels.some((l) => l.includes('-F1')))
    assert.equal(out.findings.length, 1)
  })
})

describe('resume and lifecycle', () => {
  test('a blocked unit the planner reopened runs again', async () => {
    const plan = basicPlan({ status: 'blocked', changes: [change('C-1', [unit('U-1.1', { kind: 'tests', state: 'done' }), unit('U-1.2', { after: ['U-1.1'], state: 'pending' })])] })
    const { out, labels } = await run({ args: { record: 'r.implementation.md' }, plan })
    assert.equal(out.stopKind, 'done')
    assert.ok(labels.includes('unit U-1.2'))
  })

  test('a unit left in progress by an interrupted run starts again', async () => {
    const plan = basicPlan({ status: 'implementing', changes: [change('C-1', [unit('U-1.1', { kind: 'tests', state: 'done' }), unit('U-1.2', { after: ['U-1.1'], state: 'in-progress' })])] })
    const { out, labels } = await run({ args: { record: 'r.implementation.md' }, plan })
    assert.equal(out.stopKind, 'done')
    assert.ok(labels.includes('unit U-1.2'))
  })

  test('re-conforming numbers new fix units after existing ones', async () => {
    let first = true
    const findings = (l) => (l === 'conform C-1' && first ? (first = false, [{ summary: 'dup', location: 'a.go:1', kind: 'unit', owner: 'x/', edits: ['x/'] }]) : [])
    const plan = basicPlan({ status: 'implementing', changes: [change('C-1', [unit('U-1.1', { kind: 'tests', state: 'done' }), unit('C-1-F1', { state: 'done', owner: 'y/', edits: ['y/'] })])] })
    const { labels } = await run({ args: { record: 'r.implementation.md' }, plan, findings })
    assert.ok(labels.includes('unit C-1-F2'), labels.join(', '))
  })

  test('whole-stack fixes run in a STACK change that is written to the record', async () => {
    let first = true
    const findings = (l) => (l === 'conform stack' && first ? (first = false, [{ summary: 'drift', location: 'b.go:1', kind: 'unit', owner: 'stock/', edits: ['stock/'] }]) : [])
    const plan = basicPlan({ changes: [
      change('C-1', [unit('U-1.1', { kind: 'tests', edits: ['a/a_test.go'] })]),
      change('C-2', [unit('U-2.1', { kind: 'tests', edits: ['b/b_test.go'] })]),
    ] })
    const { out, labels, records } = await run({ plan, findings })
    assert.equal(out.stopKind, 'done')
    assert.ok(labels.includes('unit STACK-F1'))
    const last = records.at(-1).changes.find((c) => c.id === 'STACK')
    assert.equal(last.accepted, true)
  })

  test('done units are not run again', async () => {
    const plan = basicPlan({ status: 'implementing', changes: [change('C-1', [unit('U-1.1', { kind: 'tests', state: 'done' }), unit('U-1.2', { after: ['U-1.1'], state: 'done' })])] })
    const { out, labels } = await run({ args: { record: 'r.implementation.md' }, plan })
    assert.equal(out.stopKind, 'done')
    assert.ok(!labels.some((l) => l.startsWith('unit') || l.startsWith('tests')))
  })

  test('a feature spec stops at the discard gate, and resuming discards it', async () => {
    const first = await run({ plan: basicPlan({ lifecycle: 'feature' }) })
    assert.equal(first.out.stopKind, 'discard-ready')
    assert.ok(!first.labels.includes('close'))
    const accepted = basicPlan({ lifecycle: 'feature', status: 'discard-ready', changes: [change('C-1', [unit('U-1.1', { kind: 'tests', state: 'accepted' })], { accepted: true })] })
    const second = await run({ args: { record: 'r.implementation.md' }, plan: accepted })
    assert.equal(second.out.stopKind, 'done')
    assert.deepEqual(second.labels, ['resume', 'close'])
  })
})
