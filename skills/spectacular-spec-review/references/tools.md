# Tools

Three scripts in this skill's `scripts/` folder do the mechanical work on specs, so an agent reads and edits only what a task needs. `spec_lint.py` checks the specs ([the linter guide](lint-format.md)); the two below read and change them.

- [Reading and changing specs](#reading-and-changing-specs): `spec.py`
- [Evidence maps](#evidence-maps): `evidence.py`

## Reading and changing specs

Read the rules a task touches with `spec.py show`, not whole contracts: it prints each declaration or decision entry with the ACs that check it, the entries its Basis cites, the terms it uses, a heading line for every other ID it cites, and its evidence rows, and starts every block with its `path:first-last` lines, so an edit needs only a ranged read. Open a whole contract only to review all of it.

```sh
spec="${CLAUDE_SKILL_DIR}/scripts/spec.py"
python3 "$spec" show REQ-BOOK-001 AC-BOOK-003       # the rules and what a reader needs beside them
python3 "$spec" show INV-BOOK-001 --cited-by        # also every section that cites it, before changing it
python3 "$spec" outline specs/booking/contract.md   # headings with lines, proposed rules, next free IDs
python3 "$spec" new AC REQ-BOOK-002 'Cancelling a confirmed booking is refused'  # AC skeleton under the rule
python3 "$spec" decide Q-BOOK-005 <<'EOF'           # move an Open entry to Decided with its answer
Which bookings can a customer cancel? Pending only. Decided by the booking product owner.
EOF
python3 "$spec" reopen Q-BOOK-002 <<'EOF'           # move a Decided entry back to Open with its question
How long is a refund window? Reopened because Q-BOOK-005 changed which bookings can be cancelled.
EOF
```

`new AC` adds the criterion after the rule's fields, rule table and existing ACs, with the next free AC ID and each required field as a placeholder the linter rejects until it is replaced. Every command reads the specs under `specs/`; pass `--root` before the command when they live elsewhere. `show` keeps its output under 16,000 bytes by shrinking supporting blocks to their heading; show those by ID. `decide` refuses an entry that is not under Open and an empty answer, and `reopen` one that is not under Decided and an empty question; either then writes nothing. `reopen` also lists every section that mentions the entry, with what to do: a rule drops the citation from its Basis, so it is proposed until the entry is decided again; a decision that rests on the entry is reconsidered, and reopened too when its answer depended on it. Edit evidence maps with `evidence.py`, below.

## Evidence maps

`evidence.py` edits a capability's [evidence map](../../spectacular-spec-writing/references/declarations.md#evidence-map); it computes the relative path, escapes pipes, and keeps the rows sorted and unique. Paths are typed from the current directory:

```sh
evidence="${CLAUDE_SKILL_DIR}/scripts/evidence.py"
python3 "$evidence" add specs/booking/contract.md AC-BOOK-003 tests/booking_test.py test_confirmed_booking_is_rejected
python3 "$evidence" add specs/booking/contract.md - <<'EOF'
AC-BOOK-001	specs/booking/cancellation.feature	Cancelling a pending booking releases its unit
AC-BOOK-003	tests/booking_test.py	test_confirmed_booking_is_rejected
EOF
python3 "$evidence" remove specs/booking/contract.md AC-BOOK-003 [tests/booking_test.py [test name]]
python3 "$evidence" unchecked specs/booking/contract.md AC-BOOK-003 'The refund e-mail; checked by review only.'
python3 "$evidence" unchecked specs/booking/contract.md AC-BOOK-003 - <<'EOF'
The customer's refund e-mail; checked by review only.
EOF
python3 "$evidence" unchecked specs/booking/contract.md AC-BOOK-003 --clear
python3 "$evidence" rename tests/booking_test.py old_name new_name
python3 "$evidence" move tests/booking_test.py tests/unit/booking_test.py
python3 "$evidence" fmt specs/booking/booking.evidence.md
```

`add` with `-` reads rows from standard input, one per line: AC, test file, and test name, separated by tabs. It checks every row first and adds none if any fails, naming each failing line. Give a test name or text containing `'`, `$`, or a backtick on standard input, from a heredoc whose delimiter is quoted (`<<'EOF'`) or from a file; inside single quotes the shell cannot hold an apostrophe, and an unquoted heredoc expands `${...}` and backticks. `rename` and `move` update every map under `specs/`; pass `--root` when the contracts live elsewhere. The script refuses a row the linter would reject (an AC its contract does not declare, a test name not in the file) and a map it cannot parse, and then writes nothing. Commands may run in parallel: each locks the directories of the maps it rewrites.
