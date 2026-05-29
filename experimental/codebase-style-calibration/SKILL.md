---
name: codebase-style-calibration
description: Derive project-specific coding style guides, code review rule books, AI-generated-code checklists, and calibration probes from existing repositories. Use when Codex needs to calibrate generated code against a repo, ask snippet-based review questions, convert maintainer feedback into enforceable rules, or produce STYLE_GUIDE.md, CODE_REVIEW_RULEBOOK.md, AI_GENERATED_CODE_CHECKLIST.md, linter opportunities, or future-agent prompts.
---

# Codebase Style Calibration

Discover and codify what good code means for a specific repository.

The purpose is not to apply generic best practices. The purpose is to extract the codebase's local design pressure and the maintainer's review taste, then turn that into a practical style guide, review rule book, and AI-generated-code checklist.

The main mechanism is snippet-based preference calibration.

The agent shows carefully chosen code snippets, asks concrete review questions, records the user's judgments, and incrementally converts those judgments into rules future agents can follow.

Do not use this skill as a normal code review unless the user's goal is to derive reusable rules.

---

## Core outcome

By the end of the calibration process, produce repository-specific versions of:

1. `STYLE_GUIDE.md`
2. `CODE_REVIEW_RULEBOOK.md`
3. `AI_GENERATED_CODE_CHECKLIST.md`
4. Optional static-analysis or linter opportunities
5. Optional future-agent prompts for this repository

Do not create the final documents too early. First gather enough evidence through calibration rounds.

---

## Bundled resources

Use `templates/` as starting points when finalizing repository-specific documents.

Use `examples/start-calibration.md` and `examples/finalise-guides.md` as invocation examples only; do not copy them into target repositories.

---

## Operating model

Work in rounds.

Each round contains:

1. A small set of code probes.
2. A short explanation of what each probe tests.
3. Specific questions for the user.
4. Tentative rules inferred from the user's answer.
5. Updates to the growing rule book.

Prefer 3 to 6 probes per round.

Keep snippets short unless a longer snippet is necessary to expose the design issue.

Do not dump a long questionnaire. Use concrete code to reveal preferences.

---

## Snippet labels

Every snippet must be labelled clearly.

Use these labels:

- `REAL`: copied from the provided repository.
- `GENERATED`: created by the agent as a style probe.
- `MUTATION`: modified from real code to test a specific preference.

Never present generated or mutated code as real repository code.

For `REAL` snippets, include file path and approximate line numbers when possible.

For `MUTATION` snippets, explain what changed.

For `GENERATED` snippets, explain what design pressure the generated code is testing.

---

## Calibration dimensions

Inspect the repository across these dimensions.

### 1. Simplicity and code shape

Look for:

- unnecessary abstractions
- wrappers that add no behaviour
- generic helpers that hide the problem
- over-generalised utilities
- needless indirection
- excessive configurability
- functions that can be flatter or smaller
- code that is mechanically correct but harder to read than necessary
- places where fewer concepts would produce the same behaviour

Ask whether the user prefers the current shape, a simpler version, or a more explicit version.

### 2. Naming

Look for:

- package names
- type names
- function names
- interface names
- error names
- test names
- domain vocabulary
- abbreviations
- names that describe responsibility vs implementation detail

Generate alternative names when useful.

Ask which names reveal intent best.

### 3. API design

Look for:

- exported vs unexported symbols
- return value shape
- boolean arguments
- option structs
- callbacks
- interfaces
- constructors
- configuration style
- context passing
- zero-value usefulness
- ownership and lifecycle
- whether invalid states are representable

Create comparison snippets showing different API shapes.

Ask which API is easiest to use correctly and hardest to misuse.

### 4. Error handling

Look for:

- wrapping style
- sentinel errors
- typed errors
- error codes
- validation errors
- multiple-error collection
- panic vs error
- human-readable vs machine-readable errors
- consistency of error messages

Show examples of different error styles and ask which fits the repository.

### 5. Tests

Look for:

- table-driven tests
- fixtures
- golden files
- property tests
- end-to-end tests
- mocks vs real collaborators
- helper naming
- equivalence classes
- implementation-coupled tests
- tests that protect behaviour during refactoring

Generate alternative test styles.

Ask which tests the user would trust during refactoring.

### 6. Architecture

Look for:

- package boundaries
- dependency direction
- lifecycle ownership
- mutable vs immutable state
- compile-time vs runtime responsibilities
- concurrency assumptions
- data ownership
- domain model clarity
- ceremony masquerading as architecture
- missing structure that creates bugs

Use code snippets to test architecture preferences. Do not rely on abstract diagrams alone.

### 7. Performance and mechanical sympathy

Look for:

- allocation patterns
- copying
- string handling
- interface dispatch
- reflection
- map usage
- slice usage
- precomputation opportunities
- hot-path data layout
- locks and shared mutable state
- concurrency safety
- cache-friendly structures

Separate performance suggestions into:

- correctness-critical performance
- known hot-path performance
- speculative optimisation
- readability-preserving optimisation
- readability-damaging optimisation

Do not recommend performance changes blindly.

### 8. AI-generated code smell

Look for patterns that often indicate generated or low-quality code:

- verbose comments explaining obvious code
- unnecessary interfaces
- trivial wrappers
- helpers used once without naming a real concept
- defensive nil checks that hide broken invariants
- broad `Manager`, `Service`, `Provider`, `Factory`, or `Handler` objects
- repeated validation logic
- generic utility packages
- shallow tests
- inconsistent naming
- premature configurability
- large functions with unrelated responsibilities
- code that compiles but does not match the repository's design style

Create probes that expose whether the user accepts or rejects these patterns.

---

## Probe construction

When generating probes:

1. Preserve semantics unless the probe explicitly tests semantic design.
2. Keep variants minimal so the difference is easy to judge.
3. Prefer pairs or triplets:
   - current style
   - simpler style
   - more abstract style
4. Avoid strawman examples.
5. Bad examples must be realistic.
6. Show the trade-off being tested.
7. Ask the user to accept, reject, or modify.
8. Capture the reason, not just the preference.

Use this format:

```markdown
## Probe N: [Name]

Tests: [What preference this reveals]

### A. REAL — [file path:line]

```language
...
```

### B. MUTATION — [what changed]

```language
...
```

### C. GENERATED — [what this imitates or tests]

```language
...
```

Questions:

1. Which version would you accept in this codebase?
2. Which version would you reject in review?
3. What specific detail makes the rejected version unacceptable?
4. What rule should future generated code follow here?
```

---

## Question style

Ask concrete review questions.

Good questions:

- Would you accept this in a pull request?
- Which version feels most native to this codebase?
- Which version would you ask to rewrite?
- Is this abstraction earning its cost?
- Is this name precise enough?
- Is this error useful to a caller or only to a human?
- Does this test protect behaviour or implementation?
- Is this defensive check useful, or is it hiding a broken invariant?
- Would this code survive maintenance by someone unfamiliar with the feature?
- Does this look written for the problem, or written from a template?
- What would you delete?
- What would you make impossible by construction?

Avoid vague questions like:

- “Do you like this?”
- “Is this good?”
- “Any thoughts?”

Force concrete judgments.

---

## Inference rules

After each user answer:

1. Extract the underlying preference.
2. Convert it into a rule.
3. Add accepted examples.
4. Add rejected examples.
5. Note exceptions.
6. Assign confidence.
7. Track contradictions.
8. Ask a follow-up only when the contradiction blocks a useful rule.

Confidence levels:

- `High`: explicitly confirmed by the user.
- `Medium`: strongly implied by repeated examples.
- `Low`: inferred from repository code only.

Do not overfit one answer into a universal rule.

A weak rule:

> Prefer simple code.

A strong rule:

> Do not introduce a helper function unless it removes duplication across at least two real call sites, gives a domain concept a name, or isolates a meaningful invariant. A helper used once must justify itself by improving local readability.

---

## Rule format

Maintain a growing rule book with `templates/CODE_REVIEW_RULEBOOK.md`.

Every rule must include status, confidence, scope, category, rationale, accepted and rejected examples, review checks, exceptions, automation potential, and source evidence.

---

## First response when invoked

When this skill is invoked on a repository, do this:

1. Inspect the repository structure.
2. Identify language, framework, package boundaries, and likely hot spots.
3. Select 3 to 6 high-signal probes.
4. Prefer real snippets first, then generated or mutated alternatives.
5. Present Round 1.
6. Include low-confidence suspected rules at the end.
7. Do not produce the final style guide yet.

Use this opening structure:

```markdown
# Round 1: Style calibration

I inspected the repository and selected probes that test the largest likely sources of future generated-code mismatch.

[Probes]

## Preliminary suspected rules

These are low confidence until confirmed:

- R001: ...
- R002: ...
```

---

## Go-specific guidance

When the repository is written in Go, pay particular attention to:

- small interfaces vs concrete types
- whether interfaces are defined by the consumer
- unnecessary `Manager`, `Service`, `Provider`, `Factory`, or `Registry` names
- trivial wrapper functions
- ignored errors
- error wrapping consistency
- boolean parameters
- multi-value returns that obscure meaning
- pointer vs value receivers
- nil correctness and invariant clarity
- allocation behaviour on hot paths
- reflection
- generics used for clarity vs cleverness
- package boundary clarity
- table-driven tests
- golden tests
- mocks vs real collaborators
- benchmarks and allocation checks
- whether code would pass review in a conservative Go codebase

For Go repositories, include probes that test:

1. Inline logic vs helper extraction.
2. Concrete type vs interface.
3. Explicit domain type vs raw string, int, or bool.
4. Simple function vs configurable abstraction.
5. Local validation vs reusable validator.
6. Sentinel error vs typed error vs structured validation error.
7. Table-driven test vs abstract test helper.
8. Fast-path specialised code vs generic reusable code.
9. Defensive nil check vs constructor-enforced invariant.
10. One-pass streaming design vs build-an-intermediate-structure design.

---

## Finalisation trigger

Only produce final documents when the user asks for them, or when enough rounds have produced stable rules.

Final output should include:

```text
STYLE_GUIDE.md
CODE_REVIEW_RULEBOOK.md
AI_GENERATED_CODE_CHECKLIST.md
```

Optional files:

```text
AGENT_PROMPTS.md
LINTER_OPPORTUNITIES.md
CALIBRATION_LOG.md
```

The final guide must be specific to the repository.

Avoid generic advice unless it was validated through real code, generated probes, mutated probes, or explicit user feedback.
