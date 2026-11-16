#!/usr/bin/env python3
from __future__ import annotations

import contextlib
import io
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import spec  # noqa: E402  # importable only after the sys.path insert above
import spec_lint  # noqa: E402  # importable only after the sys.path insert above

CONTRACT = f"""{spec_lint.MARKER}
# Alarms

Decision owner: alarm owner

Lifecycle: anchored

## Governing context and basis

### TERM-ALM-001 - snooze

A pause of the ring the cook asks for.

### SRC-ALM-001 - Alarm guide v2

## Contract

### REQ-ALM-001 - Stop the alarm

Statement: When the cook stops the alarm, the alarm service shall stop ringing.

Basis: Q-ALM-001

Rationale: a `snooze` is not a stop; see TERM-ALM-001.

#### AC-ALM-001 - Stop rings no more

Situation: The alarm rings; the cook stops it.

Expected: The alarm is silent.

Oracle: Q-ALM-001.

Boundary: The alarm service API.

Counterexample: The alarm keeps ringing.

### REQ-ALM-002 - Snooze the alarm

Statement: When the cook snoozes the alarm, the alarm service shall stop ringing for 5 minutes.

#### AC-ALM-002 - Snooze silences, then rings

Covers: REQ-ALM-001

Situation: The alarm rings; the cook snoozes it.

Expected: The alarm is silent for 5 minutes, then rings.

Oracle: SRC-ALM-001.

Boundary: The alarm service API.

Counterexample: The alarm never rings again.
"""

RECORD = """# Alarm decisions

## Policies

### Q-ALM-009 - Who decides alarm questions

The alarm owner.

## Open

### Q-ALM-002 - Snooze length

How long is a snooze? Waiting on the alarm owner.

## Decided

### Q-ALM-001 - Stopping stops

Does stopping silence the alarm? Yes. Decided by the alarm owner.

## Handoff

Next action: decide Q-ALM-002.
"""

EVIDENCE = """# alarms evidence

| AC | File | Test |
| --- | --- | --- |
| AC-ALM-001 | alarm.test | stops ringing |
| AC-ALM-002 | alarm.test | snooze silences |
"""


class SpecTree(unittest.TestCase):
    def setUp(self) -> None:
        self.directory = tempfile.TemporaryDirectory()
        self.root = Path(self.directory.name) / "specs"
        (self.root / "alarms").mkdir(parents=True)
        self.contract = self.root / "alarms" / "alarms.md"
        self.record = self.root / "alarms" / "alarms.decisions.md"
        self.contract.write_text(CONTRACT, encoding="utf-8")
        self.record.write_text(RECORD, encoding="utf-8")
        (self.root / "alarms" / "alarms.evidence.md").write_text(EVIDENCE, encoding="utf-8")
        (self.root / "alarms" / "alarm.test").write_text("stops ringing\nsnooze silences\n", encoding="utf-8")

    def tearDown(self) -> None:
        self.directory.cleanup()

    def run_tool(self, *args: str, stdin: str = "") -> tuple[int, str, str]:
        out, err = io.StringIO(), io.StringIO()
        old_stdin = sys.stdin
        sys.stdin = io.StringIO(stdin)
        try:
            with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
                code = spec.main(["--root", str(self.root), *args])
        finally:
            sys.stdin = old_stdin
        return code, out.getvalue(), err.getvalue()

class SpecToolTests(SpecTree):
    def test_show_prints_a_rule_with_its_checks_basis_terms_and_evidence(self) -> None:
        code, out, _ = self.run_tool("show", "REQ-ALM-001")

        self.assertEqual(code, 0)
        for expected in (
            "Statement: When the cook stops the alarm",
            "#### AC-ALM-001 - Stop rings no more",
            "#### AC-ALM-002 - Snooze silences, then rings",
            "Does stopping silence the alarm? Yes.",
            "A pause of the ring the cook asks for.",
            "| AC-ALM-001 | alarm.test | stops ringing |",
            "| AC-ALM-002 | alarm.test | snooze silences |",
        ):
            self.assertIn(expected, out)
        self.assertNotIn("Statement: When the cook snoozes", out)

    def test_show_prints_the_location_of_every_block(self) -> None:
        _, out, _ = self.run_tool("show", "REQ-ALM-001")

        self.assertIn(f"{self.contract}:", out)
        self.assertIn(f"{self.record}:", out)

    def test_show_prints_a_block_shared_by_two_ids_once(self) -> None:
        _, out, _ = self.run_tool("show", "REQ-ALM-001", "AC-ALM-001")

        self.assertEqual(out.count("Situation: The alarm rings; the cook stops it."), 1)
        self.assertIn("printed above", out)

    def test_show_keeps_the_requested_section_and_shrinks_supporting_blocks_past_the_budget(self) -> None:
        _, out, _ = self.run_tool("show", "REQ-ALM-001", "--max-bytes", "10")

        self.assertIn("Statement: When the cook stops the alarm", out)
        self.assertNotIn("Does stopping silence the alarm? Yes.", out)
        self.assertIn("Q-ALM-001", out)
        self.assertIn("--max-bytes", out)

    def test_show_reports_an_unknown_id_and_still_prints_the_others(self) -> None:
        code, out, err = self.run_tool("show", "REQ-ALM-404", "REQ-ALM-002")

        self.assertEqual(code, 1)
        self.assertIn("REQ-ALM-404", err)
        self.assertIn("Statement: When the cook snoozes", out)

    def test_show_lists_what_cites_an_id(self) -> None:
        _, out, _ = self.run_tool("show", "TERM-ALM-001", "--cited-by")

        self.assertIn("cited by", out)
        self.assertIn("REQ-ALM-001 - Stop the alarm", out)

    def test_outline_lists_declarations_marks_proposed_rules_and_gives_next_free_ids(self) -> None:
        code, out, _ = self.run_tool("outline", str(self.contract))

        self.assertEqual(code, 0)
        lines = out.splitlines()
        self.assertTrue(any("REQ-ALM-002 - Snooze the alarm" in line and "[proposed]" in line for line in lines))
        self.assertFalse(any("REQ-ALM-001 - Stop the alarm" in line and "[proposed]" in line for line in lines))
        self.assertIn("REQ-ALM-003", lines[-1])
        self.assertIn("AC-ALM-003", lines[-1])

    def test_decide_moves_an_open_entry_to_decided_with_its_answer(self) -> None:
        answer = "How long is a snooze? Five minutes. Decided by the alarm owner.\n"

        code, _, _ = self.run_tool("decide", "Q-ALM-002", stdin=answer)

        self.assertEqual(code, 0)
        record = self.record.read_text(encoding="utf-8")
        self.assertNotIn("## Open", record)
        self.assertIn("Five minutes.", record)
        self.assertNotIn("Waiting on the alarm owner.", record)
        sections = spec_lint.outline(record.splitlines())
        decided = next(s for s in sections if s.title == "Decided")
        entry = next(s for s in sections if s.token == "Q-ALM-002")
        self.assertTrue(decided.start < entry.start <= decided.end)
        self.assertLess(record.index("## Decided"), record.index("## Handoff"))

    def test_a_decided_entry_accepts_the_rule_that_cites_it(self) -> None:
        self.contract.write_text(CONTRACT.replace(
            "Statement: When the cook snoozes the alarm, the alarm service shall stop ringing for 5 minutes.\n",
            "Statement: When the cook snoozes the alarm, the alarm service shall stop ringing for 5 minutes.\n\n"
            "Basis: Q-ALM-002\n"), encoding="utf-8")
        before = {f.code for f in spec_lint.scan([self.root]).findings}

        self.run_tool("decide", "Q-ALM-002", stdin="How long? Five minutes.\n")

        self.assertIn("basis-not-deciding", before)
        self.assertNotIn("basis-not-deciding", {f.code for f in spec_lint.scan([self.root]).findings})

    def test_decide_creates_the_decided_section_after_open_when_missing(self) -> None:
        self.record.write_text(RECORD.split("## Decided")[0] + "## Handoff\n\nNext action: none.\n", encoding="utf-8")

        self.run_tool("decide", "Q-ALM-002", stdin="Five minutes.\n")

        record = self.record.read_text(encoding="utf-8")
        self.assertLess(record.index("## Policies"), record.index("## Decided"))
        self.assertLess(record.index("## Decided"), record.index("## Handoff"))

    def test_decide_refuses_without_changing_the_record(self) -> None:
        cases = {
            "already decided": ("Q-ALM-001", "Yes."),
            "a policy": ("Q-ALM-009", "Yes."),
            "unknown": ("Q-ALM-404", "Yes."),
            "not a question": ("REQ-ALM-001", "Yes."),
            "no answer": ("Q-ALM-002", "  \n"),
        }
        for name, (identifier, answer) in cases.items():
            with self.subTest(name):
                code, _, err = self.run_tool("decide", identifier, stdin=answer)
                self.assertEqual(code, 1)
                self.assertTrue(err.startswith("error:"))
                self.assertEqual(self.record.read_text(encoding="utf-8"), RECORD)


    def test_decide_keeps_the_sections_in_record_order_when_open_still_has_entries(self) -> None:
        second_open = "### Q-ALM-003 - Snooze limit\n\nHow many snoozes? Waiting on the alarm owner.\n\n"
        record = RECORD.replace("## Decided", second_open + "## Decided")
        self.record.write_text(record.split("## Decided")[0] + "## Handoff\n\nNext action: none.\n", encoding="utf-8")

        self.run_tool("decide", "Q-ALM-002", stdin="Five minutes.\n")

        record = self.record.read_text(encoding="utf-8")
        self.assertLess(record.index("## Policies"), record.index("## Open"))
        self.assertLess(record.index("## Open"), record.index("## Decided"))
        self.assertLess(record.index("## Decided"), record.index("## Handoff"))

    def test_reopen_moves_a_decided_entry_to_open_and_names_the_rules_that_cite_it(self) -> None:
        question = "Does stopping silence the alarm? Reopened: the owner now wants a fade-out.\n"

        code, out, _ = self.run_tool("reopen", "Q-ALM-001", stdin=question)

        self.assertEqual(code, 0)
        record = self.record.read_text(encoding="utf-8")
        self.assertNotIn("## Decided", record)
        self.assertIn("fade-out", record)
        sections = spec_lint.outline(record.splitlines())
        opened = next(s for s in sections if s.title == "Open")
        entry = next(s for s in sections if s.token == "Q-ALM-001")
        self.assertTrue(opened.start < entry.start <= opened.end)
        self.assertTrue(any("REQ-ALM-001 mentions Q-ALM-001; drop the citation from its Basis" in line
                            for line in out.splitlines()))
        self.assertIn("basis-not-deciding", {f.code for f in spec_lint.scan([self.root]).findings})

    def test_reopen_creates_the_open_section_between_policies_and_decided(self) -> None:
        self.run_tool("decide", "Q-ALM-002", stdin="Five minutes.\n")

        self.run_tool("reopen", "Q-ALM-001", stdin="Does stopping silence the alarm? Reopened.\n")

        record = self.record.read_text(encoding="utf-8")
        self.assertLess(record.index("## Policies"), record.index("## Open"))
        self.assertLess(record.index("## Open"), record.index("## Decided"))
        self.assertLess(record.index("Q-ALM-001"), record.index("## Decided"))

    def test_reopen_refuses_without_changing_the_record(self) -> None:
        cases = {
            "still open": ("Q-ALM-002", "Why?"),
            "a policy": ("Q-ALM-009", "Why?"),
            "unknown": ("Q-ALM-404", "Why?"),
            "not a question": ("REQ-ALM-001", "Why?"),
            "no question": ("Q-ALM-001", "  \n"),
        }
        for name, (identifier, question) in cases.items():
            with self.subTest(name):
                code, _, err = self.run_tool("reopen", identifier, stdin=question)
                self.assertEqual(code, 1)
                self.assertTrue(err.startswith("error:"))
                self.assertEqual(self.record.read_text(encoding="utf-8"), RECORD)

    def test_moves_keep_the_sections_in_record_order_in_a_record_without_policies(self) -> None:
        handoff = "## Handoff\n\nNext action: none.\n"
        cases = {
            "decide": ("Q-ALM-002", "## Decided", "## Open",
                       "# Alarm decisions\n\n## Open\n\n### Q-ALM-002 - Snooze length\n\nHow long?\n\n" + handoff),
            "reopen": ("Q-ALM-001", "## Open", "## Decided",
                       "# Alarm decisions\n\n## Decided\n\n### Q-ALM-001 - Stopping stops\n\nYes.\n\n" + handoff),
        }
        for command, (identifier, moved_to, emptied, record) in cases.items():
            with self.subTest(command):
                self.record.write_text(record, encoding="utf-8")

                self.run_tool(command, identifier, stdin="Text.\n")

                after = self.record.read_text(encoding="utf-8")
                self.assertNotIn(emptied, after)
                self.assertLess(after.index(moved_to), after.index(identifier))
                self.assertLess(after.index(identifier), after.index("## Handoff"))

    def test_reopen_asks_to_reconsider_a_decision_that_mentions_the_entry_instead_of_editing_a_basis(self) -> None:
        self.record.write_text(RECORD.replace("Yes. Decided by the alarm owner.",
                                              "Yes. Decided by the alarm owner.\n\n### Q-ALM-003 - Stop sound\n\n"
                                              "Silent, given Q-ALM-001."), encoding="utf-8")

        _, out, _ = self.run_tool("reopen", "Q-ALM-001", stdin="Does stopping silence it? Reopened.\n")

        line = next(l for l in out.splitlines() if "Q-ALM-003 mentions Q-ALM-001" in l)
        self.assertIn("reopen it too", line)
        self.assertNotIn("Basis", line)

    def test_new_ac_nests_after_the_rules_existing_acs_with_the_next_free_id(self) -> None:
        code, out, _ = self.run_tool("new", "AC", "REQ-ALM-001", "Stopping twice is harmless")

        self.assertEqual(code, 0)
        contract = self.contract.read_text(encoding="utf-8")
        sections = spec_lint.outline(contract.splitlines())
        added = next(s for s in sections if s.token == "AC-ALM-003")
        rule = next(s for s in sections if s.token == "REQ-ALM-001")
        existing = next(s for s in sections if s.token == "AC-ALM-001")
        self.assertEqual(added.level, rule.level + 1)
        self.assertTrue(existing.end < added.start <= rule.end)
        self.assertIn(f"{self.contract}:{added.start}-", out)
        for field in ("Situation", "Expected", "Oracle", "Boundary", "Counterexample"):
            self.assertIn(f"\n{field}: [", contract[contract.index("AC-ALM-003"):])

    def test_a_new_ac_fails_lint_until_its_placeholders_are_replaced(self) -> None:
        self.run_tool("new", "AC", "REQ-ALM-001", "Stopping twice is harmless")

        findings = [f for f in spec_lint.scan([self.root]).findings if "AC-ALM-003" in f.message]

        self.assertTrue(any(f.severity == "error" for f in findings), findings)

    def test_new_ac_refuses_without_changing_the_contract(self) -> None:
        cases = {
            "not a rule": ("AC-ALM-001", "A title"),
            "unknown rule": ("REQ-ALM-404", "A title"),
            "empty title": ("REQ-ALM-001", "   "),
        }
        for name, (rule, title) in cases.items():
            with self.subTest(name):
                code, _, err = self.run_tool("new", "AC", rule, title)
                self.assertEqual(code, 1)
                self.assertTrue(err.startswith("error:"))
                self.assertEqual(self.contract.read_text(encoding="utf-8"), CONTRACT)

class SpecToolEdgeTests(SpecTree):
    def test_outline_of_a_file_outside_the_root_still_lists_it_and_its_next_ids(self) -> None:
        other = Path(self.directory.name) / "elsewhere.md"
        other.write_text(CONTRACT.replace("ALM", "ZZ"), encoding="utf-8")

        code, out, _ = self.run_tool("outline", str(other))

        self.assertEqual(code, 0)
        self.assertIn("REQ-ZZ-003", out.splitlines()[-1])

    def test_next_free_id_skips_a_retired_id_still_written_in_a_mapping(self) -> None:
        self.contract.write_text(CONTRACT + "\nRetired: REQ-ALM-007 became REQ-ALM-002.\n", encoding="utf-8")

        _, out, _ = self.run_tool("outline", str(self.contract))

        self.assertIn("REQ-ALM-008", out.splitlines()[-1])

    def test_decide_changes_only_the_moved_entry(self) -> None:
        fenced = "```text\na\n\n\n\nb\n```\n"
        record = RECORD.replace("The alarm owner.\n", "The alarm owner.\n\n" + fenced)
        self.record.write_text(record.replace("\n", "\r\n"), encoding="utf-8", newline="")
        self.record.chmod(0o644)

        self.run_tool("decide", "Q-ALM-002", stdin="Five minutes.\n")

        after = self.record.read_bytes().decode("utf-8")
        self.assertIn(fenced.replace("\n", "\r\n"), after)
        self.assertNotIn("\n", after.replace("\r\n", ""))
        self.assertNotIn("\r\n\r\n\r\n", after.replace(fenced.replace("\n", "\r\n"), "fence\r\n"))
        self.assertEqual(self.record.stat().st_mode & 0o777, 0o644)
        removed = {"## Open", "### Q-ALM-002 - Snooze length", "How long is a snooze? Waiting on the alarm owner."}
        before_lines = [l for l in record.splitlines() if l.strip() and l not in removed]
        after_lines = [l for l in after.splitlines() if l.strip() and l not in {"### Q-ALM-002 - Snooze length", "Five minutes."}]
        self.assertEqual(sorted(before_lines), sorted(after_lines))


class OutlineTests(unittest.TestCase):
    def test_sections_end_before_the_next_heading_at_their_level_and_ignore_fenced_headings(self) -> None:
        lines = ["# A", "## B", "text", "```", "## not a heading", "```", "### C", "## D", "end"]

        sections = spec_lint.outline(lines)

        self.assertEqual([(s.title, s.start, s.end) for s in sections],
                         [("A", 1, 9), ("B", 2, 7), ("C", 7, 7), ("D", 8, 9)])


if __name__ == "__main__":
    unittest.main()
