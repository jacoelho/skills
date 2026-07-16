---
name: evolve-architecture
description: Explore, compare, select, implement, and audit architecture-changing code work. Use when a feature, refactor, new variation, integration, persistence change, protocol change, dependency change, or new execution path may tempt additive layering; when Codex should consider reshaping existing boundaries instead of stacking code on top; or when a proposed implementation needs independent architecture alternatives, evidence-based selection, migration planning, and post-implementation conformance review.
---

# Evolve Architecture

Optimize for the simplest coherent final system, not the smallest diff or the
least implementation work.

For focused and standard design mode, use the self-contained quick paths below
and do not load [references/workflow.md](references/workflow.md) unless a named
gate fails or the profile expands. For critical, full, and audit work, read the
reference and follow its artifacts, phase gates, design-card schema, selection
rubric, repair routing, and final audit.

## Budget the workflow before exploring

Classify the change and state the chosen profile before using tools:

- **Focused:** one subsystem, an established extension seam, and no material
  migration or compatibility risk. Use one exploration pass, 2 materially
  distinct designs, 1 falsification pass, and a compact decision. Default to
  at most 10 targeted evidence commands and 1,200 words in design mode.
- **Standard:** several owners or consumers, a changed contract, or a bounded
  migration. Use up to 2 explorers, 3 designs, and 2 independent critics.
- **Critical:** irreversible data or protocol changes, security boundaries,
  broad migrations, or high blast radius. Use the full multi-wave workflow.

Budgets are stop conditions, not aspirations. Expand a profile only when a
named unknown could change ownership, contracts, migration, or selection.
Record the reason. When an agent or phase exhausts its budget, stop it, mark
missing evidence `UNKNOWN`, and either decide conservatively or escalate; do
not wait indefinitely or restart the same unbounded search.

## Select the operating mode

- Use **full mode** when the user asks to change or build code. Explore, select,
  plan, implement with one writer, audit, repair, and report.
- Use **design mode** when the user asks for architecture, alternatives, a
  specification, or a plan. Stop after preserving the accepted design and
  execution plan. Do not edit production code.
- Use **audit mode** when an implementation and an accepted plan already exist.
  Reconstruct the architecture independently, compare it with both the original
  and amended plan, and route repairs.

Honor an explicit user mode or stopping point over these defaults.

## Focused design quick path

For a focused design task, complete this sequence without subagents:

1. Lock the user's explicit behavior verbatim enough to prevent narrowing or
   broadening. List unspecified effects that must preserve current behavior.
2. In one targeted evidence pass, find the current owner and path, closest
   semantic helper and lower-level primitive, existing semantic bridges
   (including SQL, IPC, or configuration APIs), helper callers, lifecycle,
   repository-native state vocabulary, result-code consumers, constraints, and
   focused tests. Inventory the exact state and dependencies already owned by
   each candidate abstraction; a nearby mapping is not proof that it owns the
   descriptors, encoders, or policy needed by the feature. For stateful
   objects, trace one object-birth/reload path and one direct low-level caller
   or test; absence of a dedicated constructor is not evidence that state
   cannot belong to an embedded object. Stop when those are known.
3. State whether the existing boundary naturally expresses the feature and
   whether a preparatory refactor is necessary.
4. Compare exactly two materially distinct designs: the smallest coherent
   extension and the strongest bounded refactor or alternate owner. Do not add
   a generic layer without a second present need or explicit extensibility
   requirement.
5. For each, audit locked behavior, independent policies, ownership,
   absent/default/override states, caller migration, concepts added/removed,
   lifecycle locality, result-code meanings, and the predicted change surface.
6. Spend at most one extra targeted probe on a selection-critical unknown. If
   it remains unresolved, preserve current behavior, choose a design valid
   under both outcomes, or return a provisional decision.
7. Select only after a literal requirement-to-outcome check. Scores are
   optional; a contradiction is a veto.
8. Return one compact record: lock/preservation ledger, evidence/refactor
   finding, selected and rejected designs, strongest objection, predicted
   files/symbols with confidence, migration/removal, ordered plan, and tests.

Default to 8 targeted evidence commands and 1,000 words. Stop rather than
expanding templates, performing broad repository surveys, or running tests in
design mode. When a file artifact is required, write a usable skeleton no later
than command 6 and reserve the final 2 commands only for selection-critical
falsification; amend once, then stop. A root orchestrator must enforce the wall
clock externally. After interruption, allow at most one artifact-only turn; if
no record appears, mark the worker incomplete rather than waiting again.

## Standard design quick path

Start with the focused quick path, then add only:

1. A second bounded evidence pass for cross-owner runtime flow, lifecycle and
   compatibility. If subagents help, use at most two parallel readers and one
   root synthesis; never wait beyond the declared wave limit.
2. Up to three designs when ownership or migration is materially distinct.
3. One critic pass focused on hidden consumers, partial migration, semantic
   result collisions, and whether configuration belongs on the owning object
   or is truly per-operation.
4. A compact decision record, not the full critical-work artifact set.

Default to 12 targeted evidence commands, two agent turns, and 1,500 words.
At the limit, freeze completed evidence, mark gaps `UNKNOWN`, and return.

## Establish the task charter

Before proposing code, capture and preserve:

- required behavior and definition of done;
- applicable repository instructions and architecture decisions;
- external and persistent contracts;
- architecture invariants;
- authorized refactoring radius and non-goals;
- required verification and approval boundaries;
- base revision, initial working-tree state, and pre-existing changes.

Separate every charter statement into `REQUIRED`, `INFERRED`, or `OPTIONAL`.
Do not silently promote future-proofing, malformed-input tolerance, lossless
round-tripping, compatibility, or a likely file location into a hard contract.
When wording is ambiguous, preserve both the narrow and broad interpretation
until repository evidence or the user resolves it.

Copy every explicit requested behavior into an immutable Requirement Lock and
check every candidate against it before scoring. Do not narrow, reverse, or
"improve" an explicit behavior to fit a preferred abstraction. For behavior
the request does not mention, preserve the closest existing path by default;
repository possibilities are evidence about implementation, not permission to
invent new product semantics.

Ask only questions whose answers could materially change ownership,
boundaries, contracts, migration, or design selection.

## Orchestrate evidence before design

Use subagents when their independence or parallelism is worth the coordination
cost. Keep the hierarchy in sequential waves under the root orchestrator; do
not create recursive fan-out. Parallelize read-heavy exploration, independent
design, falsification, scoring, and final review within the selected profile.

Give every delegated task a narrow question, an allowed evidence scope, a
tool/turn budget, a required output schema, and a hard completion limit. The
root remains responsible for synthesis and may continue after a non-critical
worker misses its limit. Prompted budgets are not timers: enforce an external
deadline, freeze completed evidence, and do not repeatedly resume a worker that
fails its single artifact-only completion turn.

Keep candidate designers isolated until their design cards are frozen. Treat
same-model agreement as correlated opinion rather than independent proof.
Require repository evidence for material claims and label each claim
`VERIFIED`, `INFERRED`, or `UNKNOWN`.

If subagents are unavailable, execute the same roles sequentially and disclose
that limitation in the final report.

## Decide whether refactoring is necessary

Produce an explicit Refactor Necessity Finding before generating designs:

- Can the current owner and abstraction express the feature naturally?
- What weakness does the new requirement expose?
- What duplication, misplaced ownership, alternate path, or change
  amplification would an additive change preserve?
- Is preparatory refactoring required? If not, what evidence shows the current
  boundary remains coherent?

Do not assume either that refactoring is always desirable or that preserving
the current structure is safer.

Before adding a new abstraction, trace the closest semantic helper as well as
the lowest-level primitive. Prefer evolving the semantic owner when it can
centralize invariants with bounded, mechanical caller migration; prefer the
primitive when a helper would merely rename one call. Explicitly compare both.

Before exporting a new internal API or duplicating conversion/validation,
inventory existing semantic bridges, including stable SQL, SPI, IPC, and
configuration interfaces. Compare their validation ownership, versioning,
atomicity, and coupling. Crossing a layer through an established semantic
interface is not automatically worse than creating a tighter internal edge.

Do a capability-completeness check before extending an existing owner. Name the
exact canonical state, derived state, dependencies, and lifecycle it already
has versus what the feature needs. Do not enlarge a decoder, registry, or other
nearby bridge merely to avoid a bounded operation-local representation. When
encoding, routing, lookup, or retry forms one cohesive capability, compare a
dedicated operation owner against both the data owner and the caller.

Use repository-native semantic states when the contract names lifecycle or
discovery behavior such as retired, deprecated, hidden, disabled, or reserved.
Trace the consumer that observes the state. A generic visibility or boolean
mechanism is equivalent only if it drives the same downstream semantics.

Check lifecycle locality. Separate the configuration source from the runtime
owner of an invariant: copying parsed configuration into an owning object at
birth can be deliberate materialization, not duplicated ownership. Trace the
aggregate owner's initializer, reload/reconstruction path, and direct test or
low-level callers even when the embedded object has no dedicated constructor.
When policy is stable for an object's lifetime and reload reconstructs that
object, prefer storing it on the object at construction. If every hot-path
caller would pass the same parent field, treat that as evidence against a new
per-operation argument. Thread parent configuration through hot-path calls only
when it varies per operation, instances cannot snapshot it safely, or the API
explicitly models operation policy.

Check result-code meanings end to end. If a new condition needs an error/state
already used for a broader old condition, split the internal representation
and migrate every consumer so observable old behavior remains unchanged. A
preservation requirement protects behavior, not necessarily the old internal
encoding.

Before unifying similar paths, prove the new invariant applies to each path and
that each is reachable for the affected state. Shared-looking tails are not by
themselves evidence for a common finalizer. Centralize the smallest genuinely
shared policy and leave unrelated polling, accounting, or cleanup lifecycles in
place.

For a new blocking wait, retry loop, or asynchronous phase, identify how tests
can observe entry, release it deterministically, and bypass it in pre-existing
scenarios whose purpose is elsewhere. Include at least one consumer-boundary
test when the invariant protects a cross-subsystem workflow.

List distinct policies the feature changes, such as value construction,
reference movement, descendant rewriting, precedence, persistence, and
presentation. Verify that the selected mechanism can express each policy
independently. Do not use one convenient API to collapse outcomes that may
legitimately vary separately.

Policy independence is not a mandate to make every policy configurable or to
refactor adjacent machinery. Change the policies named by the Requirement Lock
and hold unspecified policies at their closest-existing behavior. Record
unrelated weaknesses separately unless they block the feature or the new
change would materially amplify them.

## Explore and select designs

Generate only materially distinct design families appropriate to the task.
Always include the current architecture as calibration. For a focused change,
compare it with the strongest coherent extension or bounded refactor; add a
counterfactual only when it changes the decision.

Falsify candidates before scoring them. Apply hard constraints before weighted
criteria. A veto cannot be averaged away. Use scores to expose trade-offs and
shortlist candidates, then compare the finalists directly and record the
strongest minority argument.

Require concrete evidence for a generic registry, open envelope, adapter
layer, new runtime representation, or new orchestration API. One present
consumer plus hypothetical future consumers is not enough unless extensibility
is itself a required contract. First test whether an existing value needs one
more state (for example absent versus explicit false) before rerouting data
through new layers.

A selected design may not depend on an `UNKNOWN` that could change public
behavior, ownership, dependency direction, reference/data semantics,
migration, deletion, or the strongest objection. Spend one bounded targeted
probe, choose a conservative design that remains valid under both outcomes, or
stop with a provisional decision. Never label the affected prediction high
confidence or proceed merely because its score is highest.

Before selection, run a literal behavior audit: requirement -> candidate
mechanism -> observable outcome. Any contradiction with the Requirement Lock
is a veto. Existing tests for syntax or data that was previously unrecognized
describe the baseline, but do not create a compatibility invariant for the
newly recognized form unless the charter says so.

If a coherent design crosses the authorized radius, request expanded authority
instead of silently choosing an inferior local patch.

## Preserve the decision contract

Preserve distinct, versioned artifacts:

- `Charter v1`;
- `Baseline Dossier` and `Evidence Ledger`;
- `Accepted Design v1`;
- `Execution Plan v1`;
- append-only `Amendment Ledger`;
- append-only implementation evidence.

Map requirements, invariants, accepted decisions, anti-goals, deletion
obligations, and verification evidence bidirectionally through stable plan-step
IDs. Never rewrite the original charter or plan to make the implementation look
conformant.

In design mode, compress these artifacts into one decision record rather than
expanding every template. It must contain: charter and hard constraints;
baseline ownership and path; refactor finding; candidate comparison; selected
design and strongest objection; predicted change surface with file/symbol,
role, and confidence; ordered plan; removals/migration; and verification. Omit
empty sections and stop at the selected profile's word budget.

## Implement with one writer

In full mode, assign exactly one write-capable agent at a time. Separate:

1. baseline verification;
2. behavior-preserving preparatory refactor;
3. verification checkpoint;
4. feature implementation through the target architecture;
5. consumer migration;
6. contraction and deletion;
7. final behavioral and structural verification.

Stop on material deviations. Return to exploration, selection, or planning as
appropriate. Do not hide a broken assumption behind another adapter, flag,
wrapper, fallback, or parallel path.

## Audit independently

Freeze writes before final review. Give independent read-only reviewers the
charter, evidence, accepted design, plan, amendments, diff, and repository
state, initially without the implementer's persuasive narrative.

Review in both directions:

- plan to code: prove every planned outcome and deletion;
- code to plan: justify every material implementation change;
- architecture to code: reconstruct ownership, paths, sources of truth,
  dependency directions, states, configuration, and temporary mechanisms.

Route a failed baseline back to exploration, a weak target back to design
selection, a plan defect back to planning, and an implementation defect to the
single writer. Re-run conformance and adversarial review after repairs.

## Finish with evidence

Report requirement traceability, original-plan conformance, authorized
amendments, final-plan conformance, architecture invariants, architecture
delta, deletion evidence, deviations, temporary mechanisms, and the minority
report. Do not replace these with a prose assurance that the architecture is
clean.
