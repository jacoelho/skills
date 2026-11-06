export const meta = {
  name: 'architecture-remediate',
  description: 'Loop: /jacoelho:architecture-review -> plan -> risk-sized consultants -> batched implement -> verify -> critic, until only Low findings remain (Go-oriented defaults)',
  whenToUse: 'Fix architecture findings end to end, editing the working tree without committing. Args: {scope (required), baseRef="main", instructions}; a bare string is the scope. If the user named no scope, ask for one instead of calling with none: a bare call starts nothing. Pass reviewOnly:true for a wide read-only review split across agents (edits nothing). Pass "help" for every option with its default. Returns stopReason, next (what the caller should do now) and the findings left.',
  phases: [
    { title: 'Review', detail: 'jacoelho:architecture-review: scoping (reviews alone when one group), parallel group reviews, merge' },
    { title: 'Plan', detail: 'dispositions on the merits; dependency-ordered packets' },
    { title: 'Consult', detail: 'consultants sized to plan risk + batched QA and API review; targeted revise and re-check' },
    { title: 'Implement', detail: 'one implementer per dependency/file batch (cheap model), one batched benchmark comparison' },
    { title: 'Verify', detail: 'verification contract; fix until green' },
    { title: 'Critic', detail: 'critic on the diff; resolve material findings' },
  ],
}

// ---------- configuration ----------
// The one list of options: defaults, the `help` reply and the unknown-option check all read it.
// meta.whenToUse names only the common ones, since meta must be a literal and cannot read this.
const OPTIONS = {
  scope: { default: null, about: 'required: what round 1 reviews, such as a path, a module, "the branch diff" or "the whole repository"' },
  baseRef: { default: 'main', about: 'base ref; later rounds review the diff against it' },
  instructions: { default: '', about: 'free text for every stage that judges or edits: focus, constraints, contracts to keep' },
  followUpScope: { default: null, about: 'what later rounds review (default: diff against baseRef plus uncommitted work)' },
  verify: { default: null, about: 'checks to run (default: the repo verification contract, plus gofmt and git diff --check for Go)' },
  reviewers: { default: 3, about: 'max parallel review agents; each reviews up to eight boundaries' },
  reviewOnly: { default: false, about: 'run one review of scope and return its report; plans and edits nothing' },
  consultants: { default: 3, about: 'consultants for a plan touching a contract, hot path or exported API' },
  lowRiskConsultants: { default: 1, about: 'consultants for any other plan' },
  batchSize: { default: 3, about: 'max linked plan items per implementer' },
  maxRounds: { default: 4, about: 'max implementation rounds' },
  dryRounds: { default: 1, about: 'clean reviews in a row needed to stop; above 1 re-reviews an unchanged tree' },
  implementModel: { default: 'sonnet', about: 'model for implementers and first fix attempts' },
  implementEffort: { default: 'medium', about: 'effort for implementers' },
  escalateModel: { default: 'opus', about: 'model for repeated fix attempts and critic fixes' },
  runModel: { default: 'haiku', about: 'model that runs verification commands' },
}
const usage = () => Object.fromEntries(Object.entries(OPTIONS).map(([k, o]) => [k, o.default === null || o.default === '' ? o.about : `${o.about} (default ${JSON.stringify(o.default)})`]))
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
const typeOf = (v) => (v === null ? 'null' : typeof v)
const badType = Object.keys(raw).filter((k) => {
  const d = OPTIONS[k].default
  const v = raw[k]
  if (typeof d === 'number') return !(Number.isInteger(v) && v >= 0)
  if (typeof d === 'boolean') return typeof v !== 'boolean'
  return typeof v !== 'string' // string options, including those whose default is null
})
if (badType.length) return refuse('bad-option-type', `Option(s) ${badType.map((k) => `${k} (got ${typeOf(raw[k])} ${JSON.stringify(raw[k])})`).join(', ')} have the wrong type; see usage for each default.`, { invalid: badType })
// A run edits the working tree, so its target is never a default: a bare invocation starts nothing.
if (!raw.scope) return refuse('no-scope', 'Ask the user what to remediate (a path, a module, "the branch diff" or "the whole repository") and any instructions, then call again with {scope, instructions?}.')
// scope, followUpScope and baseRef are quoted inside the review skill's args, so a quote or newline would break that invocation.
const badQuoted = ['scope', 'followUpScope', 'baseRef'].filter((k) => raw[k] != null && /["`\n\r]/.test(String(raw[k])))
if (badQuoted.length) return refuse('bad-scope', `${badQuoted.join(', ')} must be one line without double quotes or backticks; put prose in instructions.`, { invalid: badQuoted })
const A = Object.assign(Object.fromEntries(Object.entries(OPTIONS).map(([k, o]) => [k, o.default])), raw)

const SCOPE = A.scope
const BASE = A.baseRef
const REVIEWERS = A.reviewers
const REVIEW_ONLY = A.reviewOnly
const CONSULTANTS = A.consultants
const LOW_RISK_CONSULTANTS = A.lowRiskConsultants
const BATCH_SIZE = A.batchSize
const MAX_ROUNDS = A.maxRounds
const DRY_ROUNDS = A.dryRounds
const IMPL_MODEL = A.implementModel
const RUN_MODEL = A.runModel
const IMPL_EFFORT = A.implementEffort
// Escalation for judgement-heavy repairs: failed first fix attempts and critic findings.
const ESCALATE_MODEL = A.escalateModel
// Reviews after the first cover only what the remediation changed; unchanged boundaries keep their ledger dispositions.
const FOLLOWUP_SCOPE = A.followUpScope || `the branch diff against ${BASE} plus uncommitted work (changed boundaries and their consumers)`
const VERIFY = A.verify || 'every command in the repository verification contract (AGENTS.md / CLAUDE.md / Makefile), plus gofmt and `git diff --check` for Go repositories'
const SKILL = 'jacoelho:architecture-review'
// Free-text user direction for the whole run (focus, constraints, contracts to keep). Every stage
// that judges or edits receives it, so a constraint cannot be honoured by the planner and lost by an implementer.
const INSTRUCTIONS = A.instructions
  ? `\nUser instructions for this run (binding; where they conflict with the review skill's rules or this workflow's defaults, they win):\n${A.instructions}\n`
  : ''
// Consultants are the plugin's own read-only decision-point agent, so the type always resolves.
const CONSULTANT = 'jacoelho:consultant'
const consultOnce = (prompt, opts) => agent(prompt, Object.assign({}, opts, { agentType: CONSULTANT }))
const BLOCKING = ['Critical', 'High', 'Medium']

// The user's standing instruction; it is not part of the review skill.
const AUTHORITY_STANCE = `
Authority documents (ARCHITECTURE.md, AGENTS.md, decision records) are EVIDENCE of intent, not proof of correctness. Where a finding, the code and a document disagree, decide on the merits: binding external requirements (specs, public contracts, persisted data, stated limits) first, then demonstrated consequences, then the documented rationale; say which side is wrong and fix that side (the document included). A recorded rejected alternative stands only while its stated constraint still holds.`

const EVIDENCE = `
Cite only file:line you read in this run. Prefer reproducing a consequence through the public surface (throwaway module outside the repo, deleted afterwards).`

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
  },
  required: ['id', 'title', 'findingIds', 'disposition', 'authorityAnalysis', 'owner', 'change', 'files', 'tests', 'needsApiDesign', 'hotPath', 'changesTests', 'contractRisk', 'dependsOn'],
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
const RUN = {
  type: 'object',
  properties: { passed: { type: 'boolean' }, failures: { type: 'array', items: { type: 'string' } }, summary: { type: 'string' } },
  required: ['passed', 'failures', 'summary'],
}
const CRITIQUE = {
  type: 'object',
  properties: { material: { type: 'array', items: { type: 'string' } }, minor: { type: 'array', items: { type: 'string' } } },
  required: ['material'],
}

// Compact JSON: prompts carry these blobs to every agent, so indentation is pure token cost.
const j = (x) => JSON.stringify(x)
const blockingOf = (fs) => fs.filter((f) => BLOCKING.includes(f.severity))
const active = (p) => p.items.filter((it) => it.disposition !== 'reject')

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

async function review(round, scope) {
  phase('Review')
  // Only after a remediation round is the diff against the base this workflow's own work.
  const ctx = `Repository: current working directory.${round > 1 ? ` Base ref ${BASE}: the branch diff and uncommitted work against it are remediation from earlier rounds; treat what it touches as changed boundaries.` : ''}
Prior dispositions ledger (a finding rejected with a rationale is re-raised only with evidence rebutting that rationale; a "fixed" finding is re-raised if the fix is incomplete or regressed): ${ledgerText()}
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
- Implementation runs on a cheaper model: make each item's change concrete (files, symbols, target signatures, deletions) so it needs no further design judgement.${INSTRUCTIONS}`

async function plan(round, input) {
  phase('Plan')
  let current = await agent(`Plan remediation of architecture findings in the current repository (base ref ${BASE}). Do not edit files.
Read the repository's agent instructions and architecture documents, and the code each finding cites. Each item is a dependency-complete packet (contract, owner, invariant, path, bounds, proof, writeback). Target the clean end state: single owner, obsolete paths deleted, no shims unless a binding contract requires them.
Findings: ${input}
${PLAN_RULES}
Prior ledger: ${ledgerText()}`, { label: `plan r${round}`, phase: 'Plan', schema: PLAN })
  if (!current) throw new Error('planning failed')

  // The planner already did the research; revision edits only what advice touches.
  const revise = (pass, advice) => agent(`Revise this remediation plan with the consultants' input. Do not edit files. You already researched the plan: re-read only code or documents that a piece of advice cites and you need to judge it. Change only items the advice concerns; return every other item unchanged.
You own the decision: adopt what the evidence supports; list the rest in rejectedAdvice with the reason. Consultants can be wrong. Fold the qa-tests specifications you adopt into each item's tests field verbatim (they are the QA assessment the implementer will follow) and the api-design surfaces into each item's change.
Findings: ${input}
${PLAN_RULES}
Current plan: ${j(current)}
Advice: ${j(advice)}`, { label: `revise r${round}.${pass}`, phase: 'Plan', schema: PLAN })

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
${focus || ''}Findings: ${input}
Plan: ${j(pl)}
${AUTHORITY_STANCE}
${EVIDENCE}${INSTRUCTIONS}`, { label: `consult r${round}.${pass} #${i + 1} ${lens.key}`, phase: 'Consult', schema: ADVICE })
    .then((a) => tag(lens.key, a))
  const qa = (pl, focus, pass) => agent(`Invoke the Skill tool with skill "jacoelho:testing", then follow it to assess, as one batch, the tests this remediation plan proposes before any are written. Do not edit files. For each item with changesTests: are the proposed tests contract tests with expectations from the requirement, at the right level, covering boundaries, failure and opposing shapes; which are change detectors or tautologies; which existing tests must be rewritten or deleted. Return blocking issues (wrong or missing proof) with a concrete test specification each, and the final test specification per item id in nonBlocking.
${focus || ''}Plan: ${j(pl)}
Testing boundaries: the repository's verification contract and test documentation.${INSTRUCTIONS}`,
    { label: `consult r${round}.${pass} qa-tests`, phase: 'Consult', schema: ADVICE }).then((a) => tag('qa-tests', a))
  const api = (pl, focus, pass) => agent(`Invoke the Skill tool with skill "jacoelho:programming-go-api-design", then follow it. Task mode: review. Review, as one batch, every exported or cross-package Go API change in this remediation plan (items with needsApiDesign). Callers: find with gopls references. Compatibility: internal packages carry no external obligations; the root module's exported API is binding unless an item says otherwise. Permitted edits: none. Return blocking issues with the recommended surface and caller examples per item id.${INSTRUCTIONS}
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

async function implement(round, p) {
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
Use gopls for identifier lookup and renames. Delete the obsolete path in the same change. Update the listed documents so code, docs and tests agree. gofmt changed files. After each item, run the affected packages' tests until they pass before starting the next. If an item is wrong or underspecified, report it blocked with the reason instead of improvising a design, and mark items that depend on it skipped.`,
      { label: `impl ${ids}`, phase: 'Implement', schema: BATCH_DONE, model: IMPL_MODEL, effort: IMPL_EFFORT })
    results.push({ items: ids, done })
    const status = new Map(done ? done.items.map((r) => [r.id, r.status]) : [])
    for (const it of batch) if (status.get(it.id) !== 'done') unfinished.add(it.id)
    log(done ? done.items.map((r) => `${r.id}: ${r.status}`).join('; ') : `${ids}: no result`)
  }
  // One serialised benchmark comparison per round covering every hot-path item, not one per item.
  const hot = active(p).filter((it) => it.hotPath)
  if (hot.length) {
    const perf = await agent(`Measure the performance effect of this round's remediation on the hot paths it touches: ${j(hot.map((h) => ({ id: h.id, title: h.title, files: h.files })))}.
Compare the pre-change tree (\`git worktree add\` at ${BASE} in a temp dir, removed afterwards) against the current working tree: select only benchmarks exercising those paths (the repository's documented comparison workloads where they apply), -benchmem, -count >= 10, serialised runs, benchstat. Edit scope: none. Report regressions per item with numbers and likely cause.`,
      { label: `perf r${round}`, phase: 'Implement', agentType: 'jacoelho:programming-go-performance' })
    results.push({ perf })
  }
  return results
}

// ---------- verify ----------
async function verify(label) {
  phase('Verify')
  for (let attempt = 1; attempt <= 3; attempt++) {
    const run = await agent(`Run ${VERIFY} in the current working directory. Do not edit files. Report each command with its exact exit code; passed is true only if every exit code is 0 (never infer success from output text). For failures give the failing package/test and key error lines, not full logs.`,
      { label: `verify ${label}.${attempt}`, phase: 'Verify', schema: RUN, model: RUN_MODEL, effort: 'low' })
    // Clamp in code: a run that lists failures has not passed, whatever its flag says.
    if (run) run.passed = !!run.passed && !(run.failures && run.failures.length)
    if (run && run.passed) return run
    if (attempt === 3) return run
    await agent(`Verification failed after architecture remediation. Fix the root cause in the working tree without weakening or deleting tests and without reverting the remediation's intent; if a test encodes removed behaviour, move it to the new contract and say so. Do not commit.${INSTRUCTIONS}
Failures: ${j(run)}`,
      attempt === 1 ? { label: `fix ${label}.${attempt}`, phase: 'Verify', schema: DONE, model: IMPL_MODEL, effort: IMPL_EFFORT } : { label: `fix ${label}.${attempt} (escalated)`, phase: 'Verify', schema: DONE, model: ESCALATE_MODEL })
  }
}

// ---------- critic ----------
async function critique(round, p, ver) {
  phase('Critic')
  let crit = null
  for (let pass = 1; pass <= 2; pass++) {
    crit = await agent(`Requirements: resolve these architecture findings per the plan, preserving all binding contracts.${INSTRUCTIONS}
Plan: ${j(p)}
Diff: \`git diff ${BASE}\` plus untracked files from \`git status\`.
Verification evidence: ${j(ver)}
Return material findings (concrete failure modes) and minor ones.`,
      { label: `critic r${round}.${pass}`, phase: 'Critic', agentType: 'jacoelho:critic', schema: CRITIQUE })
    if (!crit) { crit = { material: [`critic r${round}.${pass} returned no result: this round's diff was not critic-reviewed`], minor: [], ran: false }; break }
    if (!crit.material.length) break
    await agent(`Resolve these material critic findings in the working tree within the plan's scope. Do not commit. Run the affected packages' tests.${INSTRUCTIONS}
${j(crit.material)}
Plan: ${j(p)}`,
      { label: `critic-fix r${round}.${pass}`, phase: 'Critic', schema: DONE, model: ESCALATE_MODEL })
    const rv = await verify(`r${round}c${pass}`)
    crit.verify = rv || { passed: false, failures: ['verify returned no result'], summary: '' }
    if (!crit.verify.passed) { crit.material.push('verification failing after critic fixes: ' + j(rv)); break }
  }
  return crit
}

// ---------- loop ----------
// A run over its token budget dies mid-round with no result and an unverified tree. Before each
// implementation round, stop if what remains is less than the costliest cycle so far (its review
// included, since another review always follows a round).
const BUDGET = typeof budget === 'undefined' ? { total: null, spent: () => 0, remaining: () => Infinity } : budget
let costliestCycle = 0
let reviewRound = 0
let implRounds = 0
let dry = 0
let lastReview = null
let stopReason = ''
const unresolvedCritic = []
// The one record of what the working tree holds; `next` is derived from it, never guessed from the
// stop reason. untouched: no round started. unverified: a round started and did not reach a
// verification (an error mid-round). verified / failing: the last verification of the tree.
let tree = 'untouched'

// Any throw (a dead scoping, merge or plan agent; the token budget running out mid-round) still
// returns the report: after round 1 the tree may hold edits the caller must know about.
try {
  while (true) {
    const cycleStart = BUDGET.spent()
    reviewRound++
    const missingBefore = reviewMissing.length
    lastReview = await review(reviewRound, reviewRound === 1 ? SCOPE : FOLLOWUP_SCOPE)
    const open = blockingOf(lastReview.findings)
    log(`review r${reviewRound}: ${lastReview.findings.length} findings, ${open.length} Critical/High/Medium`)
    history.push({ review: reviewRound, findings: lastReview.findings.map((f) => `${f.severity} ${f.id}`) })
    // A review with dead groups cannot certify the scope clean, nor be reported as a complete review.
    const incomplete = reviewMissing.length > missingBefore
    if (incomplete && (REVIEW_ONLY || !open.length)) { stopReason = `review r${reviewRound} incomplete: ${reviewMissing.length - missingBefore} group(s) returned no result`; break }
    if (REVIEW_ONLY) { stopReason = 'review only'; break }
    if (!open.length) {
      dry++
      if (dry >= DRY_ROUNDS) { stopReason = `only Low findings for ${dry} consecutive review(s)`; break }
      continue
    }
    dry = 0
    if (implRounds >= MAX_ROUNDS) { stopReason = `maxRounds (${MAX_ROUNDS}) reached with ${open.length} blocking finding(s)`; break }
    if (BUDGET.total && costliestCycle && BUDGET.remaining() < costliestCycle) {
      stopReason = `token budget: ${Math.round(BUDGET.remaining() / 1000)}k left, the costliest review-and-fix cycle so far used ${Math.round(costliestCycle / 1000)}k`
      break
    }
    const input = j(lastReview.findings)
    implRounds++
    const p = await plan(implRounds, input)
    for (const it of p.items) for (const fid of it.findingIds) {
      ledger.set(fid, { round: implRounds, findingId: fid, disposition: it.disposition, rationale: it.disposition === 'reject' ? it.authorityAnalysis : it.change.slice(0, 300) })
    }
    tree = 'unverified'
    const impl = await implement(implRounds, p)
    const ver = await verify(`r${implRounds}`)
    const crit = await critique(implRounds, p, ver)
    // The tree's state is its LAST verification: the critic's fixes, when they ran, come after `ver`.
    const last = (crit && crit.verify) || ver
    tree = last && last.passed ? 'verified' : 'failing'
    // History is returned to the calling session, so it records outcomes, not full plans and transcripts.
    history.push({
      round: implRounds,
      items: p.items.map((it) => `${it.id} [${it.disposition}] ${it.title}`),
      rejectedAdvice: p.rejectedAdvice || [],
      impl: impl.map((r) => (r.perf ? { perf: r.perf } : { items: r.items, results: r.done ? r.done.items : 'no result', followUps: r.done ? r.done.followUps || [] : [] })),
      verify: last ? { passed: last.passed, failures: last.failures, afterCriticFixes: last !== ver } : null,
      critic: crit ? { material: crit.material, minor: crit.minor || [] } : null,
    })
    costliestCycle = Math.max(costliestCycle, BUDGET.spent() - cycleStart)
    if (crit && crit.material.length) unresolvedCritic.push(...crit.material.map((m) => `round ${implRounds}: ${m}`))
    if (tree === 'failing') { stopReason = `verification failing after round ${implRounds}`; break }
  }
} catch (e) {
  stopReason = `error: ${e && e.message ? e.message : String(e)}`
}
log(`stopped: ${stopReason}`)

const TREE = {
  untouched: 'Nothing was changed: no remediation round ran.',
  unverified: 'The run stopped mid-round, so the working tree may hold UNVERIFIED edits. Inspect git diff against baseRef before anything else; do not commit as is.',
  verified: 'The working tree holds verified, uncommitted remediation. Show the user git diff against baseRef for review before committing.',
  failing: 'The working tree holds remediation whose verification FAILS (last history entry). Do not commit: inspect git diff and fix or revert first.',
}
const WHY = stopReason === 'review only' ? 'Review only, as requested: the findings are in finalFindings; nothing was planned.'
  : stopReason.startsWith('only Low') ? 'Only Low findings remain (finalFindings).'
  : stopReason.startsWith('maxRounds') ? 'Blocking findings remain (remainingBlocking); re-run with a narrower scope or instructions.'
  : stopReason.startsWith('review') ? 'The scope was not fully reviewed (reviewMissing); re-run before trusting the result.'
  : stopReason.startsWith('token budget') ? 'Stopped before another round to stay within the token budget.'
  : stopReason.startsWith('error') ? `The run failed: ${stopReason.slice(7)}.`
  : ''
return {
  started: true,
  stopReason,
  tree,
  next: [TREE[tree], WHY, unresolvedCritic.length ? 'Unresolved critic findings need attention first (unresolvedCritic).' : ''].filter(Boolean).join(' '),
  unresolvedCritic,
  consultMissing,
  reviewMissing,
  history,
  ledger: [...ledger.values()],
  finalFindings: lastReview ? lastReview.findings : null,
  remainingBlocking: lastReview ? blockingOf(lastReview.findings) : null,
  improvements: lastReview ? lastReview.improvements : null,
  coverage: lastReview ? lastReview.coverage : null,
}
