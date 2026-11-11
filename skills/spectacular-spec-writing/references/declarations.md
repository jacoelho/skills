# Declarations

The fields a contract carries, which are required, and which the bundled linter checks. [The contract template](../assets/capability.md) shows them in place; [the linter guide](../../spectacular-spec-review/references/lint-format.md) gives the parsing rules and every check. "Linted" below says what the linter checks: presence, the value, or only that the label is well formed and not a leftover placeholder. Everything else is checked by review, and a reviewer reports a missing field as a finding only when this file requires it.

## Header

Four `Name: value` lines follow the title. None is linted.

| Line | Form |
| --- | --- |
| Contract revision | An identifier a reader can retrieve: a tag, commit, ADR number, or `workspace <date>` for uncommitted work. |
| Decision owner | The role or person who can accept rules in this contract; `unassigned` when unknown. |
| Lifecycle | `anchored` or `feature` ([lifecycle](lifecycle.md)). |
| Effective scope | The version, deployment, or workspace the contract governs. When target and deployed versions differ, name each. |

The Intent and boundary section carries three more lines. `Included:` names the increment. `Excluded:` names work deliberately absent, with the Q ID of any open decision that excludes it. `Preserved:` lists the IDs of existing obligations the increment keeps, or `none`.

## Declarations

A declaration is a column-zero ATX heading at level 2 to 6, `### <ID> - <title>`, followed by its fields. An ID is a prefix and one or more uppercase alphanumeric segments joined by hyphens. A heading is the ID's one home; `References:` and `Covers:` point to it.

| Prefix | Declares | Home |
| --- | --- | --- |
| REQ | A behavioural obligation. | The Contract section of its capability. |
| INV | An obligation that holds throughout its scope, with no activating event. | The Contract section of the one contract that owns it ([ownership](ownership.md)). |
| AC | An acceptance criterion. | The Acceptance section of the contract whose rule it covers. |
| DEC | A decision cited as basis, declared locally so the link is checked. | Governing context, or the decision record. |
| Q | An open or resolved product question. | The decision record ([session](../../spectacular-spec-grilling/assets/session.md)). |
| TERM | A defined domain term. | The smallest shared glossary. |
| SRC | An external source with its version. | Governing context. |

## Fields

Fields are column-zero, single-line `Name: value` lines inside the declaration's section, in any order.

| Declaration | Field | Required | Linted | Meaning |
| --- | --- | --- | --- | --- |
| REQ, INV | Status | yes | value | `proposed` or `accepted`; see Acceptance below. |
| REQ, INV | Statement | yes | EARS grammar | One sentence in [EARS](ears.md). |
| REQ, INV | Basis | when accepted | presence | The authorising decision or binding source. |
| REQ, INV | References | when the rule depends on an INV, DEC, SRC, or TERM | targets resolve | Local IDs, comma separated. |
| REQ, INV | Rationale | no | no | Why the rule exists, kept out of Statement. |
| AC | Covers | yes | targets are REQ or INV | The rules the criterion illustrates. |
| AC | Expected | yes | presence | The observable result and any prohibited result, or a pointer to the scenario or test that owns them. |
| AC | Oracle | yes, except a pointer AC whose target names it | label and placeholder | The independent basis for Expected ([gherkin](gherkin.md#establish-the-oracle)). |
| AC | Situation | yes, except a pointer AC | label and placeholder | Input, relevant state, and triggering event. |
| AC | Verification | yes | presence | Boundary and method, then `planned` or `executed <test name or run>`. |
| AC | Counterexample | for a consequential rule | label and placeholder | A violation this check must detect. |

A pointer AC is one whose Expected names a Gherkin scenario or a test, for example `Expected: Scenario "Cancel a pending booking" in cancellation.feature passes.` The scenario or test then owns the situation, expected values, and oracle; the AC repeats none of them. The linter does not read `.feature` files or tests, so the pointer AC is the only coverage record.

## Acceptance

A rule is `proposed` until its Basis names one of these:

- a Q or DEC resolved by a named authority, such as `Q-BOOK-001, resolved by the booking product owner`;
- an ADR or merged pull request;
- a binding external source declared as a SRC.

A decision the user gives in conversation is first recorded in the decision record as a resolved Q with the user as authority; Basis then names that Q. A recommendation, an agent's agreement, or current code behaviour is not a basis. Never change Status to satisfy the linter.

## Coverage

Every accepted REQ and INV has at least one AC covering it; the linter warns when one does not. A consequential rule also gets a Counterexample and a Situation chosen to separate plausible implementations ([acceptance shape](precision.md#acceptance-shape)). An invariant or a rule over every member of a domain defaults to a property check whose Situation names the input domain.
