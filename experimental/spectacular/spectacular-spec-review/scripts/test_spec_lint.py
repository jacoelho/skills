#!/usr/bin/env python3
"""Regression tests for declaration, EARS, and traceability contracts."""
from __future__ import annotations

import contextlib
import io
import json
import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import spec_lint  # noqa: E402


SYSTEM_TEMP = Path(tempfile.gettempdir()).resolve()


class SpecLintTests(unittest.TestCase):
    def temporary_root(self) -> tempfile.TemporaryDirectory[str]:
        return tempfile.TemporaryDirectory(dir=SYSTEM_TEMP)

    def document(self, statement: str, *, kind: str = "REQ", status: str = "accepted") -> str:
        return (
            "<!-- spec-lint: active -->\n\n"
            f"### {kind}-TEST-001\nStatus: {status}\nStatement: {statement}\n"
            "Basis: Authorised test contract.\n\n"
            "### AC-TEST-001\n"
            f"Covers: {kind}-TEST-001\nExpected: The agreed observation.\n"
        )

    def scan_text(self, text: str) -> spec_lint.Result:
        with self.temporary_root() as name:
            path = Path(name) / "contract.md"
            path.write_text(text, encoding="utf-8")
            return spec_lint.scan([path])

    def test_accepts_all_ordered_clause_combinations(self) -> None:
        statements = (
            "The alarm service shall stop.",
            "When a stop command arrives, the alarm service shall stop.",
            "If power fails, then the alarm service shall stop.",
            "While maintenance is active, the alarm service shall stop.",
            "While maintenance is active, when a stop command arrives, the alarm service shall stop.",
            "While maintenance is active, if power fails, then the alarm service shall stop.",
            "Where a stop function is included, the alarm service shall stop.",
            "Where a stop function is included, when a stop command arrives, the alarm service shall stop.",
            "Where a stop function is included, if power fails, then the alarm service shall stop.",
            "Where a stop function is included, while maintenance is active, the alarm service shall stop.",
            "Where a stop function is included, while maintenance is active, when a stop command arrives, the alarm service shall stop.",
            "Where a stop function is included, while maintenance is active, if power fails, then the alarm service shall stop.",
        )
        for statement in statements:
            for status in ("proposed", "accepted"):
                with self.subTest(statement=statement, status=status):
                    result = self.scan_text(self.document(statement, status=status))
                    self.assertEqual(result.findings, [])
                    self.assertEqual(result.exit_code(strict=True), 0)

    def test_accepts_literal_data_and_coupled_responses(self) -> None:
        statements = (
            "The alarm service shall not emit a signal.",
            "If power fails,\tthen  the alarm service\tshall  stop.",
            "When cancellation succeeds, the booking service shall atomically cancel the booking and release one reserved unit.",
            "The meter shall report values with an error below 1.5 percent.",
            "The client shall use protocol v1.2.3 at https://example.test/v1.",
            'The display shall show "If power fails, then the alarm shall stop. Retry?".',
            "The client shall request `https://example.test/v1?mode=fast`.",
            'When the message "alert, when armed" arrives, the alarm service shall stop.',
            'The display shall show "the \\"alarm\\" shall stop!".',
            "When the user's request arrives, the alarm service shall stop.",
            "When alpha, beta, and gamma arrive, the alarm service shall stop.",
            "The glossary shall explain the words may and must.",
            "When a lookup response is returned, the lookup service shall return either a current cached value or a recomputed value.",
        )
        for statement in statements:
            with self.subTest(statement=statement):
                result = self.scan_text(self.document(statement))
                self.assertEqual(result.findings, [])

    def test_rejects_invalid_ears_for_each_requirement_status_and_kind(self) -> None:
        statements = (
            "An alarm can stop.",
            "The alarm service MUST stop.",
            "The alarm service may stop.",
            "The alarm service SHALL stop.",
            "the alarm service shall stop.",
            "The shall stop.",
            'The "" shall stop.',
            "The alarm service shall.",
            'The alarm service shall "".',
            'When "  ", the alarm service shall stop.',
            "The alarm service shall not.",
            "The alarm service shall Not emit a signal.",
            'The "alarm service"shall stop.',
            'The alarm service shall"stop".',
            "When, the alarm service shall stop.",
            "If, then the alarm service shall stop.",
            "While, the alarm service shall stop.",
            "Where, the alarm service shall stop.",
            "When a command arrives the alarm service shall stop.",
            "If power fails, the alarm service shall stop.",
            "When a command arrives, then the alarm service shall stop.",
            "When a command arrives, The alarm service shall stop.",
            "WHEN a command arrives, the alarm service shall stop.",
            "Where a feature is included, While maintenance is active, the alarm service shall stop.",
            "When a command arrives, while maintenance is active, the alarm service shall stop.",
            "While maintenance is active, where a feature is included, the alarm service shall stop.",
            "While maintenance is active, while power is available, the alarm service shall stop.",
            "Where a feature is included, where another feature is included, the alarm service shall stop.",
            "When a command arrives, when another command arrives, the alarm service shall stop.",
            "When a command arrives, if power fails, then the alarm service shall stop.",
            "If power fails, when a command arrives, then the alarm service shall stop.",
            "If power fails, Then the alarm service shall stop.",
            "The alarm service shall stop",
            "The alarm service shall stop. The alarm service shall start.",
            "The alarm service shall stop. Extra commentary is present.",
            "The alarm service shall stop!.",
            "The alarm service shall use e.g. a quiet signal.",
            'The alarm service shall display "an unfinished literal.',
            "The alarm service shall display `an unfinished literal.",
            "The alarm service shall stop and shall start.",
        )
        for statement in statements:
            for kind in ("REQ", "INV"):
                for status in ("proposed", "accepted"):
                    with self.subTest(statement=statement, kind=kind, status=status):
                        result = self.scan_text(self.document(statement, kind=kind, status=status))
                        self.assertEqual(result.exit_code(), 1)
                        errors = [finding for finding in result.findings if finding.code == "invalid-ears"]
                        self.assertEqual(len(errors), 1)
                        self.assertEqual(errors[0].line, 5)
                        self.assertEqual(errors[0].severity, "error")

    def test_invariants_allow_configuration_and_state_but_not_activation(self) -> None:
        accepted = (
            "The booking service shall keep stock non-negative.",
            "While maintenance is active, the alarm service shall not emit a signal.",
            "Where an audit feature is included, the audit service shall retain all committed events.",
            "Where an audit feature is included, while maintenance is active, the audit service shall retain all committed events.",
        )
        rejected = (
            "When a stop command arrives, the alarm service shall stop.",
            "If power fails, then the alarm service shall stop.",
            "While maintenance is active, when a stop command arrives, the alarm service shall stop.",
            "Where a stop function is included, if power fails, then the alarm service shall stop.",
        )
        for statement in accepted:
            with self.subTest(statement=statement):
                self.assertEqual(self.scan_text(self.document(statement, kind="INV")).findings, [])
        for statement in rejected:
            with self.subTest(statement=statement):
                result = self.scan_text(self.document(statement, kind="INV"))
                self.assertEqual(result.exit_code(), 1)
                self.assertIn("invalid-ears", [finding.code for finding in result.findings])

    def test_unsupported_declarations_cannot_hide_beside_a_valid_contract(self) -> None:
        declarations = (
            " ### REQ-HIDDEN-001",
            "  ### REQ-HIDDEN-001",
            "   ### REQ-HIDDEN-001",
            "### **REQ-HIDDEN-001**",
            "### `REQ-HIDDEN-001`",
            "> ### REQ-HIDDEN-001",
            "1. ### REQ-HIDDEN-001",
            "> > ### REQ-HIDDEN-001",
            "- > ### REQ-HIDDEN-001",
            "<h3>REQ-HIDDEN-001</h3>",
        )
        valid = self.document("The alarm service shall stop.")
        for declaration in declarations:
            with self.subTest(declaration=declaration):
                text = valid + "\n" + declaration + "\nRationale: Unresolved obligation.\n"
                result = self.scan_text(text)
                self.assertEqual(result.exit_code(), 1)
                self.assertIn("unsupported-declaration", [finding.code for finding in result.findings])
        tables = (
            "\n| ID | Statement |\n| --- | --- |\n| REQ-HIDDEN-001 | An alarm can stop. |\n",
            "\nID | Statement\n--- | ---\nREQ-HIDDEN-001 | An alarm can stop.\n",
            "\n| ID | `Statement` |\n| --- | --- |\n| REQ-HIDDEN-001 | An alarm can stop. |\n",
        )
        for table in tables:
            with self.subTest(table=table):
                result = self.scan_text(valid + table)
                self.assertEqual(result.exit_code(), 1)
                self.assertIn("unsupported-field", [finding.code for finding in result.findings])

    def test_malformed_fields_and_continuations_cannot_bypass_validation(self) -> None:
        fields = (
            " Statement: The alarm service shall stop.",
            "\tStatement: The alarm service shall stop.",
            "- Statement: The alarm service shall stop.",
            "> Statement: The alarm service shall stop.",
            "<p>Statement: The alarm service shall stop.</p>",
            "statement: The alarm service shall stop.",
            "Statement : The alarm service shall stop.",
        )
        valid = self.document("The alarm service shall stop.")
        prefix = valid + "\n### REQ-HIDDEN-001\nStatus: proposed\n"
        for field in fields:
            with self.subTest(field=field):
                result = self.scan_text(prefix + field + "\n")
                self.assertEqual(result.exit_code(), 1)
                self.assertIn("unsupported-field", [finding.code for finding in result.findings])
        for continuation in ("It may also start.", "  It may also start.", "\nIt may also start."):
            with self.subTest(continuation=continuation):
                text = prefix + "Statement: The alarm service shall stop.\n" + continuation + "\n"
                result = self.scan_text(text)
                self.assertEqual(result.exit_code(), 1)
                self.assertIn("statement-continuation", [finding.code for finding in result.findings])

    def test_examples_and_narrative_references_remain_outside_requirement_validation(self) -> None:
        text = self.document("The alarm service shall stop.") + (
            "\nREQ-TEST-001 governs this example.\n"
            "\n| Rule reference | Expected |\n| --- | --- |\n| REQ-TEST-001 | Stopped |\n"
            "| REQ-TEST-001 | The text `| Statement |` |\n"
            "\n```markdown\n### REQ-HIDDEN-001\nStatement: An alarm can stop.\n```\n"
            "\n### Notes\nRationale: Statement: is the name of a field.\n"
            "Rationale: The imported source uses `| Statement |` as its header spelling.\n"
        )
        result = self.scan_text(text)
        self.assertEqual(result.findings, [])
        self.assertEqual(result.declarations, 2)

    def test_only_requirements_and_invariants_can_define_statements(self) -> None:
        text = self.document("The alarm service shall stop.") + "Statement: The alarm service shall start.\n"
        result = self.scan_text(text)
        self.assertEqual(result.exit_code(), 1)
        self.assertIn("invalid-statement-owner", [finding.code for finding in result.findings])

    def test_formatted_known_fields_are_rejected_after_basis(self) -> None:
        fields = (
            "**Statement:** At most 256 linked notes may belong to one activity subtree.",
            "**Statement**: At most 256 linked notes may belong to one activity subtree.",
            "*Statement:* An absent target returns 404.",
            "_Statement_: An absent target returns 404.",
            "`Statement:` An absent target returns 404.",
            "`Statement`: An absent target returns 404.",
            "**`Statement:`** An absent target returns 404.",
            "> **Statement:** An absent target returns 404.",
            "- `Statement`: An absent target returns 404.",
            "1. **Statement:** An absent target returns 404.",
            "<strong>Statement</strong>: An absent target returns 404.",
            "[Statement](https://example.test/rules): An absent target returns 404.",
            "[Statement][owner]: An absent target returns 404.",
            "[Statement][]: An absent target returns 404.",
            "[Statement](https://example.test/rule_(one)): An absent target returns 404.",
            r"[Statement](https://example.test/rule_\(one\)): An absent target returns 404.",
            '**[Statement](https://example.test/rules)**: An absent target returns 404.',
            '[Statement](https://example.test/rule_(one) "owner: (old)"): An absent target returns 404.',
            "[Statement:][owner] An absent target returns 404.",
            "[Statement:](https://example.test/rules) An absent target returns 404.",
            "**Status:** accepted",
            "*Basis*: Authorised decision.",
            "`References`: REQ-OTHER-001",
            "**Covers**: REQ-OTHER-001",
            "_Expected_: Status 404.",
        )
        for field in fields:
            with self.subTest(field=field):
                text = self.document("The notes service shall limit each activity subtree to 256 linked notes.")
                text = text.replace("Basis: Authorised test contract.\n", "Basis: Authorised test contract.\n" + field + "\n")
                result = self.scan_text(text)
                self.assertEqual(result.exit_code(strict=True), 1)
                self.assertEqual(result.declarations, 2)
                self.assertEqual([(f.code, f.line) for f in result.findings], [("unsupported-field", 7)])

    def test_field_mentions_and_unrelated_formatting_remain_commentary(self) -> None:
        comments = (
            "Rationale: The **Statement:** label is plain in maintained requirements.",
            "Rationale: The `Statement:` field contains the obligation.",
            "The **Statement:** label identifies the obligation.",
            "The `Statement:` label identifies the obligation.",
            "**Statement quality:** A review observation.",
            "**Context:** A review observation.",
            "[Statement](https://example.test/rule_(one)) explains the field.",
            "[Statement][owner] explains the field.",
            "Rationale: [Statement](https://example.test/rules): the governing rule.",
            "[Context](https://example.test/rules): A review observation.",
        )
        for comment in comments:
            with self.subTest(comment=comment):
                text = self.document("The notes service shall limit each activity subtree to 256 linked notes.")
                text = text.replace("Basis: Authorised test contract.\n", "Basis: Authorised test contract.\n" + comment + "\n")
                result = self.scan_text(text)
                self.assertEqual(result.findings, [])
                self.assertEqual(result.declarations, 2)

    def test_formatted_statement_table_headers_are_rejected(self) -> None:
        labels = (
            "[Statement](https://example.test/rule_(one))",
            "[Statement][owner]",
            "[Statement][]",
            "<strong>Statement</strong>",
            "**[Statement](https://example.test/rules)**",
            "`Statement`",
        )
        for label in labels:
            for outer_pipes in (False, True):
                with self.subTest(label=label, outer_pipes=outer_pipes):
                    table = f"ID | {label}\n--- | ---\nREQ-TEST-001 | An absent target returns 404.\n"
                    if outer_pipes:
                        table = "\n".join("| " + line + " |" for line in table.splitlines()) + "\n"
                    text = self.document("The notes service shall withhold inaccessible notes.") + "\n" + table
                    result = self.scan_text(text)
                    self.assertEqual(result.exit_code(strict=True), 1)
                    self.assertEqual(result.declarations, 2)
                    self.assertEqual([(f.code, f.line) for f in result.findings], [("unsupported-field", 12)])
        illustrative = self.document("The notes service shall withhold inaccessible notes.") + (
            "\n| Rule reference | Expected |\n| --- | --- |\n"
            "| [REQ-TEST-001](https://example.test/rules) | `[Statement](url): literal` |\n"
        )
        self.assertEqual(self.scan_text(illustrative).findings, [])

    def test_statement_headers_respect_table_cell_boundaries(self) -> None:
        rejected = (
            "| **Statement** |\n| - |\n",
            "| Statement |\n| - |\n",
            "| Statement: Free-form policy. |\n",
            "**Statement**\n| - |\n",
            "**Statement**\n:-:\n",
            "ID | [Statement](url)\n- | :--:\n",
            r"ID \| code | **Statement**" + "\n- | -\n",
            r"ID \\| **Statement**" + "\n- | -\n",
            r"| [Statement](https://example.test/a\|b) | Value |" + "\n| --- | --- |\n",
            "| `Statement` |\n:-:\n",
        )
        accepted = (
            "**Statement**\n---\n",
            "| Statement |\n---\n",
            "| Statement |\n===\n",
            "| `Statement` |\n---\n",
            "| `Statement` |\n-\n",
            r"ID \| **Statement**" + "\n- | -\n",
            "ID | **Statement** | Other\n--- | ---\n",
            "| Rule | Expected |\n| - | - |\n"
            + r"| REQ-TEST-001 | `Statement: a\|b` |" + "\n",
        )
        for table in rejected + accepted:
            with self.subTest(table=table):
                text = self.document("The notes service shall withhold inaccessible notes.") + "\n" + table
                result = self.scan_text(text)
                expected = [("unsupported-field", 12)] if table in rejected else []
                self.assertEqual([(f.code, f.line) for f in result.findings], expected)
                self.assertEqual(result.declarations, 2)
                self.assertEqual(result.exit_code(strict=True), int(table in rejected))

    def test_table_header_requires_physical_adjacency(self) -> None:
        for gap in ("", "\n", "```text\nStatement: a literal example.\n```\n"):
            with self.subTest(gap=gap):
                text = self.document("The notes service shall withhold inaccessible notes.") + (
                    "\nID | **Statement**\n" + gap + "--- | ---\n"
                )
                result = self.scan_text(text)
                expected = [("unsupported-field", 12)] if not gap else []
                self.assertEqual([(f.code, f.line) for f in result.findings], expected)
                self.assertEqual(result.declarations, 2)

    def test_table_context_distinguishes_body_rows_from_setext_headings(self) -> None:
        prefix = "| Field |\n| --- |\n"
        field = "| Statement: The alarm may restart. |\n"
        cases = (
            (prefix + field + "---\n", 14),
            (prefix + field + "===\n", 14),
            (prefix + "\n" + field + "---\n", None),
            (prefix + "```text\nA literal example.\n```\n" + field + "---\n", None),
            (prefix + "### Commentary\n" + field + "---\n", None),
            (prefix + "| `Statement: The alarm may restart.` |\n---\n", None),
            (prefix + '| "Statement: The alarm may restart." |\n---\n', None),
            (prefix + "`Statement: The alarm may restart.`\n", None),
            (prefix + '"Statement: The alarm may restart."\n', None),
            (prefix + "**Statement**: The alarm may restart.\n", 14),
            (prefix + "[Statement](url): The alarm may restart.\n", 14),
            (prefix + "Ordinary body text\n" + field + "---\n", 15),
            ("Field | Expected\n- | -\nvalue | Statement: The alarm may restart.\n---\n", 14),
            (prefix + "---\n" + field + "---\n", None),
            (prefix + "===\n" + field + "---\n", 15),
        )
        for table, error_line in cases:
            with self.subTest(table=table):
                result = self.scan_text(self.document("The alarm service shall stop.") + "\n" + table)
                expected = [("unsupported-field", error_line)] if error_line is not None else []
                self.assertEqual([(f.code, f.line) for f in result.findings], expected)
                self.assertEqual(result.declarations, 2)
                self.assertEqual(result.exit_code(strict=True), int(error_line is not None))

    def test_table_content_cannot_supply_declaration_fields(self) -> None:
        requirement = "<!-- spec-lint: active -->\n## REQ-TEST-001\n"
        acceptance = "\n## AC-TEST-001\nCovers: REQ-TEST-001\nExpected: The alarm stops.\n"
        missing_statement = requirement + "Status: proposed\nRationale: A table follows.\n"
        cases = (
            (missing_statement + "| Field |\n| --- |\nStatement: The alarm service shall stop.\n"
             + acceptance, 7, "missing-statement", 2),
            (missing_statement + "Statement: The alarm service shall stop.\n| --- |\n"
             + acceptance, 5, "missing-statement", 2),
            (requirement + "Statement: The alarm service shall stop.\nRationale: A table follows.\n"
             "| Field |\n| --- |\nStatus: proposed\n" + acceptance, 7, "invalid-status", 2),
            (requirement + "Status: proposed\nStatement: The alarm service shall stop.\nRationale: A rule.\n"
             "\n## AC-TEST-001\nCovers: REQ-TEST-001\nRationale: A table follows.\n"
             "| Field |\n| --- |\nExpected: The alarm stops.\n", 12, "missing-expected", 7),
        )
        for text, error_line, missing_code, declaration_line in cases:
            with self.subTest(text=text):
                result = self.scan_text(text)
                self.assertEqual({(f.code, f.line) for f in result.findings}, {
                    ("unsupported-field", error_line), (missing_code, declaration_line),
                })
                self.assertEqual(len(result.findings), 2)
                self.assertEqual(result.declarations, 2)
                self.assertEqual(result.exit_code(strict=True), 1)

    def test_malformed_backtick_openers_do_not_hide_declarations(self) -> None:
        openers = ("```json `response`", "```json response`", "``` `json", "````json `response`")
        for opener in openers:
            with self.subTest(opener=opener):
                text = self.document("The notes service shall limit each activity subtree to 256 linked notes.") + (
                    "\n" + opener + "\n"
                    "### REQ-NOTE-001\nStatus: proposed\n"
                    "Statement: An absent, inaccessible or mismatched target returns the common 404.\n"
                    "```\n"
                )
                result = self.scan_text(text)
                self.assertEqual(result.exit_code(strict=True), 1)
                self.assertEqual(result.active_documents, 1)
                self.assertEqual(result.declarations, 3)
                self.assertEqual([(f.code, f.line) for f in result.findings if f.code == "invalid-fence"], [("invalid-fence", 12)])
                self.assertEqual([(f.code, f.line) for f in result.findings if f.code == "invalid-ears"], [("invalid-ears", 15)])

    def test_malformed_opener_before_marker_preserves_active_scope(self) -> None:
        text = "```json `response`\n" + self.document("The notes service shall withhold inaccessible notes.")
        result = self.scan_text(text)
        self.assertEqual(result.active_documents, 1)
        self.assertEqual(result.declarations, 2)
        self.assertEqual([(f.code, f.line) for f in result.findings], [("invalid-fence", 1)])
        unmarked = text.replace("<!-- spec-lint: active -->\n", "")
        skipped = self.scan_text(unmarked)
        self.assertEqual(skipped.active_documents, 0)
        self.assertEqual(skipped.skipped_documents, 1)
        self.assertEqual(skipped.declarations, 0)
        self.assertEqual([f.code for f in skipped.findings], ["no-active-documents"])

    def test_valid_fences_preserve_literal_examples_and_later_declarations(self) -> None:
        fences = (("```json", "```"), ("~~~json `response`", "~~~"), ("````json", "````"))
        for opener, closer in fences:
            with self.subTest(opener=opener):
                text = self.document("The notes service shall withhold inaccessible notes.") + (
                    "\n" + opener + "\n"
                    "### REQ-HIDDEN-001\nStatus: proposed\nStatement: An absent target returns 404.\n"
                    "**Statement:** A literal example.\n"
                    "```json `response`\n" + closer + "\n"
                    "### REQ-AFTER-001\nStatus: proposed\n"
                    "Statement: The notes service shall withhold inaccessible notes.\n"
                )
                result = self.scan_text(text)
                self.assertEqual(result.findings, [])
                self.assertEqual(result.declarations, 3)

    def test_cli_reports_formatted_field_and_visible_requirement_after_invalid_fence(self) -> None:
        script = Path(spec_lint.__file__).resolve()
        text = (
            "<!-- spec-lint: active -->\n"
            "### REQ-NOTE-003\nStatus: proposed\n"
            "Statement: The notes service shall limit each activity subtree to 256 linked notes.\n"
            "Basis: Existing note-subtree limit.\n"
            "**Statement:** At most 256 linked notes may belong to one activity subtree.\n"
            "```json `response`\n"
            "### REQ-NOTE-001\nStatus: proposed\n"
            "Statement: An absent target returns 404.\n"
        )
        with self.temporary_root() as name:
            root = Path(name)
            path = root / "contract.md"
            path.write_text(text, encoding="utf-8")
            rejected = subprocess.run(
                [sys.executable, "-B", str(script), str(path), "--json", "--strict"],
                cwd=root, text=True, capture_output=True, check=False, timeout=10,
            )
            self.assertEqual(rejected.returncode, 1)
            report = json.loads(rejected.stdout)
            self.assertEqual(report["active_documents"], 1)
            self.assertEqual(report["declarations"], 2)
            self.assertEqual({(f["code"], f["line"]) for f in report["findings"]}, {
                ("unsupported-field", 6), ("invalid-fence", 7), ("invalid-ears", 10),
            })
            self.assertTrue(all(f["path"] == str(path) for f in report["findings"]))

    def test_cli_enforces_ears_with_located_json_diagnostics(self) -> None:
        script = Path(spec_lint.__file__).resolve()
        with self.temporary_root() as name:
            root = Path(name)
            path = root / "contract.md"
            path.write_text(self.document("An alarm can stop."), encoding="utf-8")
            rejected = subprocess.run(
                [sys.executable, "-B", str(script), str(path), "--json"],
                cwd=root, text=True, capture_output=True, check=False,
            )
            self.assertEqual(rejected.returncode, 1)
            findings = json.loads(rejected.stdout)["findings"]
            self.assertEqual(len(findings), 1)
            self.assertEqual(findings[0]["code"], "invalid-ears")
            self.assertEqual(findings[0]["path"], str(path))
            self.assertEqual(findings[0]["line"], 5)
            self.assertIn("shall", findings[0]["message"])
            path.write_text(self.document("The alarm service shall stop."), encoding="utf-8")
            accepted = subprocess.run(
                [sys.executable, "-B", str(script), str(path), "--json", "--strict"],
                cwd=root, text=True, capture_output=True, check=False,
            )
            self.assertEqual(accepted.returncode, 0)
            self.assertEqual(json.loads(accepted.stdout)["findings"], [])

    def test_reports_active_skipped_and_unsupported_entries(self) -> None:
        with self.temporary_root() as root_name:
            root = Path(root_name)
            (root / "active.md").write_text(
                """<!-- spec-lint: active -->

### REQ-BOOK-001 — Cancel
Status: accepted
Statement: When a pending booking is cancelled, the booking service shall change its state to cancelled.
Basis: DEC-BOOK-001.

### AC-BOOK-001 — Cancelled booking
Covers: REQ-BOOK-001
Expected: The booking is cancelled.
""",
                encoding="utf-8",
            )
            (root / "history.md").write_text("# Historical\n", encoding="utf-8")
            (root / "notes.txt").write_text("not Markdown\n", encoding="utf-8")
            (root / ".hidden.md").write_text(
                "<!-- spec-lint: active -->\n### REQ-HIDDEN-001\n", encoding="utf-8"
            )
            (root / ".hidden-dir").mkdir()
            (root / ".hidden-dir" / "secret.md").write_text(
                "<!-- spec-lint: active -->\n### REQ-SECRET-001\n", encoding="utf-8"
            )
            try:
                (root / "link.md").symlink_to(root / "active.md")
            except OSError:
                expected_symlinks = 0
            else:
                expected_symlinks = 1

            result = spec_lint.scan([root])

        self.assertEqual(result.active_documents, 1)
        self.assertEqual(result.skipped_documents, 1)
        self.assertEqual(result.skipped_non_markdown, 1)
        self.assertEqual(result.skipped_hidden, 2)
        self.assertEqual(result.skipped_symlinks, expected_symlinks)
        self.assertEqual(result.unsupported_inputs, 0)
        self.assertEqual(result.declarations, 2)
        self.assertEqual(result.exit_code(), 0)

    def test_rejects_an_explicit_unsupported_input(self) -> None:
        with self.temporary_root() as root_name:
            path = Path(root_name) / "notes.txt"
            path.write_text("not Markdown\n", encoding="utf-8")

            result = spec_lint.scan([path])

        self.assertEqual(result.unsupported_inputs, 1)
        self.assertEqual(result.active_documents, 0)
        self.assertEqual(result.exit_code(), 2)
        self.assertEqual([finding.code for finding in result.findings], ["input-error", "no-active-documents"])

    @unittest.skipUnless(hasattr(os, "mkfifo"), "Requires named pipes")
    def test_cli_rejects_special_files_without_reading_them(self) -> None:
        with self.temporary_root() as root_name:
            root = Path(root_name)
            nested = root / "nested"
            nested.mkdir()
            active = root / "active.md"
            active.write_text(self.document("The alarm service shall stop."), encoding="utf-8")
            (root / "notes.txt").write_text("Commentary\n", encoding="utf-8")
            fifo = nested / "queue.md"
            non_markdown_fifo = nested / "queue.txt"
            os.mkfifo(fifo)
            os.mkfifo(non_markdown_fifo)
            for inputs, rejected, skipped in (
                ([root, nested, root, fifo], {fifo, non_markdown_fifo}, 1),
                ([active, fifo, fifo], {fifo}, 0),
            ):
                with self.subTest(inputs=inputs):
                    process = subprocess.run(
                        [sys.executable, "-B", str(Path(spec_lint.__file__).resolve()),
                         *(str(path) for path in inputs), "--json", "--strict"],
                        text=True, capture_output=True, check=False, timeout=10,
                    )
                    self.assertEqual(process.returncode, 2, process.stderr)
                    report = json.loads(process.stdout)
                    self.assertEqual(report["active_documents"], 1)
                    self.assertEqual(report["declarations"], 2)
                    self.assertEqual(report["unsupported_inputs"], len(rejected))
                    self.assertEqual(report["skipped_non_markdown"], skipped)
                    self.assertEqual(
                        {(f["code"], f["path"], f["line"]) for f in report["findings"]},
                        {("input-error", str(path), 0) for path in rejected},
                    )
                    self.assertEqual(len(report["findings"]), len(rejected))

    def test_nested_heading_does_not_extend_a_declaration(self) -> None:
        with self.temporary_root() as root_name:
            path = Path(root_name) / "contract.md"
            path.write_text(
                """<!-- spec-lint: active -->

### REQ-BOOK-001 — Cancel
Status: accepted
Statement: When a pending booking is cancelled, the booking service shall change its state to cancelled.
Basis: DEC-BOOK-001.

#### Rationale
Status: historical prose, not a second field.

### AC-BOOK-001 — Cancelled booking
Covers: REQ-BOOK-001
Expected: The booking is cancelled.
""",
                encoding="utf-8",
            )

            result = spec_lint.scan([path])

        self.assertNotIn("duplicate-field", [finding.code for finding in result.findings])
        self.assertIn("unsupported-field", [finding.code for finding in result.findings])
        self.assertEqual(result.declarations, 2)
        self.assertEqual(result.exit_code(), 1)

    def test_overlapping_roots_count_skipped_entries_once(self) -> None:
        with self.temporary_root() as root_name:
            root = Path(root_name)
            nested = root / "nested"
            nested.mkdir()
            (nested / "active.md").write_text(
                """<!-- spec-lint: active -->

### REQ-BOOK-001
Status: proposed
Statement: When a pending booking is cancelled, the booking service shall change its state to cancelled.
""",
                encoding="utf-8",
            )
            (nested / "history.md").write_text("# Historical\n", encoding="utf-8")
            (nested / "notes.txt").write_text("not Markdown\n", encoding="utf-8")
            (nested / ".hidden.md").write_text(
                "<!-- spec-lint: active -->\n### REQ-HIDDEN-001\n", encoding="utf-8"
            )

            result = spec_lint.scan([root, nested])

        self.assertEqual(result.active_documents, 1)
        self.assertEqual(result.skipped_documents, 1)
        self.assertEqual(result.skipped_non_markdown, 1)
        self.assertEqual(result.skipped_hidden, 1)
        self.assertEqual(result.declarations, 1)
        self.assertEqual(result.exit_code(), 0)

    def test_indented_marker_is_not_an_opt_in_marker(self) -> None:
        with self.temporary_root() as root_name:
            path = Path(root_name) / "template.md"
            path.write_text(
                "    <!-- spec-lint: active -->\n### REQ-BOOK-001\n",
                encoding="utf-8",
            )

            result = spec_lint.scan([path])

        self.assertEqual(result.active_documents, 0)
        self.assertEqual(result.skipped_documents, 1)
        self.assertEqual(result.exit_code(), 2)

    def test_text_summary_reports_all_input_categories(self) -> None:
        with self.temporary_root() as root_name:
            root = Path(root_name)
            (root / "contract.md").write_text(
                """<!-- spec-lint: active -->

### REQ-BOOK-001
Status: proposed
Statement: When a pending booking is cancelled, the booking service shall change its state to cancelled.
""",
                encoding="utf-8",
            )
            (root / "history.md").write_text("# Historical\n", encoding="utf-8")
            (root / "notes.txt").write_text("not Markdown\n", encoding="utf-8")

            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                exit_code = spec_lint.main([str(root)])

        self.assertEqual(exit_code, 0)
        self.assertIn("1 active documents", output.getvalue())
        self.assertIn("1 unmarked documents", output.getvalue())
        self.assertIn("1 non-Markdown entries", output.getvalue())
        self.assertIn("rejected 0 unsupported inputs", output.getvalue())


if __name__ == "__main__":
    unittest.main()
