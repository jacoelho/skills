#!/usr/bin/env python3
from __future__ import annotations

import contextlib
import io
import json
import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import record  # noqa: E402

SKILL = Path(__file__).resolve().parents[1]

RECORD = """# Implementation: booking cancellation

Contracts: specs/booking/contract.md sha256:abc
Lifecycle: anchored
Status: approved
Checks: make test

## Gap map

| Requirement | Status | Evidence |
| --- | --- | --- |
| REQ-BOOK-001 | missing | - |

## Design

Design: extends booking; no new seams.

## C-1 Cancel a pending booking - after: -

Seams: none
Tests: checks AC-BOOK-001

Unit markers: `[ ]` pending, `[~]` in-progress, `[x]` done, `[a]` accepted, `[!]` blocked (reason in Notes).

- [ ] U-1.1 Write failing tests - owner: booking/ - edits: booking/cancel_test.go
- [ ] U-1.2 Release the unit - after: U-1.1 - owner: booking/ - edits: booking/cancel.go

Notes:

## C-2 Refund - after: C-1

- [ ] U-2.1 Write failing tests - owner: refund/ - edits: refund/refund_test.go

Notes:
"""


class RecordTool(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / "booking.implementation.md"
        self.path.write_text(RECORD, encoding="utf-8")

    def tearDown(self) -> None:
        self.directory.cleanup()

    def run_tool(self, *args: str, payload: object = None, raw: str | None = None) -> tuple[int, str, str]:
        out, err = io.StringIO(), io.StringIO()
        old = sys.stdin
        sys.stdin = io.StringIO(raw if raw is not None else json.dumps(payload))
        try:
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                code = record.main([*args])
        finally:
            sys.stdin = old
        return code, out.getvalue(), err.getvalue()

    def apply(self, payload: object, *extra: str) -> tuple[int, str, str]:
        return self.run_tool("apply", str(self.path), *extra, payload=payload)

    def test_show_reads_status_changes_and_unit_states(self) -> None:
        code, out, _ = self.run_tool("show", str(self.path))

        self.assertEqual(code, 0)
        self.assertEqual(json.loads(out), {"status": "approved", "changes": [
            {"id": "C-1", "units": {"U-1.1": "pending", "U-1.2": "pending"}},
            {"id": "C-2", "units": {"U-2.1": "pending"}}]})

    def test_apply_writes_status_markers_and_notes_under_their_change(self) -> None:
        code, out, _ = self.apply({"status": "implementing",
                                   "units": [{"id": "U-1.1", "state": "done"},
                                             {"id": "U-1.2", "state": "blocked", "reason": "needs\na new seam"}],
                                   "notes": [{"change": "C-1", "text": "C-1 red after U-1.1: TestCancel (assertion)"}]})

        self.assertEqual(code, 0)
        text = self.path.read_text(encoding="utf-8")
        self.assertIn("Status: implementing\n", text)
        self.assertIn("- [x] U-1.1 Write failing tests - owner: booking/", text)
        self.assertIn("- [!] U-1.2 Release the unit - after: U-1.1", text)
        c1 = text.split("## C-1")[1].split("## C-2")[0]
        self.assertIn("Notes:\n- U-1.2 blocked: needs a new seam\n- C-1 red after U-1.1: TestCancel (assertion)\n", c1)
        self.assertEqual(json.loads(out)["changes"][0]["units"], {"U-1.1": "done", "U-1.2": "blocked"})

    def test_applying_the_same_payload_twice_changes_nothing_the_second_time(self) -> None:
        payload = {"units": [{"id": "U-1.2", "state": "blocked", "reason": "no seam"},
                             {"change": "C-1", "id": "C-1-F1", "state": "pending", "owner": "booking/",
                              "edits": ["booking/cancel.go"], "title": "Cancel returns the wrong error"}],
                   "notes": [{"change": "C-1", "text": "U-1.1: tests written"}]}
        self.apply(payload)
        once = self.path.read_text(encoding="utf-8")

        code, _, _ = self.apply(payload)

        self.assertEqual(code, 0)
        self.assertEqual(self.path.read_text(encoding="utf-8"), once)

    def test_apply_adds_a_fix_unit_after_the_changes_last_unit(self) -> None:
        self.apply({"units": [{"change": "C-1", "id": "C-1-F1", "state": "pending", "kind": "impl", "after": [],
                               "owner": "booking/", "edits": ["booking/cancel.go"], "title": "Wrong error"}]})

        lines = self.path.read_text(encoding="utf-8").splitlines()
        at = lines.index("- [ ] U-1.2 Release the unit - after: U-1.1 - owner: booking/ - edits: booking/cancel.go")
        self.assertEqual(lines[at + 1], "- [ ] C-1-F1 Wrong error - owner: booking/ - edits: booking/cancel.go")

    def test_apply_creates_the_stack_change_after_the_last_change(self) -> None:
        code, out, _ = self.apply({"units": [{"change": "STACK", "id": "STACK-F1", "state": "pending",
                                              "owner": "stock/", "edits": ["stock/release.go"], "title": "Dup"}]})

        self.assertEqual(code, 0)
        text = self.path.read_text(encoding="utf-8")
        self.assertIn("\n## STACK Whole-stack conformance fixes - after: C-2\n", text)
        self.assertLess(text.index("## C-2"), text.index("## STACK"))
        self.assertEqual(json.loads(out)["changes"][-1], {"id": "STACK", "units": {"STACK-F1": "pending"}})

    def test_an_illegal_move_writes_nothing(self) -> None:
        cases = {
            "planning skips approval": ("Status: planning", {"status": "implementing"}, "planning cannot become implementing"),
            "blocked unit finishes without a resume": ("- [!] U-1.2", {"units": [{"id": "U-1.2", "state": "done"}]},
                                                       "U-1.2 is blocked and cannot become done"),
            "accepted unit goes back to done": ("- [a] U-1.2", {"units": [{"id": "U-1.2", "state": "done"}]},
                                                "U-1.2 is accepted and cannot become done"),
            "unknown unit without a change": ("- [ ] U-1.2", {"units": [{"id": "U-9.9", "state": "pending"}]},
                                              "U-9.9 is not in the record"),
            "unknown state": ("- [ ] U-1.2", {"units": [{"id": "U-1.2", "state": "finished"}]}, "needs an id and a state"),
        }
        for name, (line, payload, refusal) in cases.items():
            with self.subTest(name):
                start = RECORD.replace("- [ ] U-1.2" if "U-1.2" in line else "Status: approved", line)
                self.path.write_text(start, encoding="utf-8")

                code, _, err = self.apply({**payload, "notes": [{"change": "C-1", "text": "should not land"}]})

                self.assertEqual(code, 1)
                self.assertIn(refusal, err)
                self.assertEqual(self.path.read_text(encoding="utf-8"), start)

    def test_a_planning_record_cannot_start_work_before_approval(self) -> None:
        self.path.write_text(RECORD.replace("Status: approved", "Status: planning"), encoding="utf-8")

        code, _, err = self.apply({"status": "implementing"})

        self.assertEqual(code, 1)
        self.assertIn("planning cannot become implementing", err)
        self.assertIn("Status: planning", self.path.read_text(encoding="utf-8"))

    def test_a_payload_that_does_not_match_its_checksum_is_refused(self) -> None:
        raw = json.dumps({"status": "implementing"})

        code, _, err = self.run_tool("apply", str(self.path), "--sum", record.fnv1a(raw + " "), raw=raw)
        accepted, _, _ = self.run_tool("apply", str(self.path), "--sum", record.fnv1a(raw), raw=raw)

        self.assertEqual(code, 1)
        self.assertIn("checksum", err)
        self.assertEqual(accepted, 0)
        self.assertIn("Status: implementing", self.path.read_text(encoding="utf-8"))

    def test_checksum_matches_the_workflows_fnv1a_over_utf16_code_units(self) -> None:
        self.assertEqual(record.fnv1a(""), "811c9dc5")
        self.assertEqual(record.fnv1a("a"), "e40c292c")

    def test_a_record_it_cannot_read_is_refused_with_its_line(self) -> None:
        self.path.write_text(RECORD.replace("- [ ] U-1.2", "- [?] U-1.2"), encoding="utf-8")

        code, _, err = self.run_tool("show", str(self.path))

        self.assertEqual(code, 1)
        self.assertRegex(err, r"booking\.implementation\.md:\d+: unknown unit marker \[\?\]")

    def test_a_record_layout_it_cannot_read_is_refused_before_anything_is_written(self) -> None:
        cases = {
            "change below level 2": (RECORD.replace("## C-2 Refund", "### C-2 Refund"), "must be a level-2 heading"),
            "unit outside a change": (RECORD.replace("## Design\n", "## Design\n\n- [ ] U-0.1 Stray\n"), "outside a change section"),
            "decorated unit id": (RECORD.replace("- [ ] U-1.2 Release", "- [ ] **U-1.2** Release"), "unit line must read"),
        }
        for name, (text, refusal) in cases.items():
            with self.subTest(name):
                self.path.write_text(text, encoding="utf-8")

                code, _, err = self.apply({"units": [{"change": "C-1", "id": "U-1.1", "state": "done"}]})

                self.assertEqual(code, 1)
                self.assertIn(refusal, err)
                self.assertEqual(self.path.read_text(encoding="utf-8"), text)

    def test_apply_adds_no_change_but_stack(self) -> None:
        code, _, err = self.apply({"units": [{"change": "C-9", "id": "C-9-F1", "state": "pending"}],
                                   "notes": [{"change": "P-1", "text": "lost"}]})

        self.assertEqual(code, 1)
        self.assertIn("change C-9 is not in the record", err)
        self.assertIn("change P-1: it is not in the record", err)
        self.assertEqual(self.path.read_text(encoding="utf-8"), RECORD)

    def test_apply_keeps_crlf_line_endings(self) -> None:
        self.path.write_bytes(RECORD.replace("\n", "\r\n").encode("utf-8"))

        code, _, _ = self.apply({"status": "implementing", "notes": [{"change": "C-2", "text": "started"}]})

        written = self.path.read_bytes()
        self.assertEqual(code, 0)
        self.assertNotIn(b"\n", written.replace(b"\r\n", b""))
        self.assertIn(b"Notes:\r\n- started\r\n", written)

    def test_the_template_parses(self) -> None:
        template = (SKILL / "assets" / "implementation.md").read_text(encoding="utf-8")
        filled = template.replace("Status: [planning | approved | implementing | blocked | discard-ready | accepted]",
                                  "Status: planning")

        parsed = record.parse(filled, Path("implementation.md"))

        self.assertEqual([c.id for c in parsed.changes], ["C-1", "STACK"])
        self.assertEqual([u.id for u in parsed.changes[0].units], ["U-1.1", "U-1.2"])


class TransitionTables(unittest.TestCase):
    def table(self, header: str) -> dict[str, set[str]]:
        text = (SKILL / "references" / "execution.md").read_text(encoding="utf-8")
        section = text.split("## Record states\n")[1].split("\n## ")[0]
        rows = section.split(header)[1].split("\n\n")[0].splitlines()[2:]
        names = sorted({*record.STATUS_MOVES, *record.UNIT_MOVES}, key=len, reverse=True)
        pattern = re.compile(r"(?<![\w-])(" + "|".join(map(re.escape, names)) + r")(?![\w-])")
        table = {}
        for row in rows:
            cells = [c.strip() for c in row.strip("|").split("|")]
            table[cells[0]] = set(pattern.findall(cells[-1]))
        return table

    def test_the_status_table_lists_exactly_the_moves_record_py_allows(self) -> None:
        self.assertEqual(self.table("| Status |"), record.STATUS_MOVES)

    def test_the_unit_table_lists_exactly_the_moves_and_markers_record_py_uses(self) -> None:
        self.assertEqual(self.table("| Unit |"), record.UNIT_MOVES)
        text = (SKILL / "references" / "execution.md").read_text(encoding="utf-8")
        for state, marker in record.MARKERS.items():
            self.assertIn(f"| {state} | `[{marker}]`", text)


if __name__ == "__main__":
    unittest.main()
