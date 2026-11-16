# Declaration and EARS linter

The linter is a small, standard-library-only Python tool. It enforces the declaration layout, the EARS lexical grammar below, and local traceability in explicitly active Markdown documents. Every REQ and INV statement is checked, with or without a Basis. Requirement meaning and implementation conformance still require review.

Contents: [Run](#run), [Opt in](#opt-in), [Declarations](#declarations), [Parsing](#parsing), [EARS lexical grammar](#ears-lexical-grammar), [Evidence maps](#evidence-maps), [Findings](#findings), [Output and exit codes](#output-and-exit-codes).

## Run

Set `skill_dir` to the directory that contains this skill's `SKILL.md`, the parent of this file's `references/` directory. The commands then work from any working directory:

```sh
skill_dir=<absolute path of the spectacular-spec-review skill>
python3 "$skill_dir/scripts/spec_lint.py" ./specs
```

The spec roots are arguments to the command and are resolved from the process current working directory; use absolute paths when that directory is not the repository root. Pass the relevant active spec roots, including the canonical homes of locally referenced identifiers. The program does not fetch external sources. It accepts Python 3.10 or later. Only regular Markdown files are read.

Symbolic links you pass are followed; links met while walking a directory are skipped and counted, with a `skipped-symlink` warning when the target may hold Markdown that was not checked. Hidden entries, unmarked documents, and non-Markdown files met while walking are skipped and counted; explicit non-Markdown inputs, special files, and dangling or looping input links are rejected. Pass a skipped target explicitly when it should be checked.

## Opt in

Include this exact standalone line, without indentation, in every active document to scan; trailing whitespace is ignored:

```text
<!-- spec-lint: active -->
```

Unmarked Markdown is skipped and counted. Historical documents should not use the active marker. Template text inside valid fenced code is ignored, including an opt-in marker inside a fence. A backtick fence's info string cannot contain backticks: a malformed opener produces `invalid-fence` in an active document and its following declarations remain visible. Tilde fence info strings may contain backticks. Do not claim that a skipped document was reviewed.

## Declarations

[Declarations](../../spectacular-spec-writing/references/declarations.md) owns the prefixes, the fields of each kind, and which are required. This example is complete: with the active marker prepended it lints clean under `--strict`.

```markdown spec-lint
### SRC-BOOK-001 - Booking policy, version 2

The booking product owner's cancellation policy.

### INV-BOOK-001 - Stock stays non-negative
Statement: The booking service shall keep available stock non-negative.
Basis: SRC-BOOK-001

#### AC-BOOK-002 - Any request sequence keeps stock non-negative
Situation: Stock S has 1 unit; any generated sequence of booking and cancellation requests for S is sent.
Expected: After every request, S reports 0 or more available units.
Oracle: SRC-BOOK-001 fixes the bound independently of the implementation.
Boundary: The booking service API.
Counterexample: A cancellation that releases a unit twice after a booking of the last unit reports 2.

### REQ-BOOK-001 - Cancel a pending booking
Statement: When a pending booking is cancelled, the booking service shall atomically mark the booking cancelled and release its reserved unit.
Basis: SRC-BOOK-001 § Cancellation
Rationale: releasing the unit keeps INV-BOOK-001's bound.

#### AC-BOOK-001 - Pending booking
Covers: INV-BOOK-001
Situation: Booking B is pending and holds one reserved unit of stock S.
Expected: B is cancelled and the available stock of S rises by exactly one.
Oracle: SRC-BOOK-001: a cancellation releases what the booking reserved.
Boundary: The booking service API.
Counterexample: A cancellation that leaves B pending, or releases two units, fails.
```

A declaration is a column-zero ATX heading at level 2 to 6 holding an unformatted ID and a title. A heading such as `## REQ-BOOK-001: Title` or `# REQ-BOOK-001 Title` is a `malformed-id` error; the message names the fix, and the section's fields are not reported again. An AC heading must sit one level below a REQ or INV heading; the rule it sits under counts as covered.

Basis citations are resolved here: a Q against the entries of the `*.decisions.md` files passed in, and a SRC against the declarations. Pass the folders that hold the decision records, or every Q citation is dangling. A decision record is never an active document; the linter reads its `### Q-... - title` entries and the `## Policies`, `## Open` or `## Decided` section each sits in ([session](../../spectacular-spec-grilling/assets/session.md)). Only an entry under Decided can accept a rule.

## Parsing

Fields are plain, column-zero, single-line `Name: value` lines in the declaration's own section. The next heading, including a nested heading, ends that section. Recognised fields outside a declaration, wrong casing, indentation, list or quote prefixes, HTML wrappers, and a table `Statement` cell are errors. Declaration-shaped indented, formatted, blockquoted, list-prefixed, or HTML headings are also errors. Use unformatted IDs in column-zero level 2–6 ATX headings.

Known field labels with emphasis, inline-code, HTML, or link formatting are also unsupported, whether the colon is inside or outside that formatting. For example, `**Statement:**` and `` `Statement`: `` fail; they are not parsed as replacement fields. A leading formatted field-label mention has the same shape, so put explanations in `Rationale:`, surrounding prose, or a fenced example.

`Statement` belongs only to REQ/INV. Continuation text after it is an error, even after a blank line, until another field or heading begins. Put commentary in `Rationale:` or a separate section. Literal examples in fenced code remain outside the scan. Illustrative tables may reference rule IDs and expected observations; they cannot define a `Statement` column. A table whose first header cell is `Order`, inside a REQ, is a rule table ([declarations](../../spectacular-spec-writing/references/declarations.md#rule-tables)): it may sit directly under the Statement, which it ends, and its cells are checked as the Findings table lists. The linter does not infer undeclared requirements from arbitrary prose.

Table headers require an immediately adjacent delimiter row with the same cell count; fenced examples cannot join separated lines into a table. Single-column tables and delimiters with one or more hyphens are recognised. Outside an established table, a bare hyphen or equals-sign underline forms a Markdown heading; a table delimiter needs a pipe or alignment colon. Escaped pipes remain within their cell, including inside formatted labels or links.

Within an established table, body rows are checked before interpreting later lines. Body text can omit pipes. Table content cannot supply declaration fields: recognised `Name: value` lines in a table header or body are rejected before storing their values. Blank lines, fenced blocks, ATX headings, and quote, list, or thematic-break interruptions end table context. A bare `---` ends a table when reached; `===` remains body content. Quoted and inline-code examples in body rows remain illustrative data.

A field value that is entirely one bracketed template placeholder, such as `Basis: [Resolved Q IDs]`, is a `placeholder-value` error and counts as neither filled nor missing. Only an untouched whole-field placeholder is detected: partially edited template text, such as `<event>` left after removing the outer brackets, lints as ordinary text and is left to review; quote a literal bracketed value with backticks, for example `` Expected: `[1, 2]` ``, and write a Markdown reference link as `[ADR 7][]` rather than `[ADR 7]`.

## EARS lexical grammar

The linter checks this deterministic form of the [EARS patterns](../../spectacular-spec-writing/references/ears.md#patterns) for every `REQ` and `INV` statement in an active document, whether proposed or accepted:

- Put the complete statement on one line and end it with an unquoted full stop.
- Use exactly one unquoted, lowercase, whole-word `shall`, separated from the named system and non-empty response by whitespace. A prohibition needs an effect after `shall not`. Coupled effects share the same `shall`.
- Separate leading applicability clauses and the system with a comma followed by spaces or tabs. A comma followed by `where`, `while`, `when`, `if`, `then`, or `the` is a reserved delimiter in the text before `shall`. Keyword casing follows the patterns: title case first, lowercase thereafter. Use `then the` only after an `if` clause; otherwise use `the`, or `The` for a ubiquitous statement.
- Supply a non-empty value for every included clause, system, and response. Each applicability clause occurs at most once, in the stated order. An invariant permits `Where`, `While`, or both, with no `When` or `If` activation.
- Quote literal data containing reserved delimiters or sentence punctuation with balanced double quotes or single backticks. A backslash escapes the next character inside a literal. Apostrophes in possessives are ordinary text.
- Outside literals, a dot is internal token punctuation only when both adjacent characters are ASCII letters or digits. This permits `1.5`, `v1.2.3`, and `https://example.test/v1`. Other internal full stops, question marks, and exclamation marks require quoting; for example use `"e.g."` for an ambiguous abbreviation and backticks for a URL containing query punctuation.

The parser checks leading clauses and the obligation boundary; response prose remains opaque. Words such as `if` or `may` inside a response do not themselves create another clause or obligation. These lexical rules make enforcement predictable, not a proof that a noun phrase, outcome, or interpretation is valid.

## Evidence maps

The linter reads every `<capability>.evidence.md` under the spec roots ([evidence map](../../spectacular-spec-writing/references/declarations.md#evidence-map)); it needs no marker and is never read as a contract. Every non-blank line is an optional first `#` title, the header `| AC | File | Test |`, the delimiter row, or a row of three non-empty cells; after those rows an optional second table, the header `| AC | Unchecked |`, its delimiter row, and rows of two non-empty cells, records the part of an AC no listed test checks. `\|` is a pipe inside a cell. For each test row it reads the named file, relative to the map, and looks for the test name as written in the source, escapes included; a name that begins or ends with a letter, digit, or underscore must not run into another one, so `stop_alarm` does not match `test_stop_alarm`. In a `.feature` file the name is a whole scenario title after `Scenario:`, so a title with words appended no longer matches.

`scripts/evidence.py` writes maps in the form this section checks ([evidence map](../../spectacular-spec-writing/references/declarations.md#evidence-map)). Pass `--untested` when every AC in scope should have a test, as when an implementation closes; leave it off while contracts are being written. `--json` adds `evidence`, each AC with its rows' file, test, and `map:line`, and `unchecked`, each AC with its Unchecked text. A row shows that the named test exists, not that it passes or checks the AC well: the test run and review own those.

## Findings

Every code the linter emits. Warnings change the exit code only under `--strict`.

| Code | Severity | When |
| --- | --- | --- |
| `input-error` | error | An explicit input is missing, a special file, not Markdown, or a dangling or looping link. |
| `read-error` | error | A file cannot be read as UTF-8. |
| `no-active-documents` | error | No input holds the active marker; the message repeats the skip counts. |
| `no-declarations` | error | An active document declares nothing. |
| `invalid-fence` | error | A backtick fence's info string contains a backtick. |
| `unclosed-fence` | error | A fence is never closed, so the rest of the file is not scanned. |
| `skipped-symlink` | warning | A link met while walking a directory was skipped and its target may hold Markdown nobody checked. |
| `malformed-id` | error | A declaration heading has a malformed ID, a level outside 2 to 6, or no space before its title; or a decision-record heading starts with `Q-` but is not `Q-ID - Title`. |
| `unsupported-declaration` | error | A declaration-shaped heading is indented, formatted, quoted, list-prefixed, or HTML. |
| `duplicate-id` | error | An ID is declared more than once, in contracts or across decision records. |
| `unsupported-field` | error | A recognised field outside a declaration, in a table, formatted, or on a kind that does not carry it; or any other `Name:` line inside a REQ, INV, or AC. |
| `duplicate-field` | error | A declaration repeats a field. |
| `placeholder-value` | error | A field is still an untouched bracketed template placeholder. |
| `missing-statement` | error | A REQ or INV has no Statement. |
| `statement-continuation` | error | Text follows a Statement before the next field or heading. |
| `invalid-ears` | error | A Statement breaks the EARS lexical grammar, or an INV has a When or If clause. |
| `vague-term` | warning | A Statement or rule-table cell uses a word from `VAGUE_TERMS` outside a quoted literal. |
| `long-statement` | warning | A Statement or rule-table cell is longer than 60 words. |
| `proposed-rule` | warning | A REQ or INV has no Basis, so it is proposed. |
| `malformed-reference` | error | A Basis part is not a Q or SRC ID with an optional `§ section`, a quote or backtick in a Basis is unclosed or hides another citation, or Covers is not a comma-separated list of IDs. |
| `dangling-reference` | error | A cited ID has no declaration, or a Q in Basis or Rationale is in no decision record passed in. |
| `ambiguous-reference` | error | A cited ID is declared more than once. |
| `basis-not-deciding` | error | A Basis cites no decided Q and no SRC: only entries under Open or Policies. |
| `decision-section` | error | A decision-record entry is outside the `## Policies`, `## Open` and `## Decided` sections. |
| `ac-not-nested` | error | An AC heading is not directly below a REQ or INV heading. |
| `invalid-covers-target` | error | `Covers:` names something other than a REQ or INV. |
| `unlinked-acceptance` | warning | A REQ or INV with a Basis has no AC under it and none naming it in `Covers:`. |
| `missing-expected` | error | An AC has no Expected. |
| `missing-boundary` | error | An AC has no Boundary. |
| `missing-situation` | warning | An AC without a case table has no Situation. |
| `missing-oracle` | warning | An AC has no Oracle. |
| `missing-counterexample` | warning | An AC has no Counterexample. |
| `case-table-unreferenced` | error | An AC has a table, but its Expected does not say "Every row of the case table below." |
| `case-table-missing` | error | An Expected names the case table, but no table with rows follows. |
| `boundary-not-domain` | warning | A Boundary names code, a file, or a date: backticks, `::`, a snake_case word, a source or feature file name, or an ISO date. |
| `expected-names-test` | warning | An Expected names a test or test file: "tests … pass", a file whose name holds `test` or `spec`, a `.feature` file, or a source file with its directory. |
| `oracle-names-test` | warning | An Oracle names a test or test file ([oracles](../../spectacular-spec-writing/references/declarations.md#oracles)). |
| `unresolved-oracle` | warning | An Oracle cites a Q that no decision record passed in holds. |
| `rule-table-missing` | error | A Statement names "rule table" but no `Order` table follows it. |
| `rule-table-unnamed` | error | An `Order` table follows a Statement that does not name it. |
| `rule-table-owner` | error | An INV has a rule table. |
| `rule-table-duplicate` | error | A REQ has more than one rule table. |
| `rule-table-columns` | error | A rule table has fewer than three columns. |
| `rule-table-empty` | error | A rule table has no rows. |
| `rule-table-order` | error | Rows are not numbered 1, 2, 3 in order. |
| `rule-table-otherwise` | error | The last row's condition is not `Otherwise`, or an earlier row's is. |
| `rule-table-obligation` | error | A rule-table cell says `shall`. |
| `evidence-malformed` | error | An evidence-map line is not a title, header, delimiter, or well-formed row, or its path is absolute, starts with `~`, or uses backslashes. |
| `evidence-unknown-ac` | error | No checked contract declares the row's AC. |
| `evidence-file` | error | The listed file is missing, not a regular file, larger than 1 MiB, or not UTF-8. |
| `evidence-test-missing` | error | The test name is not in the file: the test was renamed, moved, or deleted. |
| `evidence-duplicate` | error | The same AC, file, and test appear twice, or an AC has two Unchecked rows. |
| `evidence-order` | warning | A row sorts before the one above it. |
| `unchecked-names-test` | warning | An Unchecked row mentions a test, a test file, or a listed test name. |
| `untested-ac` | warning | With `--untested` only: an AC has no test row. |
| `partial-ac` | warning | With `--untested` only: an AC has test rows and an Unchecked row. |

The patterns behind the warnings find candidates; whether a word is vague or a Boundary names code is decided by review against [terms](../../spectacular-spec-writing/references/terms.md). A clean run means the recognised declarations satisfy the schema and lexical grammar. It does not detect paraphrased duplicates, contradictory statements, invalid refinements, undeclared requirements, interaction defects, or unsupported guarantees, nor whether a resolved decision actually settles the rule that cites it. It cannot decide whether slot text names a valid system, whether terms are defined, or whether response prose hides additional policy. Those remain the responsibility of review.

## Output and exit codes

Text output includes counts for active documents and declarations, unmarked documents, non-Markdown entries, hidden entries, symlinks, and rejected unsupported inputs, plus location-specific findings. `--json` emits the same information in machine-readable form. `--strict` makes warnings affect the exit code.

- 0: no declaration, EARS syntax, or traceability errors; warnings may remain without `--strict`.
- 1: declaration, EARS syntax, or traceability errors, or warnings under `--strict`.
- 2: input/read failure or no active documents selected. The `no-active-documents` message repeats the skip counts so the cause is visible without the summary line.

Overlapping input paths are deduplicated by resolved path spelling. On a case-insensitive filesystem a differently cased spelling counts as a different path, so a covered link may still warn and a file supplied twice may be scanned twice and report duplicate IDs; spell inputs and link targets in their on-disk case. Counts for active documents, skipped entries, symlinks, and rejected inputs refer to unique absolute path entries across the supplied roots. Traversal skips directory and file symlinks and counts each once; the counts say what was skipped, and the warnings say which skipped targets went unchecked. A hidden directory counts as one skipped entry; its descendants are not traversed or counted individually. Review the reported counts rather than assuming every repository document was included. A rejected input or a skipped document is not evidence that its contents were reviewed.

When changing the linter, run its bundled regression tests from any working directory, using the same `skill_dir` as above:

```sh
python3 -B -m unittest discover -s "$skill_dir/scripts" -p 'test_*.py' -q
```
