import { readFileSync } from 'node:fs'
import { describe, test } from 'node:test'
import assert from 'node:assert/strict'

// Run with: node --test tests/workflows/*.check.mjs (a bare directory matches no file: Node does not
// discover the .check.mjs suffix, and reports 0 tests as success).
// Not part of `claude plugin test`: its runner imports files as modules, and a workflow script
// (top-level `return`) is not one.
// Drives workflows/architecture-remediate.js with scripted agents: these tests check the control
// flow (which agents run, on what, in which order), not the quality of any agent's output.

const SOURCE = readFileSync(new URL('../../workflows/architecture-remediate.js', import.meta.url), 'utf8').replace('export const meta', 'const meta')
const KNOWN_AGENT_TYPES = ['jacoelho:consultant', 'jacoelho:critic', 'jacoelho:programming-go-performance']


const finding = (id, severity = 'High') => ({ id, severity, title: id, classification: 'confirmed', location: 'a.go:1', evidence: 'e', impact: 'i', recommendation: 'r' })
const item = (id, o = {}) => ({
  id, title: id, findingIds: [id], disposition: 'fix-code', authorityAnalysis: '', owner: 'o', change: 'c', files: [`${id}.go`], tests: 't',
  needsApiDesign: false, hotPath: false, changesTests: false, contractRisk: false, dependsOn: [],
  acceptance: [{ findingId: id, command: `go test -run '^Test_${id}$' ./...`, proves: 'p' }], ...o,
})


// What the fake charges per agent call; budget tests derive their thresholds from it.
const CALL_COST = 10000

async function run(s) {
  const calls = []
  let reviews = 0
  let spent = 0
  const budget = { total: s.budgetTotal ?? null, spent: () => spent, remaining: () => (s.budgetTotal ? Math.max(0, s.budgetTotal - spent) : Infinity) }
  const agent = async (prompt, o) => {
    const L = o.label
    calls.push({ label: L, prompt, agentType: o.agentType, model: o.model })
    spent += CALL_COST
    if (s.nullLabel && s.nullLabel.test(L)) return null
    if (s.throwLabel && s.throwLabel.test(L)) throw new Error('token budget exhausted')
    if (o.agentType && !KNOWN_AGENT_TYPES.includes(o.agentType)) throw new Error(`unknown agent ${o.agentType}`)
    if (L.includes(': scope')) {
      reviews++
      const g = reviews === 1 ? (s.groups ?? 1) : 1
      const findings = s.reviewFindings ? s.reviewFindings(reviews) : reviews <= (s.blockingReviews ?? 1) ? (s.findings ?? []) : []
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
    if (s.verifyFail && s.verifyFail.test(L)) return { commands: [{ command: 'make test', exitCode: 2 }], failures: ['pkg/x: TestY failed'], summary: 'fail' }
    if (L.startsWith('verify')) return s.verifyRun ?? { commands: [{ command: 'make test', exitCode: 0 }], failures: [], summary: 'ok' }
    if (L.startsWith('snapshot')) return 'snapshot' in s ? s.snapshot : { sha: 'a'.repeat(40) }
    // Default: every declared check fails before and passes after. s.accept(check) overrides per check.
    if (L.startsWith('accept')) {
      if (s.nullAccept) return null
      const checks = JSON.parse(prompt.split('\nChecks: ')[1])
      return { checks: checks.map((c) => ({ ...c, afterExit: 0, beforeExit: 1, matched: true, beforeFailure: 'assertion', ...(s.accept ? s.accept(c, L) : {}) })) }
    }
    if (L.startsWith('perf')) return 'perf' in s ? s.perf : { measured: true, regressions: [], summary: 'No regression.' }
    if (L.startsWith('critic r')) return { material: s.criticAlways || (s.criticMaterial && L.endsWith('.1')) ? ['m1'] : [] }
    if (L.startsWith('fix') || L.startsWith('critic-fix')) return { status: 'done', summary: `fixed by ${L}. Details.` }
    return {}
  }
  const parallel = (ts) => Promise.all(ts.map((t) => t().catch(() => null)))
  const main = new Function('args', 'agent', 'parallel', 'phase', 'log', 'budget', `return (async () => {${SOURCE}\n})()`)
  const logs = []
  const out = await main('args' in s ? s.args : { scope: 'repo', autoApprove: true }, agent, parallel, () => {}, (m) => logs.push(m), budget)
  const labels = calls.map((c) => c.label)
  const planOf = (label) => calls.find((c) => c.label === label).prompt.split('Plan: ')[1].split('\n')[0]
  return { out, calls, labels, planOf, logs }
}

// history interleaves review entries; this is the last remediation round's record.
const lastRound = (out) => out.history.filter((h) => h.round).at(-1)
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
      args: { scope: 'repo', instructions: mark, autoApprove: true }, groups: 3, findings: [finding('x1')],
      items: [item('x1', { contractRisk: true, changesTests: true, needsApiDesign: true })], blockLabel: '#1 ',
      verifyFail: /^verify r1\.1$/, criticMaterial: true, // so the verify-fix and critic-fix agents run too
    })
    assert.ok(labels.some((l) => l.startsWith('fix r1')) && labels.some((l) => l.startsWith('critic-fix')))
    assert.deepEqual(calls.filter((c) => !/^verify|^perf|^snapshot|^accept/.test(c.label) && !c.prompt.includes(mark)).map((c) => c.label), [])
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
    assert.equal(out.stopKind, 'clean')
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
  test('a hot-path item triggers one benchmark run, and the critic gets its result', async () => {
    const perf = { measured: true, regressions: [{ item: 'x2', benchmark: 'BenchmarkHot-8', delta: '+12% sec/op' }], summary: 'One regression.' }
    const { labels, calls, out } = await run({ findings: [finding('x1')], items: [item('x1', { hotPath: true }), item('x2', { hotPath: true })], perf })
    assert.equal(count(labels, /^perf/), 1)
    assert.ok(calls.find((c) => c.label === 'critic r1.1').prompt.includes('BenchmarkHot-8'))
    assert.deepEqual(out.unmeasured, [])
  })
  test('no hot-path item: no benchmark run, and the critic is told there is none', async () => {
    const { labels, calls } = await run({ findings: [finding('x1')], items: [item('x1')] })
    assert.equal(count(labels, /^perf/), 0)
    assert.ok(calls.find((c) => c.label === 'critic r1.1').prompt.includes('no item is on a hot path'))
  })
})

describe('verification', () => {
  // Seen in a real run: the verify agent listed a skipped conditional benchstat check as a failure,
  // and the fix agent spent 2h49m re-running every benchmark to change nothing.
  test('checks not run do not fail verification, whatever the agent puts in failures', async () => {
    const verifyRun = { commands: [{ command: 'make test', exitCode: 0 }], failures: ['Not run: benchstat comparison'], notRun: ['benchstat: perf step owns it'], summary: 'ok' }
    const { out, labels } = await run({ findings: [finding('x1')], items: [item('x1')], verifyRun })
    assert.equal(count(labels, /^fix /), 0)
    assert.equal(out.tree, 'verified')
    assert.deepEqual(lastRound(out).verify.notRun, ['benchstat: perf step owns it'])
  })
})

describe('progress and outcomes surface', () => {
  test('fix outcomes are kept in history and each stage logs one line', async () => {
    const { out, logs } = await run({
      findings: [finding('x1')], items: [item('x1', { hotPath: true })], blockingReviews: 1,
      verifyFail: /^verify r1\.1$/, criticMaterial: true,
    })
    assert.deepEqual(lastRound(out).fixes.map((f) => [f.label, f.status]), [['fix r1.1', 'done'], ['critic-fix r1.1', 'done']])
    for (const line of ['perf r1: 0 regression(s)', 'verify r1.1: FAILED: make test (exit 2)', 'fix r1.1: done: fixed by fix r1.1.', 'critic r1.1: 1 material, 0 minor: m1', 'critic-fix r1.1: done']) {
      assert.ok(logs.some((l) => l.startsWith(line)), `no log line starting ${JSON.stringify(line)} in ${JSON.stringify(logs)}`)
    }
  })
})

describe('failures are reported, never read as success', () => {
  test('a critic with no result is an unresolved finding, not a clean review', async () => {
    const { out } = await run({ findings: [finding('x1')], items: [item('x1')], nullLabel: /^critic/ })
    assert.equal(out.unresolvedCritic.length, 1)
    assert.ok(out.next.includes('Unresolved critic findings'))
  })
  test('a non-zero exit fails verification even when the agent lists no failures', async () => {
    const verifyRun = { commands: [{ command: 'make test', exitCode: 0 }, { command: 'make lint', exitCode: 1 }], failures: [], summary: 'all good' }
    const { out, labels } = await run({ findings: [finding('x1')], items: [item('x1')], verifyRun })
    assert.ok(labels.some((l) => l.startsWith('fix r1')))
    assert.equal(out.stopKind, 'verify-failing')
    assert.ok(out.stopReason.startsWith('verification failing'))
    assert.ok(out.next.includes('Do not commit'))
    // Every stop explains itself: this one once fell through to no reason at all.
    assert.ok(out.next.includes('Verification still fails after round 1'))
  })
  test('a verify run reporting no commands has not passed', async () => {
    const { out } = await run({ findings: [finding('x1')], items: [item('x1')], verifyRun: { commands: [], failures: [], summary: 'nothing to run' } })
    assert.equal(out.tree, 'failing')
  })
  test('an unmeasured hot-path round is surfaced, whether the perf agent died or returned early', async () => {
    for (const perf of [null, { measured: false, regressions: [], summary: 'Waiting for the benchmark run to finish.' }]) {
      const { out } = await run({ findings: [finding('x1')], items: [item('x1', { hotPath: true })], perf })
      assert.deepEqual(out.unmeasured, [1], `perf=${JSON.stringify(perf)}`)
      assert.ok(out.next.includes('no benchmark comparison'))
      assert.equal(lastRound(out).perf.measured, false)
    }
  })
  test('a review group with no result is passed to the merge as uninspected', async () => {
    const { calls } = await run({ groups: 3, findings: [finding('x1')], items: [item('x1')], nullLabel: /^review r1: g1$/ })
    assert.ok(calls.find((c) => c.label.endsWith(': merge')).prompt.includes('returned no result'))
  })
  test('a consultant with no result is reported', async () => {
    const { out } = await run({ findings: [finding('x1')], items: [item('x1')], nullLabel: /^consult r1\.1 #1/ })
    assert.equal(out.consultMissing.length, 1)
  })
  test('maxRounds stops with the blocking findings left and says what to do', async () => {
    const { out, labels } = await run({ args: { scope: 'repo', maxRounds: 1, autoApprove: true }, findings: [finding('x1')], items: [item('x1')], blockingReviews: 9 })
    assert.equal(count(labels, /^plan/), 1)
    assert.equal(out.stopKind, 'max-rounds')
    assert.ok(out.stopReason.startsWith('maxRounds (1) reached'))
    assert.ok(out.next.includes('Blocking findings remain'))
    // The script can read no clock and no token total, so it asks the caller for the harness's figures.
    assert.ok(out.next.includes('usage block'))
    assert.equal(out.cost.rounds, out.history.filter((h) => h.round).length)
    assert.equal(out.cost.reviews, out.history.filter((h) => h.review).length)
    assert.ok(out.cost.outputTokens > 0)
  })
  test('the token budget stops the run before a round it cannot cover', async () => {
    const { out, labels } = await run({ findings: [finding('x1')], items: [item('x1')], blockingReviews: 9, budgetTotal: 120000 })
    assert.equal(count(labels, /^plan/), 1)
    assert.equal(out.stopKind, 'budget')
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
    assert.equal(out.stopKind, 'review-incomplete')
    assert.ok(out.stopReason.startsWith('review r1 incomplete'))
    assert.equal(out.reviewMissing.length, 1)
  })
  test('a dead plan agent after edits in round 1 still returns the report', async () => {
    let plans = 0
    const { out } = await run({ findings: [finding('x1')], items: [item('x1')], blockingReviews: 9, nullLabel: { test: (l) => l.startsWith('plan') && ++plans === 2 } })
    assert.equal(out.started, true)
    assert.equal(out.stopKind, 'error')
    assert.ok(out.stopReason.startsWith('error: planning failed'))
    assert.ok(out.next.includes('The run failed: planning failed'))
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
    assert.equal(out.stopKind, 'review-incomplete')
    assert.ok(out.stopReason.startsWith('review r1 incomplete'))
    assert.ok(out.next.includes('not fully reviewed'))
  })
  test('a count outside its range is refused before any agent starts', async () => {
    // batchSize 0 never advances the batching loop; consultants 0 skips review of a risky plan.
    for (const args of [{ scope: 'repo', batchSize: 0 }, { scope: 'repo', reviewers: 0 }, { scope: 'repo', reviewers: 9 }, { scope: 'repo', consultants: 0 }, { scope: 'repo', dryRounds: 0 }]) {
      const { out, calls } = await run({ args })
      assert.equal(calls.length, 0, JSON.stringify(args))
      assert.equal(out.reason, 'bad-option-type', JSON.stringify(args))
    }
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
    assert.equal(out.stopKind, 'review-only')
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
  })
})

describe('plan checkpoint', () => {
  test('by default the run stops after the round-1 plan and edits nothing', async () => {
    const { out, labels } = await run({ args: { scope: 'repo' }, findings: [finding('x1')], items: [item('x1')] })
    assert.equal(out.stopKind, 'plan-ready')
    assert.equal(out.tree, 'untouched')
    assert.equal(count(labels, /^snapshot|^impl|^verify|^critic/), 0)
    assert.deepEqual(out.checkpoint.plan.items.map((it) => it.id), ['x1'])
    assert.deepEqual(out.checkpoint.findings.map((f) => f.id), ['x1'])
    assert.ok(out.next.includes('approvedPlan'))
  })
  test('an approved checkpoint is implemented as given, without re-reviewing or re-planning round 1', async () => {
    const first = await run({ args: { scope: 'repo' }, findings: [finding('x1')], items: [item('x1')] })
    const edited = { ...first.out.checkpoint, plan: { ...first.out.checkpoint.plan, items: [item('x1', { title: 'USER-EDITED' })] } }
    const { out, labels, calls } = await run({ args: { scope: 'repo', approvedPlan: edited }, findings: [finding('x1')], items: [item('x1')] })
    assert.equal(count(labels, /^review r1|^plan r1|^consult r1/), 0)
    assert.ok(calls.find((c) => c.label.startsWith('impl x1')).prompt.includes('USER-EDITED'))
    assert.equal(out.stopKind, 'clean')
    assert.equal(out.tree, 'verified')
  })
  test('a malformed approved plan is refused before any agent runs', async () => {
    const bad = { findings: [finding('x1')], plan: { items: [item('x1', { findingIds: ['nope'], acceptance: 'x' })] } }
    const { out, calls } = await run({ args: { scope: 'repo', approvedPlan: bad } })
    assert.equal(calls.length, 0)
    assert.equal(out.reason, 'bad-approved-plan')
    assert.ok(out.problems.some((p) => p.includes('findingIds')) && out.problems.some((p) => p.includes('acceptance')))
  })
})

describe('acceptance decides whether a finding is fixed', () => {
  test('a check that fails before and passes after resolves its finding, and the run stops clean', async () => {
    const { out } = await run({ findings: [finding('x1')], items: [item('x1')] })
    assert.equal(out.ledger.find((e) => e.findingId === 'x1').status, 'resolved')
    assert.deepEqual(out.unresolvedFindings, [])
    assert.equal(out.stopKind, 'clean')
  })
  for (const [why, accept] of [
    ['passes before the fix', { beforeExit: 0 }],
    ['fails after the fix', { afterExit: 1 }],
    ['selected no test', { matched: false }],
  ]) {
    test(`a check that ${why} leaves the finding open, and it is re-planned though the review no longer raises it`, async () => {
      const { out, calls } = await run({ findings: [finding('x1')], items: [item('x1')], blockingReviews: 1, accept: (c, L) => (L === 'accept r1' ? accept : {}) })
      const plan2 = calls.find((c) => c.label === 'plan r2')
      assert.ok(plan2, 'round 2 planned the carried finding')
      assert.ok(plan2.prompt.includes('"id":"x1"'))
      assert.equal(out.ledger.find((e) => e.findingId === 'x1').status, 'resolved') // round 2's check passed
    })
  }
  test('an item with no check, or a dead acceptance agent, proves nothing', async () => {
    for (const s of [{ items: [item('x1', { acceptance: [] })] }, { items: [item('x1')], nullAccept: true }]) {
      const { out } = await run({ findings: [finding('x1')], args: { scope: 'repo', maxRounds: 1, autoApprove: true }, ...s })
      assert.equal(out.stopKind, 'max-rounds')
      assert.deepEqual(out.unresolvedFindings.map((e) => e.findingId), ['x1'])
      assert.deepEqual(out.remainingBlocking.map((f) => f.id), ['x1'])
    }
  })
  test('a rejected finding needs no check and is not carried', async () => {
    const { out } = await run({ findings: [finding('x1')], items: [item('x1', { disposition: 'reject', acceptance: [] })] })
    assert.equal(out.ledger.find((e) => e.findingId === 'x1').status, 'rejected')
    assert.equal(out.stopKind, 'clean')
  })
  test('the follow-up review sees which findings were proven fixed', async () => {
    const { calls } = await run({ findings: [finding('x1')], items: [item('x1')] })
    assert.ok(calls.find((c) => c.label === 'review r2: scope').prompt.includes('"status":"resolved"'))
  })
  test('checks run against the pre-round snapshot, and a snapshot without a commit id stops the run', async () => {
    const ok = await run({ findings: [finding('x1')], items: [item('x1', { hotPath: true })] })
    for (const L of ['accept r1', 'perf r1', 'critic r1.1']) assert.ok(ok.calls.find((c) => c.label === L).prompt.includes('a'.repeat(40)), L)
    const bad = await run({ findings: [finding('x1')], items: [item('x1')], snapshot: { sha: 'HEAD' } })
    assert.equal(bad.out.stopKind, 'error')
    assert.equal(count(bad.labels, /^impl/), 0)
  })
})

describe('critic', () => {
  test('the last critic fix is reviewed, and what that pass finds stays unresolved', async () => {
    const { out, labels } = await run({ findings: [finding('x1')], items: [item('x1')], criticAlways: true })
    assert.deepEqual(labels.filter((l) => l.startsWith('critic')), ['critic r1.1', 'critic-fix r1.1', 'critic r1.2', 'critic-fix r1.2', 'critic r1.3'])
    assert.ok(out.unresolvedCritic.length > 0)
  })
})


describe('critic review regressions', () => {
  test('a critic fix that repairs failing verification leaves the tree verified', async () => {
    // The round's own verification fails all three attempts; the critic fix makes it pass.
    const { out } = await run({ findings: [finding('x1')], items: [item('x1')], verifyFail: /^verify r1\.\d$/, criticMaterial: true, args: { scope: 'repo', maxRounds: 1, autoApprove: true } })
    assert.equal(out.tree, 'verified')
    assert.equal(lastRound(out).verify.afterCriticFixes, true)
    assert.equal(out.ledger.find((e) => e.findingId === 'x1').status, 'resolved')
  })
  test('a round that stops before acceptance keeps its findings open in both result lists', async () => {
    const { out } = await run({ findings: [finding('x1')], items: [item('x1')], verifyFail: /^verify /, args: { scope: 'repo', maxRounds: 1, autoApprove: true } })
    assert.equal(out.stopKind, 'verify-failing')
    assert.deepEqual(out.unresolvedFindings.map((e) => e.findingId), ['x1'])
    assert.deepEqual(out.remainingBlocking.map((f) => f.id), ['x1'])
  })
  test('a blocking finding the planner left out stays open', async () => {
    const { out, logs } = await run({ findings: [finding('x1'), finding('x2')], items: [item('x1')], args: { scope: 'repo', maxRounds: 1, autoApprove: true } })
    assert.deepEqual(out.unresolvedFindings.map((e) => e.findingId), ['x2'])
    assert.equal(out.stopKind, 'max-rounds')
    assert.ok(logs.some((l) => l.includes('no item for x2')))
  })
  test('a Low finding fixed alongside a blocking one needs no check', async () => {
    const { out } = await run({ findings: [finding('x1'), finding('l1', 'Low')], items: [item('x1', { findingIds: ['x1', 'l1'] })] })
    assert.equal(out.ledger.find((e) => e.findingId === 'l1').status, 'unchecked')
    assert.deepEqual(out.unresolvedFindings, [])
  })
  test('a check proven only by a build failure on the old tree is called out', async () => {
    const { out } = await run({ findings: [finding('x1')], items: [item('x1')], accept: () => ({ beforeFailure: 'build' }) })
    assert.deepEqual(out.weakFindings, ['x1'])
    assert.ok(out.next.includes('did not build on the old tree'))
  })
  test('conflicting or contradictory approved plans are refused', async () => {
    const cp = { findings: [finding('x1')], plan: { items: [item('x1')] } }
    const both = await run({ args: { scope: 'repo', reviewOnly: true, approvedPlan: cp } })
    assert.equal(both.out.reason, 'conflicting-options')
    const dup = await run({ args: { scope: 'repo', approvedPlan: { ...cp, plan: { items: [item('x1'), item('x1', { disposition: 'reject' })] } } } })
    assert.equal(dup.out.reason, 'bad-approved-plan')
    assert.ok(dup.out.problems.some((p) => p.includes('used twice')) && dup.out.problems.some((p) => p.includes('both rejected and fixed')))
    assert.equal(both.calls.length + dup.calls.length, 0)
  })
  test('an incomplete review is carried into the checkpoint', async () => {
    const { out } = await run({ args: { scope: 'repo' }, groups: 3, findings: [finding('x1')], items: [item('x1')], nullLabel: /^review r1: g1$/ })
    assert.equal(out.stopKind, 'plan-ready')
    assert.equal(out.checkpoint.reviewMissing.length, 1)
    assert.ok(out.next.includes('review was incomplete'))
  })
  test('the round diff covers files untracked at the snapshot', async () => {
    const { calls } = await run({ findings: [finding('x1')], items: [item('x1')] })
    for (const L of ['critic r1.1', 'accept r1']) assert.ok(calls.find((c) => c.label === L).prompt.includes('GIT_INDEX_FILE'), L)
    // A copied file list loses moved tests; a patch carries adds, edits, deletes and renames.
    assert.ok(calls.find((c) => c.label === 'accept r1').prompt.includes('| git -C <tmp> apply'))
  })
})

describe('follow-up review scope', () => {
  const scopeOf = (calls, r) => calls.find((c) => c.label === `review r${r}: scope`).prompt
  test("a follow-up reviews the last round's changes, then the whole remediation once before stopping clean", async () => {
    const { out, calls } = await run({ findings: [finding('x1')], items: [item('x1')] })
    assert.ok(scopeOf(calls, 2).includes(`snapshot ${'a'.repeat(40)}`))
    assert.ok(!scopeOf(calls, 2).includes('remediation from earlier rounds'))
    assert.ok(scopeOf(calls, 3).includes('branch diff against main'))
    assert.deepEqual(out.history.filter((h) => h.review).map((h) => h.scope), ['initial', 'round', 'full'])
    assert.equal(out.stopKind, 'clean')
  })
  test('a finding in the whole-remediation review starts another round', async () => {
    // Reviews 1 and 3 (the full one) report x1; the round-scoped review 2 is clean.
    let n = 0
    const { calls } = await run({ findings: [finding('x1')], items: [item('x1')], args: { scope: 'repo', maxRounds: 2, autoApprove: true }, reviewFindings: () => (++n === 2 ? [] : n <= 3 ? [finding('x1')] : []) })
    assert.ok(calls.some((c) => c.label === 'plan r2'))
  })
  test('a caller-supplied followUpScope is used for every follow-up, with no extra review', async () => {
    const { out, calls } = await run({ findings: [finding('x1')], items: [item('x1')], args: { scope: 'repo', followUpScope: 'internal/billing', autoApprove: true } })
    assert.ok(scopeOf(calls, 2).includes('internal/billing'))
    assert.deepEqual(out.history.filter((h) => h.review).map((h) => h.scope), ['initial', 'caller'])
    assert.equal(out.stopKind, 'clean')
  })
})

// Rules carried only in prompt text: these tests are what fails when a prompt loses one.
describe('standing rules reach the agents they bind', () => {
  // One run, shared by the tests below, that starts every kind of agent: risky item (QA, API, perf),
  // a blocked consultant (revise), a failed first verification (fix) and a critic finding (critic-fix).
  let shared
  const everyAgent = () => (shared ??= run({
    findings: [finding('x1')],
    items: [item('x1', { contractRisk: true, hotPath: true, changesTests: true, needsApiDesign: true })],
    blockLabel: '#1 ', verifyFail: /^verify r1\.1$/, criticMaterial: true,
  }))
  test('every agent that reads or runs code is told to keep tool output small', async () => {
    const { calls } = await everyAgent()
    for (const kind of [/^review r1: scope/, /^plan/, /^consult .* #/, /qa-tests/, /api-design/, /^revise/, /^impl/, /^perf/, /^verify/, /^fix/, /^critic r/, /^critic-fix/, /^accept/]) {
      assert.ok(calls.some((c) => kind.test(c.label)), `scenario starts no ${kind} agent`)
    }
    // The snapshot agent runs one fixed command and reads nothing.
    const missing = calls.filter((c) => !c.label.startsWith('snapshot') && !c.prompt.includes('Keep tool output small')).map((c) => c.label)
    assert.deepEqual(missing, [])
  })
  test('the planner checks its draft against the testing criteria and every consultant lens', async () => {
    const { calls } = await everyAgent()
    const prompt = calls.find((c) => c.label === 'plan r1').prompt
    for (const text of ['jacoelho:testing', 'Design and authority skeptic', 'Simplicity and ownership', 'Risk, verification and external contracts']) assert.ok(prompt.includes(text), text)
  })
  test('no agent but the perf step is allowed to run benchmark comparisons', async () => {
    const { calls } = await everyAgent()
    const missing = calls.filter((c) => /^(impl|verify|fix|critic)/.test(c.label) && !/do not run benchmark comparisons/i.test(c.prompt)).map((c) => c.label)
    assert.deepEqual(missing, [])
  })
})

describe('token budget covers the reviews a clean stop needs', () => {
  // Costs come from an unbudgeted run of the same scenario: the review's cost, and what was spent
  // before a given agent started.
  async function costs(s) {
    const { labels } = await run(s)
    return { review: count(labels, /^review r1/) * CALL_COST, before: (label) => labels.indexOf(label) * CALL_COST }
  }
  test('a budget too small for the whole-remediation review stops instead of skipping it', async () => {
    const s = { findings: [finding('x1')], items: [item('x1')] }
    const c = await costs(s)
    // Enough for the round review (one call), not for the full review after it.
    const { out, labels } = await run({ ...s, budgetTotal: c.before('review r2: scope') + CALL_COST + c.review - 1 })
    assert.equal(count(labels, /^review r3/), 0)
    assert.equal(out.stopKind, 'budget')
    assert.equal(out.tree, 'verified')
    assert.ok(out.next.includes('NOT reviewed as a whole'))
  })
  test('a round is not started when the budget covers the round but not the review after it', async () => {
    const s = { findings: [finding('x1')], items: [item('x1')], blockingReviews: 9, args: { scope: 'repo', maxRounds: 2, autoApprove: true } }
    const c = await costs(s)
    const cycle = c.before('review r2: scope')
    // At the round guard (after review r2, one call) what remains covers the round but not the review after it.
    const { out, labels } = await run({ ...s, budgetTotal: cycle + CALL_COST + cycle + c.review - 1 })
    assert.equal(count(labels, /^plan r2/), 0)
    assert.equal(out.stopKind, 'budget')
  })
})

describe('consultants', () => {
  test('consultantModel sets the consultant model; empty uses the agent definition', async () => {
    const risky = [item('x1', { contractRisk: true })]
    const dflt = await run({ findings: [finding('x1')], items: risky })
    assert.deepEqual([...new Set(dflt.calls.filter((c) => c.agentType === 'jacoelho:consultant').map((c) => c.model))], ['opus'])
    const def = await run({ findings: [finding('x1')], items: risky, args: { scope: 'repo', consultantModel: '', autoApprove: true } })
    assert.deepEqual([...new Set(def.calls.filter((c) => c.agentType === 'jacoelho:consultant').map((c) => c.model))], [undefined])
  })
  test('consultants get findings without evidence; the planner keeps it', async () => {
    const f = { ...finding('x1'), evidence: 'EVIDENCE-TEXT-123' }
    const { calls } = await run({ findings: [f], items: [item('x1')] })
    assert.ok(calls.find((c) => c.label === 'plan r1').prompt.includes('EVIDENCE-TEXT-123'))
    assert.ok(calls.filter((c) => c.agentType === 'jacoelho:consultant').every((c) => !c.prompt.includes('EVIDENCE-TEXT-123')))
  })
})

