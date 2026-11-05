# Declaration and EARS linter

The linter is a small, standard-library-only Python tool. It enforces the declaration layout, [EARS lexical grammar](ears.md), and local traceability in explicitly active Markdown documents. Every REQ/INV statement is checked, whether proposed or accepted; there is no switch to bypass EARS checks. Requirement meaning and implementation conformance still require review.

## Run

From any working directory, resolve the script from the directory that contains this skill's `SKILL.md`:

```sh
skill_dir=/absolute/path/to/installed/spectacular-spec-review
python3 "$skill_dir/scripts/spec_lint.py" ./specs
```

Replace the placeholder with the absolute installed directory containing `SKILL.md`; do not assume a particular user or repository install path. The spec roots are arguments to the command and are resolved from the process current working directory; use absolute paths when that directory is not the repository root. Pass the relevant active spec roots, including the canonical homes of locally referenced identifiers. The program does not fetch external sources. It accepts Python 3.10 or later. Only regular Markdown files are read.

A supplied path states intent, so symbolic links in it, including in its ancestors, are followed, and the resolved target decides eligibility: `notes.md -> notes.txt` is rejected. Findings in a followed file name its resolved path; a rejected input is named as supplied. Symbolic links met during directory traversal are never followed, and each is counted. A `skipped-symlink` warning names a link only when its target may hold Markdown this run did not check: the target is dangling or loops, is neither a regular file nor a directory, is a Markdown file that was not scanned, or is a directory that was not traversed. A link to a scanned file or a traversed directory, such as `CLAUDE.md -> AGENTS.md`, or to a regular non-Markdown file, is counted without a warning. Coverage is decided after all inputs are collected, so input order does not matter; it compares resolved path spellings, as the deduplication note under Output and exit codes describes. Under `--strict` a warning fails the run until its target is passed explicitly or the link is removed. A dangling or looping input link is an input error. Explicit non-Markdown files and unsupported input types are rejected; regular non-Markdown files encountered under a directory are skipped and counted. Special files, such as named pipes, are rejected and counted even during traversal. Hidden files and directories are skipped only when encountered during directory traversal, and the hidden check comes first, so a hidden link counts as hidden, not as a symlink. An explicitly supplied hidden Markdown file is eligible for scanning.

## Opt in

Include this exact standalone line, without indentation, in every active document to scan; trailing whitespace is ignored:

```text
<!-- spec-lint: active -->
```

Unmarked Markdown is skipped and counted. Historical documents should not use the active marker. Template text inside valid fenced code is ignored, including an opt-in marker inside a fence. A backtick fence's info string cannot contain backticks: a malformed opener produces `invalid-fence` in an active document and its following declarations remain visible. Tilde fence info strings may contain backticks. Do not claim that a skipped document was reviewed.

## Supported declarations

Outside fenced code, use an ATX heading at level 2 through 6, with whitespace between the identifier and its title. This example is complete: with the active marker prepended it lints clean under `--strict`.

```markdown spec-lint
### INV-BOOK-001 — Stock stays non-negative
Status: accepted
Statement: The booking service shall keep available stock non-negative.
Basis: DEC-BOOK-001, adopted by the designated product owner.

### REQ-BOOK-001 — Cancel a pending booking
Status: accepted
Statement: When a pending booking is cancelled, the booking service shall atomically mark the booking cancelled and release its reserved unit.
Basis: DEC-BOOK-001, adopted by the designated product owner.
References: INV-BOOK-001

### AC-BOOK-001 — Pending booking
Covers: REQ-BOOK-001, INV-BOOK-001
Situation: Booking B is pending and holds one reserved unit of stock S.
Expected: B is cancelled and the available stock of S rises by exactly one.
```

`Basis` is prose and is not resolved as a reference; declare a `DEC` locally and list it in `References:` when the link should be checked. A heading such as `## REQ-BOOK-001: Title` or `# REQ-BOOK-001 Title` is a `malformed-id` error; the message names the fix, and the section's fields are not reported again as orphans.

When the executable example lives in a Gherkin scenario or a test, keep a pointer AC: `Covers:` names the rule and `Expected:` names the scenario or test, for example `Expected: Scenario "Cancel a pending booking" in features/cancellation.feature passes.` The linter does not read `.feature` files or tests, so the pointer AC is what records coverage.

Supported prefixes: REQ, INV, AC, DEC, Q, TERM, SRC. An identifier has a prefix and one or more uppercase alphanumeric segments separated by hyphens. A heading declares one canonical home. A reference does not redeclare it.

Fields are plain, column-zero, single-line `Name: value` lines in the declaration's own section. The next heading, including a nested heading, ends that section. Recognised fields outside a declaration, wrong casing, indentation, list or quote prefixes, HTML wrappers, and a table `Statement` cell are errors. Declaration-shaped indented, formatted, blockquoted, list-prefixed, or HTML headings are also errors. Use unformatted IDs in column-zero level 2–6 ATX headings.

Known field labels with emphasis, inline-code, HTML, or link formatting are also unsupported, whether the colon is inside or outside that formatting. For example, `**Statement:**` and `` `Statement`: `` fail; they are not parsed as replacement fields. A leading formatted field-label mention has the same shape, so put explanations in `Rationale:`, surrounding prose, or a fenced example.

`Statement` belongs only to REQ/INV. Continuation text after it is an error, even after a blank line, until another named field or heading begins. Put commentary in `Rationale:` or another named field, or a separate section. Literal examples in fenced code remain outside the scan. Illustrative tables may reference rule IDs and expected observations; they cannot define a `Statement` column. The linter does not infer undeclared requirements from arbitrary prose.

Table headers require an immediately adjacent delimiter row with the same cell count; fenced examples cannot join separated lines into a table. Single-column tables and delimiters with one or more hyphens are recognised. Outside an established table, a bare hyphen or equals-sign underline forms a Markdown heading; a table delimiter needs a pipe or alignment colon. Escaped pipes remain within their cell, including inside formatted labels or links.

Within an established table, body rows are checked before interpreting later lines. Body text can omit pipes. Table content cannot supply declaration fields: recognised `Name: value` lines in a table header or body are rejected before storing their values. Blank lines, fenced blocks, ATX headings, and quote, list, or thematic-break interruptions end table context. A bare `---` ends a table when reached; `===` remains body content. Quoted and inline-code examples in body rows remain illustrative data.

For `References:` and `Covers:`, supply comma-separated local IDs only. Reference an external source by a local SRC declaration that identifies its source and version; the tool does not validate that source. Put narrative links on other field names or ordinary prose lines outside a Statement continuation.

A field value that is entirely one bracketed template placeholder, such as `Basis: [Authorised decision]`, is a `placeholder-value` error and counts as neither filled nor missing. Only an untouched whole-field placeholder is detected: partially edited template text, such as `<event>` left after removing the outer brackets, lints as ordinary text and is left to review; quote a literal bracketed value with backticks, for example `` Expected: `[1, 2]` ``, and write a Markdown reference link as `[ADR 7][]` rather than `[ADR 7]`.

Use `Status: proposed` or `Status: accepted` for REQ and INV declarations. Other statuses should be represented in non-active history or translated explicitly before opting in. Never relabel a rule accepted just to satisfy the checker.

## Checks

- Duplicate IDs, including duplicate definitions in one file.
- Malformed declared IDs and malformed reference lists in supported fields.
- Dangling local references and references to ambiguously duplicated IDs.
- `Covers:` on a non-AC block or covering something other than REQ/INV.
- REQ/INV declarations missing their statement, status, or accepted decision basis.
- Field values left as a bracketed template placeholder.
- REQ/INV statements violating the EARS lexical grammar: casing, clause order, empty slots, obligation boundary, balanced literals, or sentence punctuation.
- INV statements containing a When or If activation clause; configuration and state scopes are permitted.
- Unsupported declaration/field forms, orphan fields, Statement continuations, or Statement on another declaration kind.
- AC declarations missing a coverage link or an expected result.
- An accepted REQ/INV with no AC declaration pointing to it: warning only.
- A symbolic link skipped during traversal whose target was not checked: warning only.
- Duplicate recognised fields within a block.
- An opted-in document with no supported declarations, a malformed backtick fence opener, or an unclosed code fence.

Coverage links indicate claimed traceability, not execution, adequate coverage, a valid oracle, or a proof of correctness. A reference can be syntactically valid and semantically inappropriate.

## Output and exit codes

Text output includes counts for active documents and declarations, unmarked documents, non-Markdown entries, hidden entries, symlinks, and rejected unsupported inputs, plus location-specific findings. `--json` emits the same information in machine-readable form. `--strict` makes warnings affect the exit code.

- 0: no declaration, EARS syntax, or traceability errors; warnings may remain without `--strict`.
- 1: declaration, EARS syntax, or traceability errors, or warnings under `--strict`.
- 2: input/read failure or no active documents selected. The `no-active-documents` message repeats the skip counts so the cause is visible without the summary line.

Overlapping input paths are deduplicated by resolved path spelling. On a case-insensitive filesystem a differently cased spelling counts as a different path, so a covered link may still warn and a file supplied twice may be scanned twice and report duplicate IDs; spell inputs and link targets in their on-disk case. Counts for active documents, skipped entries, symlinks, and rejected inputs refer to unique absolute path entries across the supplied roots. Traversal skips directory and file symlinks and counts each once; the counts say what was skipped, and the warnings say which skipped targets went unchecked. A hidden directory counts as one skipped entry; its descendants are not traversed or counted individually. Review the reported counts rather than assuming every repository document was included. A rejected input or a skipped document is not evidence that its contents were reviewed.

When changing the linter, run its bundled regression tests from any working directory, using the same installed `skill_dir` as above:

```sh
python3 -B -m unittest discover -s "$skill_dir/scripts" -p 'test_*.py' -q
```

A clean run means the recognised declarations satisfy the supported schema and lexical grammar. It does not detect paraphrased duplicates, contradictory statements, invalid refinements, undeclared requirements, interaction defects, or unsupported guarantees. It cannot decide whether slot text names a valid system, whether terms are defined, or whether response prose hides additional policy. Those remain the responsibility of semantic review.
