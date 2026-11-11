<!-- spec-lint: active -->
# [Capability or behavioural change]

> Keep unresolved questions, hypotheses, and proposed changes awaiting authority in the decision record. This template is for the current contract and its settled obligations. The skill's `references/declarations.md` defines every line and field below, which are required, and what makes a rule accepted; `references/ears.md` gives the statement syntax. The bracketed placeholders are layout guidance, not another requirement syntax. The linter rejects a recognised field whose value is still an untouched bracketed placeholder; it cannot see partially edited placeholders such as a leftover `<event>`, so replace those by review. Keep the first-line marker so this contract is checked.

Contract revision: [tag, commit, ADR number, or `workspace <date>`]
Decision owner: [role or person who can accept rules; otherwise unassigned]
Lifecycle: [anchored | feature]
Effective scope: [version, deployment, or workspace governed; target and deployed named separately when they differ]

## Intent and boundary

[Who needs this change, the problem it addresses, and how its usefulness will be observed.]

Included: [the increment].
Excluded: [work deliberately absent, with the Q ID of any open decision that excludes it].
Preserved: [IDs of existing obligations the increment keeps, or none].

## Governing context and basis

[Only terms, external interfaces, shared invariants, and binding constraints that affect this contract. Give precise references and applicable versions. Keep the source, rationale, and evidence separate from the normative statements below.]

## Contract

### REQ-CAP-001 - [One reviewable obligation]

Status: proposed
Statement: [When <event>, the <responsible system> shall <observable response, including coupled effects and relevant bounds or prohibitions>.]
Basis: [Resolved Q or DEC with its authority, an ADR or merged PR, or a SRC.]
References: [Local IDs this rule depends on, such as a shared INV; omit the line when none.]

[The event-driven shape above is only an example; select the applicable EARS pattern. Add further requirements only when needed. Refer to shared obligations instead of repeating their definitions. Tables and diagrams are illustrative and reference governing requirements.]

## Acceptance

### AC-CAP-001 - [Distinguishing case or property]

Covers: REQ-CAP-001
Situation: [Input, relevant state, and triggering event; or omit for a pointer AC.]
Expected: [Observable accepted result and prohibited result where relevant; or the scenario or test that owns them.]
Oracle: [Why this expectation is justified independently of the proposed implementation; or omit when the pointed-to scenario or test names it.]
Verification: [Boundary and method; planned, or executed <test name or run>.]
Counterexample: [A violation this check must detect; required for a consequential rule.]

## Structural commitments

[Optional. Location and revision of the committed declarations that bind structure, and the verifiability or integration reason for binding it; see the skill's `references/structure.md`. Omit when structure is open or existing code already fixes it.]

## Implementation discretion

[Choices explicitly open to the implementer; omit when already clear from the enclosing contract.]
