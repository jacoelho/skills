---
name: testing
description: Design, write, and review tests for defect detection, independent expectations, appropriate boundaries and maintenance cost. Use for coverage gaps, redundant or tautological tests, test doubles, flaky tests and testability.
---

# Testing

## Review method

Read the relevant contract, implementation, tests, fixtures and assertion helpers. Apply each relevant criterion below in order. A finding needs a concrete missed defect, failure under a behavior-preserving refactor, or material maintenance cost; unverified premises remain uncertainties.

Complete one evidence pass and one validation/deduplication pass. Continue only for a specific unresolved question, changed evidence or failure. If delegating, split by capability so implementation and existing tests are evaluated together; consolidate severity and duplicates centrally.

## Evaluation criteria

### 1. Coverage and contribution

Judge contribution by defects detected, fidelity and diagnostics. Before adding a test or claiming a gap, identify what existing assertions leave unprotected. Unit and integration tests of the same behavior can provide complementary evidence.

Redundancy requires showing that removal preserves detection, fidelity and diagnostics. Similar setup, names or exercised lines do not establish equivalence. Coverage measures execution, not assertion quality; choose tests by risk and cost rather than fixed pyramid ratios.

### 2. Oracle and tautology

Derive expectations independently from worked examples, contracts, properties or checked reference models. Trace expected and actual values to their sources. Flag assertions of setup, expectations derived from actual results, or copied production decisions with a concrete incorrect implementation they would accept.

Shared helpers or literals alone are not tautology; preserving an input may be the contract. Property tests and reference models may contain bounded logic when structurally independent and checked against known examples. Characterization tests document uncertain legacy behavior without establishing its correctness.

### 3. Internal versus API boundary

Prefer stable consumer boundaries. Public accessibility does not establish a contract; internal functions can own meaningful invariants or framework contracts. Claims about application behavior also need representative real-entry evidence.

To establish implementation coupling, name a behavior-preserving refactor that breaks the assertion. Internal access and interaction assertions alone are insufficient. Exact bytes, persisted forms, counts, destinations, order and architecture are legitimate assertions when contractual.

### 4. Assertions and cases

Assert all facts needed for the guarantee, including forbidden effects, duplicates, wrong destinations or effects after rejection when relevant. Match counts and ordering to actual retry/delivery semantics; one local call does not prove exactly-once delivery. Multiple actions or assertions can support one coherent guarantee.

Choose boundary, rejection, transition, partial-failure, retry, idempotency, concurrency and limit cases by risk. Distinct values expose ignored, swapped or aliased inputs; defaults and equal values remain valid cases. Completion or an expected exception can itself be the oracle when that is the guarantee.

### 5. Execution fidelity and doubles

Use the cheapest scope that preserves the semantics being claimed. Doubles establish owned response handling or contractual interactions, not provider behavior. Identify reusable fakes' semantic gaps and check their claimed subset against the real implementation where useful; fixed-response stubs need no conformance suite.

Tests claiming an external interaction should exercise relevant owned mapping, serialization, routing and dispatch before substituting the external effect. Retain real-boundary evidence for assumptions a double cannot establish. Use representative schema/provider inputs when their fidelity is claimed; narrower tests can use smaller fixtures.

For committed-persistence claims, arrange committed fixture state, preserve production session/transaction lifetimes and read through a fresh observation context. Cached objects or rollback fixtures must not hide missing saves, commits or visibility errors. Check partial failure when atomicity is promised; other workflows may promise partial completion or compensation. Bound waits for delayed visibility. Choose real or in-memory storage by the semantics tested.

### 6. Isolation and lifecycle

Tests own mutable state, resources, cleanup and deadlines and work under supported ordering and parallelism. Control or record clocks, randomness and relevant scheduling. Bound generated exploration and retain reproducing inputs or seeds.

Coordinate through observable events. Wall-clock waits need a timing contract, tolerance, deadline and useful failure state. Deterministic schedules provide primary concurrency evidence; bounded stress/race runs can supplement them. Retries must not conceal flakes.

### 7. Readability and diagnostics

Keep behavior-defining inputs, actions and expectations visible together; helpers hide irrelevant mechanics. Tables and fixtures must preserve case meaning. Failure messages should identify the scenario, relevant inputs and expected/actual results without a diagnostic rerun. Report demonstrated diagnostic or maintenance costs, not naming or formatting preferences.

### 8. Testability and cost

Separate deterministic decisions from side effects. Extra interfaces or adapters need a production boundary, policy or volatility justification beyond substitution. Exposing incidental state solely for assertions adds coupling.

Test-mode bypasses and partial substitutes cannot prove the complete behavior they replace. Preserve scoped invariant tests and real-entry evidence for broader claims. Evaluate added production I/O, latency, memory, ownership and orchestration costs; faster tests alone do not justify extra production work or duplicated decisions.

When changing tests, reuse or extend existing evidence. Where feasible, demonstrate that a regression assertion fails on the prior defect or a controlled equivalent.

## Severity

Assign severity from consequences supported by the inspected paths and remaining suite gap, not the test's category.

- P0 — Critical: immediate severe harm caused by testing, such as deleting production data. Missing coverage alone is not P0.
- P1 — High: invalid or absent essential evidence lets a serious failure on an inspected production path escape, or a test defect broadly disables essential verification. A double's limitations alone do not establish serious production exposure.
- P2 — Medium: a concrete nontrivial defect can escape, a supported harmless refactor breaks tests, or a fidelity/isolation/diagnostic problem materially harms verification.
- P3 — Low: limited maintenance or diagnostic cost while meaningful behavioral evidence remains.

Report P0–P2 by default; include P3 for cleanup or requests covering low-priority findings. Report every qualifying finding without quotas.

## Deduplication and repeat reviews

One finding represents the same guarantee and causal mechanism; group affected locations. Different obligations or independent causes remain separate. Changed wording, location or priority does not make an issue new.

Reconcile prior findings when available. Changed conclusions need changed code, requirements, evidence or an explained analytical correction. Report genuinely missed defects; omission from a later report does not prove resolution. Keep review state in the conversation, without snapshots, ledgers or tracking files.

## Report

Open with one sentence giving scope, outcome and completeness. Use plain paragraphs, file links and a flat numbered list ordered by severity, then location:

```text
1. [<priority>] <factual problem title> — <file:line>
   <Concrete evidence and consequence; what existing tests cover and why the issue remains.>
```

Keep each finding to one short paragraph, distinguishing observed results from static reasoning. Use one primary evaluation criterion for classification; show its category label only when requested.

Give per-test verdicts or suggest fixes only when requested. Recommendations require considering the affected suite, production contracts and ownership; a finding does not require a chosen remedy.

If none qualify, say: "No material findings in the inspected scope." Close with relevant checks that passed, failed or were not run, and material limits. An incomplete review or unrun check is not a passing result.
