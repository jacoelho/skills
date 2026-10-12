# Critical Changes

Use this workflow only for irreversible data or protocol changes, security boundaries, broad migrations, or similarly high-blast-radius work.

## 1. Preserve the decision contract

Create versioned, append-only records for:

- the charter: required behavior, constraints, invariants, non-goals, approvals, and base revision;
- the baseline: current owners, paths, contracts, data, dependencies, and known failure modes;
- the accepted design and execution plan;
- amendments discovered during implementation;
- verification and migration evidence.

Assign stable IDs to requirements and plan steps when traceability matters. Do not rewrite the original plan to make later implementation appear conformant.

## 2. Gather independent evidence

Use bounded waves rather than recursive delegation:

1. repository readers trace ownership, runtime flow, lifecycle, contracts, and consumers;
2. isolated designers produce materially distinct candidates;
3. critics try to falsify the candidates and expose hidden consumers, partial migrations, unsafe compatibility assumptions, or rollback gaps;
4. the root agent synthesizes and decides.

Give each delegated task one narrow question, evidence scope, completion condition, and output schema. Continue with completed evidence when a non-critical worker fails. Label material claims `VERIFIED`, `INFERRED`, or `UNKNOWN`.

## 3. Select with gates before scores

Apply hard constraints first. Reject a candidate that violates required behavior, security invariants, data integrity, compatibility commitments, dependency rules, or migration feasibility. A veto cannot be averaged away by a weighted score.

Falsify candidates before selecting. Resolve an unknown when it could change public behavior, ownership, dependency direction, data semantics, migration, rollback, or the strongest objection. Otherwise record it and proceed conservatively.

## 4. Design migration and recovery

Specify:

- old and new representations or protocols;
- compatibility window and version negotiation;
- ordering of deploy, backfill, cutover, and deletion;
- idempotency and retry behavior;
- rollback versus roll-forward strategy;
- observability and abort conditions;
- ownership of temporary mechanisms and their deletion criteria.

Prefer a migration that can be paused and observed. Do not claim rollback when irreversible writes or external consumers make only roll-forward recovery realistic.

## 5. Implement through checkpoints

Use one write-capable agent at a time and separate:

1. baseline verification;
2. behavior-preserving preparatory refactor;
3. checkpoint verification;
4. feature or protocol implementation;
5. consumer and data migration;
6. contraction and deletion;
7. final behavioral and structural verification.

Record material deviations as amendments before continuing. Return to exploration or design when an assumption fails; do not add compensating layers by default.

## 6. Audit independently

Freeze writes and review in three directions:

- plan to code: prove every planned outcome, migration, and deletion;
- code to plan: justify every material implementation change;
- architecture to code: reconstruct owners, sources of truth, dependency directions, states, configuration, temporary paths, and recovery behavior.

Route a failed baseline back to evidence gathering, a weak target back to design, a plan defect back to planning, and an implementation defect to the single writer. Re-run the relevant checks after repair.

## 7. Finish with evidence

Report requirement traceability, authorized amendments, final-plan conformance, architecture delta, migration state, deletion evidence, deviations, temporary mechanisms, recovery posture, and the strongest unresolved objection. Prefer concrete evidence over prose assurances.
