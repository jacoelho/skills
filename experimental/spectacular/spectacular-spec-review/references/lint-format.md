# Optional structural linter

The linter is a small, standard-library-only Python tool. It checks an explicitly opted-in subset of Markdown. It is not a semantic requirements analyser and is not required for these skills.

## Run

From any working directory, resolve the script from the directory that contains this skill's `SKILL.md`:

```sh
skill_dir=/absolute/path/to/installed/spectacular-spec-review
python3 "$skill_dir/scripts/spec_lint.py" ./examples/booking-cancellation
```

Replace the placeholder with the absolute installed directory containing `SKILL.md`; do not assume a particular user or repository install path. The spec roots are arguments to the command and are resolved from the process current working directory; use absolute paths when that directory is not the repository root. Pass the relevant active spec roots, including the canonical homes of locally referenced identifiers. The program does not fetch external sources or follow symbolic links. It accepts Python 3.10 or later. Explicit non-Markdown files and unsupported input types are rejected; non-Markdown entries encountered under a directory are skipped and counted. Hidden files and directories are skipped only when encountered during directory traversal; an explicitly supplied hidden Markdown file is eligible for scanning.

## Opt in

Include this exact standalone line, without indentation, in every active document to scan:

```text
<!-- spec-lint: active -->
```

Unmarked Markdown is skipped and counted. Historical documents should not use the active marker. Template text inside fenced code is ignored, including an opt-in marker inside a fence. Do not claim that a skipped document was reviewed.

## Supported declarations

Outside fenced code, use an ATX heading at level 2 through 6:

```markdown
### REQ-BOOK-001 — Cancel a pending booking
Status: accepted
Statement: Cancelling a pending booking changes its state to cancelled.
Basis: DEC-BOOK-001, adopted by the designated product owner.
References: INV-BOOK-001

### AC-BOOK-001 — Pending booking
Covers: REQ-BOOK-001, INV-BOOK-001
Situation: ...
Expected: ...
```

Supported prefixes: REQ, INV, AC, DEC, Q, TERM, SRC. An identifier has a prefix and one or more uppercase alphanumeric segments separated by hyphens. A heading declares one canonical home. A reference does not redeclare it.

Fields are plain, single-line `Name: value` lines in the declaration's own section. The next heading, including a nested heading, ends that section. Indented lines, multiline values, tables, HTML declarations, and other Markdown heading syntaxes are not interpreted. For `References:` and `Covers:`, supply comma-separated local IDs only. Reference an external source by a local SRC declaration that identifies its source and version; the tool does not validate that source. Put narrative links on other field names or ordinary prose lines.

Use `Status: proposed` or `Status: accepted` for REQ and INV declarations. Other statuses should be represented in non-active history or translated explicitly before opting in. Never relabel a rule accepted just to satisfy the checker.

## Checks

- Duplicate IDs, including duplicate definitions in one file.
- Malformed declared IDs and malformed reference lists in supported fields.
- Dangling local references and references to ambiguously duplicated IDs.
- `Covers:` on a non-AC block or covering something other than REQ/INV.
- REQ/INV declarations missing their statement, status, or accepted decision basis.
- AC declarations missing a coverage link or an expected result.
- An accepted REQ/INV with no AC declaration pointing to it: warning only.
- Duplicate recognised fields within a block.
- An opted-in document with no supported declarations or an unclosed code fence.

Coverage links indicate claimed traceability, not execution, adequate coverage, a valid oracle, or a proof of correctness. A reference can be syntactically valid and semantically inappropriate.

## Output and exit codes

Text output includes counts for active documents and declarations, unmarked documents, non-Markdown entries, hidden entries, symlinks, and explicitly rejected unsupported inputs, plus location-specific findings. `--json` emits the same information in machine-readable form. `--strict` makes warnings affect the exit code.

- 0: no structural errors; warnings may remain without `--strict`.
- 1: structural errors, or warnings under `--strict`.
- 2: input/read failure or no active documents selected.

Overlapping input paths are deduplicated. Counts for active documents, skipped entries, symlinks, and rejected inputs refer to unique absolute path entries across the supplied roots. Traversal skips directory and file symlinks and counts them. A hidden directory counts as one skipped entry; its descendants are not traversed or counted individually. Review the reported counts rather than assuming every repository document was included. A rejected input or a skipped document is not evidence that its contents were reviewed.

When changing the linter, run its bundled regression tests from the repository root:

```sh
python3 -B -m unittest discover -s experimental/spectacular/spectacular-spec-review/scripts -p 'test_*.py' -q
```

A clean run does not detect paraphrased duplicates, contradictory statements, invalid refinements, missed requirements, interaction defects, or unsupported guarantees. Those remain the responsibility of semantic review.
