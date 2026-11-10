export const meta = {
  name: 'architecture-remediate',
  description: 'Loop: /jacoelho:architecture-review -> plan with acceptance checks -> risk-sized consultants -> batched implement -> verify -> critic -> acceptance, until no Critical/High/Medium finding is open (Go-oriented defaults)',
  whenToUse: 'Fix architecture findings end to end, editing the working tree without committing. Args: {scope (required), baseRef="main", instructions}; a bare string is the scope. If the user named no scope, ask for one instead of calling with none: a bare call starts nothing. Pass reviewOnly:true for a wide read-only review split across agents (edits nothing). Pass "help" for every option with its default. By default the run stops after the round-1 plan (stopKind plan-ready) so the user can approve or edit it; continue with the same args plus approvedPlan (the returned checkpoint), or pass autoApprove:true to run unattended. Returns stopKind (plan-ready, review-incomplete, review-only, clean, max-rounds, budget, verify-failing, error), stopReason (the same in words), tree, next (what the caller should do now) and the findings left. Costly, and the cost follows the number of rounds, not the size of the scope: a round (review, plan, consultants, implementers, verification, critic) has used about 15 to 20 agents, 2 million tokens and 1.5 hours on a 20,000-line repository, and the default allows four. Tell the user that before starting. To spend less: maxRounds 1 or 2, reviewers 1, a token target, and a baseRef that already holds earlier remediation, since the review before a clean stop covers the whole diff against baseRef. When it finishes, report the cost with the result (see next).',
  phases: [
    { title: 'Review', detail: 'jacoelho:architecture-review: scoping (reviews alone when one group), parallel group reviews, merge' },
    { title: 'Plan', detail: 'dispositions on the merits; dependency-ordered packets' },
    { title: 'Consult', detail: 'consultants sized to plan risk + batched QA and API review; targeted revise and re-check' },
    { title: 'Implement', detail: 'one implementer per dependency/file batch (cheap model), one batched benchmark comparison' },
    { title: 'Verify', detail: 'verification contract; fix until green' },
    { title: 'Critic', detail: 'critic on the diff; resolve material findings; the last fix is always re-reviewed' },
    { title: 'Accept', detail: "each finding's check fails on the pre-round tree and passes now" },
  ],
}

// ---------- configuration ----------
// The one list of options: defaults, the `help` reply and the unknown-option check all read it.
// meta.whenToUse names only the common ones, since meta must be a literal and cannot read this.
const OPTIONS = {
  scope: { default: null, about: 'required: what round 1 reviews, such as a path, a module, "the branch diff" or "the whole repository"' },
  baseRef: { default: 'main', about: 'base ref; the one review of the whole remediation before a clean stop covers the diff against it' },
  instructions: { default: '', about: 'free text for every stage that judges or edits: focus, constraints, contracts to keep' },
  followUpScope: { default: null, about: "what every later review covers (default: the previous round's changes and their consumers, then the whole diff against baseRef once before stopping clean)" },
  verify: { default: null, about: 'checks to run (default: the repo verification contract, plus gofmt and git diff --check for Go)' },
  reviewers: { default: 3, min: 1, max: 8, about: 'max parallel review agents; each reviews up to eight boundaries' },
  reviewOnly: { default: false, about: 'run one review of scope and return its report; plans and edits nothing' },
  consultants: { default: 3, min: 1, max: 6, about: 'consultants for a plan touching a contract, hot path or exported API' },
  lowRiskConsultants: { default: 1, max: 6, about: 'consultants for any other plan' },
  batchSize: { default: 3, min: 1, about: 'max linked plan items per implementer' },
  maxRounds: { default: 4, about: 'max implementation rounds' },
  dryRounds: { default: 1, min: 1, about: 'clean whole-scope reviews (initial, full or followUpScope) in a row needed to stop; a clean review of one round\'s changes never counts, it leads to a full review; above 1 re-reviews an unchanged tree' },
  implementModel: { default: 'sonnet', about: 'model for implementers and first fix attempts' },
  implementEffort: { default: 'medium', about: 'effort for implementers' },
  escalateModel: { default: 'opus', about: 'model for repeated fix attempts and critic fixes' },
  consultantModel: { default: 'opus', about: 'model for the jacoelho:consultant plan reviewers; "" uses the agent definition\'s model' },
  runModel: { default: 'haiku', about: 'model that runs verification commands' },
  autoApprove: { default: false, about: 'implement the round-1 plan without stopping for approval' },
  approvedPlan: { default: null, object: true, about: 'the checkpoint a plan-ready run returned, edited or not: skips round 1 review and planning and implements it' },
}
const bounds = (o) => ({ min: o.min || 0, max: o.max ?? Infinity })
const range = (o) => { const b = bounds(o); return typeof o.default !== 'number' ? '' : b.max < Infinity ? `, ${b.min} to ${b.max}` : `, at least ${b.min}` }
const usage = () => Object.fromEntries(Object.entries(OPTIONS).map(([k, o]) => [k, o.default === null || o.default === '' ? o.about : `${o.about} (default ${JSON.stringify(o.default)}${range(o)})`]))
// args can arrive as an object, as that object's JSON text, or as a bare string (the scope).
// Every refusal returns started:false with a `next` for the caller instead of throwing: nothing ran,
// and the caller should fix the call, not debug a crash.
const refuse = (reason, next, extra) => Object.assign({ started: false, reason, next, usage: usage() }, extra || {})
const raw = (() => {
  if (typeof args !== 'string') return args || {}
  const t = args.trim()
  if (t.startsWith('{')) { try { return JSON.parse(t) } catch (e) { return { unparsable: t } } }
  if (t === 'help') return { help: true }
  return t ? { scope: t } : {}
})()
if (raw.help) return refuse('help', 'Show the user these options; call again with at least {scope}.')
if (raw.unparsable) return refuse('bad-args', 'The args text looked like JSON but did not parse; call again with an object.', { args: raw.unparsable })
const unknown = Object.keys(raw).filter((k) => !(k in OPTIONS))
if (unknown.length) return refuse('unknown-option', `Unknown option(s) ${unknown.join(', ')}; correct the names against usage and call again.`, { unknown })
// Each option has its default's type. A wrong type is refused rather than read as the default:
// reviewOnly: "true" read as false would run a full remediation the caller asked to avoid.
// Numbers also have a range: batchSize 0 never advances the batching loop, consultants 0 would
// skip review of a risky plan unannounced, and fan-out options bound how many agents run at once.
const typeOf = (v) => (v === null ? 'null' : typeof v)
const badType = Object.keys(raw).filter((k) => {
  const d = OPTIONS[k].default
  const v = raw[k]
  if (OPTIONS[k].object) return !(v && typeof v === 'object' && !Array.isArray(v))
  if (typeof d === 'number') { const b = bounds(OPTIONS[k]); return !(Number.isInteger(v) && v >= b.min && v <= b.max) }
  if (typeof d === 'boolean') return typeof v !== 'boolean'
  return typeof v !== 'string' // string options, including those whose default is null
})
if (badType.length) return refuse('bad-option-type', `Option(s) ${badType.map((k) => `${k} (got ${typeOf(raw[k])} ${JSON.stringify(raw[k])})`).join(', ')} have the wrong type or are out of range; see usage for each default and range.`, { invalid: badType })
// A run edits the working tree, so its target is never a default: a bare invocation starts nothing.
if (!raw.scope) return refuse('no-scope', 'Ask the user what to remediate (a path, a module, "the branch diff" or "the whole repository") and any instructions, then call again with {scope, instructions?}.')
// scope, followUpScope and baseRef are quoted inside the review skill's args, so a quote or newline would break that invocation.
const badQuoted = ['scope', 'followUpScope', 'baseRef'].filter((k) => raw[k] != null && /["`\n\r]/.test(String(raw[k])))
if (badQuoted.length) return refuse('bad-scope', `${badQuoted.join(', ')} must be one line without double quotes or backticks; put prose in instructions.`, { invalid: badQuoted })
const A = Object.assign(Object.fromEntries(Object.entries(OPTIONS).map(([k, o]) => [k, o.default])), raw)
// The approved plan comes back through the caller, possibly hand-edited: check it before anything runs.
if (A.approvedPlan && A.reviewOnly) return refuse('conflicting-options', 'reviewOnly edits nothing and approvedPlan implements a plan; pass one of them.')
if (A.approvedPlan) {
  const problems = checkpointProblems(A.approvedPlan)
  if (problems.length) return refuse('bad-approved-plan', 'approvedPlan must be the checkpoint a plan-ready run returned ({findings, plan}); fix the listed problems and call again.', { problems })
}

const SCOPE = A.scope
const BASE = A.baseRef
const REVIEWERS = A.reviewers
const REVIEW_ONLY = A.reviewOnly
const CONSULTANTS = A.consultants
const LOW_RISK_CONSULTANTS = A.lowRiskConsultants
const BATCH_SIZE = A.batchSize
const MAX_ROUNDS = A.maxRounds
const AUTO_APPROVE = A.autoApprove
const APPROVED = A.approvedPlan
const DRY_ROUNDS = A.dryRounds
const IMPL_MODEL = A.implementModel
const RUN_MODEL = A.runModel
const IMPL_EFFORT = A.implementEffort
// Escalation for judgement-heavy repairs: failed first fix attempts and critic findings.
const ESCALATE_MODEL = A.escalateModel
// Reviews after the first cover only what the remediation changed; unchanged boundaries keep their ledger dispositions.
// A follow-up review covers the previous round's changes: earlier rounds' fixes are already in the
// ledger, proven by their acceptance checks or carried as open. Before the run may stop clean, one
// review of the whole remediation looks for defects that only appear where rounds interact.
const FULL_SCOPE = `the branch diff against ${BASE} plus uncommitted work (changed boundaries and their consumers)`
const roundScope = (round, snap) => `the changes remediation round ${round} made (the working tree against snapshot ${snap}, untracked files included) and their direct consumers`
const VERIFY = A.verify || 'every command in the repository verification contract (AGENTS.md / CLAUDE.md / Makefile), plus gofmt and `git diff --check` for Go repositories'
const SKILL = 'jacoelho:architecture-review'
// Free-text user direction for the whole run (focus, constraints, contracts to keep). Every stage
// that judges or edits receives it, so a constraint cannot be honoured by the planner and lost by an implementer.
const INSTRUCTIONS = A.instructions
  ? `\nUser instructions for this run (binding; where they conflict with the review skill's rules or this workflow's defaults, they win):\n${A.instructions}\n`
  : ''
// Consultants are the plugin's own read-only decision-point agent, so the type always resolves.
const CONSULTANT = 'jacoelho:consultant'
const consultOnce = (prompt, opts) => agent(prompt, Object.assign({}, opts, { agentType: CONSULTANT }, A.consultantModel ? { model: A.consultantModel } : {}))
const BLOCKING = ['Critical', 'High', 'Medium']

// The user's standing instruction; it is not part of the review skill.
const AUTHORITY_STANCE = `
Authority documents (ARCHITECTURE.md, AGENTS.md, decision records) are EVIDENCE of intent, not proof of correctness. Where a finding, the code and a document disagree, decide on the merits: binding external requirements (specs, public contracts, persisted data, stated limits) first, then demonstrated consequences, then the documented rationale; say which side is wrong and fix that side (the document included). A recorded rejected alternative stands only while its stated constraint still holds.`

// Every tool result stays in the agent's context and is re-read on each later turn, so output volume
// multiplies cost: in one 77-agent run, cached re-reads were 16 times the new context written.
const OUTPUT = `
Keep tool output small; it stays in your context for the rest of the task. Filter test and build output (\`2>&1 | tail -n 40\`, or grep for FAIL, panic and the failing test), read file ranges rather than whole files, and cap searches (\`grep -m\`, \`| head\`).`

const EVIDENCE = `
Cite only file:line you read in this run. Prefer reproducing a consequence through the public surface (throwaway module outside the repo, deleted afterwards).` + OUTPUT

// ---------- schemas ----------
const FINDING = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'stable kebab-case slug of the root cause' },
    severity: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
    title: { type: 'string' },
    classification: { type: 'string', enum: ['confirmed', 'conditional'] },
    location: { type: 'string' },
    evidence: { type: 'string' },
    impact: { type: 'string' },
    recommendation: { type: 'string' },
    regressionTest: { type: 'string' },
    authorityConflict: { type: 'string' },
  },
  required: ['id', 'severity', 'title', 'classification', 'location', 'evidence', 'impact', 'recommendation'],
}
const REPORT = {
  type: 'object',
  properties: {
    findings: { type: 'array', items: FINDING },
    improvements: { type: 'array', items: { type: 'string' } },
    changeAtADistance: { type: 'array', items: { type: 'string' } },
    coverage: { type: 'array', items: { type: 'string' } },
    ownershipMap: { type: 'array', items: { type: 'string' } },
  },
  required: ['findings', 'coverage'],
}
const SCOPING = {
  type: 'object',
  properties: {
    authorityDocs: { type: 'array', items: { type: 'string' } },
    standard: { type: 'string', description: 'the standard that applies, to hand to every reviewer' },
    allBoundaries: { type: 'array', items: { type: 'string' }, description: 'ranked, each with its consumers' },
    groups: {
      type: 'array',
      items: { type: 'object', properties: { name: { type: 'string' }, boundaries: { type: 'array', items: { type: 'string' } } }, required: ['name', 'boundaries'] },
    },
    coverageNotes: { type: 'array', items: { type: 'string' } },
    report: Object.assign({ description: 'the full review report, present only when the selected boundaries form one group' }, REPORT),
  },
  required: ['standard', 'allBoundaries', 'groups'],
}
const ITEM = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    title: { type: 'string' },
    findingIds: { type: 'array', items: { type: 'string' } },
    disposition: { type: 'string', enum: ['fix-code', 'fix-doc', 'fix-both', 'reject'] },
    authorityAnalysis: { type: 'string' },
    owner: { type: 'string' },
    change: { type: 'string' },
    deletes: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    docUpdates: { type: 'array', items: { type: 'string' } },
    tests: { type: 'string' },
    needsApiDesign: { type: 'boolean' },
    hotPath: { type: 'boolean' },
    changesTests: { type: 'boolean' },
    contractRisk: { type: 'boolean', description: 'changes a public API, persisted or wire format, documented limit or binding spec' },
    dependsOn: { type: 'array', items: { type: 'string' } },
    acceptance: {
      type: 'array',
      description: 'per finding this item fixes: a command that exits 0 once the defect is gone and non-zero while it is present',
      items: { type: 'object', properties: { findingId: { type: 'string' }, command: { type: 'string' }, proves: { type: 'string' } }, required: ['findingId', 'command', 'proves'] },
    },
  },
  required: ['id', 'title', 'findingIds', 'disposition', 'authorityAnalysis', 'owner', 'change', 'files', 'tests', 'needsApiDesign', 'hotPath', 'changesTests', 'contractRisk', 'dependsOn', 'acceptance'],
}
const PLAN = {
  type: 'object',
  properties: {
    items: { type: 'array', items: ITEM },
    rejectedAdvice: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
  },
  required: ['items', 'summary'],
}
const ADVICE = {
  type: 'object',
  properties: {
    approve: { type: 'boolean' },
    blocking: {
      type: 'array',
      items: { type: 'object', properties: { item: { type: 'string' }, issue: { type: 'string' }, evidence: { type: 'string' }, fix: { type: 'string' } }, required: ['item', 'issue', 'evidence', 'fix'] },
    },
    nonBlocking: { type: 'array', items: { type: 'string' } },
  },
  required: ['approve', 'blocking'],
}
const DONE = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['done', 'partial', 'blocked'] },
    summary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    followUps: { type: 'array', items: { type: 'string' } },
  },
  required: ['status', 'summary'],
}
const BATCH_DONE = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: { type: 'object', properties: { id: { type: 'string' }, status: { type: 'string', enum: ['done', 'partial', 'blocked', 'skipped'] }, summary: { type: 'string' } }, required: ['id', 'status', 'summary'] },
    },
    filesChanged: { type: 'array', items: { type: 'string' } },
    followUps: { type: 'array', items: { type: 'string' } },
  },
  required: ['items'],
}
// No `passed` field: the verdict is computed from exit codes (verdictOf), so an agent's reading of a
// conditional or skipped check can never fail, or pass, a run.
const RUN = {
  type: 'object',
  properties: {
    commands: { type: 'array', items: { type: 'object', properties: { command: { type: 'string' }, exitCode: { type: 'integer' } }, required: ['command', 'exitCode'] } },
    failures: { type: 'array', items: { type: 'string' }, description: 'failing package/test and key error lines, for non-zero exits only' },
    notRun: { type: 'array', items: { type: 'string' }, description: 'checks skipped as conditional or out of scope, with the reason' },
    summary: { type: 'string' },
  },
  required: ['commands', 'failures', 'summary'],
}
const PERF = {
  type: 'object',
  properties: {
    measured: { type: 'boolean', description: 'true only if benchstat output for both trees is in hand' },
    regressions: {
      type: 'array',
      items: { type: 'object', properties: { item: { type: 'string' }, benchmark: { type: 'string' }, delta: { type: 'string' }, cause: { type: 'string' } }, required: ['item', 'benchmark', 'delta'] },
    },
    summary: { type: 'string' },
  },
  required: ['measured', 'regressions', 'summary'],
}
const SNAPSHOT = { type: 'object', properties: { sha: { type: 'string' } }, required: ['sha'] }
const ACCEPT = {
  type: 'object',
  properties: {
    checks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'integer', description: 'the index the check was given with' },
          afterExit: { type: 'integer' },
          beforeExit: { type: 'integer' },
          matched: { type: 'boolean', description: 'false when a test command selected no test' },
          beforeFailure: { type: 'string', enum: ['assertion', 'build', 'other', 'none'] },
        },
        required: ['index', 'afterExit', 'beforeExit', 'matched', 'beforeFailure'],
      },
    },
  },
  required: ['checks'],
}
const CRITIQUE = {
  type: 'object',
  properties: { material: { type: 'array', items: { type: 'string' } }, minor: { type: 'array', items: { type: 'string' } } },
  required: ['material'],
}

// Compact JSON: prompts carry these blobs to every agent, so indentation is pure token cost.
const j = (x) => JSON.stringify(x)
// First sentence of an agent summary, for one-line progress logs; full text stays in `history`.
const brief = (s) => { const t = String(s || '').trim().split(/(?<=[.!?])\s/)[0]; return t.length > 200 ? t.slice(0, 199) + '…' : t }
// Benchmark comparisons belong to the round's one perf step; every other agent is told so, because
// a fixer that re-runs the suite on its own costs hours (seen: 2h49m to confirm no regression).
const NO_BENCH = 'Do not run benchmark comparisons or full benchmark suites: the round\'s perf step owns them. Run at most the specific benchmarks a failure or finding names.'
const blockingOf = (fs) => fs.filter((f) => BLOCKING.includes(f.severity))
const active = (p) => p.items.filter((it) => it.disposition !== 'reject')
// What the critic and its fixer need from a plan: what each item changes and how it is proven.
// The planner's authority analysis and routing flags stay with the planner and consultants.
const compactPlan = (p) => ({
  summary: p.summary,
  items: p.items.map((it) => ({ id: it.id, title: it.title, findingIds: it.findingIds, disposition: it.disposition, change: it.change, deletes: it.deletes, files: it.files, docUpdates: it.docUpdates, tests: it.tests, acceptance: it.acceptance })),
})

// Shape check for a checkpoint that went through the caller. Returns problems, empty when usable.
function checkpointProblems(c) {
  const out = []
  const str = (v) => typeof v === 'string' && v.length > 0
  const findings = Array.isArray(c.findings) ? c.findings : (out.push('findings: not an array'), [])
  findings.forEach((f, i) => { if (!f || !str(f.id) || !['Critical', 'High', 'Medium', 'Low'].includes(f.severity)) out.push(`findings[${i}]: needs id and severity`) })
  const ids = new Set(findings.map((f) => f && f.id))
  const items = c.plan && Array.isArray(c.plan.items) ? c.plan.items : (out.push('plan.items: not an array'), [])
  items.forEach((it, i) => {
    const at = `plan.items[${i}]${it && str(it.id) ? ` (${it.id})` : ''}`
    if (!it || !str(it.id) || !str(it.title) || !str(it.change)) return out.push(`${at}: needs id, title and change`)
    if (!['fix-code', 'fix-doc', 'fix-both', 'reject'].includes(it.disposition)) out.push(`${at}: unknown disposition ${JSON.stringify(it.disposition)}`)
    if (!Array.isArray(it.findingIds) || it.findingIds.some((f) => !ids.has(f))) out.push(`${at}: findingIds must name findings in the checkpoint`)
    for (const k of ['files', 'dependsOn', 'acceptance']) if (!Array.isArray(it[k])) out.push(`${at}: ${k} must be an array`)
    if (Array.isArray(it.acceptance)) it.acceptance.forEach((a, n) => { if (!a || !str(a.findingId) || !str(a.command)) out.push(`${at}: acceptance[${n}] needs findingId and command`) })
  })
  const itemIds = items.map((it) => it && it.id)
  for (const id of new Set(itemIds.filter((x, i) => itemIds.indexOf(x) !== i))) out.push(`plan.items: id ${id} used twice`)
  for (const fid of ids) {
    const ds = items.filter((it) => it && Array.isArray(it.findingIds) && it.findingIds.includes(fid)).map((it) => it.disposition === 'reject')
    if (ds.includes(true) && ds.includes(false)) out.push(`finding ${fid}: both rejected and fixed by different items`)
  }
  return out
}

const CONSULTANT_LENSES = [
  { key: 'design-skeptic', text: 'Design and authority skeptic: does each item remove the root cause or patch a symptom; is the disposition right where code, finding and authority documents disagree; are findings misread?' },
  { key: 'simplicity-ownership', text: 'Simplicity and ownership: does every new concept earn its keep; does each fact end with one owner and obsolete paths deleted, with no shims or speculative generality; is scope creeping?' },
  { key: 'risk-contracts', text: 'Risk, verification and external contracts: item ordering and coupling; whether changes preserve binding specs, public API, persisted and wire formats and documented limits (where a spec is doubtful, which observable behaviour should decide); hot-path cost and planned benchmarks; whether tests are contract tests rather than change detectors.' },
]
// A low-risk plan gets one consultant holding all three lenses. "Low risk" is the planner's own flagging,
// so the contract and ordering checks stay, just without three separate opus reads of the same code.
const SOLO_LENS = { key: 'all-lenses', text: CONSULTANT_LENSES.map((l) => l.text).join(' ') }

// ---------- state ----------
// Latest disposition per finding id; earlier rounds' entries for the same id are superseded, not kept.
const ledger = new Map()
const ledgerText = () => (ledger.size ? j([...ledger.values()]) : 'none')
// Latest version of every finding any review raised, so an unresolved one can be carried forward.
const findingById = new Map()
// Blocking findings a round planned but did not prove fixed. They stay open whether or not the
// next review raises them again: a fresh review is no evidence the defect is gone.
// 'planned' counts as open: a round that stopped before acceptance (verify failing, an error) proved nothing.
const isBlocking = (fid) => findingById.has(fid) && BLOCKING.includes(findingById.get(fid).severity)
const unproven = () => [...ledger.values()].filter((e) => (e.status === 'unresolved' || e.status === 'planned') && isBlocking(e.findingId))
const carried = () => unproven().map((e) => findingById.get(e.findingId))
const openFindings = (report) => {
  const own = blockingOf(report.findings)
  return own.concat(carried().filter((f) => !own.some((o) => o.id === f.id)))
}
const history = []
const consultMissing = []
const reviewMissing = []

// ---------- review ----------
// The skill owns the method and defines the three roles of a split review (its "Split review roles"
// section). This script owns the orchestration the skill leaves to it: how many agents, and how the
// boundaries are partitioned among them.
const SKILL_INVOKE = (scope, role) => `Invoke the Skill tool with skill "${SKILL}" and args "${scope}", then follow it. This workflow splits the review across agents and gives you one of the skill's split review roles; you cannot start subagents. YOUR ROLE: ${role}`
const IDS = 'Give each finding a stable kebab-case id, reusing ledger ids for the same root cause.'
// Eight boundaries per agent is the skill's single-reviewer budget, so the selection budget is eight
// per agent: left at the skill's default of eight, every review would collapse to one group. The
// partition keeps related boundaries together so one agent sees both sides of shared knowledge.
const PARTITION = `Your selection budget is ${8 * REVIEWERS} boundaries (eight per review agent), replacing the single-reviewer budget. Partition the selected boundaries into min(${REVIEWERS}, ceil(selected / 8)) groups of at most eight, keeping boundaries that share a module or consumers in the same group; when a related set exceeds eight, split it where the fewest consumers are shared and list the split in coverageNotes.`

async function review(round, scope, focus) {
  phase('Review')
  const ctx = `Repository: current working directory.${focus ? ` ${focus}` : ''}
Prior dispositions ledger. status resolved: its acceptance check failed before the fix and passes now; re-raise it only by naming, with evidence, what that check does not cover. status rejected: re-raise only with evidence rebutting the rationale. status unresolved: still open; the workflow carries it forward, so raise it only with new evidence. Ledger: ${ledgerText()}
${AUTHORITY_STANCE}
${EVIDENCE}${INSTRUCTIONS}`

  // One group means fan-out would only hand the same code to a second and third agent; the lead reviews it alone.
  const scoping = await agent(SKILL_INVOKE(scope, `**Scope**. ${PARTITION} If that gives one group, do not stop there: take the **Group review** and **Merge** roles for it too, reproduce confirmed consequences where feasible, and return the full report in "report". ${IDS} With more than one group, do not review and omit "report".`) + '\n' + ctx,
    { label: `review r${round}: scope`, phase: 'Review', schema: SCOPING })
  if (!scoping) throw new Error('scoping failed')
  log(`review r${round}: ${scoping.allBoundaries.length} boundaries, ${scoping.groups.length} group(s)`)
  if (scoping.groups.length <= 1 && scoping.report) return scoping.report

  const parts = (await parallel(scoping.groups.map((g, i) => () =>
    agent(SKILL_INVOKE(scope, `**Group review**, group ${i + 1} of ${scoping.groups.length}.
Full boundary list: ${j(scoping.allBoundaries)}
Your group "${g.name}": ${j(g.boundaries)}
Standard: ${scoping.standard}`) + '\n' + ctx,
      { label: `review r${round}: ${g.name}`, phase: 'Review', schema: REPORT }))))
  const missing = scoping.groups.filter((g, i) => !parts[i]).map((g) => g.name)
  if (missing.length) {
    reviewMissing.push(...missing.map((g) => `review r${round}: group ${g}`))
    log(`review r${round}: no result from group(s) ${missing.join(', ')}; recorded as uninspected`)
  }

  const merged = await agent(SKILL_INVOKE(scope, `**Merge**. Reproduce confirmed consequences where feasible. ${IDS}
Scoping: ${j(scoping)}
Reviewer results: ${j(parts.filter(Boolean))}${missing.length ? `
These groups returned no result; list their boundaries under Coverage as uninspected: ${j(scoping.groups.filter((g) => missing.includes(g.name)))}` : ''}`) + '\n' + ctx,
    { label: `review r${round}: merge`, phase: 'Review', schema: REPORT })
  if (!merged) throw new Error('merge failed')
  return merged
}

// ---------- plan + consult ----------
const PLAN_RULES = `- Every Critical/High/Medium finding gets an item; a Low one only when it shares the root cause or the same edit. Findings sharing a root cause get one model change, not per-site patches.
- Per item choose fix-code | fix-doc | fix-both | reject after analysing disagreements on the merits. Reject needs evidence the finding is wrong or not worth its cost, never "the docs say so".
${AUTHORITY_STANCE}
- Dependency order. needsApiDesign for exported or cross-package Go API changes (internal packages included); hotPath for hot paths; changesTests when tests are added or materially changed; contractRisk when the item changes a public API, persisted or wire format, documented limit or binding spec.
- docUpdates name the owner document; tests describe observable behaviour through the public surface with expectations from the requirement.
- Implementation runs on a cheaper model: make each item's change concrete (files, symbols, target signatures, deletions) so it needs no further design judgement.
- acceptance: for each Critical/High/Medium finding an item fixes (not reject), at least one shell command, run from the repository root, that exits 0 once the defect is gone and non-zero while it is present. Usually it runs a test the item adds, selected exactly (\`go test -run '^TestName$' ./pkg\`); for a deleted path, a check such as \`! grep -rn 'obsoleteSymbol' internal/\`. The workflow runs it on the tree before the round with the round's test files copied in, and again after: the finding counts as fixed only if it fails before and passes after. Prefer a check that compiles against the pre-round code (through a surface the round does not change), so it fails before by assertion: a check that fails before only because the package does not build is reported as weak evidence. proves says what the passing check shows. An unresolved finding in the ledger needs a stronger fix or a corrected check.${INSTRUCTIONS}`

// Lens consultants re-read the cited code themselves; the planner and reviser keep the full evidence.
const compactFindings = (fs) => fs.map((f) => ({ id: f.id, severity: f.severity, title: f.title, location: f.location, impact: f.impact }))

async function plan(round, findings) {
  phase('Plan')
  const input = j(findings)
  // The consultants' questions, asked by the planner first: in one run every consultant blocked the
  // first draft and QA blocked every round, each costing a revision and a second consult pass.
  const selfCheck = `Before returning, invoke the Skill tool with skill "jacoelho:testing" and apply its criteria to every item's tests and acceptance checks, then check the plan against the questions its reviewers will ask:\n${CONSULTANT_LENSES.map((l) => `- ${l.text}`).join('\n')}`
  let current = await agent(`Plan remediation of architecture findings in the current repository (base ref ${BASE}). Do not edit files.
Read the repository's agent instructions and architecture documents, and the code each finding cites. Each item is a dependency-complete packet (contract, owner, invariant, path, bounds, proof, writeback). Target the clean end state: single owner, obsolete paths deleted, no shims unless a binding contract requires them.
Findings: ${input}
${PLAN_RULES}
Prior ledger: ${ledgerText()}
${selfCheck}${OUTPUT}`, { label: `plan r${round}`, phase: 'Plan', schema: PLAN })
  if (!current) throw new Error('planning failed')

  // The planner already did the research; revision edits only what advice touches.
  const revise = (pass, advice) => agent(`Revise this remediation plan with the consultants' input. Do not edit files. You already researched the plan: re-read only code or documents that a piece of advice cites and you need to judge it. Change only items the advice concerns; return every other item unchanged.
You own the decision: adopt what the evidence supports; list the rest in rejectedAdvice with the reason. Consultants can be wrong. Fold the qa-tests specifications you adopt into each item's tests field verbatim (they are the QA assessment the implementer will follow) and the api-design surfaces into each item's change.
Findings: ${input}
${PLAN_RULES}
Current plan: ${j(current)}
Advice: ${j(advice)}${OUTPUT}`, { label: `revise r${round}.${pass}`, phase: 'Plan', schema: PLAN })

  const isRisky = (pl) => active(pl).some((it) => it.contractRisk || it.hotPath || it.needsApiDesign)
  const lensesFor = (pl) => (isRisky(pl)
    ? Array.from({ length: CONSULTANTS }, (_, i) => CONSULTANT_LENSES[i % CONSULTANT_LENSES.length])
    : Array.from({ length: LOW_RISK_CONSULTANTS }, (_, i) => (i === 0 ? SOLO_LENS : CONSULTANT_LENSES[(i + 1) % CONSULTANT_LENSES.length])))
  const needsQa = (pl) => active(pl).some((it) => it.changesTests)
  const needsApi = (pl) => active(pl).some((it) => it.needsApiDesign)
  const lenses = lensesFor(current)
  log(`plan r${round}: ${isRisky(current) ? 'risky' : 'low-risk'} plan, ${lenses.length} consultant(s)`)

  const tag = (key, a) => (a ? Object.assign({ lens: key }, a) : null)
  const consult = (lens, i, n, pl, focus, pass) => consultOnce(`You are consultant ${i + 1}/${n}, independent of the others, reviewing a remediation plan. Lens: ${lens.text}
Read the code the plan touches; do not edit files. Approve unless an issue would make the change wrong, incomplete or harmful; each blocking issue needs evidence (file:line, spec text or a concrete scenario) and a concrete fix. Preferences go in nonBlocking.
${focus || ''}Findings: ${j(compactFindings(findings))}
Plan: ${j(pl)}
${AUTHORITY_STANCE}
${EVIDENCE}${INSTRUCTIONS}`, { label: `consult r${round}.${pass} #${i + 1} ${lens.key}`, phase: 'Consult', schema: ADVICE })
    .then((a) => tag(lens.key, a))
  const qa = (pl, focus, pass) => agent(`Invoke the Skill tool with skill "jacoelho:testing", then follow it to assess, as one batch, the tests this remediation plan proposes before any are written. Do not edit files. For each item with changesTests: are the proposed tests contract tests with expectations from the requirement, at the right level, covering boundaries, failure and opposing shapes; which are change detectors or tautologies; which existing tests must be rewritten or deleted. Return blocking issues (wrong or missing proof) with a concrete test specification each, and the final test specification per item id in nonBlocking.
${focus || ''}Plan: ${j(pl)}
Testing boundaries: the repository's verification contract and test documentation.${OUTPUT}${INSTRUCTIONS}`,
    { label: `consult r${round}.${pass} qa-tests`, phase: 'Consult', schema: ADVICE }).then((a) => tag('qa-tests', a))
  const api = (pl, focus, pass) => agent(`Invoke the Skill tool with skill "jacoelho:programming-go-api-design", then follow it. Task mode: review. Review, as one batch, every exported or cross-package Go API change in this remediation plan (items with needsApiDesign). Callers: find with gopls references. Compatibility: internal packages carry no external obligations; the root module's exported API is binding unless an item says otherwise. Permitted edits: none. Return blocking issues with the recommended surface and caller examples per item id.${OUTPUT}${INSTRUCTIONS}
${focus || ''}Plan: ${j(pl)}`,
    { label: `consult r${round}.${pass} api-design`, phase: 'Consult', schema: ADVICE }).then((a) => tag('api-design', a))

  // Pass 1: every consultant on the whole plan, plus the specialists once as a batch over the plan
  // (one QA assessment covers a coherent batch, and API decisions belong in the plan, not after it).
  phase('Consult')
  const thunks = lenses.map((l, i) => () => consult(l, i, lenses.length, current, '', 1).then((a) => (a ? Object.assign(a, { idx: i }) : null)))
  const ranQa = needsQa(current)
  const ranApi = needsApi(current)
  if (ranQa) thunks.push(() => qa(current, '', 1))
  if (ranApi) thunks.push(() => api(current, '', 1))
  const adviceAll = await parallel(thunks)
  const advice = adviceAll.filter(Boolean)
  if (advice.length < thunks.length) {
    const n = thunks.length - advice.length
    consultMissing.push(`plan r${round} pass 1: ${n} of ${thunks.length} reviewer(s) returned no result`)
    log(`plan r${round}: ${n} of ${thunks.length} pass-1 reviewer(s) returned no result; the plan had fewer checks`)
  }
  const blockers = advice.reduce((n, a) => n + a.blocking.length, 0)
  log(`plan r${round} advice pass 1: ${blockers} blocking`)
  // Specialist output must be folded into items even when nothing blocks; otherwise the plan stands as is.
  if (!blockers && !ranQa && !ranApi) return current
  const before = current
  const revised = await revise(1, advice)
  if (revised) current = revised
  if (!blockers) return current

  // Pass 2 reviews what revision produced, not the whole plan again. Its scope is every item the
  // revision added or changed (whoever asked for it), plus each reviewer's own blocked items; its
  // reviewers are those that blocked, specialists included. A plan that revision made risky, or that
  // now needs a specialist pass 1 did not run, gets that review in full.
  phase('Consult')
  const old = new Map(before.items.map((it) => [it.id, j(it)]))
  const changed = current.items.filter((it) => old.get(it.id) !== j(it))
  const removed = before.items.filter((it) => !current.items.some((x) => x.id === it.id)).map((it) => it.id)
  const scopeFor = (blocking) => {
    const ids = new Set(blocking.map((b) => b.item))
    const items = current.items.filter((it) => ids.has(it.id) || changed.includes(it))
    return { summary: current.summary, removedItemIds: removed, items }
  }
  const recheckFocus = (blocking) => `This is a re-check after revision. Your pass-1 blocking issues were: ${j(blocking)}. The items below are those the revision added or changed plus those you blocked; removedItemIds were dropped. Judge whether your issues are resolved and whether any shown item now has a blocking issue under your lens.\n`
  const thunks2 = []
  const newlyRisky = !isRisky(before) && isRisky(current)
  if (newlyRisky) {
    const full = lensesFor(current)
    full.forEach((l, i) => thunks2.push(() => consult(l, i, full.length, current, 'Revision made this plan touch a contract, hot path or exported API; review it in full.\n', 2)))
  } else {
    lenses.forEach((l, i) => {
      const a = advice.find((x) => x.idx === i && x.blocking.length)
      if (a) thunks2.push(() => consult(l, i, lenses.length, scopeFor(a.blocking), recheckFocus(a.blocking), 2))
    })
  }
  const blockedBy = (key) => advice.find((x) => x.lens === key && x.blocking.length)
  if (blockedBy('qa-tests')) thunks2.push(() => qa(scopeFor(blockedBy('qa-tests').blocking), recheckFocus(blockedBy('qa-tests').blocking), 2))
  else if (!ranQa && needsQa(current)) thunks2.push(() => qa(current, '', 2))
  if (blockedBy('api-design')) thunks2.push(() => api(scopeFor(blockedBy('api-design').blocking), recheckFocus(blockedBy('api-design').blocking), 2))
  else if (!ranApi && needsApi(current)) thunks2.push(() => api(current, '', 2))
  const advice2 = (await parallel(thunks2)).filter(Boolean)
  if (advice2.length < thunks2.length) {
    consultMissing.push(`plan r${round} pass 2: ${thunks2.length - advice2.length} of ${thunks2.length} re-check(s) returned no result`)
    log(`plan r${round}: ${thunks2.length - advice2.length} pass-2 re-check(s) returned no result`)
  }
  const blockers2 = advice2.reduce((n, a) => n + a.blocking.length, 0)
  log(`plan r${round} advice pass 2 (${thunks2.length} reviewer(s), ${changed.length} changed item(s)): ${blockers2} blocking`)
  // A specialist that first ran in pass 2 still has output to fold in.
  const late = advice2.some((a) => (a.lens === 'qa-tests' && !ranQa) || (a.lens === 'api-design' && !ranApi))
  if (!blockers2 && !late) return current
  const revised2 = await revise(2, advice2)
  return revised2 || current
}

// ---------- implement ----------
// Items that depend on each other or share files go to one implementer, in plan order, at most BATCH_SIZE
// per agent: fewer cold starts re-loading the same context, and no two agents editing one file in sequence blind.
function batches(items) {
  const parent = new Map(items.map((it) => [it.id, it.id]))
  const find = (x) => (parent.get(x) === x ? x : (parent.set(x, find(parent.get(x))), parent.get(x)))
  const union = (a, b) => { if (parent.has(a) && parent.has(b)) parent.set(find(a), find(b)) }
  const byFile = new Map()
  for (const it of items) {
    for (const d of it.dependsOn || []) union(it.id, d)
    for (const f of it.files || []) { if (byFile.has(f)) union(it.id, byFile.get(f)); else byFile.set(f, it.id) }
  }
  const clusters = new Map()
  for (const it of items) {
    const root = find(it.id)
    if (!clusters.has(root)) clusters.set(root, [])
    clusters.get(root).push(it)
  }
  const out = []
  for (const c of clusters.values()) for (let k = 0; k < c.length; k += BATCH_SIZE) out.push(c.slice(k, k + BATCH_SIZE))
  return out
}

async function implement(round, p, snap) {
  phase('Implement')
  const results = []
  // An item that did not finish poisons everything depending on it, across batches too: a split
  // cluster's later batch must not build on an earlier batch's blocked or partial item.
  const unfinished = new Set()
  for (const all of batches(active(p))) {
    const batch = []
    for (const it of all) {
      if ((it.dependsOn || []).some((d) => unfinished.has(d))) { unfinished.add(it.id); results.push({ items: it.id, done: { items: [{ id: it.id, status: 'skipped', summary: 'depends on an unfinished item' }] } }) }
      else batch.push(it)
    }
    if (!batch.length) continue
    const ids = batch.map((it) => it.id).join(', ')
    const done = await agent(`Implement exactly these remediation items in the current working tree, in the order given (round ${round}). Do not commit, push or switch branches. Preserve other edits in the tree.
Items: ${j(batch)}
Plan summary: ${p.summary}${INSTRUCTIONS}
Each item's change already includes the API-design review and its tests field is the QA assessment: write only those tests; anything more goes in followUps as a spec.
Use gopls for identifier lookup and renames. Delete the obsolete path in the same change. Update the listed documents so code, docs and tests agree. gofmt changed files. After each item, run the affected packages' tests until they pass before starting the next. If an item is wrong or underspecified, report it blocked with the reason instead of improvising a design, and mark items that depend on it skipped. ${NO_BENCH}${OUTPUT}`,
      { label: `impl ${ids}`, phase: 'Implement', schema: BATCH_DONE, model: IMPL_MODEL, effort: IMPL_EFFORT })
    results.push({ items: ids, done })
    const status = new Map(done ? done.items.map((r) => [r.id, r.status]) : [])
    for (const it of batch) if (status.get(it.id) !== 'done') unfinished.add(it.id)
    log(done ? done.items.map((r) => `${r.id}: ${r.status}: ${brief(r.summary)}`).join('; ') : `${ids}: no result`)
  }
  return { results, perf: await measure(round, p, snap) }
}

// One serialised benchmark comparison per round covering every hot-path item, not one per item.
// Returns null when no item is on a hot path; otherwise a PERF record, `measured: false` when the
// agent died or returned without numbers, so the critic and the caller see the gap instead of a
// fixer re-running the suite to fill it.
async function measure(round, p, snap) {
  const hot = active(p).filter((it) => it.hotPath)
  if (!hot.length) return null
  const perf = await agent(`Measure the performance effect of this round's remediation on the hot paths it touches: ${j(hot.map((h) => ({ id: h.id, title: h.title, files: h.files })))}.
Compare the pre-round tree (\`git worktree add --detach\` at ${snap}, the snapshot taken before this round, in a temp dir, removed afterwards) against the current working tree: select only benchmarks exercising those paths (the repository's documented comparison workloads where they apply), -benchmem, -count >= 10, serialised runs, benchstat. Edit scope: none. Report regressions per item with numbers and likely cause.
Wait for every run to finish before you return: this result is final and nothing reads a later notification, so returning while a benchmark is still running loses the measurement. measured is true only if you hold benchstat output for both trees.${OUTPUT}`,
    { label: `perf r${round}`, phase: 'Implement', agentType: 'jacoelho:programming-go-performance', schema: PERF })
  const out = perf || { measured: false, regressions: [], summary: 'perf agent returned no result' }
  log(`perf r${round}: ${out.measured ? `${out.regressions.length} regression(s)` : 'NOT measured'}: ${brief(out.summary)}`)
  return out
}

// ---------- snapshot ----------
// The tree before a round, as a commit, built through a temporary index so the user's index and
// working tree are untouched. Round 1's edits are never committed, so baseRef is not "before round 2".
// The commit is unreferenced; git gc prunes it after its expiry window.
async function snapshot(round) {
  phase('Implement')
  const cmd = `T=$(mktemp) && cp "$(git rev-parse --git-path index)" "$T" && GIT_INDEX_FILE="$T" git add -A && git commit-tree "$(GIT_INDEX_FILE="$T" git write-tree)" -p HEAD -m "architecture-remediate: before round ${round}"; S=$?; rm -f "$T"; exit $S`
  const r = await agent(`Run exactly this shell command from the repository root and return the commit id it prints as sha. Do not edit files or run anything else.\n${cmd}`,
    { label: `snapshot r${round}`, phase: 'Implement', schema: SNAPSHOT, model: RUN_MODEL, effort: 'low' })
  const sha = r && String(r.sha).trim()
  if (!sha || !/^[0-9a-f]{40}([0-9a-f]{24})?$/.test(sha)) throw new Error(`snapshot r${round} returned no commit id (${r ? JSON.stringify(r.sha) : 'no result'})`)
  return sha
}

// The current tree as a tree object, built the same way as the snapshot. Plain \`git diff <snap>\`
// compares only paths in the user's index, so files that were untracked at the snapshot (every
// earlier round's new files) would read as deleted.
const CURRENT_TREE = `$(T=$(mktemp) && cp "$(git rev-parse --git-path index)" "$T" && GIT_INDEX_FILE="$T" git add -A && GIT_INDEX_FILE="$T" git write-tree; rm -f "$T")`
const roundDiff = (snap, flags) => `git diff${flags ? ' ' + flags : ''} ${snap} "${CURRENT_TREE}"`

// ---------- acceptance ----------
// Every check the plan declared is judged in code from exit codes: fixed means it fails on the
// pre-round tree (with this round's tests copied in) and passes now. A check the agent did not
// report, or a test command that selected no test, proves nothing.
async function accept(round, p, snap) {
  phase('Accept')
  const checks = active(p).flatMap((it) => (it.acceptance || []).map((a) => ({ findingId: a.findingId, command: a.command }))).map((c, index) => ({ index, ...c }))
  const res = checks.length ? await agent(`Run acceptance checks for remediation round ${round}. Do not edit the working tree.
After: run each command from the repository root of the current working tree.
Before: \`git worktree add --detach <tmp> ${snap}\` (the tree before this round), apply this round's test-file changes to it as a patch, so added, edited, deleted and moved tests all carry over (\`${roundDiff(snap, '--binary')} -- <test paths> | git -C <tmp> apply\`, with pathspecs for the repository's test files; for Go, '*_test.go' '*testdata/*'), run each command there, then remove the worktree.
Return one entry per check with the index it was given. Report each command's exact exit codes. Set matched false when a test command selected no test (for go test, "no tests to run" or no test listed under -v). For a non-zero before exit, say whether it failed on a build error, an assertion or something else.${OUTPUT}
Checks: ${j(checks)}`, { label: `accept r${round}`, phase: 'Accept', schema: ACCEPT, model: RUN_MODEL, effort: 'low' }) : null
  const reported = (res && res.checks) || []
  const judged = checks.map((c) => {
    const r = reported.find((x) => x.index === c.index)
    const why = !r ? (res ? 'not reported' : 'acceptance run returned no result')
      : r.matched === false ? 'selected no test'
      : r.afterExit !== 0 ? `fails after the fix (exit ${r.afterExit})`
      : r.beforeExit === 0 ? 'passes before the fix, so it does not detect the defect'
      : ''
    return { ...c, passed: !why, why, weak: !why && r.beforeFailure === 'build' }
  })
  // A finding is fixed when it has at least one check and every check passed.
  // A finding several items share is judged once over all their checks; a reject only stands
  // when no item fixes it. A Low finding needs no check, so having none is not a failure.
  const out = new Map()
  for (const fid of new Set(p.items.flatMap((it) => it.findingIds))) {
    if (!active(p).some((it) => it.findingIds.includes(fid))) { out.set(fid, { status: 'rejected' }); continue }
    const mine = judged.filter((c) => c.findingId === fid)
    const failed = mine.filter((c) => !c.passed)
    out.set(fid, !mine.length ? (isBlocking(fid) ? { status: 'unresolved', reason: 'no acceptance check' } : { status: 'unchecked' })
      : failed.length ? { status: 'unresolved', reason: failed.map((c) => `${c.command}: ${c.why}`).join('; ') }
      : { status: 'resolved', check: mine.map((c) => c.command).join(' && '), weak: mine.some((c) => c.weak) })
  }
  const vals = [...out.values()]
  log(`accept r${round}: ${vals.filter((v) => v.status === 'resolved').length} resolved, ${vals.filter((v) => v.status === 'unresolved').length} unresolved${judged.some((c) => c.weak) ? ', some proven only by a build failure on the old tree' : ''}`)
  return { byFinding: out, checks: judged }
}

// ---------- verify ----------
async function verify(label) {
  phase('Verify')
  for (let attempt = 1; attempt <= 3; attempt++) {
    const run = await agent(`Run ${VERIFY} in the current working directory. Do not edit files. Report every command you ran with its exact exit code (never infer success from output text). For non-zero exits give the failing package/test and key error lines, not full logs. ${NO_BENCH} List any check you did not run under notRun with the reason; a check not run is not a failure.${OUTPUT}`,
      { label: `verify ${label}.${attempt}`, phase: 'Verify', schema: RUN, model: RUN_MODEL, effort: 'low' })
    const v = verdictOf(run)
    log(`verify ${label}.${attempt}: ${v.passed ? 'passed' : `FAILED: ${v.failed.join('; ') || 'no commands reported'}`}`)
    if (v.passed || attempt === 3) return v
    const fixLabel = attempt === 1 ? `fix ${label}.${attempt}` : `fix ${label}.${attempt} (escalated)`
    const fix = await agent(`Verification failed after architecture remediation. Fix the root cause in the working tree without weakening or deleting tests and without reverting the remediation's intent; if a test encodes removed behaviour, move it to the new contract and say so. Do not commit. ${NO_BENCH}${OUTPUT}${INSTRUCTIONS}
Failures: ${j(run)}`,
      attempt === 1 ? { label: fixLabel, phase: 'Verify', schema: DONE, model: IMPL_MODEL, effort: IMPL_EFFORT } : { label: fixLabel, phase: 'Verify', schema: DONE, model: ESCALATE_MODEL })
    fixes.push(fixRecord(fixLabel, fix))
  }
}

// The verdict is the exit codes, nothing else: a run with no commands, or any non-zero exit, fails.
function verdictOf(run) {
  if (!run) return { passed: false, failed: [], failures: ['verify returned no result'], notRun: [], summary: '' }
  const failed = run.commands.filter((c) => c.exitCode !== 0).map((c) => `${c.command} (exit ${c.exitCode})`)
  return { passed: run.commands.length > 0 && !failed.length, failed, failures: run.failures, notRun: run.notRun || [], summary: run.summary }
}

// Fix agents change the tree, so their outcome is part of the round's record, not discarded.
function fixRecord(label, done) {
  const r = done ? { label, status: done.status, summary: done.summary, filesChanged: done.filesChanged || [] } : { label, status: 'no result', summary: '', filesChanged: [] }
  log(`${label}: ${r.status}${r.summary ? `: ${brief(r.summary)}` : ''}`)
  return r
}

// ---------- critic ----------
// At most CRITIC_FIXES fixes, and every fix is followed by another critic pass: the last fix is
// reviewed too, and what that final pass still finds is reported unresolved.
const CRITIC_FIXES = 2
async function critique(round, p, ver, perf, snap) {
  phase('Critic')
  let crit = null
  // Each pass replaces crit, so the latest verification lives outside it.
  let verified = null
  for (let pass = 1; ; pass++) {
    crit = await agent(`Requirements: resolve these architecture findings per the plan, preserving all binding contracts.${INSTRUCTIONS}
Plan: ${j(compactPlan(p))}
This round's diff: \`${roundDiff(snap)}\`; all remediation so far: \`git diff ${BASE}\` plus untracked files from \`git status\`.
Verification evidence: ${j(ver)}
Performance evidence (this round's only benchmark comparison, run before any critic fix): ${perf ? j(perf) : 'none: no item is on a hot path'}
Judge regressions from that evidence; do not run benchmark comparisons yourself. A missing or unmeasured comparison is already reported to the user by the workflow; do not raise it as a finding.
Return material findings (concrete failure modes) and minor ones.${OUTPUT}`,
      { label: `critic r${round}.${pass}`, phase: 'Critic', agentType: 'jacoelho:critic', schema: CRITIQUE })
    if (!crit) { crit = { material: [`critic r${round}.${pass} returned no result: this round's diff was not critic-reviewed`], minor: [], ran: false }; log(`critic r${round}.${pass}: no result`); break }
    log(`critic r${round}.${pass}: ${crit.material.length} material, ${(crit.minor || []).length} minor${crit.material.length ? `: ${crit.material.map(brief).join(' | ')}` : ''}`)
    if (!crit.material.length || pass > CRITIC_FIXES) break
    const fixLabel = `critic-fix r${round}.${pass}`
    const fix = await agent(`Resolve these material critic findings in the working tree within the plan's scope. Do not commit. Run the affected packages' tests. ${NO_BENCH}${OUTPUT}${INSTRUCTIONS}
${j(crit.material)}
Plan: ${j(compactPlan(p))}`,
      { label: fixLabel, phase: 'Critic', schema: DONE, model: ESCALATE_MODEL })
    fixes.push(fixRecord(fixLabel, fix))
    verified = await verify(`r${round}c${pass}`)
    if (!verified.passed) { crit.material.push('verification failing after critic fixes: ' + j(verified)); break }
  }
  return Object.assign(crit, { verify: verified })
}

// ---------- loop ----------
const FULL_FOCUS = `Base ref ${BASE}: the branch diff and uncommitted work against it are remediation from earlier rounds; treat what it touches as changed boundaries.`
// What a follow-up review covers. A caller-supplied followUpScope replaces both kinds; history records
// it as 'caller', since it is not a review of the whole remediation.
const followUp = (kind, round, snap) => (A.followUpScope ? { kind: 'caller', scope: A.followUpScope, focus: FULL_FOCUS }
  : kind === 'round' ? { kind, scope: roundScope(round, snap), focus: `Round ${round}'s changes: \`${roundDiff(snap)}\`. Earlier rounds' fixes are in the ledger; review them only where this round's changes touch or rely on them.` }
  : { kind: 'full', scope: FULL_SCOPE, focus: FULL_FOCUS })
// A run over its token budget dies mid-round with no result and an unverified tree, so each kind of
// spend is checked before it starts, whatever transition leads there. Before a review: the costliest
// review so far. Before an implementation round: the costliest cycle (review and round) plus one more
// review, since a clean stop after the round needs a round review and a full review.
const BUDGET = typeof budget === 'undefined' ? { total: null, spent: () => 0, remaining: () => Infinity } : budget
let costliestCycle = 0
let costliestReview = 0
const overBudget = (need, before) => (BUDGET.total && BUDGET.remaining() < need ? { kind: 'budget', remaining: BUDGET.remaining(), need, before, scope: next.kind } : null)
let reviewRound = 0
let implRounds = 0
let dry = 0
let lastReview = null
// Why the loop ended, as one tagged value; `stopReason` and the advice in `next` are both derived
// from it, so a new kind of stop cannot go unexplained.
//   plan-ready | review-incomplete {round, missing} | review-only | clean {dry} | max-rounds {open}
//   | budget {remaining, need, before: review | round, scope} | verify-failing {round} | error {message}
let stop = null
// Output tokens the turn had spent when the loop started; the script can read no clock and no
// input-token count, so `cost` is a floor and the caller adds the harness's figures (COST_REPORT).
const spentAtStart = BUDGET.spent()
const unresolvedCritic = []
// Rounds whose hot-path changes have no benchmark comparison: surfaced, never silently re-run.
const unmeasured = []
// Verify-fix and critic-fix outcomes of the current round, in order.
let fixes = []
// The one record of what the working tree holds; `next` is derived from it, never guessed from the
// stop reason. untouched: no round started. unverified: a round started and did not reach a
// verification (an error mid-round). verified / failing: the last verification of the tree.
let tree = 'untouched'
// The round-1 plan and the findings it answers, returned at a plan-ready stop for approval.
let checkpoint = null
// What the next review covers: round 1's scope, the last round's changes, or the whole remediation.
let next = { kind: 'initial', scope: SCOPE, focus: '' }

// Any throw (a dead scoping, merge or plan agent; the token budget running out mid-round) still
// returns the report: after round 1 the tree may hold edits the caller must know about.
try {
  while (true) {
    if ((stop = overBudget(costliestReview, 'review'))) break
    const cycleStart = BUDGET.spent()
    reviewRound++
    // An approved checkpoint stands in for round 1's review and plan: the user has already judged both.
    const approved = APPROVED && reviewRound === 1 ? APPROVED : null
    const missingBefore = reviewMissing.length
    lastReview = approved
      ? { findings: approved.findings, coverage: approved.coverage || [], improvements: approved.improvements || [] }
      : await review(reviewRound, next.scope, next.focus)
    if (!approved) costliestReview = Math.max(costliestReview, BUDGET.spent() - cycleStart)
    const reviewed = approved ? 'initial' : next.kind
    for (const f of lastReview.findings) findingById.set(f.id, f)
    const open = openFindings(lastReview)
    log(`review r${reviewRound}${approved ? ' (approved checkpoint)' : ''}: ${lastReview.findings.length} findings, ${open.length} open Critical/High/Medium`)
    history.push({ review: reviewRound, approved: !!approved, scope: reviewed, findings: lastReview.findings.map((f) => `${f.severity} ${f.id}`), carried: carried().map((f) => f.id) })
    if (!approved) {
      // A review with dead groups cannot certify the scope clean, nor be reported as a complete review.
      const incomplete = reviewMissing.length > missingBefore
      if (incomplete && (REVIEW_ONLY || !open.length)) { stop = { kind: 'review-incomplete', round: reviewRound, missing: reviewMissing.length - missingBefore }; break }
      if (REVIEW_ONLY) { stop = { kind: 'review-only' }; break }
      if (!open.length) {
        // A clean review of one round's changes cannot certify the whole remediation.
        if (reviewed === 'round') { next = followUp('full'); continue }
        dry++
        if (dry >= DRY_ROUNDS) { stop = { kind: 'clean', dry }; break }
        if (reviewed !== 'initial') next = followUp('full')
        continue
      }
    }
    dry = 0
    if (implRounds >= MAX_ROUNDS) { stop = { kind: 'max-rounds', open: open.length }; break }
    if (costliestCycle && (stop = overBudget(costliestCycle + costliestReview, 'round'))) break
    // Carried findings go back to the planner even when this review did not raise them again.
    const input = lastReview.findings.concat(carried().filter((f) => !lastReview.findings.some((x) => x.id === f.id)))
    const p = approved ? approved.plan : await plan(implRounds + 1, input)
    if (implRounds === 0 && !approved && !AUTO_APPROVE) {
      checkpoint = { findings: lastReview.findings, coverage: lastReview.coverage || [], improvements: lastReview.improvements || [], reviewMissing: reviewMissing.slice(), plan: p }
      stop = { kind: 'plan-ready' }
      break
    }
    implRounds++
    for (const fid of new Set(p.items.flatMap((it) => it.findingIds))) {
      const it = active(p).find((x) => x.findingIds.includes(fid)) || p.items.find((x) => x.findingIds.includes(fid))
      ledger.set(fid, { round: implRounds, findingId: fid, disposition: it.disposition, status: it.disposition === 'reject' ? 'rejected' : 'planned', rationale: it.disposition === 'reject' ? it.authorityAnalysis : it.change.slice(0, 300) })
    }
    // The planner must answer every open blocking finding; one it left out stays open and returns next round.
    const omitted = open.filter((f) => !p.items.some((it) => it.findingIds.includes(f.id)))
    for (const f of omitted) ledger.set(f.id, { round: implRounds, findingId: f.id, disposition: 'none', status: 'unresolved', reason: 'no plan item' })
    if (omitted.length) log(`plan r${implRounds}: no item for ${omitted.map((f) => f.id).join(', ')}; carried to the next round`)
    const snap = await snapshot(implRounds)
    next = followUp('round', implRounds, snap)
    tree = 'unverified'
    fixes = []
    const impl = await implement(implRounds, p, snap)
    const ver = await verify(`r${implRounds}`)
    const crit = await critique(implRounds, p, ver, impl.perf, snap)
    // The tree's state is its LAST verification: the critic's fixes, when they ran, come after `ver`.
    const last = (crit && crit.verify) || ver
    tree = last.passed ? 'verified' : 'failing'
    // Acceptance runs on the final tree of the round; a failing tree stops the run before it.
    const acc = tree === 'verified' ? await accept(implRounds, p, snap) : null
    if (acc) for (const [fid, v] of acc.byFinding) ledger.set(fid, Object.assign(ledger.get(fid), v))
    // History is returned to the calling session, so it records outcomes, not full plans and transcripts.
    history.push({
      round: implRounds,
      items: p.items.map((it) => `${it.id} [${it.disposition}] ${it.title}`),
      rejectedAdvice: p.rejectedAdvice || [],
      impl: impl.results.map((r) => ({ items: r.items, results: r.done ? r.done.items : 'no result', followUps: r.done ? r.done.followUps || [] : [] })),
      perf: impl.perf,
      fixes,
      verify: { passed: last.passed, failed: last.failed, failures: last.failures, notRun: last.notRun, afterCriticFixes: last !== ver },
      critic: crit ? { material: crit.material, minor: crit.minor || [] } : null,
      acceptance: acc ? acc.checks : null,
    })
    costliestCycle = Math.max(costliestCycle, BUDGET.spent() - cycleStart)
    if (crit && crit.material.length) unresolvedCritic.push(...crit.material.map((m) => `round ${implRounds}: ${m}`))
    if (impl.perf && !impl.perf.measured) unmeasured.push(implRounds)
    if (tree === 'failing') { stop = { kind: 'verify-failing', round: implRounds }; break }
  }
} catch (e) {
  stop = { kind: 'error', message: e && e.message ? e.message : String(e) }
}

// The caller-facing wording of each stop (stopReason) and what to do about it (part of `next`).
// A switch with no default: an unhandled kind throws here, in tests, rather than reading as ''.
function describeStop(st) {
  const k = (n) => `${Math.round(n / 1000)}k`
  switch (st.kind) {
    case 'plan-ready': return { reason: 'round-1 plan ready for approval', why: (reviewMissing.length ? `The review was incomplete (checkpoint.reviewMissing: ${reviewMissing.join('; ')}); say so when showing the plan. ` : '') + 'Show the user checkpoint.plan (items, dispositions, acceptance checks) against checkpoint.findings and ask whether to proceed. To proceed, call again with the same args plus approvedPlan: the checkpoint, with any edits the user asks for. Pass autoApprove: true to skip this stop.' }
    case 'review-incomplete': return { reason: `review r${st.round} incomplete: ${st.missing} group(s) returned no result`, why: 'The scope was not fully reviewed (reviewMissing); re-run before trusting the result.' }
    case 'review-only': return { reason: 'review only', why: 'Review only, as requested: the findings are in finalFindings; nothing was planned.' }
    case 'clean': return { reason: `only Low findings for ${st.dry} consecutive whole-scope review(s)`, why: 'Only Low findings remain (finalFindings).' }
    case 'max-rounds': return { reason: `maxRounds (${MAX_ROUNDS}) reached with ${st.open} blocking finding(s)`, why: 'Blocking findings remain (remainingBlocking); re-run with a narrower scope or instructions.' }
    case 'budget': return {
      reason: `token budget: ${k(st.remaining)} left, ${st.before === 'round' ? 'another round and its reviews need' : 'the next review needs'} about ${k(st.need)}`,
      why: st.before === 'round' ? 'Stopped before another round to stay within the token budget.' : {
        initial: 'Stopped before re-reviewing the scope (dryRounds) to stay within the token budget.',
        round: 'The last round\'s changes were NOT reviewed; run /jacoelho:architecture-review on them before committing.',
        full: 'The last round\'s changes reviewed clean, but the whole remediation was NOT reviewed as a whole against baseRef; run /jacoelho:architecture-review on the diff before committing.',
        caller: 'The last round was NOT reviewed in followUpScope; review it before committing.',
      }[st.scope],
    }
    case 'verify-failing': return { reason: `verification failing after round ${st.round}`, why: `Verification still fails after round ${st.round}'s fix attempts (last history entry); fix or revert before re-running.` }
    case 'error': return { reason: `error: ${st.message}`, why: `The run failed: ${st.message}.` }
  }
  throw new Error(`architecture-remediate: no description for stop kind ${JSON.stringify(st && st.kind)}`)
}
const described = describeStop(stop)
const stopReason = described.reason
log(`stopped: ${stopReason}`)

// What the caller owes the user about cost. The harness alone knows the agents, total tokens and
// running time of a run (the usage block of its completion notification); the script can only ask
// for them to be reported, and add what it does know.
const COST_REPORT = 'Report what the run cost, in the same summary as its result: helper agents, tokens and running time from the usage block of this run\'s completion notification, with the reviews and rounds in `cost`. Say that the figures exclude the calling session, and that another run of the same number of rounds will cost about the same whatever its scope.'
const unresolvedFindings = unproven()
const weakFindings = [...ledger.values()].filter((e) => e.status === 'resolved' && e.weak).map((e) => e.findingId)
const TREE = {
  untouched: 'Nothing was changed: no remediation round ran.',
  unverified: 'The run stopped mid-round, so the working tree may hold UNVERIFIED edits. Inspect git diff against baseRef before anything else; do not commit as is.',
  verified: 'The working tree holds verified, uncommitted remediation. Show the user git diff against baseRef for review before committing.',
  failing: 'The working tree holds remediation whose verification FAILS (last history entry). Do not commit: inspect git diff and fix or revert first.',
}
return {
  started: true,
  stopKind: stop.kind,
  stopReason,
  tree,
  next: [TREE[tree], described.why, unresolvedFindings.length ? `${unresolvedFindings.length} planned finding(s) are not proven fixed (unresolvedFindings).` : '', weakFindings.length ? `Finding(s) ${weakFindings.join(', ')} count as fixed only because their check did not build on the old tree; review those checks before trusting the fix.` : '', unresolvedCritic.length ? 'Unresolved critic findings need attention first (unresolvedCritic).' : '', unmeasured.length ? `Hot-path changes in round(s) ${unmeasured.join(', ')} have no benchmark comparison (history[].perf); measure before committing.` : '', COST_REPORT].filter(Boolean).join(' '),
  cost: { reviews: reviewRound, rounds: implRounds, outputTokens: BUDGET.spent() - spentAtStart },
  checkpoint,
  unresolvedFindings,
  weakFindings,
  unresolvedCritic,
  unmeasured,
  consultMissing,
  reviewMissing,
  history,
  ledger: [...ledger.values()],
  finalFindings: lastReview ? lastReview.findings : null,
  remainingBlocking: lastReview ? openFindings(lastReview) : null,
  improvements: lastReview ? lastReview.improvements : null,
  coverage: lastReview ? lastReview.coverage : null,
}
