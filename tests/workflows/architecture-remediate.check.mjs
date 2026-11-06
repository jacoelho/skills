import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

// Run with: node --test tests/workflows/
// Not part of `claude plugin test`: its runner imports files as modules, and a workflow script
// (top-level `return`) is not one.
// Drives workflows/architecture-remediate.js with scripted agents: these tests check the control
// flow (which agents run, on what, in which order), not the quality of any agent's output.

const SOURCE = readFileSync(new URL('../../workflows/architecture-remediate.js', import.meta.url), 'utf8').replace('export const meta', 'const meta')
const KNOWN_AGENT_TYPES = ['jacoelho:consultant', 'jacoelho:critic', 'jacoelho:programming-go-performance']


const finding = (id, severity = 'High') => ({ id, severity, title: id, classification: 'confirmed', location: 'a.go:1', evidence: 'e', impact: 'i', recommendation: 'r' })
const item = (id, o = {}) => ({
  id, title: id, findingIds: [id], disposition: 'fix-code', authorityAnalysis: '', owner: 'o', change: 'c', files: [`${id}.go`], tests: 't',
  needsApiDesign: false, hotPath: false, changesTests: false, contractRisk: false, dependsOn: [], ...o,
})


async function run(s) {
  const calls = []
  let reviews = 0
  let spent = 0
  const budget = { total: s.budgetTotal ?? null, spent: () => spent, remaining: () => (s.budgetTotal ? Math.max(0, s.budgetTotal - spent) : Infinity) }
  const agent = async (prompt, o) => {
    const L = o.label
    calls.push({ label: L, prompt, agentType: o.agentType, model: o.model })
    spent += 10000
    if (s.nullLabel && s.nullLabel.test(L)) return null
    if (s.throwLabel && s.throwLabel.test(L)) throw new Error('token budget exhausted')
    if (o.agentType && !KNOWN_AGENT_TYPES.includes(o.agentType)) throw new Error(`unknown agent ${o.agentType}`)
    if (L.includes(': scope')) {
      reviews++
      const g = reviews === 1 ? (s.groups ?? 1) : 1
      const findings = reviews <= (s.blockingReviews ?? 1) ? (s.findings ?? []) : []
      return { standard: 's', allBoundaries: ['b'], groups: Array.from({ length: g }, (_, i) => ({ name: `g${i}`, boundaries: ['b'] })), report: g === 1 ? { findings, coverage: [] } : undefined }
    }
    if (L.includes(': merge')) return { findings: s.findings ?? [], coverage: [] }
    if (L.startsWith('review')) return { findings: [], coverage: [] }
    if (L.startsWith('plan')) return { items: s.items ?? [], summary: 'sum' }
    if (L.startsWith('revise')) return { items: s.reviseItems ?? s.items ?? [], summary: 'sum2' }
    if (L.startsWith('consult')) {
      const block = L.includes('.1 ') && s.blockLabel !== undefined && L.includes(s.blockLabel)
      return { approve: !block, blocking: block ? [{ item: s.blockItem ?? 'x1', issue: 'i', evidence: 'e', fix: 'f' }] : [] }
    }
    if (L.startsWith('impl')) return { items: L.slice(5).split(', ').map((id) => ({ id, status: s.implStatus?.[id] ?? 'done', summary: 'ok' })) }
    if (s.verifyFail && s.verifyFail.test(L)) return { passed: false, failures: ['pkg/x: TestY failed'], summary: 'fail' }
    if (L.startsWith('verify')) return s.verifyLies ? { passed: true, failures: ['pkg/x: TestY failed'], summary: 'ok?' } : { passed: true, failures: [], summary: 'ok' }
    if (L.startsWith('critic r')) return { material: s.criticMaterial && L.endsWith('.1') ? ['m1'] : [] }
    return {}
  }
  const parallel = (ts) => Promise.all(ts.map((t) => t().catch(() => null)))
  const main = new Function('args', 'agent', 'parallel', 'phase', 'log', 'budget', `return (async () => {${SOURCE}\n})()`)
  const out = await main('args' in s ? s.args : { scope: 'repo' }, agent, parallel, () => {}, () => {}, budget)
  const labels = calls.map((c) => c.label)
  const planOf = (label) => calls.find((c) => c.label === label).prompt.split('Plan: ')[1].split('\n')[0]
  return { out, calls, labels, planOf }
}

const count = (labels, re) => labels.filter((l) => re.test(l)).length

describe('options', () => {
  test('help lists every option and starts no agent', async () => {
    const { out, calls } = await run({ args: 'help' })
    assert.equal(calls.length, 0)
    assert.equal(out.started, false)
    assert.ok(Object.keys(out.usage).includes('instructions'))
  })
  test('a bare invocation starts nothing and asks for a scope', async () => {
    for (const args of [undefined, '', {}, { instructions: 'x' }]) {
      const { out, calls } = await run({ args })
      assert.equal(calls.length, 0)
      assert.equal(out.reason, 'no-scope')
    }
  })
  test('an unknown option starts nothing and names it', async () => {
    const { out, calls } = await run({ args: { scope: 'x', advisors: 2 } })
    assert.equal(calls.length, 0)
    assert.deepEqual(out.unknown, ['advisors'])
  })
  test('args given as JSON text are parsed, not taken as the scope', async () => {
    const { calls } = await run({ args: '{"scope": "internal/billing", "instructions": "KEEP-V1"}' })
    assert.ok(calls[0].prompt.includes('args "internal/billing"'))
    assert.ok(calls[0].prompt.includes('KEEP-V1'))
  })
  test('a value that would break the skill invocation is refused', async () => {
    for (const args of [{ scope: 'a "quoted" scope' }, { scope: 'x', followUpScope: 'line1\nline2' }, { scope: 'x', baseRef: 'm"ain' }]) {
      const { out, calls } = await run({ args })
      assert.equal(calls.length, 0)
      assert.equal(out.reason, 'bad-scope')
    }
  })
  test('JSON-looking text that does not parse is refused', async () => {
    const { out, calls } = await run({ args: '{scope: internal/billing}' })
    assert.equal(calls.length, 0)
    assert.equal(out.reason, 'bad-args')
  })
  test('a bare string is the scope', async () => {
    const { calls } = await run({ args: 'internal/billing' })
    assert.ok(calls[0].prompt.includes('internal/billing'))
  })
  test('instructions reach every stage that judges or edits', async () => {
    const mark = 'KEEP-THE-V1-WIRE-FORMAT'
    const { calls, labels } = await run({
      args: { scope: 'repo', instructions: mark }, groups: 3, findings: [finding('x1')],
      items: [item('x1', { contractRisk: true, changesTests: true, needsApiDesign: true })], blockLabel: '#1 ',
      verifyFail: /^verify r1\.1$/, criticMaterial: true, // so the verify-fix and critic-fix agents run too
    })
    assert.ok(labels.some((l) => l.startsWith('fix r1')) && labels.some((l) => l.startsWith('critic-fix')))
    assert.deepEqual(calls.filter((c) => !/^verify|^perf/.test(c.label) && !c.prompt.includes(mark)).map((c) => c.label), [])
  })
})

describe('review', () => {
  test('one group: the scoping agent reviews alone', async () => {
    const { labels } = await run({ findings: [finding('x1')], items: [item('x1')] })
    assert.equal(count(labels, /^review r1: /), 1)
  })
  test('several groups: parallel reviewers then a merge; the follow-up is reviewed alone', async () => {
    const { labels } = await run({ groups: 3, findings: [finding('x1')], items: [item('x1')] })
    assert.equal(count(labels, /^review r1: g/), 3)
    assert.equal(count(labels, /: merge$/), 1)
    assert.equal(count(labels, /^review r2: /), 1)
  })
  test('only Low findings stop the run without planning', async () => {
    const { out, labels } = await run({ findings: [finding('x1', 'Low')] })
    assert.equal(count(labels, /^plan/), 0)
    assert.ok(out.stopReason.includes('only Low'))
  })
})

describe('consult', () => {
  test('low-risk plan: one consultant holding all lenses, no revise', async () => {
    const { labels } = await run({ findings: [finding('x1')], items: [item('x1'), item('x2')] })
    assert.deepEqual(labels.filter((l) => l.startsWith('consult')), ['consult r1.1 #1 all-lenses'])
    assert.equal(count(labels, /^revise/), 0)
  })
  test('risky plan: three consultants plus QA and API review, all known agent types', async () => {
    const { labels, calls } = await run({ findings: [finding('x1')], items: [item('x1', { contractRisk: true, changesTests: true, needsApiDesign: true })] })
    assert.equal(count(labels, /^consult r1\.1 #/), 3)
    assert.ok(labels.includes('consult r1.1 qa-tests'))
    assert.ok(labels.includes('consult r1.1 api-design'))
    assert.equal(calls.filter((c) => c.label.startsWith('consult r1.1 #')).every((c) => c.agentType === 'jacoelho:consultant'), true)
    assert.equal(count(labels, /^revise/), 1) // folds the specialists' specs even with no blocker
  })
  test('revise edits the plan without redoing the research', async () => {
    const { calls } = await run({ findings: [finding('x1')], items: [item('x1', { contractRisk: true })], blockLabel: '#1 ' })
    assert.ok(!calls.find((c) => c.label.startsWith('revise')).prompt.includes("Read the repository's agent instructions"))
  })
  test('pass 2: only the blocking consultant re-checks its item and every item revision changed', async () => {
    const { labels, planOf } = await run({
      findings: [finding('x1')],
      items: [item('x1', { contractRisk: true }), item('x2')],
      reviseItems: [item('x1', { contractRisk: true, change: 'c2' }), item('x2'), item('x9')],
      blockLabel: '#1 ', blockItem: 'x1',
    })
    const pass2 = labels.filter((l) => l.startsWith('consult r1.2'))
    assert.deepEqual(pass2, ['consult r1.2 #1 design-skeptic'])
    const plan = planOf(pass2[0])
    assert.ok(plan.includes('"id":"x1"'))
    assert.ok(plan.includes('"id":"x9"'))
    assert.ok(!plan.includes('"id":"x2"'))
  })
  test('pass 2: a QA blocker is re-checked by QA', async () => {
    const { labels } = await run({ findings: [finding('x1')], items: [item('x1', { changesTests: true })], blockLabel: 'qa-tests' })
    assert.ok(labels.includes('consult r1.2 qa-tests'))
  })
  test('pass 2: a plan that revision made risky gets the full panel', async () => {
    const { labels } = await run({ findings: [finding('x1')], items: [item('x1')], reviseItems: [item('x1', { contractRisk: true })], blockLabel: 'all-lenses' })
    assert.equal(count(labels, /^consult r1\.2 #/), 3)
  })
})

describe('implement', () => {
  test('linked items share an implementer, capped at batchSize, rejected items skipped', async () => {
    const { labels } = await run({
      findings: [finding('x1')],
      items: [item('x1'), item('x2', { dependsOn: ['x1'] }), item('x3', { files: ['x1.go'] }), item('x4', { files: ['x1.go'] }), item('x5'), item('x6', { disposition: 'reject' })],
    })
    assert.deepEqual(labels.filter((l) => l.startsWith('impl')), ['impl x1, x2, x3', 'impl x4', 'impl x5'])
  })
  test('an unfinished item skips its dependents in later batches', async () => {
    const { labels } = await run({
      findings: [finding('a')],
      items: [item('a'), item('b', { dependsOn: ['a'] }), item('c', { dependsOn: ['b'] }), item('d', { dependsOn: ['c'] }), item('e', { dependsOn: ['a'] })],
      implStatus: { c: 'blocked' },
    })
    assert.deepEqual(labels.filter((l) => l.startsWith('impl')), ['impl a, b, c', 'impl e'])
  })
  test('a hot-path item triggers one benchmark run', async () => {
    const { labels } = await run({ findings: [finding('x1')], items: [item('x1', { hotPath: true }), item('x2', { hotPath: true })] })
    assert.equal(count(labels, /^perf/), 1)
  })
})

describe('failures are reported, never read as success', () => {
  test('a critic with no result is an unresolved finding, not a clean review', async () => {
    const { out } = await run({ findings: [finding('x1')], items: [item('x1')], nullLabel: /^critic/ })
    assert.equal(out.unresolvedCritic.length, 1)
    assert.ok(out.next.includes('Unresolved critic findings'))
  })
  test('a verify run that lists failures has not passed', async () => {
    const { out, labels } = await run({ findings: [finding('x1')], items: [item('x1')], verifyLies: true })
    assert.ok(labels.some((l) => l.startsWith('fix r1')))
    assert.ok(out.stopReason.startsWith('verification failing'))
    assert.ok(out.next.includes('Do not commit'))
  })
  test('a review group with no result is passed to the merge as uninspected', async () => {
    const { calls } = await run({ groups: 3, findings: [finding('x1')], items: [item('x1')], nullLabel: /^review r1: g1$/ })
    assert.ok(calls.find((c) => c.label.endsWith(': merge')).prompt.includes('returned no result'))
  })
  test('a consultant with no result is reported', async () => {
    const { out } = await run({ findings: [finding('x1')], items: [item('x1')], nullLabel: /^consult r1\.1 #1/ })
    assert.equal(out.consultMissing.length, 1)
  })
  test('the token budget stops the run before a round it cannot cover', async () => {
    const { out, labels } = await run({ findings: [finding('x1')], items: [item('x1')], blockingReviews: 9, budgetTotal: 120000 })
    assert.equal(count(labels, /^plan/), 1)
    assert.ok(out.stopReason.startsWith('token budget'))
  })
})

describe('the result says what the working tree holds', () => {
  test('a first review with only Low findings: nothing changed', async () => {
    const { out } = await run({ findings: [finding('x1', 'Low')] })
    assert.equal(out.tree, 'untouched')
    assert.ok(out.next.startsWith('Nothing was changed'))
  })
  test('verification failing after the critic fixes stops the run as failing', async () => {
    const { out, labels } = await run({ findings: [finding('x1')], items: [item('x1')], blockingReviews: 9, criticMaterial: true, verifyFail: /^verify r1c1/ })
    assert.equal(out.tree, 'failing')
    assert.equal(count(labels, /^plan/), 1)
    assert.ok(out.next.includes('Do not commit'))
    assert.equal(out.history.at(-1).verify.afterCriticFixes, true)
  })
  test('a review with dead groups cannot stop the run as clean', async () => {
    const { out } = await run({ groups: 3, findings: [], nullLabel: /^review r1: g1$/ })
    assert.ok(out.stopReason.startsWith('review r1 incomplete'))
    assert.equal(out.reviewMissing.length, 1)
  })
  test('a dead plan agent after edits in round 1 still returns the report', async () => {
    let plans = 0
    const { out } = await run({ findings: [finding('x1')], items: [item('x1')], blockingReviews: 9, nullLabel: { test: (l) => l.startsWith('plan') && ++plans === 2 } })
    assert.equal(out.started, true)
    assert.ok(out.stopReason.startsWith('error: planning failed'))
    assert.equal(out.tree, 'verified') // round 1's verified edits, reported, not lost
    assert.equal(out.history.filter((h) => h.round).length, 1)
  })
  test('a throw mid-implementation reports the tree as unverified', async () => {
    const { out } = await run({ findings: [finding('x1')], items: [item('x1'), item('x2')], throwLabel: /^impl x2/ })
    assert.equal(out.tree, 'unverified')
    assert.ok(out.stopReason.startsWith('error: token budget exhausted'))
    assert.ok(out.next.includes('UNVERIFIED'))
  })
  test('a verify agent with no result leaves the tree failing, not verified', async () => {
    const { out } = await run({ findings: [finding('x1')], items: [item('x1')], nullLabel: /^verify/ })
    assert.equal(out.tree, 'failing')
  })
})

describe('review only', () => {
  test('the Scope agent gets a selection budget of eight per review agent', async () => {
    const { calls } = await run({ args: { scope: 'repo', reviewOnly: true, reviewers: 4 }, findings: [] })
    assert.ok(calls[0].prompt.includes('selection budget is 32 boundaries'))
  })
  test('a review with dead groups is reported incomplete, not as a finished review', async () => {
    const { out } = await run({ args: { scope: 'repo', reviewOnly: true }, groups: 3, findings: [finding('x1')], nullLabel: /^review r1: g1$/ })
    assert.ok(out.stopReason.startsWith('review r1 incomplete'))
    assert.ok(out.next.includes('not fully reviewed'))
  })
  test('an option of the wrong type is refused, never read as its default', async () => {
    for (const args of [{ scope: 'repo', reviewOnly: 'true' }, { scope: 'repo', reviewers: '3' }, { scope: 7 }]) {
      const { out, calls } = await run({ args })
      assert.equal(calls.length, 0)
      assert.equal(out.reason, 'bad-option-type')
    }
  })
  test('reviews once, plans and edits nothing, and leaves the tree untouched', async () => {
    const { out, labels } = await run({ args: { scope: 'repo', reviewOnly: true }, groups: 3, findings: [finding('x1')], items: [item('x1')] })
    assert.deepEqual(labels, ['review r1: scope', 'review r1: g0', 'review r1: g1', 'review r1: g2', 'review r1: merge'])
    assert.equal(out.tree, 'untouched')
    assert.equal(out.finalFindings.length, 1)
  })
  test('agents get skill roles by name, not step numbers', async () => {
    const { calls } = await run({ args: { scope: 'repo', reviewOnly: true }, groups: 2, findings: [finding('x1')] })
    const roles = calls.map((c) => (c.prompt.match(/YOUR ROLE: \*\*([A-Za-z ]+)\*\*/) || [])[1])
    assert.deepEqual(roles, ['Scope', 'Group review', 'Group review', 'Merge'])
    assert.ok(calls.every((c) => !/Parallel review|--agents|steps? \d/.test(c.prompt)))
  })
  test('round 1 does not call the existing branch diff remediation', async () => {
    const { calls } = await run({ findings: [finding('x1')], items: [item('x1')] })
    assert.ok(!calls[0].prompt.includes('remediation from earlier rounds'))
    assert.ok(calls.find((c) => c.label === 'review r2: scope').prompt.includes('remediation from earlier rounds'))
  })
})
