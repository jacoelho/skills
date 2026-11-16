<!-- spec-lint: active -->
# [Capability or behavioural change]

> Keep unresolved questions, hypotheses, and proposed changes awaiting authority in the decision record. This template is for the current contract and its settled obligations. The skill's `references/declarations.md` defines every line and field below, which are required, and what makes a rule accepted; `references/ears.md` gives the statement syntax. The bracketed placeholders are layout guidance, not another requirement syntax. The linter rejects a recognised field whose value is still an untouched bracketed placeholder; it cannot see partially edited placeholders such as a leftover `<event>`, so replace those by review. Keep the first-line marker so this contract is checked.

Decision owner: [role or person who can accept rules; otherwise unassigned]

Lifecycle: [anchored | feature]

## Intent and boundary

[Who needs this change, the problem it addresses, and how its usefulness will be observed.]

Included: [the increment].

Preserved: [IDs of existing obligations the increment keeps, or none].

Excluded: [work deliberately absent, each item with the Q ID of the decision or open question that leaves it out; a list under this line when there are more than two].

## Governing context and basis

[Only terms, external interfaces, shared invariants, and binding constraints that affect this contract. Declare each binding source this contract cites as a SRC heading, such as `### SRC-CAP-001 - Payments API v3`, with its version or commit; another contract citing the same source declares its own. Keep the source, rationale, and evidence separate from the normative statements below.]

## Contract

### REQ-CAP-001 - [One reviewable obligation]

Statement: [When <event>, the <responsible system> shall <observable response, including coupled effects and relevant bounds or prohibitions>.]

Basis: [Resolved Q IDs or SRC IDs, separated by semicolons; a SRC may add "§ section".]

#### AC-CAP-001 - [Distinguishing case or property]

Situation: [Input, relevant state, and triggering event.]

Expected: [Observable accepted result and prohibited result where relevant.]

Oracle: [Why this expectation is justified independently of the proposed implementation.]

Boundary: [Where the result is observed, in domain terms, such as the booking service API; never a test, tool, or code name. The evidence map names the tests.]

Counterexample: [A violation this check must detect.]

[The event-driven shape above is only an example; select the applicable EARS pattern. Each AC sits one heading level below the rule it checks; add `Covers:` only to name other rules the same AC also checks. For a rule with several distinguishing cases, keep the Situation line only for setup every row shares, set the Expected line to `Expected: Every row of the case table below.`, and add a table whose first column names the precision dimension, then Situation and Expected columns. Tables and diagrams are illustrative, except a rule table directly under a Statement that names it, which holds an ordered choice. The skill's `references/declarations.md` gives the rules for both tables. Group related requirements under `###` headings and declare them one level deeper when the section passes about fifteen.]

## Structural commitments

[Optional. Location and revision of the committed declarations that bind structure, and the verifiability or integration reason for binding it; see the skill's `references/structure.md`. Omit when structure is open or existing code already fixes it.]

## Implementation discretion

[Choices explicitly open to the implementer; omit when already clear from the enclosing contract.]
