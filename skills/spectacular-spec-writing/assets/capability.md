<!-- spec-lint: active -->
# [Capability or behavioural change]

> Keep unresolved questions, hypotheses, and proposed changes awaiting authority in the task or decision record. This template is for the current contract and its settled obligations.

> Write each requirement and invariant as one EARS sentence using the skill's `references/ears.md`. The placeholders below are layout guidance, not another requirement syntax. The linter rejects a `Status`, `Statement`, `Basis`, `References`, `Covers`, or `Expected` value that is still an untouched bracketed placeholder. It cannot see partially edited placeholders, such as a leftover `<event>`, or bracketed text in other fields; replace those by review. Keep the first-line marker so this contract is checked.

Contract revision: [identifier or recorded workspace state]
Decision owner: [known authority; otherwise unassigned]
Effective scope: [target version, deployed state, or workspace boundary when relevant]

## Intent and boundary

[Who needs this change, the problem it addresses, and how its usefulness will be observed.]

Included: [the next bounded outcome].
Excluded: [work deliberately absent from this increment].
Preserved: [existing promises that the change must retain].

## Governing context and basis

[Only terms, external interfaces, shared invariants, and binding constraints that affect this contract. Give precise references and applicable versions. Keep the source, rationale, and evidence separate from the normative statements below.]

## Contract

### REQ-CAP-001 - [One reviewable obligation]

Status: proposed
Statement: [When <event>, the <responsible system> shall <observable response, including coupled effects and relevant bounds or prohibitions>.]
Basis: [Authorised decision or binding source and rationale. Do not put unresolved questions here.]

[Change Status to accepted only when Basis names the authorising decision or binding source; never to satisfy the linter. Select the applicable EARS pattern; the event-driven shape above is only an example. Add further requirements only when needed. Refer to shared obligations instead of repeating their definitions. Tables and diagrams are illustrative and reference governing requirements.]

## Acceptance

### AC-CAP-001 - [Distinguishing case or property]

Covers: REQ-CAP-001
Situation: [Input, relevant state, and triggering event.]
Expected: [Observable accepted result and prohibited result where relevant.]
Basis: [Why this expectation is justified independently of the proposed implementation.]
Verification: [Boundary, method, revision, and environment; mark planned versus executed.]
Counterexample: [A relevant violation this check must detect.]

## Implementation discretion

[Choices explicitly open to the implementer; omit when already clear from the enclosing contract. Unanswered product questions do not belong here.]
