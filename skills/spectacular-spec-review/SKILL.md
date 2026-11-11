---
name: spectacular-spec-review
description: Read-only review of EARS specifications, requirements, invariants, and acceptance criteria for syntax, ambiguity, contradiction, duplicate authority, consequential gaps, evidence gaps, and drift from decisions, code, or tests; runs the bundled spec linter. Use when asked to review, audit, lint, or check a spec or requirements, to reconcile a proposed change with existing specs and code, to judge whether a spec is ready to implement, or to review Gherkin scenarios or acceptance examples against a spec.
argument-hint: "[spec path | proposed change]"
---

# Spectacular spec review

Review the scope you were given, not the whole product, and back each finding with a concrete counterexample rather than a quality adjective. The review is read-only: do not edit specs, code, tests, or decisions to make a finding go away. If the user asks for a repair, report the finding first, make the smallest edit, and rerun the affected checks.

Scale the review to the request. Linting one contract returns the lint result and the findings it implies; a readiness question returns the blockers. Report only material findings, and omit any report section the scope does not cover.

Read [EARS](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/ears.md) from Keywords to the end of Check meaning before judging statements; use its Terms table for exact meanings, such as consequential and vague term. Judge a quoted external source in its own form: a local syntax defect neither retires a binding obligation nor proves an implementation defect.

## Steps

1. **Fix the basis.** Name the capability and change under review, the contracts and their revisions, settled decisions, the code revision, tests, and governing external contracts. Inspect them directly. Label each observation by source, and call behaviour observed only when a check was executed; reading code is inference.
2. **Lint.** Find active documents with `grep -rlF --include='*.md' -- '<!-- spec-lint: active -->' .` (it also matches markers in fenced examples; the linter's counts are authoritative) and run:

   ```sh
   python3 "${CLAUDE_SKILL_DIR}/scripts/spec_lint.py" <spec roots>
   ```

   Report its counts and findings. A clean run covers syntax and ID traceability only. [The linter guide](references/lint-format.md) explains each check and the exit codes. If it cannot run, say so; do not claim automated compliance.
3. **Meaning.** For each consequential obligation, check its home, applicability, outcome, prohibited effects, and basis, and that it is one EARS sentence with the right pattern. Report syntax-only defects separately from changed meaning. Apply the vague-term definition to every statement, including words the linter misses, such as "supports", "handles", or "correctly", and show each ambiguity as two behaviours that fit the wording with different observable outcomes. Bounded, explicitly delegated discretion is fine. Contracts on a structural commitment's declarations are secondary sources: each traces to a requirement ID, and one stating behaviour no requirement settles is an unspecified case.
4. **Overlap.** Classify related rules with [the overlap method](references/overlap.md), and check combinations and lifecycle interactions, not just pairs.
5. **Gaps.** Probe only boundaries that change acceptance in this scope, using the dimensions in [the precision checks](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/precision.md#conditions-that-change-meaning). A gap blocks when plausible answers change a promised outcome, violate a shared invariant, break a consumer, or invalidate dependent work; a case that matters only if scope grows is a limit, not a finding. Check permissions against the EARS permission section: flag a `MAY` rewritten into a closed set or a guarantee.
6. **Evidence.** Trace rules to acceptance evidence and back. Each expected result needs a basis independent of the implementation, and planned checks are not executed ones. A check whose fixture or expected value repeats the implementation's premise proves only its setup. For scenarios, apply [the scenario lenses](references/scenarios.md). When boundary evidence cannot tell a correct implementation from a wrong composition, report an evidence gap and name the structural commitment or component check that would close it.
7. **Reconcile.** For each new or changed decision, compare outcomes on a concrete input against contracts, binding interfaces, code paths, and tests. Classify each mismatch with [the mismatch classes](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/mismatch.md); the class decides which source to repair. For a deliberate change, trace consumers, stored data, and migrations only when the changed promise makes them relevant. For a feature spec, check the discard gate in [the lifecycle rules](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/lifecycle.md) before recommending it be discarded.
8. **Readiness.** Classify what remains as a product decision, evidence gap, environment limit, or missing authority, and separate blockers from work that can proceed. Recommend one of: implement the named scope, investigate a named uncertainty, revise the contract, reconcile drift, or insufficient evidence.

## Report

Order findings by consequence. Each gives its location, classification, witness or missing evidence, consequence, and the smallest repair or decision, plus affected dependants when the rule changes. State what was not inspected or run; a clean review means only that the inspected scope produced no material finding.

Keep these four questions apart when the scope covers more than one; a sound spec can still be unready, and code can follow a faulty rule:

- **Specification quality:** are the rules clear, consistent, feasible, and verifiable for this scope?
- **Readiness:** can an implementer retrieve the contract, see its discretion, and produce evidence at the boundary?
- **Conformance:** at a named code revision, does executed evidence show the rules hold?
- **Faulty specification:** does evidence challenge a rule itself, and what must change with it?

[The report template](references/report.md) gives a full layout for larger reviews. With several reviewers, give each the same sources and a different focus, and merge findings by root cause; a single reviewer reports its passes as self-review, not independent agreement.
