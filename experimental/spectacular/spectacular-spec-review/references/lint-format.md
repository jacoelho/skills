# Declaration and EARS linter

The linter is a small, standard-library-only Python tool. It enforces the declaration layout, [EARS lexical grammar](ears.md), and local traceability in explicitly active Markdown documents. Every REQ/INV statement is checked, whether proposed or accepted; there is no switch to bypass EARS checks. Requirement meaning and implementation conformance still require review.

## Run

From any working directory, resolve the script from the directory that contains this skill's `SKILL.md`:

```sh
skill_dir=/absolute/path/to/installed/spectacular-spec-review
python3 "$skill_dir/scripts/spec_lint.py" ./examples/booking-cancellation
```

Replace the placeholder with the absolute installed directory containing `SKILL.md`; do not assume a particular user or repository install path. The spec roots are arguments to the command and are resolved from the process current working directory; use absolute paths when that directory is not the repository root. Pass the relevant active spec roots, including the canonical homes of locally referenced identifiers. The program does not fetch external sources or follow symbolic links. It accepts Python 3.10 or later. Only regular Markdown files are read. Explicit non-Markdown files and unsupported input types are rejected; regular non-Markdown files encountered under a directory are skipped and counted. Special files, such as named pipes, are rejected and counted even during traversal. Hidden files and directories are skipped only when encountered during directory traversal; an explicitly supplied hidden Markdown file is eligible for scanning.

## Opt in

Include this exact standalone line, without indentation, in every active document to scan:

```text
<!-- spec-lint: active -->
```

Unmarked Markdown is skipped and counted. Historical documents should not use the active marker. Template text inside valid fenced code is ignored, including an opt-in marker inside a fence. A backtick fence's info string cannot contain backticks: a malformed opener produces `invalid-fence` in an active document and its following declarations remain visible. Tilde fence info strings may contain backticks. Do not claim that a skipped document was reviewed.

## Supported declarations

Outside fenced code, use an ATX heading at level 2 through 6:

```markdown
### REQ-BOOK-001 — Cancel a pending booking
Status: accepted
Statement: When a pending booking is cancelled, the booking service shall change its state to cancelled.
Basis: DEC-BOOK-001, adopted by the designated product owner.
References: INV-BOOK-001

### AC-BOOK-001 — Pending booking
Covers: REQ-BOOK-001, INV-BOOK-001
Situation: ...
Expected: ...
```

Supported prefixes: REQ, INV, AC, DEC, Q, TERM, SRC. An identifier has a prefix and one or more uppercase alphanumeric segments separated by hyphens. A heading declares one canonical home. A reference does not redeclare it.

Fields are plain, column-zero, single-line `Name: value` lines in the declaration's own section. The next heading, including a nested heading, ends that section. Recognised fields outside a declaration, wrong casing, indentation, list or quote prefixes, HTML wrappers, and a table `Statement` cell are errors. Declaration-shaped indented, formatted, blockquoted, list-prefixed, or HTML headings are also errors. Use unformatted IDs in column-zero level 2–6 ATX headings.

Known field labels with emphasis, inline-code, HTML, or link formatting are also unsupported, whether the colon is inside or outside that formatting. For example, `**Statement:**` and `` `Statement`: `` fail; they are not parsed as replacement fields. A leading formatted field-label mention has the same shape, so put explanations in `Rationale:`, surrounding prose, or a fenced example.

`Statement` belongs only to REQ/INV. Continuation text after it is an error, even after a blank line, until another named field or heading begins. Put commentary in `Rationale:` or another named field, or a separate section. Literal examples in fenced code remain outside the scan. Illustrative tables may reference rule IDs and expected observations; they cannot define a `Statement` column. The linter does not infer undeclared requirements from arbitrary prose.

Table headers require an immediately adjacent delimiter row with the same cell count; fenced examples cannot join separated lines into a table. Single-column tables and delimiters with one or more hyphens are recognised. Outside an established table, a bare hyphen or equals-sign underline forms a Markdown heading; a table delimiter needs a pipe or alignment colon. Escaped pipes remain within their cell, including inside formatted labels or links.

Within an established table, body rows are checked before interpreting later lines. Body text can omit pipes. Table content cannot supply declaration fields: recognised `Name: value` lines in a table header or body are rejected before storing their values. Blank lines, fenced blocks, ATX headings, and quote, list, or thematic-break interruptions end table context. A bare `---` ends a table when reached; `===` remains body content. Quoted and inline-code examples in body rows remain illustrative data.

For `References:` and `Covers:`, supply comma-separated local IDs only. Reference an external source by a local SRC declaration that identifies its source and version; the tool does not validate that source. Put narrative links on other field names or ordinary prose lines outside a Statement continuation.

Use `Status: proposed` or `Status: accepted` for REQ and INV declarations. Other statuses should be represented in non-active history or translated explicitly before opting in. Never relabel a rule accepted just to satisfy the checker.

## Checks

- Duplicate IDs, including duplicate definitions in one file.
- Malformed declared IDs and malformed reference lists in supported fields.
- Dangling local references and references to ambiguously duplicated IDs.
- `Covers:` on a non-AC block or covering something other than REQ/INV.
- REQ/INV declarations missing their statement, status, or accepted decision basis.
- REQ/INV statements violating the EARS lexical grammar: casing, clause order, empty slots, obligation boundary, balanced literals, or sentence punctuation.
- INV statements containing a When or If activation clause; configuration and state scopes are permitted.
- Unsupported declaration/field forms, orphan fields, Statement continuations, or Statement on another declaration kind.
- AC declarations missing a coverage link or an expected result.
- An accepted REQ/INV with no AC declaration pointing to it: warning only.
- Duplicate recognised fields within a block.
- An opted-in document with no supported declarations, a malformed backtick fence opener, or an unclosed code fence.

Coverage links indicate claimed traceability, not execution, adequate coverage, a valid oracle, or a proof of correctness. A reference can be syntactically valid and semantically inappropriate.

## Output and exit codes

Text output includes counts for active documents and declarations, unmarked documents, non-Markdown entries, hidden entries, symlinks, and rejected unsupported inputs, plus location-specific findings. `--json` emits the same information in machine-readable form. `--strict` makes warnings affect the exit code.

- 0: no declaration, EARS syntax, or traceability errors; warnings may remain without `--strict`.
- 1: declaration, EARS syntax, or traceability errors, or warnings under `--strict`.
- 2: input/read failure or no active documents selected.

Overlapping input paths are deduplicated. Counts for active documents, skipped entries, symlinks, and rejected inputs refer to unique absolute path entries across the supplied roots. Traversal skips directory and file symlinks and counts them. A hidden directory counts as one skipped entry; its descendants are not traversed or counted individually. Review the reported counts rather than assuming every repository document was included. A rejected input or a skipped document is not evidence that its contents were reviewed.

When changing the linter, run its bundled regression tests from any working directory, using the same installed `skill_dir` as above:

```sh
python3 -B -m unittest discover -s "$skill_dir/scripts" -p 'test_*.py' -q
```

A clean run means the recognised declarations satisfy the supported schema and lexical grammar. It does not detect paraphrased duplicates, contradictory statements, invalid refinements, undeclared requirements, interaction defects, or unsupported guarantees. It cannot decide whether slot text names a valid system, whether terms are defined, or whether response prose hides additional policy. Those remain the responsibility of semantic review.
