---
name: testing
description: Design, implement, diagnose, or review language-agnostic tests. Use when work concerns behavioral evidence, regression protection, test scope, oracles, fixtures, test doubles, flaky tests, testability, or coverage quality.
---

# Testing

Produce evidence that is sensitive to defects, resilient to non-contractual refactors, and diagnostic when it fails.

- **Defect sensitivity:** a plausible defect in the claimed behavior makes the test fail.
- **Refactor resilience:** behavior-preserving implementation changes do not make the test fail. Tests for explicit architecture, representation, or interaction contracts may change when those contracts change.
- **Diagnostic precision:** the test name and failure output identify the violated behavior, relevant inputs, expected result, and observed result without a diagnostic rerun.

Default to read-only analysis for reviews, diagnosis, explanations, and test strategy. Edit tests when the user asks to write, fix, migrate, or improve them. Preserve production behavior; if adequate evidence requires a material production refactor outside the requested scope, report the boundary instead of silently expanding the task.

## Workflow

1. **Establish the target**
   - Read binding requirements, repository instructions, test commands, existing tests, and the observable behavior: an outcome, state transition, side effect, or invariant available at a controlled boundary.
   - For changed-code review, inspect status, the relevant diff including staged and unstaged work, surrounding callers, and related tests.
   - Trace the exercised path far enough to identify inputs, outputs, state, dependencies, lifecycle, failure modes, and externally visible contracts.

2. **Define the evidence**
   - State one coherent behavioral guarantee and a plausible defect that must make the evidence fail. One guarantee may require several actions or assertions.
   - Choose the observation boundary and execution scope separately. The boundary is where evidence is observed; the scope is the set of real components executed.
   - Choose an independent oracle: expected results derived separately from the implementation under test.
   - Inspect existing coverage before adding a test. Strengthen or replace weak evidence instead of adding a redundant example.

3. **Select the smallest sufficient portfolio**
   - Choose from risk, fidelity, cost, and diagnostic value. Do not prescribe a test pyramid, fixed ratio, duration threshold, or test count.
   - Prefer a stable consumer-visible boundary. Exercise lower-level rules when they expose important states or faults more economically, while retaining representative evidence that the real entry path is wired correctly.
   - Use real component boundaries for serialization, storage, transport, configuration, transactions, and provider assumptions that substitutes cannot prove.

4. **Implement or assess the cases**
   - Keep behavior-defining inputs, actions, and expected outcomes visible together. Apply DAMP—Descriptive and Meaningful Phrases—over mechanical DRY deduplication.
   - Use distinct, non-default, and non-symmetric values when ignored, swapped, aliased, or reused inputs could pass accidentally.
   - Cover the risks that matter: representative success, rejection, boundaries, transitions, partial failure, retry, idempotency, concurrency, and performance limits where applicable.
   - Assert every fact needed to prove the guarantee and omit incidental representation or choreography.

5. **Prove the evidence**
   - Run the narrowest relevant test first, then the repository checks justified by the impact.
   - For regression tests and other high-risk evidence, when safe and feasible, show that the intended assertion fails against the prior defect or a controlled equivalent and passes against the corrected behavior. A green run alone does not prove defect sensitivity.
   - Inspect actual failure diagnostics. Remove temporary mutations or fault injection before the final green run.
   - Record the seed, generated input, schedule, timeline, or other reproducer for nondeterministic exploration.

6. **Close the risk**
   - Map each binding behavior to the evidence that proves it.
   - Identify material unproved assumptions, semantic gaps in doubles, unexercised real boundaries, and risks intentionally left uncovered.
   - Finish only when the requested guarantee is proved or the remaining gap is explicit.

## Evidence standards

### Cases and assertions

- Make each case independently readable. Use tables and shared fixtures only when names, relevant values, actions, and outcomes remain clear at the failure site.
- Name the scenario and expected outcome. Failure output must distinguish cases and show relevant expected and observed facts.
- Derive expectations from worked examples, explicit contracts, mathematical or domain properties, independently constructed reference models, differential implementations, or independently reviewed outputs. Do not reproduce the production algorithm in the test.
- Prefer semantic predicates over broad equality when only part of a value is contractual. Exact bytes, order, calls, persisted form, or interaction sequence are valid when they are explicit contracts or the targeted risk.
- Use snapshots or goldens only when the complete representation is controlled behavior. Keep diffs reviewable, establish the baseline independently, and never regenerate it blindly.
- Property tests must use bounded generation and an independent property or reference model. Check the property against known examples. Preserve a useful smallest failure as regression evidence.
- Label characterization tests as temporary evidence of observed legacy behavior. Promote that behavior to an explicit contract or remove the test when the migration resolves it.

### Doubles and external dependencies

- A **stub** returns fixed responses. A **fake** implements a useful subset of real behavior. A **mock** records interactions for assertions.
- Choose the cheapest substitute that preserves the required semantics: a controlled real dependency, stub, maintained fake, or mock. Prefer state and outcomes; use mocks when the interaction itself is contractual.
- A substitute for an unowned dependency proves owned response handling, not provider behavior. Retain thin real-boundary evidence for assumptions the substitute cannot prove.
- State the semantic gaps of reusable fakes and, where practical, test the contract subset they claim against the real implementation. Trivial fixed-response stubs need no conformance suite.
- Add an owned adapter only when production translation, policy, failure semantics, repeated use, or dependency volatility justifies the boundary—not solely to enable substitution.

### Determinism and lifecycle

- Prefer hermetic evidence whose dependencies, state, and resources the test owns or controls. Use real filesystems, processes, networks, providers, or devices when their semantics are the subject; keep them isolated and bounded.
- Each test owns its mutable state, resources, cleanup, and deadline. Tests must be order-independent and safe under supported parallel execution.
- Control or record clocks, randomness, generated inputs, and relevant scheduling. Keep generation, stress, race, and schedule exploration bounded.
- Coordinate through observable events instead of sleeps. Use wall-clock waits only when elapsed time is the behavior, with explicit tolerance, deadline, and diagnostics.
- Retries do not repair flakes. Deterministic schedules provide primary concurrency evidence; bounded stress or randomized runs may supplement them.
- Every failure and timeout must identify the guarantee, case, relevant state, and unmet condition.

### Testability and coverage

- Treat hard-to-test behavior as design evidence. Separate deterministic decisions from side effects and make production dependencies explicit, but do not introduce an abstraction solely for tests.
- Use coverage to locate untested risk and treat repository thresholds as floors. A percentage is not proof that required behavior is covered.
- Keep high-fidelity journeys that uniquely prove wiring or user-visible outcomes. Add diagnostic checkpoints at meaningful boundaries.

## Presumptive blockers

Flag these unless the asserted detail is itself a binding contract:

- The test remains green under a plausible defect in the claimed behavior.
- The oracle repeats the production algorithm or derives expectations from the result under test.
- Assertions record implementation choreography, fixture setup, broad object shape, or incidental representation instead of behavior.
- Mock-only evidence is presented as proof of a real provider, protocol, serializer, database, or framework boundary.
- Sleeps, retries, shared mutable fixtures, leaked resources, unbounded generation, or uncontrolled scheduling make the result nondeterministic.
- A large snapshot is accepted without an independently reviewed baseline or a diagnostic diff.
- Coverage growth adds executions without proving a named risk.

Consolidate findings that share a root cause. Prefer replacing or deleting false evidence over layering more tests around it.

## Output contract

For review or diagnosis work, report findings first in this order: missing defect sensitivity or independent oracles, nondeterminism or lifecycle leaks, boundary and substitute gaps, refactor brittleness, then material coverage gaps. Each finding includes `file:line`, the unproved guarantee or plausible escaping defect, why the current evidence fails, a concrete replacement, and whether it is blocking, risky, or needs proof. If no finding meets the bar, say so and name residual risks.

For implementation work, report changed files, checks and results, red/green evidence obtained, the behavior now proved, and remaining gaps.

For strategy or design work, provide the smallest sufficient portfolio. For each material guarantee, identify the plausible defect, observation boundary, execution scope, oracle, essential cases, and unresolved risk.
