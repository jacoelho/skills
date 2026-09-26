# Go Architecture Analysis Report Template

Use this structure. Omit sections that are genuinely irrelevant, but do not omit evidence, assumptions, or the overall decision.

# Go Architecture Analysis

## Decision

State exactly one: **Retain**, **Repair**, or **Restructure**.

Give:

- the scope analyzed;
- a one-paragraph conclusion;
- the three strongest reasons;
- overall confidence;
- the most important residual uncertainty, if any.

Do not start with a long executive summary.

## Requirements, constraints, and assumptions

Separate:

### User-provided

List only requirements, expected changes, constraints, trade-offs, and exclusions supplied by the user.

### Repository-derived

List the material requirements and trade-offs inferred from code, tests, schemas, configuration, maintained documentation, and deployment wiring. Cite exact repository locations.

### Unknown external constraints

List only uncertainties that cannot be answered from the repository. For each, state:

- the assumption used;
- which recommendation it could change;
- why the review can still proceed.

Do not phrase these as blocking questions.

## Current architecture

Describe the current design without criticism.

Include:

- system purpose and externally visible capabilities;
- executable entry points and composition roots;
- principal packages and their actual responsibilities;
- dependency direction;
- major runtime and data flows;
- ownership of important state, invariants, transactions, and resources;
- persistence, transport, protocol, and external-system boundaries;
- concurrency, cancellation, startup, and shutdown ownership.

Use a concise package table when helpful:

| Package | Implemented responsibility | Owns | Main callers | Main dependencies |
|---|---|---|---|---|

Use a Mermaid diagram only when it makes dependency or runtime flow materially clearer. Label inferred edges.

## Change-pressure analysis

Analyze three to five scenarios, or fewer for a very small repository.

For each:

### Scenario: `<concrete change>`

- **Evidence that this change is relevant:**
- **Where it enters:**
- **Packages that must change:**
- **Packages that must understand the concept:**
- **Current coupling mechanism:** structural, semantic, data, control, temporal, lifecycle, operational, deployment, or change coupling.
- **Coordination required:**
- **Compiler/test protection:**
- **Desired locality:**

Do not use generic scenarios that are unrelated to repository evidence.

## Primary architectural findings

Report no more than five. If there are none, state that clearly and explain why **Retain** is supported.

For each finding:

### A-01 — `<root-cause title>`

- **Classification:** Structural | Significant | Local architectural
- **Confidence:** High | Medium
- **Architectural property:**
- **Evidence:** exact files, symbols, call paths, data paths, or dependency edges.
- **Exposing scenario:**
- **Root cause:**
- **Consequence:** ownership ambiguity, broad change propagation, representation leakage, lifecycle fragility, or another concrete cost.
- **Why this is not merely stylistic:**
- **Target boundary:** which package should own what, and what other packages should no longer know.
- **Smallest coherent repair:**
- **Larger redesign:** include only when materially different and plausible.
- **Trade-offs and migration cost:**
- **Verification:** how to prove the boundary improved without relying on opinion.

Merge symptoms that share a root cause. Do not add a miscellaneous suggestions section.

## Target architecture

Include only for **Repair** or **Restructure**.

Describe:

- proposed package responsibilities;
- dependency rules;
- ownership of important invariants, state, resources, and lifecycle;
- where concrete implementations live;
- where consumer-owned interfaces live;
- where storage, transport, event, and behavioural representations are translated;
- composition and configuration ownership;
- expected effect on each change-pressure scenario.

Include one or two small Go API sketches only where they make the boundary concrete. Do not write the complete implementation.

## Migration sequence

Provide an ordered sequence. Each step must include:

1. **Architectural purpose**
2. **Code movement or API change**
3. **Behaviour preserved or intentionally changed**
4. **Dependencies removed or introduced**
5. **Verification**
6. **Rollback or compatibility consideration**, when relevant

Prefer steps that make invalid intermediate architectures difficult to sustain. Avoid introducing a parallel “new architecture” that coexists indefinitely with the old one.

## Verification performed

List commands and evidence actually used. Distinguish:

- passed checks;
- failed checks;
- checks not run;
- static inferences that remain unverified.

Do not imply repository-wide correctness from architecture analysis.

## Residual risks

List only material risks that remain after the recommendation. Separate:

- accepted trade-offs;
- external constraints not represented in the repository;
- areas outside the analyzed scope;
- findings that lacked enough evidence for acceptance.

End after the decision is adequately supported. Do not invent further criticism.
