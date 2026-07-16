# Architecture Evolution Workflow

## Contents

1. Operating rules
2. Charter gate
3. Baseline gate
4. Candidate gate
5. Falsification and selection
6. Plan gate
7. Implementation gate
8. Release gate
9. Repair routing
10. Final report

## Operating rules

1. Optimize final-state coherence before diff size or implementation effort.
2. Keep exploration, design, evaluation, implementation, and audit separate.
3. Close each wave at its declared budget. Synthesize completed evidence and
   mark missing non-critical evidence unknown instead of waiting indefinitely.
4. Keep proposals independent until frozen.
5. Use one writer and multiple readers.
6. Treat synthesis as a new candidate rather than inheriting parent scores.
7. Do not weaken tests, architecture checks, or repository rules to pass.
8. Preserve the original charter, accepted design, and plan as immutable
   versions; record later changes as append-only amendments.
9. Treat a deviation as material when it changes ownership, canonical path,
   source of truth, dependency direction, public or persistent contract,
   migration or deletion obligation, planned package/state/flag/adapter/
   configuration/fallback, or required guardrail.
10. Require user approval to waive a charter invariant, external contract,
    permanent competing path, or unresolved high-severity architecture finding.

### Proportional profiles

Choose before exploration:

| Profile | Typical signal | Exploration | Designs | Evaluation | Design-mode artifact |
| --- | --- | --- | --- | --- | --- |
| Focused | One subsystem and known seam | One targeted pass, default 10 commands | 2 distinct | One critic and root decision | <=1,200 words |
| Standard | Multiple owners/consumers or bounded migration | Up to 2 explorers | Up to 3 | 2 critics, root adjudication | <=2,000 words |
| Critical | Irreversible contract/data change or broad blast radius | 3 evidence roles | Up to 4 | 3 evaluators plus adversary | Full artifacts |

A command budget counts repository-search, inspection, and verification tool
calls made for the design. Raise it only for a named selection-critical unknown
and record the new ceiling. Prefer one batched targeted search over repeated
broad scans. Do not run a full test suite in design mode.

An exploration pass is complete once it has identified, with evidence:

- the current owner and canonical runtime/data path;
- the closest extension seam and relevant competing mechanism;
- contracts and invariants that constrain the choice;
- likely consumers, migration/removal obligations, and verification surface;
- any remaining unknown capable of changing the decision.

Stop when these are known. Repository size alone does not justify more agents.

## Charter gate

Preserve `Charter v1` with:

- goal and externally visible behavior;
- repository context and instructions;
- external contracts;
- architecture invariants;
- authorized refactoring radius;
- non-goals;
- definition of done;
- verification commands;
- actions requiring approval;
- base revision, initial dirty state, and task-owned paths.

Pass the gate only when behavior is verifiable and unknowns that could change
ownership, boundaries, contracts, or migration have been resolved or escalated.

## Baseline gate

Run the number of read-only explorations selected by the profile. The following
are evidence roles, not mandatory separate agents:

### Structure explorer

Map packages, APIs, dependencies, ownership, sources of truth, extension
mechanisms, competing concepts, and suspected boundary violations.

### Runtime explorer

Trace the affected behavior end to end, including data, control, state, errors,
retry, recovery, compatibility, and operational boundaries.

### Constraint explorer

Find tests, documented decisions, standards, hidden consumers, compatibility
requirements, prior migrations, and likely obsolete mechanisms.

Require file, symbol, command, test, or dependency evidence for `VERIFIED`
claims. Preserve contradictions and investigate those that affect design.

Produce a versioned Baseline Dossier containing:

- current responsibility map;
- canonical and competing paths;
- sources of truth;
- closest existing extension mechanism;
- task-relevant debt;
- verified constraints, inferences, unknowns, and disagreements;
- Refactor Necessity Finding.

Also preserve a requirement-strength ledger. Mark behavior and contracts as
`REQUIRED`, `INFERRED`, or `OPTIONAL`, with the evidence for each. In
particular, distinguish unknown keys from malformed known values, absence from
explicit false/default, and preservation from mere parse-time acceptance.

Add an immutable Requirement Lock that restates each explicit requested
behavior without architectural interpretation. Build a preservation ledger for
unspecified effects using the closest existing workflow. Repository mechanisms
or tests may support an implementation inference, but cannot broaden or narrow
the product contract by themselves.

Pass the gate only when the affected behavior and ownership are understood and
no critical decision depends solely on an unknown.

## Candidate gate

Generate the strongest materially distinct candidates. Prefer these families:

1. **Calibration:** preserve the present architecture while implementing the
   feature safely.
2. **Coherent extension:** evolve the best existing abstraction without a
   parallel mechanism.
3. **Bounded refactor:** reshape the affected responsibility and immediate
   boundaries, then add the feature.
4. **Counterfactual:** describe the design likely chosen had the requirement
   existed initially, plus a safe path from today.

Do not force four cards when two families collapse to the same design. Explain
deduplication rather than fabricating diversity.

Use this Design Card schema:

- thesis and supported requirements;
- current and proposed canonical path;
- ownership before and after;
- dependency changes;
- packages, types, APIs, states, flags, configuration, and adapters added and
  removed;
- preparatory refactor;
- prepare, migrate, and contract sequence;
- deletion ledger;
- verification and architecture fitness checks;
- rollback, failure modes, and reversibility;
- verified, inferred, and unknown assumptions;
- effect of the next analogous requirement;
- comparison with the calibration candidate.

Every card must answer these probes:

- **Semantic owner:** What domain helper is closest? What lower-level
  primitive would it wrap? Which location best owns validation and invariants?
- **Semantic bridges:** Which existing SQL, SPI, IPC, callback, or configuration
  interfaces already own conversion, validation, atomicity, or versioning?
  Would a new internal API duplicate that contract?
- **Capability completeness:** What exact canonical and derived state,
  dependencies, and lifecycle does the proposed owner already have? Would the
  feature enlarge a nearby bridge more than a dedicated operation owner?
- **Semantic state:** Which repository-native state represents retirement,
  deprecation, visibility, disablement, or another named lifecycle? Which
  consumer observes it, and is a generic flag actually equivalent?
- **Caller surface:** If an API changes, which existing callers migrate, and
  is that churn semantic or mechanical?
- **Lifecycle locality:** Is policy stable for an owning object's lifetime and
  naturally copied at construction/reload, or genuinely per operation? Name
  the configuration source, runtime invariant owner, object-birth path, reload
  path, and direct low-level/test callers. Do not infer non-ownership merely
  because an embedded aggregate lacks its own constructor. If all callers pass
  the same parent field, why is that not construction-time state?
- **Result semantics:** Does a new outcome reuse an internal error/state that
  already represents a different observable condition? Which consumers must
  migrate to preserve behavior?
- **Path applicability:** For every path a refactor would unify, is the new
  invariant reachable and required there? What evidence supports convergence
  beyond a similar-looking tail?
- **Blocking observability:** For a wait/retry phase, how do tests observe its
  entry, release it deterministically, bypass it when orthogonal, and exercise
  the protected consumer workflow?
- **Policy independence:** Which outcomes may vary separately, and can the
  proposed mechanism change only the locked outcomes while preserving the
  closest-existing behavior of every unspecified outcome?
- **State/provenance:** Does precedence require distinguishing absent,
  explicit false/empty, inherited, and default values?
- **Minimum concept proof:** What second present requirement or explicit
  extensibility contract justifies each generic layer, registry, envelope,
  adapter, or additional runtime representation?

Return or reject a card that:

- violates a hard contract or invariant;
- rests on a critical unknown;
- leaves permanent competing paths, owners, or sources of truth;
- retains old and new mechanisms without contraction;
- weakens a guardrail;
- lacks credible migration or verification;
- describes feature mechanics but not the final architecture;
- leaves known task-relevant debt unaddressed without accepted justification.

Also reject a card that contradicts a Requirement Lock row, changes an
unspecified product policy without necessity, or expands into adjacent debt
whose repair is not required to deliver or safely contract the feature.

Treat an unknown as selection-critical when resolving it could change public
or persistent behavior, ownership, dependency direction, data/reference
semantics, migration/contraction, or the strongest objection to the leader.
Use one reserved targeted probe. If it remains unknown, select only a design
valid under both outcomes or preserve a provisional decision and stop. A score
cannot clear this gate.

If the unknown concerns an unspecified product policy, the conservative
default is the closest existing behavior, not a newly inferred behavior. Ask
the user only when preservation is impossible or mutually inconsistent with a
locked requirement.

## Falsification and selection

Relabel cards with neutral identifiers. Keep authors and evaluators separate.
Use read-only critics for:

- repository evidence and hidden consumers;
- ownership, boundaries, conceptual multiplication, and dependency direction;
- partial migration, mixed versions, rollback, and incomplete contraction.

For each finding require claim, evidence, consequence, correction, severity,
and confidence. Give each author one bounded evidence-driven revision, then
reapply the Candidate Gate.

Use the number of evaluators selected by the profile. In a focused change, one
critic can score both normalized cards and the root adjudicates; do not pretend
that extra same-model votes create independent evidence. For standard and
critical work, randomize card order, hide author identity, and prevent
evaluators from seeing one another's scores. Score 0–4:

- `0`: contradicted or absent;
- `1`: serious weakness requiring redesign;
- `2`: plausible with material gaps;
- `3`: convincingly supported with bounded compromises;
- `4`: exceptionally satisfies the charter, either by improving the design or
  proving the existing shape is already appropriate.

| Criterion | Weight |
| --- | ---: |
| Behavior and invariant fit | 15 |
| Repository grounding | 15 |
| Responsibility coherence | 15 |
| One canonical path and completed contraction | 15 |
| Dependency direction and change amplification | 10 |
| Conceptual economy without hidden centralization | 10 |
| Migration safety and reversibility | 15 |
| Verification and operability | 5 |

For focused work, record criterion-level strengths, risks, and a total rather
than manufacturing false numerical precision. For standard and critical work,
record support, counterevidence, uncertainty, and what would change every
score. Preserve score ranges. Any supported veto, score of 0 or 1, or spread of
at least 2 requires adjudication. Calculate the median per criterion, then
weight and normalize to 100. Report destination quality and transition
credibility separately.

Apply this selection order:

1. hard-gate survival;
2. verified evidence;
3. Pareto dominance;
4. weighted shortlist;
5. pairwise top-two comparison;
6. reversibility as tie-breaker;
7. accountable root decision with minority report.

Run a pre-mortem for partial migration, hidden consumer, rollback in mixed
versions, the next analogous feature, and copying the pattern elsewhere. When
the weighted and pairwise leaders differ or finalists are within five points,
run a bounded factual probe or ask the user rather than adding rhetorical votes.

A veto is cleared only by contradicting evidence, candidate revision, or an
approved charter amendment, never by score or majority.

## Plan gate

Preserve `Accepted Design v1` as the evaluated card. Material synthesis creates
a new candidate and returns to selection.

Preserve `Execution Plan v1` with stable step IDs. Separate:

1. baseline verification;
2. behavior-preserving preparatory refactor;
3. verification checkpoint;
4. feature implementation through the target design;
5. consumer migration;
6. contraction and deletion;
7. behavioral, structural, and operational verification.

For each step record intent, requirement/invariant/decision served, likely
components, preserved behavior, additions, migrations, removals, verification,
completion evidence, and rollback point.

Trace every requirement, invariant, accepted decision, anti-goal, deletion, and
forecast architecture delta to plan steps and final evidence. Pass only when
the plan ends in the target architecture rather than an indefinite transition.

Every amendment must record ID, reason, affected step IDs, architecture effect,
evidence, approval, and resulting plan version.

For design-mode forecasting, add a predicted change-surface table:

| File or symbol | Add/change/remove | Architectural role | Confidence | Evidence |
| --- | --- | --- | --- | --- | --- |

Forecast at the narrowest justified scope. Distinguish required ownership and
flow changes from likely file placement. A low-confidence filename must not be
presented as an architectural requirement.

Use confidence consistently:

- `High`: direct symbol/caller evidence supports the prediction;
- `Medium`: repository pattern supports it but exact placement or semantics
  remain inferred;
- `Low`: plausible forecast with unresolved alternatives;
- `UNKNOWN`: a selection-critical fact still needs evidence.

When changing a semantic helper, enumerate its callers and generated or
contract artifacts. When bypassing it for a primitive, explain why its
invariants do not belong in the helper. Call-site churn counts as migration
even when it is compiler-enforced and behavior-preserving.

## Implementation gate

Use exactly one writer. Verify and record evidence after every step. Stop on a
material deviation before further writes. Return to the relevant earlier phase
instead of improvising a local layer.

Pass only when all consumers use the target path, contraction is complete,
tests and guardrails pass, and actual architecture delta is recorded.

## Release gate

Freeze implementation and run three independent read-only reviews, initially
without the implementer's explanatory narrative:

### Plan-conformance auditor

Check plan-to-code and code-to-plan. Verify original requirements, assumptions,
removals, amendments, and deviations.

### Architecture adversary

Reconstruct ownership, paths, sources of truth, dependencies, adapters, flags,
configuration, and obsolete code. Simulate the next analogous feature and
removing the new feature.

### Behavior reviewer

Retrace the end-to-end behavior and inspect edge cases, compatibility, errors,
recovery, tests, observability, and relevant performance risks.

Require severity, concrete evidence, violated decision or criterion,
consequence, smallest coherent correction, and confidence for every finding.

Pass only with no unexplained plan omission, unauthorized material change,
competing canonical mechanism, or unresolved critical finding. Require the
approval named by the charter for high-severity compromises.

## Repair routing

| Finding | Return to |
| --- | --- |
| Incorrect baseline | Exploration |
| Weak target architecture | Candidate generation and selection |
| Missing or invalid plan step | Planning |
| Implementation defect | Single writer |
| New requirement or external trade-off | User decision |

After repair, rerun affected verification plus conformance and architecture
review. If the same architecture problem survives two repair cycles, reopen
design selection rather than applying a third patch.

## Final report

Produce:

1. requirement → plan step → implementation evidence → verification → status;
2. original Plan v1 effect → actual evidence → status;
3. amendment → approval → architecture effect → resulting plan version;
4. final amended-plan effect → evidence → deviation → consequence → status;
5. invariant → evidence → status;
6. additions and removals across packages, APIs, dependencies, states, flags,
   adapters, paths, sources of truth, and obsolete mechanisms;
7. deletion evidence;
8. remaining temporary mechanism → consumer → owner → expiry → deletion trigger;
9. strongest remaining argument against the selected design.

Do not declare completion when any unapproved owner, path, or source of truth
was added; a new concept lacks documented necessity; planned removal lacks
evidence; or actual change amplification exceeds the accepted forecast without
an approved amendment.
