export const meta = {
  name: 'spec-implement',
  description: 'jacoelho:spectacular-spec-implementation: plan (gap map, design, change stack, units) -> per change: failing tests and red check, parallel unit waves, repository checks, contract and design conformance -> close by lifecycle; resumable from its Markdown record',
  whenToUse: 'Implement one or more spectacular contracts end to end, editing the working tree without committing. Args: {contracts (list of contract paths) | record (path of an implementation record to resume), instructions, gates, concurrency, models, maxAttempts, verify, keepRecord, skillPath}; a bare string is a contract path, or a record path when it ends in .implementation.md. Pass "help" for every option with its default. Re-invoking with the record path continues the run and approves the gate it stopped at. Returns stopKind (plan-ready, spec-blocked, blocked, verify-failing, contract-changed, change-ready, discard-ready, budget, done, error), next (what the caller should do now), record and units. Costly: roughly 6 to 8 agents per change (hash, tests, red check, verify, conformance, record writes) plus one per unit and one record write per wave, before any fixes; tell the user before starting. tokens in the result is the spend of the whole turn, not of this workflow alone.',
  phases: [
    { title: 'Plan', detail: 'gap map, design, change stack, test design, units; written to the record' },
    { title: 'Tests', detail: 'failing tests, red check' },
    { title: 'Implement', detail: 'waves of units in disjoint modules; attempts escalate, then block' },
    { title: 'Verify', detail: 'repository checks' },
    { title: 'Conform', detail: 'contract (spec-review) and design check; one round of fix units' },
    { title: 'Close', detail: 'ACs point at tests (anchored) or discard gate (feature)' },
  ],
}

// ---------- configuration ----------
// The one list of options: defaults, the `help` reply and the unknown-option check all read it.
const OPTIONS = {
  contracts: { default: null, about: 'contract paths to implement (a list, or one path); required unless record is given' },
  record: { default: null, about: 'path of an implementation record to resume; re-invoking with it approves the gate the run stopped at' },
  instructions: { default: '', about: 'free text every agent must follow' },
  gates: { default: ['plan', 'discard'], about: 'where to stop for approval: "plan" (only when the design adds a seam, module or dependency), "change" (after each change), "discard" (before discarding a feature spec); [] runs unattended' },
  concurrency: { default: 3, min: 1, max: 8, about: 'max units per wave' },
  models: { default: { planner: 'opus', testWriter: 'sonnet', implementer: 'sonnet', runner: 'haiku', reviewer: 'opus', recorder: 'sonnet' }, object: true, about: 'model per role: a model name, or "inherit" for the session model; missing roles keep their default.' },
  maxAttempts: { default: 2, min: 1, max: 5, about: 'attempts per unit with the implementer model before one attempt with the planner model; then the unit is blocked' },
  verify: { default: '', about: 'repository check command (default: discovered from repository conventions by the planner)' },
  keepRecord: { default: false, about: 'keep the implementation record at close instead of deleting it' },
  skillPath: { default: null, about: 'read the method from this SKILL.md path instead of invoking the installed skill (for unreleased checkouts)' },
}
// Token target left before starting a change; below it the run stops with stopKind budget.
const CHANGE_RESERVE = 150000
const GATES = ['plan', 'change', 'discard']

const usage = () => Object.fromEntries(Object.entries(OPTIONS).map(([k, o]) => [k, o.default === null || o.default === '' ? o.about : `${o.about} (default ${JSON.stringify(o.default)})`]))
// Every refusal returns started:false with a `next` for the caller instead of throwing: nothing ran.
const refuse = (reason, next, extra) => Object.assign({ started: false, reason, next, usage: usage() }, extra || {})

const parseArgs = () => {
  if (typeof args !== 'string') return args || {}
  const t = args.trim()
  if (t === '') return {}
  if (t === 'help') return { help: true }
  if (t.startsWith('{')) {
    try { return JSON.parse(t) } catch (e) { return { unparsable: t } }
  }
  return t.endsWith('.implementation.md') ? { record: t } : { contracts: [t] }
}
const raw = parseArgs()
if (raw.help) return refuse('help', 'Show the user these options; call again with {contracts} or {record}.')
if (raw.unparsable) return refuse('bad-args', 'The args text looked like JSON but did not parse; call again with an object.', { args: raw.unparsable })
const unknown = Object.keys(raw).filter((k) => !(k in OPTIONS))
if (unknown.length) return refuse('unknown-option', `Remove or rename: ${unknown.join(', ')}.`, { unknown })
const opt = Object.fromEntries(Object.entries(OPTIONS).map(([k, o]) => [k, raw[k] === undefined ? o.default : raw[k]]))
const contracts = typeof opt.contracts === 'string' ? [opt.contracts] : (Array.isArray(opt.contracts) ? opt.contracts.filter(Boolean) : [])
if (!contracts.length && !opt.record) return refuse('no-input', 'Ask the user which contract to implement, or which implementation record to resume.')
if (contracts.length && opt.record) return refuse('both-inputs', 'Pass contracts to plan anew or record to resume, not both.')
for (const k of ['concurrency', 'maxAttempts']) {
  const o = OPTIONS[k]
  if (!Number.isInteger(opt[k]) || opt[k] < o.min || opt[k] > o.max) return refuse('bad-option', `${k} must be an integer from ${o.min} to ${o.max}.`)
}
if (!Array.isArray(opt.gates) || opt.gates.some((g) => !GATES.includes(g))) return refuse('bad-option', `gates must be a list drawn from ${GATES.join(', ')}.`)
if (typeof opt.models !== 'object' || Array.isArray(opt.models) || Object.keys(opt.models).some((r) => !(r in OPTIONS.models.default))) return refuse('bad-option', `models takes roles ${Object.keys(OPTIONS.models.default).join(', ')}.`)
// A skill passes the plugin's per-role settings here; an unsubstituted ${user_config.*} placeholder must refuse, not reach agent().
const badModel = Object.entries(opt.models).find(([, m]) => typeof m !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9.\-\[\]]*$/.test(m))
if (badModel) return refuse('bad-option', `models.${badModel[0]} must be a model name or "inherit"; got ${JSON.stringify(badModel[1])}.`)
// undefined makes agent() use the session model.
const MODEL = Object.fromEntries(Object.entries(OPTIONS.models.default).map(([r, d]) => {
  const m = opt.models[r]
  return [r, m === undefined ? d : m === 'inherit' ? undefined : m]
}))

// The record sits next to the first contract and is named for its capability: the file name, or the
// folder's name for a contract.md. A bare string ending in .implementation.md resumes, so the name is not the planner's choice.
const recordPathFor = (contract) => {
  const cut = contract.lastIndexOf('/')
  const dir = cut < 0 ? '' : contract.slice(0, cut)
  const base = contract.slice(cut + 1).replace(/\.md$/, '')
  const name = base === 'contract' && dir ? dir.slice(dir.lastIndexOf('/') + 1) : base
  return `${dir ? `${dir}/` : ''}${name}.implementation.md`
}

// ---------- briefs ----------
const SKILL = 'jacoelho:spectacular-spec-implementation'
const method = opt.skillPath
  ? `Read the file ${opt.skillPath} and the files it links to as you need them.`
  : `Invoke the Skill tool with skill "${SKILL}" and read the references it links to as you need them.`
const METHOD_MISSING = 'If you cannot load the method, do no work: say so in your result.'
// Runners and the record writer only run commands or update lines; loading the method would cost each of them several turns.
const brief = (role, task, input, needsMethod = true) => [
  needsMethod ? `${method} ${METHOD_MISSING}` : '',
  `YOUR ROLE: ${role}. This workflow runs the other roles and orders the work; you cannot start subagents. ${task}`,
  opt.instructions ? `Instructions from the user: ${opt.instructions}` : '',
  `INPUT (JSON):\n${JSON.stringify(input, null, 1)}`,
].filter(Boolean).join('\n\n')
const READ_ONLY_RECORD = 'Read the implementation record but never write it; return your result instead.'
const UNIT_RULES = 'Open your work from the skill\'s Decision rights section: decide what is yours, return what is not. Edit only the paths your unit lists, except files the design names as consumers of a seam you serve. Code and comments may cite contract IDs but never IDs that live only in the implementation record, which is deleted at close. ' + READ_ONLY_RECORD

const str = { type: 'string' }
const strs = { type: 'array', items: str }
const bool = { type: 'boolean' }
const obj = (properties, required) => ({ type: 'object', properties, required: required || Object.keys(properties) })
const UNIT_STATE = { type: 'string', enum: ['pending', 'in-progress', 'done', 'accepted', 'blocked'] }
const UNIT = obj({ id: str, kind: { type: 'string', enum: ['tests', 'impl'] }, after: strs, owner: str, edits: strs, state: UNIT_STATE, blockedReason: str })
const CHANGE = obj({ id: str, title: str, kind: { type: 'string', enum: ['feature', 'prefactor'] }, requirements: strs, accepted: bool, units: { type: 'array', items: UNIT } })
const PLAN = obj({
  record: str,
  status: { type: 'string', enum: ['planning', 'approved', 'implementing', 'discard-ready', 'accepted', 'blocked'] },
  lifecycle: { type: 'string', enum: ['anchored', 'feature'] },
  needsApproval: bool, contractChanged: bool, verify: str,
  // The planner is the canary: in a session whose skill list predates the skill, every agent would work blind.
  methodLoaded: bool,
  specBlocked: strs, changes: { type: 'array', items: CHANGE },
})
const HASH = obj({ changed: bool, files: strs })
const TEST_REASON = { type: 'string', enum: ['assertion', 'not-implemented', 'build', 'no-tests', 'setup', 'passed'] }
const RED = obj({ tests: { type: 'array', items: obj({ name: str, reason: TEST_REASON }) }, output: str })
const UNIT_RESULT = obj({ outcome: { type: 'string', enum: ['done', 'returned', 'failed'] }, summary: str, decisions: strs, returned: strs, output: str })
const CHECK = obj({ passed: bool, output: str })
const FINDING = obj({ summary: str, location: str, kind: { type: 'string', enum: ['unit', 'design-change', 'spec'] }, owner: str, edits: strs })
const CONFORM = obj({ findings: { type: 'array', items: FINDING } })
const WRITE = obj({ written: bool })
const CLOSE = obj({ closed: bool, discarded: bool, summary: str })

// ---------- deterministic helpers ----------
const prefix = (p) => p.split('*')[0].replace(/\/+$/, '')
const overlaps = (a, b) => { const x = prefix(a), y = prefix(b); return x === y || x.startsWith(y + '/') || y.startsWith(x + '/') || x === '' || y === '' }
const isDone = (u) => u.state === 'done' || u.state === 'accepted'
const ownerKey = (o) => String(o).replace(/\/+$/, '')
const allUnits = (plan) => plan.changes.flatMap((c) => c.units)
// A wave is the ready units of one change, in different owner modules with disjoint edit paths,
// up to concurrency. Dependencies resolve across the whole plan. Overlap is a planning defect, so
// overlapping units simply wait for a later wave.
const nextWave = (plan, units) => {
  const byId = Object.fromEntries(allUnits(plan).map((u) => [u.id, u]))
  const ready = units.filter((u) => u.kind === 'impl' && u.state === 'pending' && u.after.every((a) => byId[a] && isDone(byId[a])))
  const wave = []
  for (const u of ready) {
    if (wave.length >= opt.concurrency) break
    if (wave.some((w) => ownerKey(w.owner) === ownerKey(u.owner) || w.edits.some((e) => u.edits.some((f) => overlaps(e, f))))) continue
    wave.push(u)
  }
  return wave
}
const unitView = (plan) => allUnits(plan).map((u) => ({ id: u.id, state: u.state, blockedReason: u.blockedReason || '' }))
const out = (plan, stopKind, next, extra) => Object.assign({ started: true, stopKind, next, record: plan && plan.record, units: plan ? unitView(plan) : [], tokens: budget.spent() }, extra || {})
const notes = []
let current = null

async function run() {
  // ---------- single writer of the record ----------
  async function writeRecord(plan, label, status) {
    if (status) plan.status = status
    const pending = notes.slice()
    const r = await agent(brief('record writer', 'You are the only writer of the implementation record. Change only these parts to match INPUT: the status line, unit markers and blocked reasons, fix units added to a change, the STACK change appended as the last change section when INPUT has it (heading "## STACK Whole-stack conformance fixes - after: <last change>", then its units in the same line layout as the other changes), and each note appended as "- <text>" under the right change\'s Notes: line. Unit markers: [ ] pending, [~] in-progress, [x] done, [a] accepted, [!] blocked. Leave every other line, including the gap map, design, and test design, exactly as it is. Edit no other file. Then read the record back: return written true only when every change in INPUT is in the file.', { record: plan.record, status: plan.status, changes: plan.changes, notes: pending }, false),
      { label: `record: ${label}`, phase: 'Implement', schema: WRITE, model: MODEL.recorder })
    if (!r || !r.written) throw new Error(`the record writer did not update ${plan.record} after ${label}`)
    notes.splice(0, pending.length)
  }

  // ---------- plan or resume ----------
  phase('Plan')
  const resumed = !contracts.length
  const plan = !resumed
    ? await agent(brief('planner', 'Do the Plan steps for these contracts and write the implementation record at INPUT\'s record path (you are its only writer now), with status planning when needsApproval and INPUT\'s planGate are both true, approved otherwise. Return the plan as stored, with methodLoaded true only if you read the method. Set needsApproval when the design adds a seam, a module or a dependency between modules. List requirements stopped by a gap-map spec defect in specBlocked. Discover the repository check command unless one is given.', { contracts, record: recordPathFor(contracts[0]), verify: opt.verify, planGate: opt.gates.includes('plan') }),
      { label: 'plan', phase: 'Plan', schema: PLAN, model: MODEL.planner })
    : await agent(brief('planner', 'Do the Resume steps for this record (you are its only writer now): compare contract hashes, re-plan only changed requirements and set contractChanged when you did, re-run green for done implementation units in the current change (a done tests unit keeps its recorded red), and reopen what no longer holds. For each blocked unit, set it pending when the record\'s Design, its notes or the decision record now settle the reason it was blocked; keep it blocked otherwise. This call approves the gate the record stopped at: a record in status planning becomes approved; keep discard-ready as it is. Return the plan as stored, with methodLoaded true only if you read the method.', { record: opt.record, verify: opt.verify }),
      { label: 'resume', phase: 'Plan', schema: PLAN, model: MODEL.planner })
  if (!plan) return out(null, 'error', 'The planner returned no result; rerun.')
  if (!plan.methodLoaded) return out(plan, 'error', `The planner could not load ${SKILL}, so every agent would work without the method. Start a new session (its skill list predates the skill) or pass skillPath, then rerun.`)
  current = plan
  const verifyCmd = (opt.verify || plan.verify || '').trim()
  // Every acceptance rests on this command: an empty one would let a runner report checks it never ran.
  if (!verifyCmd) return out(plan, 'error', `No repository check command: rerun with {verify}, or set the Checks line in ${plan.record}.`)
  // Red evidence comes only from a tests unit, so a feature change without one could be accepted on checks alone.
  const untested = plan.changes.filter((c) => c.kind === 'feature' && !c.accepted && !c.units.some((u) => u.kind === 'tests'))
  if (untested.length) return out(plan, 'error', `Planning defect: feature changes ${untested.map((c) => c.id).join(', ')} have no tests unit; ${opt.record ? 'rerun' : 'rerun with {record}'} after the planner adds one to each.`)
  // A unit left in progress by an interrupted run starts again.
  allUnits(plan).filter((u) => u.state === 'in-progress').forEach((u) => { u.state = 'pending' })

  if (plan.specBlocked.length && !plan.changes.length) return out(plan, 'spec-blocked', `Every requirement is blocked by a spec defect (${plan.specBlocked.join(', ')}); fix the contracts with jacoelho:spectacular-spec-writing, then rerun with contracts.`, { specBlocked: plan.specBlocked })
  if (plan.specBlocked.length) log(`spec-blocked, left out of the plan: ${plan.specBlocked.join(', ')}`)
  // A re-plan on resume after a contract change needs the same approval as a fresh plan.
  if (opt.gates.includes('plan') && plan.needsApproval && (!resumed || plan.contractChanged)) {
    if (resumed) await writeRecord(plan, 'replanned', 'planning')
    return out(plan, 'plan-ready', `Show the user the plan in ${plan.record}; the design adds a seam, module or dependency${resumed ? ' after the contracts changed' : ''}. On approval, rerun with {record: "${plan.record}"}.`)
  }
  if (!resumed && plan.status !== 'approved') await writeRecord(plan, 'approved', 'approved')

  // Returned items are decisions for the planner or user even when the unit finished, so they always reach the record.
  const noteResult = (u, r) => notes.push(`${u.id}: ${r.summary}${r.decisions.length ? `; decided: ${r.decisions.join('; ')}` : ''}${r.returned.length ? `; returned: ${r.returned.join('; ')}` : ''}`)

  // ---------- per-unit execution ----------
  // maxAttempts tries with the implementer model, then one with the planner model, then blocked.
  async function runUnit(change, u, finding) {
    let failure = ''
    for (let attempt = 1; attempt <= opt.maxAttempts + 1; attempt++) {
      const r = await agent(brief('implementer', `Implement unit ${u.id} of change ${change.id} until the tests for the code it touches pass. Other units are editing the same working tree at the same time: run only the tests and packages your unit touches, never the repository-wide checks, and never run a tool that rewrites files outside your edit paths (repository-wide formatters, generators). The repository checks run once after the change's last wave. Never edit tests. ${UNIT_RULES}`, { record: plan.record, change: change.id, unit: u, verify: verifyCmd, previousFailure: failure, finding: finding || null }),
        { label: `unit ${u.id}${attempt > 1 ? ` #${attempt}` : ''}`, phase: 'Implement', schema: UNIT_RESULT, model: attempt > opt.maxAttempts ? MODEL.planner : MODEL.implementer })
      if (!r) { failure = 'agent returned no result'; continue }
      noteResult(u, r)
      if (r.outcome === 'done') { u.state = 'done'; return }
      if (r.outcome === 'returned') { u.state = 'blocked'; u.blockedReason = `returned: ${r.returned.join('; ')}`; return }
      failure = r.output
    }
    u.state = 'blocked'
    u.blockedReason = `failed ${opt.maxAttempts + 1} attempts: ${failure.slice(0, 500)}`
  }

  // Runs the change's ready units wave by wave; returns the units left unfinished.
  async function runWaves(change, findings) {
    for (;;) {
      const wave = nextWave(plan, change.units)
      if (!wave.length) break
      wave.forEach((u) => { u.state = 'in-progress' })
      log(`${change.id} wave: ${wave.map((u) => u.id).join(', ')}`)
      await parallel(wave.map((u) => () => runUnit(change, u, findings && findings[u.id])))
      wave.filter((u) => u.state === 'in-progress').forEach((u) => { u.state = 'blocked'; u.blockedReason = 'unit run did not finish' })
      await writeRecord(plan, `${change.id} wave`)
    }
    const ids = new Set(allUnits(plan).map((u) => u.id))
    for (const u of change.units.filter((x) => x.state === 'pending')) {
      const missing = u.after.filter((a) => !ids.has(a))
      if (missing.length) { u.state = 'blocked'; u.blockedReason = `follows unknown unit ${missing.join(', ')}` }
    }
    return change.units.filter((u) => !isDone(u))
  }

  // Same attempt policy as a unit: maxAttempts fixes with the implementer model, then one with the planner model.
  async function verify(change) {
    phase('Verify')
    for (let fixes = 0; ; fixes++) {
      const r = await agent(brief('runner', `Run the repository checks and report the exact result. Edit nothing. ${READ_ONLY_RECORD}`, { verify: verifyCmd }, false),
        { label: `verify ${change.id}${fixes ? ` #${fixes + 1}` : ''}`, phase: 'Verify', schema: CHECK, model: MODEL.runner, effort: 'low' })
      if (!r) throw new Error(`the repository checks for ${change.id} returned no result`)
      if (r.passed) return true
      if (fixes > opt.maxAttempts) return false
      const fix = await agent(brief('implementer', `The repository checks fail after change ${change.id}. Fix the cause inside the change's owner modules without editing tests. ${UNIT_RULES}`, { record: plan.record, change: change.id, output: r.output, verify: verifyCmd }),
        { label: `fix ${change.id} #${fixes + 1}`, phase: 'Verify', schema: UNIT_RESULT, model: fixes >= opt.maxAttempts ? MODEL.planner : MODEL.implementer })
      if (fix) notes.push(`${change.id} verify fix: ${fix.summary}${fix.decisions.length ? `; decided: ${fix.decisions.join('; ')}` : ''}`)
      if (fix && fix.outcome === 'returned') { notes.push(`${change.id} verify fix returned: ${fix.returned.join('; ')}`); return false }
    }
  }

  // The run never commits, so a change's work is the working tree's changes in its units' edit paths.
  const pathsOf = (changes) => [...new Set(changes.flatMap((c) => c.units.flatMap((u) => u.edits)))]
  async function conform(scope, label, paths) {
    phase('Conform')
    return agent(brief('reviewer', `Check conformance for ${scope}, reading the whole working tree's changes against HEAD (untracked files included); INPUT's paths are the planned scope, so a change outside them is a design-check finding unless the design lists it as a seam consumer: the contracts with jacoelho:spectacular-spec-review (its Reconcile step) and the recorded design with the skill's design check. Report material findings only, each summary stating one defect and nothing else. For a finding a unit can fix, give its owner module and the source paths to edit (never the implementation record); use kind design-change when the design itself must change and spec when a contract must. Edit nothing. ${READ_ONLY_RECORD}`, { record: plan.record, scope, paths }),
      { label, phase: 'Conform', schema: CONFORM, model: MODEL.reviewer })
  }

  // One round of fix units per conformance check; what remains goes to the user.
  async function conformAndFix(change, scope, label, changes) {
    const first = await conform(scope, label, pathsOf(changes))
    if (!first) return { error: `${label} returned no result` }
    // A unit may not edit the record: the workflow is its only writer.
    const needUser = first.findings.filter((f) => f.kind !== 'unit' || f.edits.some((p) => p === plan.record || p.endsWith('.implementation.md')))
    if (needUser.length) return { needUser }
    if (!first.findings.length) return {}
    const taken = change.units.filter((u) => u.id.startsWith(`${change.id}-F`)).length
    const findings = {}
    for (const [i, f] of first.findings.entries()) {
      const id = `${change.id}-F${taken + i + 1}`
      findings[id] = f
      change.units.push({ id, kind: 'impl', after: [], owner: f.owner, edits: f.edits, state: 'pending', blockedReason: '' })
    }
    await writeRecord(plan, `${label} fixes`)
    phase('Implement')
    if ((await runWaves(change, findings)).length) return { blocked: true }
    if (!(await verify(change))) return { verifyFailed: true }
    const second = await conform(scope, `${label} #2`, pathsOf(changes))
    if (!second) return { error: `${label} #2 returned no result` }
    return second.findings.length ? { needUser: second.findings } : {}
  }

  const blockedUnits = () => allUnits(plan).filter((u) => u.state === 'blocked').map((u) => `${u.id}: ${u.blockedReason}`)
  const RERUN = `rerun with {record: "${plan.record}"}`
  const stopBlocked = async (label, next, extra) => { await writeRecord(plan, label, 'blocked'); return out(plan, 'blocked', next, extra) }

  // ---------- changes, in order ----------
  // The planner compared the contract hashes moments ago, so the first change this run works on needs no check.
  let hashChecked = true
  for (const change of plan.changes) {
    if (change.accepted || change.id === 'STACK') continue
    if (budget.total && budget.remaining() < CHANGE_RESERVE) {
      await writeRecord(plan, 'budget stop')
      return out(plan, 'budget', `The token target cannot cover change ${change.id}; ${RERUN} and a larger target.`)
    }
    phase('Tests')
    const hash = hashChecked ? { changed: false, files: [] } : await agent(brief('runner', `Compare the sha256 of each contract file's content (shasum -a 256) with the hashes on the record's Contracts line. Edit nothing. ${READ_ONLY_RECORD}`, { record: plan.record }, false),
      { label: `hash ${change.id}`, phase: 'Tests', schema: HASH, model: MODEL.runner, effort: 'low' })
    if (!hash) return out(plan, 'error', `The contract hash check for ${change.id} returned no result; ${RERUN}.`)
    if (hash.changed) return out(plan, 'contract-changed', `Contracts changed since planning (${hash.files.join(', ')}); ${RERUN} to re-plan the affected changes.`)
    hashChecked = false

    for (const u of change.units.filter((x) => x.kind === 'tests' && x.state === 'pending')) {
      const r = await agent(brief('test writer', `Write the failing tests for change ${change.id} (unit ${u.id}), plus only the declarations they need to compile, as stubs that fail without aborting the test run (the skill's Evidence section). Expected values come from the contracts' oracles, never from running code. ${UNIT_RULES}`, { record: plan.record, change: change.id, unit: u }),
        { label: `tests ${u.id}`, phase: 'Tests', schema: UNIT_RESULT, model: MODEL.testWriter })
      if (r) noteResult(u, r)
      if (!r || r.outcome !== 'done') { u.state = 'blocked'; u.blockedReason = r ? `${r.outcome}: ${r.returned.join('; ') || r.output.slice(0, 300)}` : 'no result'; continue }
      const red = await agent(brief('runner', `Run change ${change.id}'s tests (the test unit's edit paths) on the working tree and report each test the test unit added or changed (diff its paths against HEAD; leave out tests that already existed there) by name with why it failed: assertion, not-implemented, build, setup, or passed; no-tests when the command selected none. When one test aborts the run, run the others one by one. Edit nothing. ${READ_ONLY_RECORD}`, { record: plan.record, change: change.id, tests: change.units.filter((x) => x.kind === 'tests').flatMap((x) => x.edits) }, false),
        { label: `red ${change.id}`, phase: 'Tests', schema: RED, model: MODEL.runner, effort: 'low' })
      const tests = red ? red.tests : []
      const notRed = tests.filter((t) => !['assertion', 'not-implemented'].includes(t.reason))
      if (!tests.length || notRed.some((t) => t.reason !== 'passed')) {
        u.state = 'blocked'
        u.blockedReason = !red ? 'the red check returned no result' : tests.length ? `not red: ${notRed.map((t) => `${t.name} (${t.reason})`).join(', ')}` : 'no tests ran'
        continue
      }
      if (notRed.length === tests.length) {
        // No test could show the change doing anything, so implementing it proves nothing.
        u.state = 'blocked'
        u.blockedReason = `every test passed before implementation: already-satisfied (fix the gap map) or weak-test (rewrite the tests); the planner decides`
        continue
      }
      notes.push(`${change.id} red after ${u.id}: ${tests.filter((t) => t.reason !== 'passed').map((t) => `${t.name} (${t.reason})`).join(', ')}`)
      if (notRed.length) notes.push(`${change.id}: passed before implementation (already-satisfied or weak-test, planner to decide): ${notRed.map((t) => t.name).join(', ')}`)
      u.state = 'done'
    }
    await writeRecord(plan, `${change.id} tests`, 'implementing')

    phase('Implement')
    if ((await runWaves(change)).length) return stopBlocked(`${change.id} blocked`, `Decisions or failures block ${change.id}: ${blockedUnits().join(' | ')}. Settle each (user decisions in the decision record, design changes in the record's Design, or a note in the record), then ${RERUN}; the planner reopens units whose reason is settled.`)

    if (!(await verify(change))) {
      await writeRecord(plan, `${change.id} verify failed`, 'blocked')
      return out(plan, 'verify-failing', `Repository checks still fail after ${change.id}; see the record's notes, fix or decide, then ${RERUN}.`)
    }

    const c = await conformAndFix(change, `change ${change.id}`, `conform ${change.id}`, [change])
    if (c.error) return out(plan, 'error', `${c.error}; ${RERUN}.`)
    if (c.blocked) return stopBlocked(`${change.id} fix blocked`, `Fix units for ${change.id} are blocked: ${blockedUnits().join(' | ')}; settle them, then ${RERUN}.`)
    if (c.verifyFailed) { await writeRecord(plan, `${change.id} verify failed`, 'blocked'); return out(plan, 'verify-failing', `Checks fail after fixing ${change.id}'s conformance findings; ${RERUN} once fixed.`) }
    if (c.needUser) {
      notes.push(`${change.id} findings for the user: ${c.needUser.map((f) => `${f.kind} at ${f.location}: ${f.summary}`).join(' | ')}`)
      return stopBlocked(`${change.id} findings`, `Conformance findings on ${change.id} need a decision: ${c.needUser.map((f) => `${f.kind}: ${f.summary}`).join(' | ')}. Decide, update the contract or the record's Design, then ${RERUN}.`, { findings: c.needUser })
    }

    change.units.forEach((u) => { u.state = 'accepted' })
    change.accepted = true
    await writeRecord(plan, `${change.id} accepted`)
    const remaining = plan.changes.filter((x) => !x.accepted && x.id !== 'STACK')
    if (opt.gates.includes('change') && remaining.length) return out(plan, 'change-ready', `${change.id} is accepted; show the user the diff, then ${RERUN} for ${remaining[0].id}.`)
  }

  // ---------- whole stack and close ----------
  if (plan.status !== 'discard-ready') {
    // Fix units from the whole-stack check live in their own change, so a resumed run finds them.
    let stack = plan.changes.find((c) => c.id === 'STACK')
    if (!stack || !stack.accepted) {
      if (!stack) {
        stack = { id: 'STACK', title: 'Whole-stack conformance fixes', kind: 'prefactor', requirements: [], accepted: false, units: [] }
        plan.changes.push(stack)
      }
      const pendingFixes = await runWaves(stack)
      // With one change and no stack fixes, the whole stack is that change, which its own check just covered.
      const single = plan.changes.filter((c) => c !== stack).length === 1 && !stack.units.length
      const s = pendingFixes.length ? { blocked: true } : single ? {} : await conformAndFix(stack, 'the whole stack', 'conform stack', plan.changes)
      if (!stack.units.length) plan.changes = plan.changes.filter((c) => c !== stack)
      if (s.error) return out(plan, 'error', `${s.error}; ${RERUN}.`)
      if (s.blocked || s.verifyFailed || s.needUser) {
        await writeRecord(plan, 'stack findings', 'blocked')
        return out(plan, s.verifyFailed ? 'verify-failing' : 'blocked', `The whole-stack check left work for the user${s.needUser ? `: ${s.needUser.map((f) => `${f.kind}: ${f.summary}`).join(' | ')}` : `: ${blockedUnits().join(' | ')}`}; ${RERUN} once settled.`, { findings: s.needUser || [] })
      }
      if (stack.units.length) {
        stack.accepted = true
        stack.units.forEach((u) => { u.state = 'accepted' })
        await writeRecord(plan, 'stack accepted')
      }
    }
    if (plan.lifecycle === 'feature' && opt.gates.includes('discard')) {
      await writeRecord(plan, 'discard gate', 'discard-ready')
      return out(plan, 'discard-ready', `Everything is accepted. Show the user the discard gate for the feature spec; on approval, ${RERUN} to discard it.`)
    }
  }

  phase('Close')
  const closed = await agent(brief('planner', `Close the implementation by its lifecycle as the skill's Execute section describes. Acceptance and conformance are already done by other roles: do not repeat them. Your summary is shown to the user: list the files you edited or created and the open questions you carried into the decision record, and do not question instructions you followed. Carry every open question in the record into the capability's decision record (jacoelho:spectacular-spec-grilling's Decision record section says where) before the record can be deleted. ${plan.lifecycle === 'feature' ? 'Check the discard gate, then discard the feature spec.' : `Mark each AC's Verification as executed, naming its test${opt.keepRecord ? ', and update the record\'s contract hashes to the edited contracts' : ''}.`} ${opt.keepRecord ? 'Keep the record and set its status to accepted.' : 'Then delete the record.'}`, { record: plan.record, lifecycle: plan.lifecycle, keepRecord: opt.keepRecord }),
    { label: 'close', phase: 'Close', schema: CLOSE, model: MODEL.planner })
  if (!closed || !closed.closed) return out(plan, 'error', `Closing did not complete${closed ? `: ${closed.summary}` : ''}; ${RERUN}.`)
  return out(plan, 'done', `Report to the user: ${closed.summary} The tree is uncommitted; review and commit it.`, { discarded: closed.discarded, specBlocked: plan.specBlocked })
}

// A failure inside the run (such as the record writer not answering) is a stop, not an exception.
try {
  return await run()
} catch (e) {
  return out(current, 'error', `${e.message}; ${current ? `rerun with {record: "${current.record}"}` : 'rerun'}.`)
}
