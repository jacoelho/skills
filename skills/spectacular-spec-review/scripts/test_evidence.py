#!/usr/bin/env python3
"""Tests for the evidence map editor, checked against the linter it feeds."""
from __future__ import annotations

import contextlib
import io
import os
import stat
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent))
import evidence
import spec_lint

SYSTEM_TEMP = Path(tempfile.gettempdir()).resolve()
SCRIPT = Path(evidence.__file__).resolve()
CONTRACT = (
    "<!-- spec-lint: active -->\n\n"
    "### SRC-ALM-001 - Alarm specification\n\n"
    "### REQ-ALM-001\nStatement: The alarm service shall stop.\nBasis: SRC-ALM-001\n\n"
    "#### AC-ALM-001\nExpected: The alarm stops.\nBoundary: The alarm service API.\nSituation: The alarm rings.\nOracle: The alarm specification.\nCounterexample: The alarm keeps ringing.\n\n"
    "#### AC-ALM-002\nExpected: The alarm stays stopped.\nBoundary: The alarm service API.\nSituation: The alarm rings.\nOracle: The alarm specification.\nCounterexample: The alarm keeps ringing.\n"
)


class EvidenceTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory(dir=SYSTEM_TEMP)
        self.root = Path(self.temporary.name)
        self.addCleanup(self.temporary.cleanup)
        previous = Path.cwd()
        os.chdir(self.root)
        self.addCleanup(os.chdir, previous)
        (self.root / "specs" / "alarm").mkdir(parents=True)
        (self.root / "tests").mkdir()
        self.contract = Path("specs/alarm/alarm.md")
        self.contract.write_text(CONTRACT, encoding="utf-8")
        Path("tests/alarm_test.py").write_text(
            "def test_stop():\n    pass\n\ndef test_stays_stopped():\n    pass\n\nit(\"keeps | quiet\")\n",
            encoding="utf-8")
        Path("tests/alarm.feature").write_text("Feature: Alarm\n  Scenario: Stopping the alarm\n", encoding="utf-8")
        self.map = Path("specs/alarm/alarm.evidence.md")

    def run_cli(self, *argv: str, stdin: str = "") -> tuple[int, str]:
        output, errors = io.StringIO(), io.StringIO()
        self.addCleanup(setattr, sys, "stdin", sys.stdin)
        sys.stdin = io.StringIO(stdin)
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(errors):
            code = evidence.main(list(argv))
        return code, output.getvalue() + errors.getvalue()

    def lint(self) -> spec_lint.Result:
        return spec_lint.scan([self.root / "specs"])

    def rows(self) -> list[str]:
        return [line for line in self.map.read_text(encoding="utf-8").splitlines() if line.startswith("| AC-")]

    def test_add_creates_a_sorted_map_with_paths_relative_to_it(self) -> None:
        self.assertEqual(self.run_cli("add", str(self.contract), "AC-ALM-002", "tests/alarm_test.py", "test_stays_stopped")[0], 0)
        self.assertEqual(self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "keeps | quiet")[0], 0)
        self.assertEqual(self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm.feature", "Stopping the alarm")[0], 0)
        self.assertEqual(self.map.read_text(encoding="utf-8"), (
            "# alarm evidence\n\n| AC | File | Test |\n| --- | --- | --- |\n"
            "| AC-ALM-001 | ../../tests/alarm.feature | Stopping the alarm |\n"
            "| AC-ALM-001 | ../../tests/alarm_test.py | keeps \\| quiet |\n"
            "| AC-ALM-002 | ../../tests/alarm_test.py | test_stays_stopped |\n"
        ))
        result = self.lint()
        self.assertEqual(result.findings, [])
        self.assertEqual(len(result.evidence["AC-ALM-001"]), 2)

    def test_a_folder_contract_names_its_map_after_the_folder(self) -> None:
        folder = Path("specs/alarm/contract.md")
        self.contract.rename(folder)
        self.run_cli("add", str(folder), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        self.assertTrue(self.map.exists())

    def test_adding_a_listed_row_again_changes_nothing(self) -> None:
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        code, output = self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        self.assertEqual(code, 0)
        self.assertIn("already lists", output)
        self.assertEqual(len(self.rows()), 1)

    def test_add_rejects_a_row_the_linter_would_reject_and_writes_nothing(self) -> None:
        for argv in (("AC-ALM-001", "tests/gone_test.py", "test_stop"),
                     ("REQ-ALM-001", "tests/alarm_test.py", "test_stop"),
                     ("AC-ALM-009", "tests/alarm_test.py", "test_stop"),
                     ("AC-ALM-001", "tests/alarm_test.py", "test_sto"),
                     ("AC-ALM-001", "tests/alarm.feature", "Stopping")):
            with self.subTest(argv=argv):
                code, output = self.run_cli("add", str(self.contract), *argv)
                self.assertEqual(code, 1)
                self.assertIn("error:", output)
                self.assertFalse(self.map.exists())

    def test_remove_narrows_by_file_and_test(self) -> None:
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm.feature", "Stopping the alarm")
        self.run_cli("add", str(self.contract), "AC-ALM-002", "tests/alarm_test.py", "test_stays_stopped")
        self.assertEqual(self.run_cli("remove", str(self.contract), "AC-ALM-001", "tests/alarm_test.py")[0], 0)
        self.assertEqual(self.rows(), [
            "| AC-ALM-001 | ../../tests/alarm.feature | Stopping the alarm |",
            "| AC-ALM-002 | ../../tests/alarm_test.py | test_stays_stopped |",
        ])
        self.assertEqual(self.run_cli("remove", str(self.contract), "AC-ALM-001")[0], 0)
        self.assertEqual(len(self.rows()), 1)
        self.assertEqual(self.run_cli("remove", str(self.contract), "AC-ALM-001")[0], 1)

    def test_rename_updates_every_map_naming_the_test(self) -> None:
        other = Path("specs/other")
        other.mkdir()
        (other / "other.md").write_text(CONTRACT.replace("ALM", "OTH"), encoding="utf-8")
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        self.run_cli("add", str(other / "other.md"), "AC-OTH-001", "tests/alarm_test.py", "test_stop")
        Path("tests/alarm_test.py").write_text("def test_stop_now():\n    pass\n", encoding="utf-8")
        self.assertEqual(self.lint().findings[0].code, "evidence-test-missing")
        code, _ = self.run_cli("rename", "tests/alarm_test.py", "test_stop", "test_stop_now")
        self.assertEqual(code, 0)
        self.assertEqual(self.lint().findings, [])
        self.assertIn("test_stop_now", (other / "other.evidence.md").read_text(encoding="utf-8"))

    def test_move_repoints_rows_at_the_new_file(self) -> None:
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        Path("tests/unit").mkdir()
        Path("tests/alarm_test.py").rename("tests/unit/alarm_test.py")
        code, _ = self.run_cli("move", "tests/alarm_test.py", "tests/unit/alarm_test.py")
        self.assertEqual(code, 0)
        self.assertEqual(self.rows(), ["| AC-ALM-001 | ../../tests/unit/alarm_test.py | test_stop |"])
        self.assertEqual(self.lint().findings, [])

    def test_rename_or_move_with_no_matching_row_fails(self) -> None:
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        self.assertEqual(self.run_cli("rename", "tests/alarm_test.py", "test_absent", "test_stays_stopped")[0], 1)
        self.assertEqual(self.run_cli("move", "tests/alarm.feature", "tests/alarm_test.py")[0], 1)

    def test_rename_searches_specs_by_default_and_another_root_when_given(self) -> None:
        Path("docs/contracts").mkdir(parents=True)
        Path("specs/alarm").rename("docs/contracts/alarm")
        contract = Path("docs/contracts/alarm/alarm.md")
        self.run_cli("add", str(contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        Path("specs").rmdir()
        Path("tests/alarm_test.py").write_text("def test_stop_now():\n    pass\n", encoding="utf-8")
        code, output = self.run_cli("rename", "tests/alarm_test.py", "test_stop", "test_stop_now")
        self.assertEqual(code, 1)
        self.assertIn("--root", output)
        code, _ = self.run_cli("rename", "tests/alarm_test.py", "test_stop", "test_stop_now", "--root", "docs")
        self.assertEqual(code, 0)
        self.assertIn("test_stop_now", Path("docs/contracts/alarm/alarm.evidence.md").read_text(encoding="utf-8"))

    def test_a_test_name_is_matched_as_written_in_the_source(self) -> None:
        Path("tests/alarm.test.ts").write_text("it('keeps the alarm\\'s tone')\n", encoding="utf-8")
        code, output = self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm.test.ts", "keeps the alarm's tone")
        self.assertEqual(code, 1)
        self.assertIn("escapes included", output)
        code, output = self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm.test.ts", "keeps the alarm\\'s tone")
        self.assertEqual(code, 0)
        self.assertIn("'keeps the alarm\\'s tone'", output)
        self.assertEqual(self.lint().findings, [])

    def test_an_unchecked_part_is_recorded_replaced_and_cleared(self) -> None:
        self.run_cli("add", str(self.contract), "AC-ALM-002", "tests/alarm_test.py", "test_stays_stopped")
        self.assertEqual(self.run_cli("unchecked", str(self.contract), "AC-ALM-002", "Staying stopped | after a restart.")[0], 0)
        self.run_cli("unchecked", str(self.contract), "AC-ALM-001", "Checked by review only.")
        code, output = self.run_cli("unchecked", str(self.contract), "AC-ALM-001", "-",
                                    stdin="Checked by a nightly script.\n")
        self.assertEqual(code, 0)
        self.assertIn("replaced the unchecked part of AC-ALM-001, which read: Checked by review only.", output)
        self.assertEqual(self.map.read_text(encoding="utf-8"), (
            "# alarm evidence\n\n| AC | File | Test |\n| --- | --- | --- |\n"
            "| AC-ALM-002 | ../../tests/alarm_test.py | test_stays_stopped |\n"
            "\n| AC | Unchecked |\n| --- | --- |\n"
            "| AC-ALM-001 | Checked by a nightly script. |\n"
            "| AC-ALM-002 | Staying stopped \\| after a restart. |\n"
        ))
        self.assertEqual(self.lint().unchecked["AC-ALM-002"], "Staying stopped | after a restart.")
        self.assertEqual(self.run_cli("unchecked", str(self.contract), "AC-ALM-009", "Nothing.")[0], 1)
        self.assertEqual(self.run_cli("unchecked", str(self.contract), "AC-ALM-001", "--clear")[0], 0)
        self.assertEqual(self.run_cli("unchecked", str(self.contract), "AC-ALM-001", "--clear")[0], 1)
        self.assertNotIn("AC-ALM-001", self.map.read_text(encoding="utf-8"))

    def test_rename_and_move_refuse_a_name_the_target_file_lacks_and_change_no_map(self) -> None:
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        before = self.map.read_text(encoding="utf-8")
        self.assertEqual(self.run_cli("rename", "tests/alarm_test.py", "test_stop", "test_halt")[0], 1)
        Path("tests/other_test.py").write_text("def test_other():\n    pass\n", encoding="utf-8")
        self.assertEqual(self.run_cli("move", "tests/alarm_test.py", "tests/other_test.py")[0], 1)
        self.assertEqual(self.map.read_text(encoding="utf-8"), before)

    def test_fmt_sorts_and_dedupes_a_hand_edited_map(self) -> None:
        self.map.write_text(
            "# Alarm\n| AC | File | Test |\n|---|---|---|\n"
            "|AC-ALM-002|../../tests/alarm_test.py|test_stays_stopped|\n"
            "| AC-ALM-001 | ../../tests/alarm_test.py | test_stop |\n"
            "| AC-ALM-002 | ../../tests/alarm_test.py | test_stays_stopped |\n", encoding="utf-8")
        self.assertEqual(self.run_cli("fmt", str(self.map))[0], 0)
        self.assertEqual(self.map.read_text(encoding="utf-8"), (
            "# Alarm\n\n| AC | File | Test |\n| --- | --- | --- |\n"
            "| AC-ALM-001 | ../../tests/alarm_test.py | test_stop |\n"
            "| AC-ALM-002 | ../../tests/alarm_test.py | test_stays_stopped |\n"
        ))

    def test_add_from_standard_input_lists_every_row_at_once(self) -> None:
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        rows = ("AC-ALM-001\ttests/alarm_test.py\ttest_stop\n"
                "AC-ALM-001\ttests/alarm_test.py\tkeeps | quiet\r\n\n"
                "AC-ALM-002\ttests/alarm.feature\tStopping the alarm\n")
        code, output = self.run_cli("add", str(self.contract), "-", stdin=rows)
        self.assertEqual(code, 0, output)
        self.assertIn("added 2 row(s); 1 already listed", output)
        self.assertEqual(len(self.rows()), 3)
        self.assertEqual(self.lint().findings, [])

    def test_add_from_standard_input_reports_every_bad_line_and_adds_nothing(self) -> None:
        rows = ("AC-ALM-001\ttests/alarm_test.py\ttest_stop\n"
                "AC-ALM-009\ttests/alarm_test.py\ttest_stop\n"
                "AC-ALM-002\ttests/alarm_test.py\ttest_gone\n"
                "AC-ALM-002 tests/alarm_test.py test_stop\n")
        code, output = self.run_cli("add", str(self.contract), "-", stdin=rows)
        self.assertEqual(code, 1)
        for line in ("line 2: ", "line 3: ", "line 4: "):
            self.assertIn(line, output)
        self.assertNotIn("line 1: ", output)
        self.assertFalse(self.map.exists())

    def test_add_takes_a_whole_row_or_a_dash_alone(self) -> None:
        for argv in (("AC-ALM-001", "tests/alarm_test.py"), ("-", "tests/alarm_test.py", "test_stop")):
            with self.subTest(argv=argv), self.assertRaises(SystemExit), contextlib.redirect_stderr(io.StringIO()):
                evidence.main(["add", str(self.contract), *argv])

    def test_parallel_adds_to_one_map_keep_every_row(self) -> None:
        names = [f"test_case_{n}" for n in range(16)]
        Path("tests/many_test.py").write_text("".join(f"def {name}():\n    pass\n" for name in names), encoding="utf-8")
        workers = [subprocess.Popen([sys.executable, "-B", str(SCRIPT), "add", str(self.contract), "AC-ALM-001",
                                     "tests/many_test.py", name], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
                   for name in names]
        for worker in workers:
            output, _ = worker.communicate(timeout=60)
            self.assertEqual(worker.returncode, 0, output)
        self.assertEqual(len(self.rows()), len(names))
        self.assertEqual(self.lint().findings, [])

    def test_rename_rewrites_two_maps_in_one_directory(self) -> None:
        second = Path("specs/alarm/second.md")
        second.write_text(CONTRACT.replace("ALM", "SEC"), encoding="utf-8")
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        self.run_cli("add", str(second), "AC-SEC-001", "tests/alarm_test.py", "test_stop")
        Path("tests/alarm_test.py").write_text("def test_stop_now():\n    pass\n", encoding="utf-8")
        renamed = subprocess.run([sys.executable, "-B", str(SCRIPT), "rename", "tests/alarm_test.py", "test_stop",
                                  "test_stop_now"], capture_output=True, text=True, timeout=60)
        self.assertEqual(renamed.returncode, 0, renamed.stderr)
        self.assertEqual(self.lint().findings, [])

    def test_a_rewrite_keeps_the_map_mode_and_leaves_no_temporary_file(self) -> None:
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        os.chmod(self.map, 0o640)
        self.run_cli("add", str(self.contract), "AC-ALM-002", "tests/alarm_test.py", "test_stays_stopped")
        self.assertEqual(stat.S_IMODE(self.map.stat().st_mode), 0o640)
        self.assertEqual(sorted(path.name for path in self.map.parent.iterdir()), ["alarm.evidence.md", "alarm.md"])

    def test_a_failed_save_leaves_the_map_unchanged_and_no_temporary_file(self) -> None:
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        before = self.map.read_text(encoding="utf-8")
        with mock.patch.object(evidence.os, "replace", side_effect=OSError("disk full")):
            code, output = self.run_cli("add", str(self.contract), "AC-ALM-002", "tests/alarm_test.py", "test_stays_stopped")
        self.assertEqual(code, 1)
        self.assertIn("disk full", output)
        self.assertEqual(self.map.read_text(encoding="utf-8"), before)
        self.assertEqual(sorted(path.name for path in self.map.parent.iterdir()), ["alarm.evidence.md", "alarm.md"])

    def test_unwritable_text_is_an_error_and_leaves_no_temporary_file(self) -> None:
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        before = self.map.read_text(encoding="utf-8")
        code, output = self.run_cli("unchecked", str(self.contract), "AC-ALM-001", "bad \udcff byte")
        self.assertEqual(code, 1)
        self.assertIn("left unchanged", output)
        self.assertEqual(self.map.read_text(encoding="utf-8"), before)
        self.assertEqual(sorted(path.name for path in self.map.parent.iterdir()), ["alarm.evidence.md", "alarm.md"])

    def test_rename_includes_a_map_created_while_it_was_locking(self) -> None:
        late = Path("specs/late")
        late.mkdir()
        (late / "late.md").write_text(CONTRACT.replace("ALM", "LAT"), encoding="utf-8")
        self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        Path("tests/alarm_test.py").write_text("def test_stop():\n    pass\ndef test_stop_now():\n    pass\n",
                                               encoding="utf-8")
        listing = evidence.maps_under
        calls = []

        def listing_that_misses_the_late_map_once(root: Path) -> list[Path]:
            calls.append(root)
            if len(calls) == 1:
                return listing(root)
            if len(calls) == 2:
                evidence.add(late / "late.md", "AC-LAT-001", Path("tests/alarm_test.py"), "test_stop")
            return listing(root)

        with mock.patch.object(evidence, "maps_under", listing_that_misses_the_late_map_once):
            code, output = self.run_cli("rename", "tests/alarm_test.py", "test_stop", "test_stop_now")
        self.assertEqual(code, 0, output)
        self.assertIn("test_stop_now", (late / "late.evidence.md").read_text(encoding="utf-8"))
        self.assertIn("test_stop_now", self.map.read_text(encoding="utf-8"))

    def test_fmt_refuses_a_map_that_does_not_exist(self) -> None:
        code, output = self.run_cli("fmt", "specs/alarm/typo.evidence.md")
        self.assertEqual(code, 1)
        self.assertFalse(Path("specs/alarm/typo.evidence.md").exists())

    def test_a_malformed_map_is_left_unchanged(self) -> None:
        broken = "# Alarm\n\n| AC | File | Test |\n| --- | --- | --- |\nnot a row\n"
        self.map.write_text(broken, encoding="utf-8")
        code, output = self.run_cli("add", str(self.contract), "AC-ALM-001", "tests/alarm_test.py", "test_stop")
        self.assertEqual(code, 1)
        self.assertIn("left unchanged", output)
        self.assertEqual(self.map.read_text(encoding="utf-8"), broken)


if __name__ == "__main__":
    unittest.main()
