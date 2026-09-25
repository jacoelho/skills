---
name: spectacular-spec-review
description: Review bounded software specifications for ambiguity, contradiction, duplicate authority, missing cases, evidence gaps, and drift. Use for read-only spec audits, change reconciliation, and readiness review.
metadata:
  version: "1.2.0"
---

# Spectacular spec review

Review the next bounded commitment, not the whole imagined product. Prefer concrete counterexamples over generic quality commentary.

The user's explicit task and decisions take precedence over this workflow. Treat binding external constraints as evidence that may require a decision when they conflict with the requested behaviour.

This is a read-only review. Do not edit specifications, code, tests, or decisions to make a finding disappear. If the user explicitly requests a repair, record the finding first, make the smallest scoped edit, and rerun the affected checks as a separate step.

## Outcome

Return a review that makes every material finding actionable. For each finding identify the applicable source, a concrete witness or evidence gap, the consequence, and the smallest repair or decision needed.

A clean review means only that the inspected scope produced no material finding under the stated evidence. Record excluded or inaccessible sources.

## Four independent assessments

Assess the questions supported by the scope; they are related but are not sequential gates:

- **Specification quality:** Do the rules express a justified need and provide clear, consistent, feasible, and verifiable commitments for the next increment?
- **Agent readiness:** Can the assigned agent retrieve the current contract, distinguish governing material from history, access the repository and checks, understand its discretion, and produce evidence at the relevant boundary?
- **Implementation conformance:** At the named code revision, configuration, and execution boundary, does actual behaviour satisfy the applicable rules, including rejection, partial failure, preservation, and shared invariants?
- **Faulty-specification response:** Does evidence challenge a rule itself, and if so, which decision, examples, implementation, tests, dependants, or released effects require correction?

Keep the assessments separate in the report. A specification can be sound while an assignment is not ready or an implementation violates it; code can follow a faulty rule. A second reviewer agreeing with the same premise is not independent evidence that the requirement is correct.

## Establish the review basis

Identify:

- the bounded capability and proposed change;
- active specification versions and shared contracts;
- settled decisions and their authority;
- relevant code revision or workspace state;
- acceptance examples and tests;
- external contracts that govern the behaviour.

Inspect accessible sources directly. Label observations by source: normative spec, recorded decision, code behaviour, test expectation, runtime observation, or external contract. Treat conclusions from reading code, tests, or configuration as static inferences. Call behaviour observed only after an executed check or operational observation a runtime observation, and record the code state, configuration, boundary, command, fixture, and result that support it.

## Review passes

### 1. Meaning and authority

For each consequential obligation, identify its maintained home, applicability, required outcome, prohibited effects, and basis.

Expose ambiguity with a distinguishing case: show two behaviours that fit the wording but produce different observable outcomes. Explicitly delegated discretion is acceptable when its bounds are clear.

### 2. Overlap and interaction

Use [the overlap method](references/overlap.md). Classify related rules as duplicate authority, contradiction, partial overlap, legitimate refinement, shared applicability, or disjoint cases.

Check combinations and lifecycle interactions as well as pairs. Shared invariants may legitimately apply to the same execution as capability-specific rules.

### 3. Consequential gaps

Probe only boundaries that can change acceptance for this increment: invalid or empty input, limits, identity, permissions, retries, cancellation, partial failure, concurrency, ordering, time, lifecycle, preservation, or version coexistence.

A gap is blocking when plausible answers would change a promised outcome, violate a shared invariant, break a consumer, or invalidate dependent work. When a case matters only if scope expands, record it as a limit or deferred question, not a finding or readiness blocker for this increment.

Classify permissions separately from guarantees. A `MAY` or otherwise allowed outcome says that the behaviour is permitted; it does not require the system to produce that outcome in every case. Do not turn an allowed path into a new `MUST` obligation or expand the increment because no positive demonstration exists. Check that observed behaviour does not violate required or forbidden outcomes, and record permitted outcomes with their actual bounds.

### 4. Acceptance and evidence

Trace important rules to acceptance evidence and evidence back to rules. Confirm that expected results have a basis independent of the implementation under review.

Distinguish proposed verification from executed evidence. A recorded ad-hoc check can support an obligation for its stated code state, boundary, fixture, command, and result; committed automation is not required. State the boundary, fixture, measurement, or counterexample needed to support unresolved claims. A passing check whose fixture, fake, or expected value repeats the implementation's premise is evidence about that setup, not independent evidence of conformance. Record preserved behaviour and negative controls when they matter to the claim.

### 5. Reconcile decisions with existing specs and code

For every new or changed decision, compare it with:

1. active specifications and shared contracts;
2. externally binding interfaces or policies;
3. existing code paths that implement the affected behaviour;
4. tests that encode current expectations.

Use a concrete input, state, or event to compare outcomes. Classify each mismatch before recommending a change:

- **implementation defect** — the current contract is authoritative and code violates it;
- **specification defect** — stronger evidence shows the current contract misstates the intended or binding behaviour;
- **deliberate change** — the proposal intentionally changes an existing promise; examine migration or compatibility consequences when the changed promise, persisted data, consumer contract, binding constraint, or version coexistence makes them relevant;
- **undocumented existing behaviour** — code behaves consistently in a way the contract does not settle; obtain authority before promoting it to a requirement;
- **stale secondary source** — a test, example, design note, or duplicate spec conflicts with the maintained contract;
- **unresolved conflict** — authority or evidence is insufficient to choose which source should change.

Code describes actual behaviour, not automatically intended behaviour. A test demonstrates an encoded expectation, not automatically the governing requirement. Preserve the evidence needed to decide which source is wrong.

For deliberate changes, trace affected consumers, stored data, scenarios, compatibility promises, migrations, and active assignments when the changed promise or binding constraints make them relevant; otherwise record why those concerns are out of scope. For defects, propose correction at the source that is wrong rather than synchronising every source to the same mistake.

### 6. Readiness

Classify remaining uncertainty as product decision, evidence gap, environment limitation, or missing authority. Separate blockers from independently executable work. Report limits on scope and execution explicitly: inaccessible sources, unrun checks, unsupported dependencies, sampled interactions, and static inferences must not be presented as complete or executed evidence.

Possible recommendations are: implement the bounded scope, investigate a named uncertainty, revise the contract, reconcile drift, or insufficient evidence to assess.

## Structural checking

For repositories using the bundled notation, [the linter guide](references/lint-format.md) and `scripts/spec_lint.py` can check identifiers and references. Report the emitted counts for active documents and declarations, skipped documents or entries, symlinks, and rejected unsupported inputs; do not describe skipped or unrun material as inspected. Treat structural cleanliness as supporting evidence only; semantic overlap and correctness require the passes above.

## Output

Use [the report template](references/report.md) when useful. Prefer findings ordered by consequence.

Each material finding contains:

- location and affected rule or decision;
- classification;
- concrete witness or missing evidence;
- observed or possible consequence;
- smallest repair, decision, or investigation;
- affected dependants when the rule changes.

When multiple independent reviewers are available, give them the same identified source set and distinct focuses such as semantics, cross-contract interaction, evidence, and feasibility. Consolidate findings by root cause and rerun affected checks after changes. When only one reviewer is available, describe the work as adversarial review passes rather than independent-agent consensus.
