# Declarations

The fields a contract carries and which are required. [The contract template](../assets/capability.md) shows them in place; [the linter guide](../../spectacular-spec-review/references/lint-format.md#findings) lists what the linter checks. Everything else is checked by review, and a reviewer reports a missing field as a finding only when this file requires it.

Contents: [Header](#header), [Declarations](#declarations), [Fields](#fields), [Oracles](#oracles), [Evidence map](#evidence-map), [Rule tables](#rule-tables), [Case tables](#case-tables), [Acceptance](#acceptance), [Coverage](#coverage).

## Header

Two `Name: value` lines follow the title. Neither is linted.

| Line | Form |
| --- | --- |
| Decision owner | The role or person who can accept rules in this contract; `unassigned` when unknown. |
| Lifecycle | `anchored` or `feature` ([lifecycle](lifecycle.md)). |

A contract carries no revision, date, or deployment state: git holds the revision, and the implementation record pins each contract by its hash. When target and deployed behaviour differ, the transition is a rule ([change handling](changes.md)).

The Intent and boundary section carries three more parts. `Included:` names the increment. `Preserved:` lists the IDs of existing obligations the increment keeps, or `none`. `Excluded:` names work deliberately absent, each item with the Q ID of the decision record entry that leaves it out: an open question nobody has decided, or a decision to leave it out; when it holds more than two items, write it as a list under the line.

## Declarations

A declaration is a column-zero ATX heading at level 2 to 6, `### <ID> - <title>`, followed by its fields. An ID is a prefix and one or more uppercase alphanumeric segments joined by hyphens. A heading is the ID's one home; every other mention points to it. Write every ID in full, never as a list or range such as `REQ-CAP-001 to 004`, so a search for an ID finds every mention and a rename is a plain search and replace.

| Prefix | Declares | Home |
| --- | --- | --- |
| REQ | A behavioural obligation. | The Contract section of its capability. |
| INV | An obligation that holds throughout its scope, with no activating event. | The Contract section of the one contract that owns it ([ownership](ownership.md)). |
| AC | An acceptance criterion. | Nested one heading level below the rule it checks, in that rule's contract. |
| Q | An open or decided product question. | A decision record ([session](../../spectacular-spec-grilling/assets/session.md)). |
| TERM | A defined domain term. | The smallest shared glossary. |
| SRC | A binding source with its version or commit, such as an external interface, a standard, an ADR, or an architecture document at a commit. | Governing context of each contract that cites it. |

Decisions have one home, the decision record; a contract never declares one. A choice settled elsewhere, such as in an ADR, enters a contract as a SRC.

## Fields

Fields are column-zero, single-line `Name: value` lines inside the declaration's section, in any order. Separate them with a blank line: rendered Markdown joins adjacent lines into one paragraph, and the linter reads fields either way. Each kind has a closed set of fields: any other `Name:` line inside a REQ, INV, or AC section is an error, so commentary goes in `Rationale:` or in prose outside the declaration.

| Declaration | Field | Required | Meaning |
| --- | --- | --- | --- |
| REQ, INV | Statement | yes | One sentence in [EARS](ears.md). |
| REQ, INV | Basis | to accept the rule | Citations of what authorises the rule, separated by semicolons: decided Q IDs and SRC IDs, a SRC optionally narrowed with `§ section`, as in `Q-BOOK-001; SRC-BOOK-002 § Refunds`. Section text that holds a `;` goes in straight double quotes, as in `SRC-BOOK-002 § Refunds, "full; then partial"`. Nothing else: who decided and when is in the Q entry, and a reason goes in Rationale. See Acceptance below. |
| REQ, INV | Rationale | no | Why the rule exists, kept out of Statement, citing by ID any rule or term the reason depends on. Never a list, limit, mapping, or exception ([EARS](ears.md#keep-each-statement-short)), and never history: what changed, which defect it fixed, or who reviewed it belongs in git. |
| TERM | Basis | when the term defines a set that decides behaviour, such as a list of recognised forms | Citations, as for a rule. |
| AC | Covers | no | Other rules the AC also checks, comma separated. The rule it is nested under is always covered and need not be named. |
| AC | Expected | yes | The observable result, and any prohibited result, for the AC's Situation, not for the whole rule: other cases of the rule belong to other ACs. A case-table AC's Expected says `Every row of the case table below.`, optionally after a result every row shares. Never a test or test file name: "Test X passes" states no result, so write the result X observes and list X in the evidence map. |
| AC | Oracle | yes | The independent basis for Expected ([oracles](#oracles)). |
| AC | Situation | yes; optional on a case-table AC | Input, relevant state, and triggering event, so Expected holds only the result. On a case-table AC, the setup every row shares. |
| AC | Boundary | yes | Where the result is observed, in domain terms, such as the booking service API or the import page end to end. Never a test, tool, or code name, and never whether a check ran: the [evidence map](#evidence-map) holds those. |
| AC | Counterexample | yes | A violation this check must detect. |

An AC sits one heading level below the REQ or INV it checks, after that rule's fields and rule table, so a reviewer reads a rule and its cases together and a change to both is one hunk. An AC that checks several rules nests under the one whose behaviour it varies and names the others in `Covers:`; an AC whose rules all live in another contract belongs in that contract. A rule with no AC under it is still covered when another AC names it in `Covers:`.

## Oracles

Every expected result needs an oracle, the place Expected comes from. It is one of:

- **The covered rule**, cited by ID, when Expected follows from its statement or rule table without computation.
- **A worked example**: the computation from the Situation to Expected, written out.
- **A decision or source**: a Q or SRC ID, or a binding external contract named with its version or owner.
- **A reference model or property**: a simpler implementation, table, or separately justified property the result is compared with, named in domain terms.

These are not oracles: a test, its file, or its assertions; the implementation's output; the production query or helper the system itself uses; a fixture that repeats that logic; or another agent's agreement. The Oracle derives every value Expected states. An Oracle that cites only the covered rule is right only when Expected restates that rule; when it adds values or a computation, write the worked example. A value no source derives does not belong in Expected: loosen Expected to what the rule states and leave the exact value to the test when it is not consequential ([terms](terms.md)), or record a decision question and keep the value out of Expected until it is answered. An Oracle never notes a gap and never covers only part of Expected. A property derived only from a disputed rule checks conformance to that rule; it does not justify it.

## Evidence map

Which test checks which AC is evidence, not intent, so it lives in `<capability>.evidence.md` beside the contract, never in the contract or in the code. Writing, renaming, or running a test never edits the contract, and test code, scenario files included, carries no spec IDs.

```markdown
# Booking cancellation evidence

| AC | File | Test |
| --- | --- | --- |
| AC-BOOK-001 | cancellation.feature | Cancelling a pending booking releases its unit |
| AC-BOOK-003 | ../../tests/booking_test.py | test_confirmed_booking_is_rejected |

| AC | Unchecked |
| --- | --- |
| AC-BOOK-003 | The refund e-mail; checked by review only. |
```

- **One row per AC and test.** File is the test file's path relative to the map, with forward slashes. Test is the test's name as written in that file's source, escapes included: a function name, the string of a string-named test without its quotes, a parametrised or generated test's template, or a scenario title. A name of letters, digits, and underscores matches a whole word in the file, except in a JavaScript or TypeScript file, where it matches a whole quoted string or a declared identifier (`const`, `function`, `type`, and the like). Any other name matches only a whole quoted string, so a row for `keeps quiet` goes stale when the test becomes `keeps quiet forever`. Write `\|` for a pipe inside a cell. A map is named for its contract's capability: `<capability>.md` has `<capability>.evidence.md`, and `<capability>/contract.md` has `<capability>/<capability>.evidence.md`.
- **Sorted.** Rows are in order of AC, then File, then Test, so an added row has one place and two writers rarely conflict.
- **What a row may claim.** A row names a check the repository's test command runs and fails on: a test, or a type-check fixture the command checks, named by a unique identifier in it (never by a suppression directive such as `@ts-expect-error`). It belongs under an AC only when the check observes at that AC's Boundary and asserts part of its Situation and Expected. A check of the same behaviour at another place, such as a helper below the boundary or the core under a page AC, is not a row; a row whose check asserts nothing for the AC is removed.
- **What no listed check covers.** When the listed checks leave part of an AC's Situation or Expected unchecked, or the AC is checked only by review, by hand, or by a scheduled job outside the test command, say what is unchecked in one row of the optional Unchecked table. State only the unchecked part, in domain terms, and any check outside the tests that covers it: review, a scheduled job, or another AC by ID. Never describe what the tests do or do not check: the rows already say which tests check the AC, and a test change never edits this text. `--untested` reports each Unchecked row, so a partial AC never passes as fully tested. A case of the rule that no AC covers is not an Unchecked row; it is a coverage gap for review.
- **Who writes it.** The implementation's test writer adds a row for each test it writes that checks an AC, and an Unchecked row for any part of the AC its tests leave unchecked. Whoever renames, moves, or deletes a test updates its row in the same change.
- **Edit it with `evidence.py`**, never by hand ([tools](../../spectacular-spec-review/references/tools.md#evidence-maps)).
- **What it proves.** A row shows that the named test exists and claims to check the AC; whether it passes is the test run's fact, and whether it checks the AC well is review's.

The linter checks every map it finds under the spec roots ([the linter guide](../../spectacular-spec-review/references/lint-format.md#evidence-maps)). A feature contract's map is deleted with its folder.

## Rule tables

A rule table makes an ordered choice one requirement: the statement says to use the first row that applies, and the rows are part of the obligation. It is the only normative table; every other table, a case table included, illustrates.

```markdown
### REQ-TMR-014 - Label each offered timer

Statement: When the core derives the cooking view for a step with an offered timer, the core shall label the timer with the label in the first row of the rule table that applies.

| Order | Applies when | Label |
| --- | --- | --- |
| 1 | The step has a name. | The name. |
| 2 | A word precedes the duration in its `label clause`. | The clause, shortened as REQ-TMR-015 says. |
| 3 | Otherwise. | "Step N", N being the step's 1-based position. |

Basis: Q-TMR-004
```

- **Owned by one REQ.** The table sits directly under the Statement, which names "the rule table". The first column is `Order`, numbered 1, 2, 3 without gaps; then the condition column, then one or more outcome columns. The last row's condition is `Otherwise`, so no case is left without an outcome.
- **Rows state outcomes, never obligations.** No cell says `shall`. A cell may cite another rule by ID, and the ID must resolve. A row that takes its outcome from a cited rule applies when the row's own condition holds and no earlier row applied; the cited rule's trigger does not select the row, so write any part of it that matters into the row's condition.
- **One basis.** The rows share the REQ's Basis, which may cite several decisions. A row that needs its own basis or its own change becomes a REQ, and the row cites it by ID.
- **Covered by a case table.** Its AC holds at least one row per rule-table row, plus one at each boundary between adjacent rows.

The linter checks the table's placement, naming, numbering, final `Otherwise`, `shall` in a cell, and cited IDs; row meaning, the shared basis, and coverage are left to review.

## Case tables

A case-table AC gathers the cases of one rule into a Markdown table below its fields, so a reader sees the rule's edge cases side by side instead of across several ACs or files. A table under an AC's fields makes it a case-table AC. Its `Expected:` says `Every row of the case table below.`, optionally after a result every row shares; each row holds one situation and its expected observation, and the AC's `Situation:` (the setup every row shares, if any), `Oracle:`, `Boundary:`, and `Counterexample:` apply to every row. The linter rejects a table its Expected does not name, and an Expected that names a table without rows. An AC that states a result of its own and also has a table is two ACs.

- **One rule under test.** The AC nests under the rule the rows vary; `Covers:` adds any rule needed to observe it at the boundary, such as a recognition rule seen only through the conversion it feeds, and any INV it preserves. Every rule it covers ships in the same change. A boundary between two independent rules puts each side in its own rule's table, with matching values.
- **One check.** Every row shares one boundary and one oracle; several tests may check the AC when they share them. A row that needs a different oracle or boundary belongs in another AC.
- **Rows only illustrate.** Each row's expected result follows from the statements the AC covers. A case whose outcome no statement settles is a missing REQ or a Q to resolve or exclude ([acceptance shape](precision.md#acceptance-shape)), never a row; a case the increment leaves out goes on the `Excluded:` line, not in the table.
- **Chosen with the contract.** Rows are written with the rule, to pin its meaning at its boundaries. An edge case found later that the statements already settle is test data: it goes into a test the evidence map lists for the AC, and the contract stays as it is.
- **Name the dimension.** A first column names the [precision dimension](precision.md#conditions-that-change-meaning) each row exercises, so a reviewer can see which forks were closed.

The linter checks the AC's fields, not its rows; a table cell never supplies a field. It warns when a case-table AC has no Oracle or Counterexample. [The discount example](../examples/discount-redemption/contract.md) shows two case tables that meet at a boundary.

## Acceptance

A rule is accepted when its Basis cites at least one of these, and proposed while it has no Basis:

- a Q whose entry sits under its decision record's Decided section;
- a binding source declared as a SRC.

A proposed rule is a warning, and it blocks readiness. An entry under Open decides nothing, and neither does one under Policies: a policy records who or what may decide, such as a delegation to an agent or a rule for which source wins, not what was decided. Each decision taken under a policy is its own decided entry that names the policy, with the options it rejected, and the rule's Basis cites that entry. A decision the user gives in conversation is first recorded as a decided entry that names the user. A recommendation, an agent's agreement, or current code behaviour is not a basis. Never add a Basis to satisfy the linter.

## Coverage

Every REQ and INV with a Basis has at least one AC: one nested under it, or one that names it in `Covers:`. The linter warns when one does not. Every AC gets a Counterexample and situations chosen to separate plausible implementations ([acceptance shape](precision.md#acceptance-shape)); when a rule has more than one such situation, a [case table](#case-tables) holds them. An invariant or a rule over every member of a domain defaults to a property check whose Situation names the input domain.
