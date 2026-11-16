#!/usr/bin/env python3
"""Regression tests for declaration, EARS, and traceability contracts."""
from __future__ import annotations

import contextlib
import io
import itertools
import json
import os
import re
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import spec_lint  # noqa: E402


# Reported paths are resolved, so fixtures live under the canonical temporary
# directory for path assertions to hold where it is a symlink, as on macOS.
SYSTEM_TEMP = Path(tempfile.gettempdir()).resolve()


class SpecLintTests(unittest.TestCase):
    def temporary_root(self) -> tempfile.TemporaryDirectory[str]:
        return tempfile.TemporaryDirectory(dir=SYSTEM_TEMP)

    SOURCE = "\n### SRC-TEST-001 - Test source\n"

    def document(self, statement: str, *, kind: str = "REQ", basis: str | None = "SRC-TEST-001",
                 acceptance: str = "") -> str:
        basis_line = f"Basis: {basis}\n" if basis is not None else ""
        return (
            "<!-- spec-lint: active -->\n\n"
            f"### {kind}-TEST-001\nStatement: {statement}\n{basis_line}\n"
            "#### AC-TEST-001\n"
            "Expected: The agreed observation.\nBoundary: The alarm service API.\n"
            "Situation: The alarm rings.\nOracle: The alarm specification.\nCounterexample: The alarm keeps ringing.\n"
            f"{acceptance}{self.SOURCE}"
        )

    def scan_tree(self, files: dict[str, str]) -> spec_lint.Result:
        with self.temporary_root() as name:
            root = Path(name)
            for relative, text in files.items():
                (root / relative).parent.mkdir(parents=True, exist_ok=True)
                (root / relative).write_text(text, encoding="utf-8")
            return spec_lint.scan([root])

    def located(self, result: spec_lint.Result) -> list[tuple[str, str, int]]:
        return [(finding.code, Path(finding.path).name, finding.line) for finding in result.findings]

    def symlink(self, link: Path, target: Path) -> None:
        try:
            link.symlink_to(target)
        except OSError as error:
            raise unittest.SkipTest(f"symbolic links unavailable: {error}") from error

    def findings(self, result: spec_lint.Result) -> list[tuple[str, int]]:
        return [(finding.code, finding.line) for finding in result.findings]

    def scan_text(self, text: str) -> spec_lint.Result:
        with self.temporary_root() as name:
            path = Path(name) / "contract.md"
            path.write_text(text, encoding="utf-8")
            return spec_lint.scan([path])

    def test_vague_terms_warn_but_quoted_and_embedded_words_do_not(self) -> None:
        cases = {
            "The export service shall respond quickly.": ["quickly"],
            "When a report is requested, the export service shall include totals, taxes, etc.": None,
            "The export service shall retry where possible and/or log the failure.": ["where possible", "and/or"],
            "The export service shall return \"fast\" as the mode label.": [],
            "The export service shall return `appropriate` as the reason code.": [],
            "The export service shall reject breakfast-order identifiers.": [],
            "The export service shall keep a steadfast audit trail.": [],
        }
        for statement, expected in cases.items():
            with self.subTest(statement=statement):
                result = self.scan_text(self.document(statement))
                warnings = [f for f in result.findings if f.code == "vague-term"]
                if expected is None:
                    # "etc." also breaks the one-sentence rule; the warning still names the term.
                    self.assertEqual(len(warnings), 1)
                    self.assertIn("'etc'", warnings[0].message)
                    continue
                self.assertEqual(len(warnings), 1 if expected else 0, result.findings)
                for term in expected:
                    self.assertIn(repr(term), warnings[0].message)
                if expected:
                    self.assertEqual(warnings[0].line, 4)
                    self.assertEqual(result.exit_code(), 0)
                    self.assertEqual(result.exit_code(strict=True), 1)

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
            with self.subTest(statement=statement):
                result = self.scan_text(self.document(statement))
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

    def test_rejects_invalid_ears_for_each_rule_kind_with_or_without_basis(self) -> None:
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
            "When the file, the folder, and the destination are ready, the alarm service shall stop.",
        )
        for statement in statements:
            for kind in ("REQ", "INV"):
                for basis in ("SRC-TEST-001", None):
                    with self.subTest(statement=statement, kind=kind, basis=basis):
                        result = self.scan_text(self.document(statement, kind=kind, basis=basis))
                        self.assertEqual(result.exit_code(), 1)
                        errors = [finding for finding in result.findings if finding.code == "invalid-ears"]
                        self.assertEqual(len(errors), 1)
                        self.assertEqual(errors[0].line, 4)
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
        prefix = valid + "\n### REQ-HIDDEN-001\n"
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
            "\n### Examples\n"
            "\nREQ-TEST-001 governs this example.\n"
            "\n| Rule reference | Expected |\n| --- | --- |\n| REQ-TEST-001 | Stopped |\n"
            "| REQ-TEST-001 | The text `| Statement |` |\n"
            "\n```markdown\n### REQ-HIDDEN-001\nStatement: An alarm can stop.\n```\n"
            "\n### Notes\nNote: Statement: is the name of a field.\n"
            "Note: The imported source uses `| Statement |` as its header spelling.\n"
        )
        result = self.scan_text(text)
        self.assertEqual(result.findings, [])
        self.assertEqual(result.declarations, 3)

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
            "*Basis*: Authorised decision.",
            "`Rationale`: Because the owner asked.",
            "**Covers**: REQ-OTHER-001",
            "_Expected_: Status 404.",
        )
        for field in fields:
            with self.subTest(field=field):
                text = self.document("The notes service shall limit each activity subtree to 256 linked notes.")
                text = text.replace("Basis: SRC-TEST-001\n", "Basis: SRC-TEST-001\n" + field + "\n")
                result = self.scan_text(text)
                self.assertEqual(result.exit_code(strict=True), 1)
                self.assertEqual(result.declarations, 3)
                self.assertEqual([(f.code, f.line) for f in result.findings], [("unsupported-field", 6)])

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
                text = text.replace("Basis: SRC-TEST-001\n", "Basis: SRC-TEST-001\n" + comment + "\n")
                result = self.scan_text(text)
                self.assertEqual(result.findings, [])
                self.assertEqual(result.declarations, 3)

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
                    self.assertEqual(result.declarations, 3)
                    self.assertEqual([(f.code, f.line) for f in result.findings], [("unsupported-field", 16)])
        illustrative = self.document("The notes service shall withhold inaccessible notes.") + (
            "\n### Examples\n| Rule reference | Expected |\n| --- | --- |\n"
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
                text = self.document("The notes service shall withhold inaccessible notes.") + "\n### Notes\n" + table
                result = self.scan_text(text)
                expected = [("unsupported-field", 17)] if table in rejected else []
                self.assertEqual([(f.code, f.line) for f in result.findings], expected)
                self.assertEqual(result.declarations, 3)
                self.assertEqual(result.exit_code(strict=True), int(table in rejected))

    def test_table_header_requires_physical_adjacency(self) -> None:
        for gap in ("", "\n", "```text\nStatement: a literal example.\n```\n"):
            with self.subTest(gap=gap):
                text = self.document("The notes service shall withhold inaccessible notes.") + (
                    "\nID | **Statement**\n" + gap + "--- | ---\n"
                )
                result = self.scan_text(text)
                expected = [("unsupported-field", 16)] if not gap else []
                self.assertEqual([(f.code, f.line) for f in result.findings], expected)
                self.assertEqual(result.declarations, 3)

    def test_table_context_distinguishes_body_rows_from_setext_headings(self) -> None:
        prefix = "| Field |\n| --- |\n"
        field = "| Statement: The alarm may restart. |\n"
        cases = (
            (prefix + field + "---\n", 19),
            (prefix + field + "===\n", 19),
            (prefix + "\n" + field + "---\n", None),
            (prefix + "```text\nA literal example.\n```\n" + field + "---\n", None),
            (prefix + "### Commentary\n" + field + "---\n", None),
            (prefix + "| `Statement: The alarm may restart.` |\n---\n", None),
            (prefix + '| "Statement: The alarm may restart." |\n---\n', None),
            (prefix + "`Statement: The alarm may restart.`\n", None),
            (prefix + '"Statement: The alarm may restart."\n', None),
            (prefix + "**Statement**: The alarm may restart.\n", 19),
            (prefix + "[Statement](url): The alarm may restart.\n", 19),
            (prefix + "Ordinary body text\n" + field + "---\n", 20),
            ("Field | Expected\n- | -\nvalue | Statement: The alarm may restart.\n---\n", 19),
            (prefix + "---\n" + field + "---\n", None),
            (prefix + "===\n" + field + "---\n", 20),
        )
        for table, error_line in cases:
            with self.subTest(table=table):
                result = self.scan_text(self.document("The alarm service shall stop.") + "\n### Notes\n" + table)
                expected = [("unsupported-field", error_line)] if error_line is not None else []
                self.assertEqual([(f.code, f.line) for f in result.findings], expected)
                self.assertEqual(result.declarations, 3)
                self.assertEqual(result.exit_code(strict=True), int(error_line is not None))

    def test_table_content_cannot_supply_declaration_fields(self) -> None:
        requirement = "<!-- spec-lint: active -->\n## REQ-TEST-001\n"
        basis = "Basis: SRC-TEST-001\n"
        statement = "Statement: The alarm service shall stop.\n"
        source = "\n## SRC-TEST-001 - Test source\n"
        acceptance = ("\n### AC-TEST-001\nExpected: The alarm stops.\nBoundary: The alarm service API.\n"
                      "Situation: The alarm rings.\nOracle: The alarm specification.\nCounterexample: The alarm keeps ringing.\n"
                      + source)
        missing_statement = requirement + basis + "Rationale: A table follows.\n"
        cases = (
            (missing_statement + "| Field |\n| --- |\n" + statement + acceptance, 7, "missing-statement", 2),
            (missing_statement + statement + "| --- |\n" + acceptance, 5, "missing-statement", 2),
            (requirement + statement + "Rationale: A table follows.\n| Field |\n| --- |\n" + basis + acceptance,
             7, "proposed-rule", 2),
            (requirement + statement + basis
             + "\n### AC-TEST-001\nBoundary: The alarm service API.\nSituation: The alarm rings.\n"
             "Oracle: The alarm specification.\nCounterexample: The alarm keeps ringing.\nA table follows.\n"
             "| Field |\n| --- |\nExpected: The alarm stops.\n" + source, 14, "missing-expected", 6),
        )
        for text, error_line, missing_code, declaration_line in cases:
            with self.subTest(text=text):
                result = self.scan_text(text)
                self.assertEqual({(f.code, f.line) for f in result.findings}, {
                    ("unsupported-field", error_line), (missing_code, declaration_line),
                })
                self.assertEqual(len(result.findings), 2)
                self.assertEqual(result.declarations, 3)
                self.assertEqual(result.exit_code(strict=True), 1)

    def test_case_table_acceptance_lints_clean_without_situation(self) -> None:
        text = self.document(
            "When a customer applies a code before its expiry, the checkout service shall apply it.",
            acceptance=("\n| Dimension | Situation | Expected |\n| --- | --- | --- |\n"
                        "| Time | One millisecond before expiry | Applied |\n"
                        "| Identity | Lowercase code before expiry | Applied |\n"),
        ).replace("Expected: The agreed observation.", "Expected: Every row of the case table below.").replace(
            "Situation: The alarm rings.\n", "")

        result = self.scan_text(text)

        self.assertEqual(result.findings, [])
        self.assertEqual(result.declarations, 3)
        self.assertEqual(result.exit_code(strict=True), 0)

    RULE_REQUIREMENT = (
        "<!-- spec-lint: active -->\n\n"
        "### REQ-TMR-001\n"
        "Statement: When the core labels a timer, the core shall use the label in the first row of the rule table that applies.\n"
        "{table}\n"
        "Basis: SRC-TEST-001\n\n"
        "### REQ-TMR-002\n"
        "Statement: When a label clause exceeds 60 code points, the core shall shorten it to its first 60 code points.\n"
        "Basis: SRC-TEST-001\n\n"
        "#### AC-TMR-001\nCovers: REQ-TMR-001\nExpected: The agreed labels.\nBoundary: The alarm service API.\n"
        "Situation: A step with a label clause.\nOracle: The label rules.\nCounterexample: An unlabelled timer.\n"
        "\n### SRC-TEST-001 - Test source\n"
    )
    RULE_TABLE = (
        "| Order | Applies when | Label |\n| --- | --- | --- |\n"
        "| 1 | The step has a name. | The name. |\n"
        "| 2 | A word precedes the duration. | The clause, shortened as REQ-TMR-002 says. |\n"
        "| 3 | Otherwise. | \"Step N\" |\n"
    )

    def rule_document(self, table: str) -> str:
        return self.RULE_REQUIREMENT.replace("{table}", table)

    def test_rule_table_directly_under_its_statement_lints_clean(self) -> None:
        result = self.scan_text(self.rule_document(self.RULE_TABLE))

        self.assertEqual(result.findings, [])
        self.assertEqual(result.exit_code(strict=True), 0)

    def test_rule_table_defects_are_reported_on_their_row(self) -> None:
        cases = {
            "rows out of order": (self.RULE_TABLE.replace("| 2 |", "| 3 |", 1), {("rule-table-order", 8)}),
            "no Otherwise row": (self.RULE_TABLE.replace("Otherwise.", "No word precedes it."), {("rule-table-otherwise", 9)}),
            "a cell with shall": (self.RULE_TABLE.replace("The name.", "The core shall use the name."), {("rule-table-obligation", 7)}),
            "a cell citing an undeclared rule": (self.RULE_TABLE.replace("REQ-TMR-002", "REQ-TMR-009"), {("dangling-reference", 8)}),
            "two columns": ("| Order | Label |\n| --- | --- |\n| 1 | Otherwise. |\n", {("rule-table-columns", 5)}),
            "two rule tables": (self.RULE_TABLE + "\n" + self.RULE_TABLE, {("rule-table-duplicate", 11)}),
        }
        for name, (table, expected) in cases.items():
            with self.subTest(name):
                result = self.scan_text(self.rule_document(table))
                self.assertEqual({(f.code, f.line) for f in result.findings}, expected)

    def test_rule_table_and_statement_must_name_each_other(self) -> None:
        missing = self.rule_document("")
        unnamed = self.rule_document(self.RULE_TABLE).replace(
            "the label in the first row of the rule table that applies", "the step name")

        self.assertEqual(self.findings(self.scan_text(missing)), [("rule-table-missing", 4)])
        self.assertEqual(self.findings(self.scan_text(unnamed)), [("rule-table-unnamed", 5)])

    def test_only_a_requirement_owns_a_rule_table(self) -> None:
        text = self.rule_document(self.RULE_TABLE).replace(
            "### REQ-TMR-001", "### INV-TMR-001").replace(
            "When the core labels a timer, the core", "The core").replace(
            "Covers: REQ-TMR-001", "Covers: INV-TMR-001")

        self.assertEqual(self.findings(self.scan_text(text)), [("rule-table-owner", 5)])

    def test_other_tables_after_a_statement_remain_continuations(self) -> None:
        text = self.rule_document("| Case | Label |\n| --- | --- |\n| named | The name. |\n").replace(
            " in the first row of the rule table that applies", "")

        codes = {f.code for f in self.scan_text(text).findings}

        self.assertIn("statement-continuation", codes)
        self.assertNotIn("rule-table-unnamed", codes)

    def test_statement_citations_resolve_but_quoted_literals_do_not_count(self) -> None:
        cited = self.document("When a draft is saved, the notes service shall apply REQ-NOTE-404 to it.")
        quoted = self.document("When a draft is saved, the notes service shall return `REQ-NOTE-404` as its code.")

        self.assertEqual(self.findings(self.scan_text(cited)), [("dangling-reference", 4)])
        self.assertEqual(self.scan_text(quoted).findings, [])

    DECISIONS = (
        "# Notes decisions\n\n"
        "## Policies\n\n"
        "### Q-NOTE-003 - Who decides retention\n\nThe product lead decides retention questions.\n\n"
        "## Open\n\n"
        "### Q-NOTE-002 - Draft retention period\n\nHow long is a draft kept? Needs the product lead.\n\n"
        "## Decided\n\n"
        "### Q-NOTE-001 - Keep drafts\n\nAre unsaved drafts kept? Yes, for 30 days.\n"
    )

    def basis_findings(self, basis: str) -> list[tuple[str, int]]:
        contract = self.document("When a draft is saved, the notes service shall keep it.", basis=basis)
        return self.findings(self.scan_tree({"notes.md": contract, "notes.decisions.md": self.DECISIONS}))

    def test_basis_citing_a_decided_entry_or_a_declared_source_decides(self) -> None:
        for basis in (
            "Q-NOTE-001",
            "SRC-TEST-001",
            "SRC-TEST-001 § 4.2, cancellation window",
            "Q-NOTE-001 § Answer",
            "Q-NOTE-002; SRC-TEST-001 § Refunds",
            "Q-NOTE-003; Q-NOTE-001",
        ):
            with self.subTest(basis=basis):
                self.assertEqual(self.basis_findings(basis), [])

    def test_basis_citing_only_policies_or_open_questions_does_not_decide(self) -> None:
        for basis in ("Q-NOTE-002", "Q-NOTE-003", "Q-NOTE-003; Q-NOTE-002"):
            with self.subTest(basis=basis):
                self.assertEqual(self.basis_findings(basis), [("basis-not-deciding", 5)])

    def test_basis_citing_an_unknown_decision_or_source_dangles(self) -> None:
        for basis in ("Q-NOTE-404", "SRC-NONE-001", "Q-NOTE-001; Q-NOTE-404"):
            with self.subTest(basis=basis):
                self.assertEqual(self.basis_findings(basis), [("dangling-reference", 5)])

    def test_basis_parts_that_are_not_citations_are_malformed(self) -> None:
        for basis in (
            "Authorised test contract.",
            "Q-NOTE-001, Q-NOTE-002",
            "Q-NOTE-001, resolved by the notes owner.",
            "DEC-NOTE-001",
            "ADR-7",
            "REQ-TEST-001",
            "SRC-TEST-001 §",
            "SRC-TEST-001;",
            "[ADR 7](https://example.test/adr/7)",
        ):
            with self.subTest(basis=basis):
                self.assertEqual(self.basis_findings(basis), [("malformed-reference", 5)])
        self.assertEqual(self.basis_findings("Q-NOTE-002; resolved by the notes owner"), [("malformed-reference", 5)])

    def test_a_semicolon_inside_quoted_section_text_does_not_split_the_basis(self) -> None:
        for basis in (
            'SRC-TEST-001 § Refunds, "full; then partial"',
            'SRC-TEST-001 § Refunds, `full; then partial`; Q-NOTE-001',
            'SRC-TEST-001 § "a \\" b; c"',
        ):
            with self.subTest(basis=basis):
                self.assertEqual(self.basis_findings(basis), [])

    def test_a_quote_that_is_unclosed_or_hides_a_citation_makes_the_basis_unreadable(self) -> None:
        for basis in (
            'SRC-TEST-001 § Refunds, "full; then partial',
            'SRC-TEST-001 § 9" pan; Q-NOTE-404 § 12" pan',
            'SRC-TEST-001 § "x; SRC-NONE-001"',
        ):
            with self.subTest(basis=basis):
                self.assertEqual(self.basis_findings(basis), [("malformed-reference", 5)])

    def test_a_term_basis_is_checked_like_a_rule_basis(self) -> None:
        def scan_with(basis: str) -> list[tuple[str, int]]:
            contract = self.document("When a draft is saved, the notes service shall keep it.") + (
                f"\n### TERM-TEST-001 - Draft\n\nAn unsaved note.\n\nBasis: {basis}\n")
            return self.findings(self.scan_tree({"notes.md": contract, "notes.decisions.md": self.DECISIONS}))

        self.assertEqual(scan_with("Q-NOTE-001"), [])
        self.assertEqual(scan_with("Q-NOTE-002"), [("basis-not-deciding", 20)])
        self.assertEqual(scan_with("Q-NOTE-404"), [("dangling-reference", 20)])
        self.assertEqual(scan_with("resolved by the notes owner"), [("malformed-reference", 20)])

    def test_basis_questions_resolve_against_any_decision_record_under_the_roots(self) -> None:
        contract = self.document("When a draft is saved, the notes service shall keep it.", basis="Q-NOTE-001; Q-SPEC-005")
        files = {
            "notes/notes.md": contract,
            "notes/notes.decisions.md": "## Decided\n\n### Q-NOTE-001 - Keep drafts\n",
            "specs.decisions.md": "## Policies\n\n### Q-SPEC-005 - Delegation\n",
        }

        resolved = self.scan_tree(files)
        del files["specs.decisions.md"]
        unresolved = self.scan_tree(files)

        self.assertEqual(resolved.findings, [])
        self.assertEqual(resolved.active_documents, 1)
        self.assertEqual(self.findings(unresolved), [("dangling-reference", 5)])
        self.assertIn("Q-SPEC-005", unresolved.findings[0].message)

    def test_a_decision_record_holds_only_question_headings(self) -> None:
        contract = self.document("When a draft is saved, the notes service shall keep it.", basis="Q-NOTE-001")
        records = {
            "table row": "## Decided\n\n| ID | Answer |\n| --- | --- |\n| Q-NOTE-001 | Yes |\n",
            "fenced heading": "## Decided\n\n```markdown\n### Q-NOTE-001 - Keep drafts\n```\n",
        }
        for name, record in records.items():
            with self.subTest(name):
                result = self.scan_tree({"notes.md": contract, "notes.decisions.md": record})
                self.assertEqual(self.findings(result), [("dangling-reference", 5)])

    def test_a_decision_entry_belongs_to_the_policies_open_or_decided_section(self) -> None:
        entry = "### Q-A-001 - Keep drafts\n"
        cases = {
            "under Policies": ("## Policies\n\n" + entry, []),
            "under Open": ("## Open\n\n" + entry, []),
            "under Decided": ("# Notes\n\n## Decided\n\n" + entry, []),
            "before any section": (entry, [("decision-section", 1)]),
            "under another section": ("## Handoff\n\n" + entry, [("decision-section", 3)]),
            "after Decided ends": ("## Decided\n\n## Handoff\n\n" + entry, [("decision-section", 5)]),
            "after a level-1 heading": ("## Decided\n\n# Appendix\n\n" + entry, [("decision-section", 5)]),
            "a level-3 section name": ("### Decided\n\n" + entry, [("decision-section", 3)]),
            "a lower-case section name": ("## decided\n\n" + entry, [("decision-section", 3)]),
        }
        contract = self.document("When a draft is saved, the notes service shall keep it.")
        for name, (record, expected) in cases.items():
            with self.subTest(name):
                result = self.scan_tree({"notes.md": contract, "notes.decisions.md": record})
                self.assertEqual(self.findings(result), expected)
                self.assertTrue(all(Path(f.path).name == "notes.decisions.md" for f in result.findings))

    def test_moving_an_entry_from_open_to_decided_accepts_the_rule_citing_it(self) -> None:
        contract = self.document("When a draft is saved, the notes service shall keep it.", basis="Q-NOTE-001")
        entry = "### Q-NOTE-001 - Keep drafts\n\nAre drafts kept? Yes, for 30 days.\n"

        still_open = self.scan_tree({"notes.md": contract, "notes.decisions.md": "## Open\n\n" + entry})
        decided = self.scan_tree({"notes.md": contract, "notes.decisions.md": "## Decided\n\n" + entry})

        self.assertEqual(self.findings(still_open), [("basis-not-deciding", 5)])
        self.assertEqual(decided.findings, [])

    def test_a_question_recorded_in_two_records_is_a_duplicate_in_each(self) -> None:
        entry = "## Decided\n\n### Q-NOTE-001 - Keep drafts\n"
        contract = self.document("When a draft is saved, the notes service shall keep it.", basis="Q-NOTE-001")

        result = self.scan_tree({
            "notes.md": contract,
            "a.decisions.md": "# A\n\n" + entry,
            "b.decisions.md": entry,
        })

        self.assertEqual(self.located(result), [
            ("duplicate-id", "a.decisions.md", 5), ("duplicate-id", "b.decisions.md", 3),
        ])

    def test_text_between_a_rule_table_and_the_next_field_continues_the_statement(self) -> None:
        text = self.rule_document(self.RULE_TABLE + "\nAlso labels longer than 20 characters are cut.\n")

        self.assertEqual(self.findings(self.scan_text(text)), [("statement-continuation", 11)])

    def test_a_heading_directly_after_a_rule_table_ends_the_statement(self) -> None:
        text = self.rule_document(self.RULE_TABLE).replace(
            "Statement: When the core labels", "Basis: SRC-TEST-001\nStatement: When the core labels").replace(
            "\nBasis: SRC-TEST-001\n\n### REQ-TMR-002", "## Notes\nLabels are shown in the timer list.\n\n### REQ-TMR-002")

        self.assertEqual(self.scan_text(text).findings, [])

    def test_only_a_table_directly_under_the_statement_is_a_rule_table(self) -> None:
        purchase_orders = "| Order | Total | Discount |\n| --- | --- | --- |\n| A-17 | 40 | none |\n"
        illustrative = self.rule_document("").replace(
            " in the first row of the rule table that applies", "").replace(
            "Basis: SRC-TEST-001\n\n### REQ-TMR-002",
            "Basis: SRC-TEST-001\nRationale: Orders seen in the pilot.\n" + purchase_orders + "\n### REQ-TMR-002")
        below_basis = self.rule_document("").replace(
            "Basis: SRC-TEST-001\n\n### REQ-TMR-002",
            "Basis: SRC-TEST-001\n\n" + self.RULE_TABLE + "\n### REQ-TMR-002")

        self.assertEqual(self.scan_text(illustrative).findings, [])
        self.assertEqual([f.code for f in self.scan_text(below_basis).findings], ["rule-table-missing"])

    def test_link_destinations_in_a_statement_are_not_citations(self) -> None:
        text = self.document("When a draft is saved, the notes service shall apply [the save rule](notes.md#REQ-NOTE-404).")

        self.assertEqual(self.scan_text(text).findings, [])

    def test_long_statement_warns_only_above_sixty_words(self) -> None:
        def statement(words: int) -> str:
            prefix = "When a draft is saved, the notes service shall keep"
            return prefix + " it" * (words - len(prefix.split())) + "."

        self.assertEqual(self.scan_text(self.document(statement(60))).findings, [])
        self.assertEqual(self.findings(self.scan_text(self.document(statement(61)))), [("long-statement", 4)])

    def test_each_kind_of_acceptance_needs_its_own_case_fields(self) -> None:
        statement = "When a draft is saved, the notes service shall keep it."
        case_fields = ("Situation: The alarm rings.\nOracle: The alarm specification.\n"
                       "Counterexample: The alarm keeps ringing.\n")
        complete = self.document(statement)
        bare = complete.replace(case_fields, "")
        case_table = self.document(
            statement, acceptance="\n| Dimension | Situation | Expected |\n| --- | --- | --- |\n| Time | Saved at noon | Kept |\n",
        ).replace(case_fields, "").replace("Expected: The agreed observation.", "Expected: Every row of the case table below.")
        scenario_words = bare.replace("Expected: The agreed observation.",
                                      "Expected: Every scenario the evidence map lists for this AC.")

        self.assertEqual(self.scan_text(complete).findings, [])
        self.assertEqual([f.code for f in self.scan_text(bare).findings],
                         ["missing-situation", "missing-oracle", "missing-counterexample"])
        self.assertEqual([f.code for f in self.scan_text(case_table).findings], ["missing-oracle", "missing-counterexample"])
        self.assertEqual([f.code for f in self.scan_text(scenario_words).findings],
                         ["missing-situation", "missing-oracle", "missing-counterexample"])

    def test_a_case_table_and_its_expected_must_name_each_other(self) -> None:
        def acceptance(table: str, expected: str = "Every row of the case table below.") -> str:
            return self.document("When a draft is saved, the notes service shall keep it.", acceptance=table).replace(
                "Expected: The agreed observation.", f"Expected: {expected}")

        table = "\n| Dimension | Situation | Expected |\n| --- | --- | --- |\n| Time | Saved at noon | Kept, as {cited} says |\n"
        cases = {
            "no table": (acceptance(""), {"case-table-missing"}),
            "header only": (acceptance("\n| Dimension | Situation | Expected |\n| --- | --- | --- |\n"), {"case-table-missing"}),
            "a table Expected does not name": (acceptance(table.format(cited="REQ-TEST-001"), "The draft is kept."),
                                               {"case-table-unreferenced"}),
            "a setup sentence before the reference": (
                acceptance(table.format(cited="REQ-TEST-001"), "A saved draft is kept. Every row of the case table below."),
                set()),
            "a row citing an undeclared rule": (acceptance(table.format(cited="REQ-TEST-009")), {"dangling-reference"}),
            "complete, with a shared Situation": (acceptance(table.format(cited="REQ-TEST-001")), set()),
            "a table outside the AC": (acceptance("") + table.format(cited="REQ-TEST-001"), {"case-table-missing"}),
        }
        for name, (text, expected) in cases.items():
            with self.subTest(name):
                self.assertEqual({f.code for f in self.scan_text(text).findings}, expected)

    def test_only_the_last_rule_table_row_may_be_otherwise_and_cells_count_toward_length(self) -> None:
        early = self.RULE_TABLE.replace("The step has a name.", "Otherwise.")
        long_cell = self.RULE_TABLE.replace("The name.", "The name" + " and more" * 30 + ".")

        self.assertEqual(self.findings(self.scan_text(self.rule_document(early))), [("rule-table-otherwise", 7)])
        self.assertEqual(self.findings(self.scan_text(self.rule_document(long_cell))), [("long-statement", 7)])

    def test_malformed_backtick_openers_do_not_hide_declarations(self) -> None:
        openers = ("```json `response`", "```json response`", "``` `json", "````json `response`")
        for opener in openers:
            with self.subTest(opener=opener):
                text = self.document("The notes service shall limit each activity subtree to 256 linked notes.") + (
                    "\n" + opener + "\n"
                    "### REQ-NOTE-001\n"
                    "Statement: An absent, inaccessible or mismatched target returns the common 404.\n"
                    "```\n"
                )
                result = self.scan_text(text)
                self.assertEqual(result.exit_code(strict=True), 1)
                self.assertEqual(result.active_documents, 1)
                self.assertEqual(result.declarations, 4)
                self.assertEqual([(f.code, f.line) for f in result.findings if f.code == "invalid-fence"], [("invalid-fence", 16)])
                self.assertEqual([(f.code, f.line) for f in result.findings if f.code == "invalid-ears"], [("invalid-ears", 18)])

    def test_malformed_opener_before_marker_preserves_active_scope(self) -> None:
        text = "```json `response`\n" + self.document("The notes service shall withhold inaccessible notes.")
        result = self.scan_text(text)
        self.assertEqual(result.active_documents, 1)
        self.assertEqual(result.declarations, 3)
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
                    "### REQ-HIDDEN-001\nStatement: An absent target returns 404.\n"
                    "**Statement:** A literal example.\n"
                    "```json `response`\n" + closer + "\n"
                    "### REQ-AFTER-001\n"
                    "Statement: The notes service shall withhold inaccessible notes.\n"
                )
                result = self.scan_text(text)
                self.assertEqual(self.findings(result), [("proposed-rule", 22)])
                self.assertEqual(result.declarations, 4)

    def test_cli_reports_formatted_field_and_visible_requirement_after_invalid_fence(self) -> None:
        script = Path(spec_lint.__file__).resolve()
        text = (
            "<!-- spec-lint: active -->\n"
            "### REQ-NOTE-003\n"
            "Statement: The notes service shall limit each activity subtree to 256 linked notes.\n"
            "**Statement:** At most 256 linked notes may belong to one activity subtree.\n"
            "```json `response`\n"
            "### REQ-NOTE-001\n"
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
                ("unsupported-field", 4), ("invalid-fence", 5), ("invalid-ears", 7),
                ("proposed-rule", 2), ("proposed-rule", 6),
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
            self.assertEqual(findings[0]["line"], 4)
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

### REQ-BOOK-001 - Cancel
Statement: When a pending booking is cancelled, the booking service shall change its state to cancelled.
Basis: SRC-BOOK-001

#### AC-BOOK-001 - Cancelled booking
Expected: The booking is cancelled.
Boundary: The alarm service API.

### SRC-BOOK-001 - Booking policy
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

            result = spec_lint.scan([root])

        self.assertEqual(result.active_documents, 1)
        self.assertEqual(result.skipped_documents, 1)
        self.assertEqual(result.skipped_non_markdown, 1)
        self.assertEqual(result.skipped_hidden, 2)
        self.assertEqual(result.skipped_symlinks, 0)
        self.assertEqual(result.unsupported_inputs, 0)
        self.assertEqual(result.declarations, 3)
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
                    self.assertEqual(report["declarations"], 3)
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

### REQ-BOOK-001 - Cancel
Statement: When a pending booking is cancelled, the booking service shall change its state to cancelled.
Basis: SRC-BOOK-001

#### Rationale
Basis: historical prose, not a second field.

#### AC-BOOK-001 - Cancelled booking
Expected: The booking is cancelled.
Boundary: The alarm service API.
Situation: A pending booking.
Oracle: The booking policy.
Counterexample: The booking stays pending.

### SRC-BOOK-001 - Booking policy
""",
                encoding="utf-8",
            )

            result = spec_lint.scan([path])

        self.assertEqual(self.findings(result), [("unsupported-field", 8)])
        self.assertEqual(result.declarations, 3)
        self.assertEqual(result.exit_code(), 1)

    def test_overlapping_roots_count_skipped_entries_once(self) -> None:
        with self.temporary_root() as root_name:
            root = Path(root_name)
            nested = root / "nested"
            nested.mkdir()
            (nested / "active.md").write_text(
                """<!-- spec-lint: active -->

### REQ-BOOK-001
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

    def symlinked_contract(self, root: Path, statement: str) -> Path:
        real = root / "real"
        real.mkdir()
        contract = real / "doc.md"
        contract.write_text(self.document(statement), encoding="utf-8")
        self.symlink(root / "link", real)
        self.symlink(root / "alias.md", contract)
        return contract

    def test_explicit_symlink_inputs_are_followed_to_their_target(self) -> None:
        with self.temporary_root() as root_name:
            root = Path(root_name)
            # A deliberate error shows which file was read.
            contract = self.symlinked_contract(root, "An alarm can stop.")
            for name in ("link", "link/doc.md", "alias.md"):
                with self.subTest(input=name):
                    result = spec_lint.scan([root / name])
                    self.assertEqual(
                        [(f.code, f.path, f.line) for f in result.findings],
                        [("invalid-ears", str(contract), 4)],
                    )
                    self.assertEqual(result.active_documents, 1)
                    self.assertEqual(result.skipped_symlinks, 0)

    def test_cli_follows_a_symlinked_ancestor_of_an_input(self) -> None:
        script = Path(__file__).resolve().with_name("spec_lint.py")
        with self.temporary_root() as root_name:
            root = Path(root_name)
            contract = self.symlinked_contract(root, "An alarm can stop.")
            rejected = subprocess.run(
                [sys.executable, "-B", str(script), str(root / "link" / "doc.md"), "--json"],
                text=True, capture_output=True, check=False,
            )
            self.assertEqual(rejected.returncode, 1)
            findings = json.loads(rejected.stdout)["findings"]
            self.assertEqual([(f["code"], f["path"]) for f in findings], [("invalid-ears", str(contract))])
            contract.write_text(self.document("The alarm service shall stop."), encoding="utf-8")
            accepted = subprocess.run(
                [sys.executable, "-B", str(script), str(root / "link" / "doc.md"), "--json", "--strict"],
                text=True, capture_output=True, check=False,
            )
            self.assertEqual(accepted.returncode, 0)
            self.assertEqual(json.loads(accepted.stdout)["findings"], [])

    def traversal_tree(self, root: Path) -> tuple[Path, Path]:
        """Return a traversed root and a sibling that is checked only when supplied."""
        valid = self.document("The alarm service shall stop.")
        scan, outside = root / "scan", root / "outside"
        (outside / "sub").mkdir(parents=True)
        (outside / ".hid").mkdir()
        scan.mkdir()
        # Distinct IDs keep documents from colliding when both roots are scanned.
        (outside / "doc.md").write_text(valid.replace("TEST-001", "OUT-001"), encoding="utf-8")
        (outside / ".hid" / "doc.md").write_text(valid.replace("TEST-001", "HID-001"), encoding="utf-8")
        (outside / ".x.md").write_text(valid.replace("TEST-001", "HDN-001"), encoding="utf-8")
        (outside / "notes.txt").write_text("not Markdown\n", encoding="utf-8")
        return scan, outside

    def test_traversal_warns_only_about_links_whose_targets_went_unchecked(self) -> None:
        valid = self.document("The alarm service shall stop.")

        def ok(scan: Path) -> None:
            (scan / "ok.md").write_text(valid, encoding="utf-8")

        def link(path: Path, target: Path | str) -> Path:
            self.symlink(path, Path(target))
            return path

        # Each row builds its links and returns (inputs, warned links, link count, active documents).
        def non_markdown_target(scan, outside):
            ok(scan)
            link(scan / "n", outside / "notes.txt")
            return [scan], [], 1, 1

        def covered_file(scan, outside):
            (scan / "AGENTS.md").write_text(valid, encoding="utf-8")
            link(scan / "CLAUDE.md", scan / "AGENTS.md")
            return [scan], [], 1, 1

        def chain(scan, outside):
            (scan / "AGENTS.md").write_text(valid, encoding="utf-8")
            link(scan / "b", scan / "AGENTS.md")
            link(scan / "a", scan / "b")
            return [scan], [], 2, 1

        def covered_by_explicit_file(scan, outside):
            ok(scan)
            link(scan / "alias.md", outside / "doc.md")
            return [scan, outside / "doc.md"], [], 1, 2

        def covered_dir_traversed(scan, outside):
            (scan / "real").mkdir()
            (scan / "real" / "doc.md").write_text(valid, encoding="utf-8")
            link(scan / "link", scan / "real")
            link(scan / "up", scan)
            return [scan], [], 2, 1

        def covered_dir_explicit(scan, outside):
            ok(scan)
            link(scan / "link", outside)
            return [scan, outside], [], 1, 2

        def mutual_roots(scan, outside):
            ok(scan)
            link(scan / "alias.md", outside / "doc.md")
            link(outside / "alias.md", scan / "ok.md")
            return [scan, outside], [], 2, 2

        def uncovered_markdown(scan, outside):
            ok(scan)
            return [scan], [link(scan / "alias.md", outside / "doc.md")], 1, 1

        def uncovered_dir(scan, outside):
            ok(scan)
            return [scan], [link(scan / "link", outside)], 1, 1

        def pruned_targets(scan, outside):
            warned = [
                link(scan / "h1", outside / ".hid"),
                link(scan / "h2.md", outside / ".hid" / "doc.md"),
                link(scan / "h3.md", outside / ".x.md"),
            ]
            return [scan, outside], warned, 3, 1

        def non_regular_target(scan, outside):
            if not hasattr(os, "mkfifo"):
                self.skipTest("named pipes unavailable")
            ok(scan)
            os.mkfifo(outside / "queue")
            return [scan], [link(scan / "pipe", outside / "queue")], 1, 1

        def dangling(scan, outside):
            ok(scan)
            warned = [link(scan / "gone.md", outside / "missing.md"), link(scan / "gone-dir", outside / "missing")]
            return [scan], warned, 2, 1

        def looping(scan, outside):
            ok(scan)
            warned = [link(scan / "a.md", "b.md"), link(scan / "b.md", "a.md"), link(scan / "self", "self")]
            return [scan], warned, 3, 1

        def covered_and_uncovered(scan, outside):
            (scan / "AGENTS.md").write_text(valid, encoding="utf-8")
            link(scan / "CLAUDE.md", scan / "AGENTS.md")
            return [scan], [link(scan / "alias.md", outside / "doc.md")], 2, 1

        def repeated_and_nested_inputs(scan, outside):
            ok(scan)
            (scan / "sub").mkdir()
            return [scan, scan, scan / "sub"], [link(scan / "sub" / "link.md", outside / "doc.md")], 1, 1

        rows = (
            non_markdown_target, covered_file, chain, covered_by_explicit_file, covered_dir_traversed,
            covered_dir_explicit, mutual_roots, uncovered_markdown, uncovered_dir, pruned_targets,
            non_regular_target, dangling, looping, covered_and_uncovered, repeated_and_nested_inputs,
        )
        for row in rows:
            with self.subTest(row=row.__name__), self.temporary_root() as root_name:
                scan, outside = self.traversal_tree(Path(root_name))
                inputs, warned, links, active = row(scan, outside)
                expected = [("warning", "skipped-symlink", str(path), 0) for path in sorted(warned)]
                for order in dict.fromkeys(itertools.permutations(inputs)):
                    result = spec_lint.scan(list(order))
                    self.assertEqual([(f.severity, f.code, f.path, f.line) for f in result.findings], expected, order)
                    self.assertEqual(result.skipped_symlinks, links, order)
                    self.assertEqual(result.active_documents, active, order)
                    self.assertEqual(result.declarations, 3 * active, order)
                    self.assertEqual(result.exit_code(), 0, order)
                    self.assertEqual(result.exit_code(strict=True), 1 if warned else 0, order)

    def test_traversal_checks_hidden_names_before_links(self) -> None:
        with self.temporary_root() as root_name:
            scan, outside = self.traversal_tree(Path(root_name))
            (scan / "ok.md").write_text(self.document("The alarm service shall stop."), encoding="utf-8")
            # The dangling hidden link proves no target is resolved for a hidden name.
            self.symlink(scan / ".venv", outside)
            self.symlink(scan / ".alias.md", outside / "doc.md")
            self.symlink(scan / ".gone", outside / "missing")

            result = spec_lint.scan([scan])

        self.assertEqual(result.findings, [])
        self.assertEqual((result.skipped_hidden, result.skipped_symlinks), (3, 0))
        self.assertEqual(result.active_documents, 1)

    def test_cli_strict_fails_only_for_an_unchecked_symlink_target(self) -> None:
        script = Path(__file__).resolve().with_name("spec_lint.py")
        with self.temporary_root() as root_name:
            scan, outside = self.traversal_tree(Path(root_name))
            (scan / "AGENTS.md").write_text(self.document("The alarm service shall stop."), encoding="utf-8")
            self.symlink(scan / "CLAUDE.md", scan / "AGENTS.md")

            def run() -> tuple[int, dict]:
                completed = subprocess.run(
                    [sys.executable, "-B", str(script), str(scan), "--json", "--strict"],
                    text=True, capture_output=True, check=False,
                )
                return completed.returncode, json.loads(completed.stdout)

            covered_code, covered = run()
            self.symlink(scan / "alias.md", outside / "doc.md")
            uncovered_code, uncovered = run()

        self.assertEqual((covered_code, covered["findings"], covered["skipped_symlinks"]), (0, [], 1))
        self.assertEqual(uncovered_code, 1)
        self.assertEqual(
            [(f["severity"], f["code"], f["path"]) for f in uncovered["findings"]],
            [("warning", "skipped-symlink", str(scan / "alias.md"))],
        )
        self.assertEqual(uncovered["skipped_symlinks"], 2)

    def test_traversal_never_reads_through_a_symlink(self) -> None:
        with self.temporary_root() as root_name:
            root = Path(root_name)
            (root / "other").mkdir()
            (root / "other" / "doc.md").write_text(self.document("An alarm can stop."), encoding="utf-8")
            (root / "scan").mkdir()
            self.symlink(root / "scan" / "alias.md", root / "other" / "doc.md")

            result = spec_lint.scan([root / "scan"])

        self.assertEqual(
            [(f.severity, f.code, f.path, f.line) for f in result.findings if f.code != "no-active-documents"],
            [("warning", "skipped-symlink", str(root / "scan" / "alias.md"), 0)],
        )
        self.assertEqual(sorted(f.code for f in result.findings), ["no-active-documents", "skipped-symlink"])
        self.assertEqual(result.active_documents, 0)
        self.assertEqual(result.exit_code(), 2)

    def test_unusable_symlink_inputs_are_input_errors(self) -> None:
        with self.temporary_root() as root_name:
            root = Path(root_name)
            self.symlink(root / "a.md", root / "b.md")
            self.symlink(root / "b.md", root / "a.md")
            self.symlink(root / "dangling.md", root / "missing.md")
            (root / "notes.txt").write_text("not Markdown\n", encoding="utf-8")
            self.symlink(root / "notes.md", root / "notes.txt")
            for name in ("a.md", "dangling.md", "notes.md"):
                with self.subTest(input=name):
                    result = spec_lint.scan([root / name])
                    self.assertEqual(
                        [(f.code, f.path) for f in result.findings if f.code != "no-active-documents"],
                        [("input-error", str(root / name))],
                    )
                    self.assertEqual(result.exit_code(), 2)

    def test_an_explicit_symlink_is_judged_by_its_target(self) -> None:
        with self.temporary_root() as root_name:
            root = Path(root_name)
            (root / "doc.md").write_text(self.document("The alarm service shall stop."), encoding="utf-8")
            self.symlink(root / "doc-link.txt", root / "doc.md")

            result = spec_lint.scan([root / "doc-link.txt"])

        self.assertEqual(result.findings, [])
        self.assertEqual(result.active_documents, 1)

    def test_no_active_documents_reports_why_inputs_were_skipped(self) -> None:
        with self.temporary_root() as root_name:
            root = Path(root_name)
            for name in ("one.md", "two.md"):
                (root / name).write_text("# Historical\n", encoding="utf-8")
            for name in ("a.txt", "b.txt", "c.txt"):
                (root / name).write_text("not Markdown\n", encoding="utf-8")
            for name in (".a.md", ".b.md", ".c"):
                (root / name).write_text(self.document("The alarm service shall stop."), encoding="utf-8")
            (root / ".dir").mkdir()
            self.symlink(root / "link.md", root / "one.md")

            result = spec_lint.scan([root])

        self.assertEqual(
            (result.skipped_documents, result.skipped_non_markdown, result.skipped_hidden, result.skipped_symlinks),
            (2, 3, 4, 1),
        )
        self.assertEqual(result.exit_code(), 2)
        # The link targets a scanned file, so it is counted without a warning.
        self.assertEqual([f.code for f in result.findings], ["no-active-documents"])
        [message] = [f.message for f in result.findings]
        for count, stem in ((2, "unmarked"), (3, "non-Markdown"), (4, "hidden"), (1, "symlink")):
            with self.subTest(category=stem):
                self.assertRegex(message, rf"\b{count}\s+{stem}")

    def test_no_active_documents_fails_for_an_empty_root(self) -> None:
        with self.temporary_root() as root_name:
            result = spec_lint.scan([Path(root_name)])

        self.assertEqual([f.code for f in result.findings], ["no-active-documents"])
        self.assertEqual(result.exit_code(), 2)

    def test_marker_tolerates_only_trailing_whitespace(self) -> None:
        body = self.document("The alarm service shall stop.").split("\n", 1)[1]
        marker = spec_lint.MARKER
        active = {
            "space": f"{marker} \n{body}",
            "tab": f"{marker}\t\n{body}",
            "mixed": f"{marker}  \t\n{body}",
            "CRLF": f"{marker}\n{body}".replace("\n", "\r\n"),
        }
        inactive = {
            "trailing text": f"{marker}x\n{body}",
            "indented": f" {marker}\n{body}",
            "internal spacing": f"<!--  spec-lint: active -->\n{body}",
            "fenced": f"```text\n{marker}\n```\n{body}",
        }
        for label, text in active.items():
            with self.subTest(active=label):
                with self.temporary_root() as name:
                    path = Path(name) / "contract.md"
                    path.write_bytes(text.encode("utf-8"))
                    result = spec_lint.scan([path])
                self.assertEqual(result.active_documents, 1)
                self.assertEqual(result.findings, [])
        for label, text in inactive.items():
            with self.subTest(inactive=label):
                result = self.scan_text(text)
                self.assertEqual(result.skipped_documents, 1)
                self.assertEqual([f.code for f in result.findings], ["no-active-documents"])

    def assert_single_ears_error(self, statement: str) -> str:
        result = self.scan_text(self.document(statement))
        self.assertEqual(self.findings(result), [("invalid-ears", 4)])
        return result.findings[0].message

    def assert_clean(self, statement: str) -> None:
        result = self.scan_text(self.document(statement))
        self.assertEqual(result.findings, [])

    def test_missing_clause_comma_is_named_and_its_repair_lints_clean(self) -> None:
        repairs = {
            "Where a feature is included the alarm service shall stop.":
                "Where a feature is included, the alarm service shall stop.",
            "While maintenance is active the alarm service shall stop.":
                "While maintenance is active, the alarm service shall stop.",
            "When a command arrives the alarm service shall stop.":
                "When a command arrives, the alarm service shall stop.",
            "If power fails then the alarm service shall stop.":
                "If power fails, then the alarm service shall stop.",
        }
        for broken, repaired in repairs.items():
            with self.subTest(statement=broken):
                self.assertIn("comma", self.assert_single_ears_error(broken).lower())
                self.assert_clean(repaired)
        for statement in ("An alarm can stop.", "If power fails, the alarm service shall stop."):
            with self.subTest(statement=statement):
                self.assertNotIn("comma", self.assert_single_ears_error(statement).lower())

    def test_reserved_delimiter_inside_a_clause_is_named(self) -> None:
        cases = {
            "When the file, the folder, and the destination are ready, the alarm service shall stop.": ", the",
            "When a, then b, the alarm service shall stop.": ", then",
            "The pump, the fan, and the valve shall stop.": ", the",
            "The pump, the fan, when idle, shall stop.": ", the",
            "The pump, then the fan shall stop.": ", then",
        }
        for statement, delimiter in cases.items():
            with self.subTest(statement=statement):
                message = self.assert_single_ears_error(statement)
                self.assertIn(delimiter, message)
                self.assertRegex(message, "quote|rephrase")
        for statement in (
            'When "the file, the folder" are ready, the alarm service shall stop.',
            "When the file, folder, and destination are ready, the alarm service shall stop.",
            "The alarm service shall stop the pump, the fan, and the valve.",
            "The pump, fan, and valve shall stop.",
            'The "pump, the fan, and the valve" shall stop.',
        ):
            with self.subTest(statement=statement):
                self.assert_clean(statement)

    def test_misplaced_clause_after_a_ubiquitous_subject_is_moved_not_quoted(self) -> None:
        repairs = {
            ("The pump, when idle, shall stop.", "when"): "While the pump is idle, the pump shall stop.",
            ("The pump, While running, shall not stop.", "while"): "While the pump is running, the pump shall not stop.",
            ("The pump, if overheated, then the pump shall stop.", "if"): "If the pump overheats, then the pump shall stop.",
            ("The pump, where fitted, shall stop.", "where"): "Where the pump is fitted, the pump shall stop.",
        }
        for (broken, keyword), repaired in repairs.items():
            with self.subTest(statement=broken):
                message = self.assert_single_ears_error(broken)
                self.assertRegex(message.lower(), rf"\b{keyword}\b")
                # Quoting would hide the clause inside the system name.
                self.assertNotRegex(message, "quote")
                self.assertNotIn("Begin with", message)
                self.assert_clean(repaired)
        for statement, delimiter in (("An alarm, the pump shall stop.", ", the"), ("An alarm, when idle, shall stop.", ", when")):
            with self.subTest(statement=statement):
                message = self.assert_single_ears_error(statement)
                self.assertIn("Begin with", message)
                self.assertNotIn(delimiter, message)

    def malformed_heading_document(self, heading: str, extra: str = "") -> str:
        return (
            "<!-- spec-lint: active -->\n\n"
            f"{heading}\nStatement: The alarm service shall stop.\n{extra}\n"
            "## REQ-OK-001\nStatement: The alarm service shall stop.\n"
        )

    def test_malformed_heading_is_one_finding_with_an_applicable_hint(self) -> None:
        hints = {
            "## REQ-A-1: Title": "whitespace",
            "## REQ-A-1.": "whitespace",
            "## REQ-A-1—Title": "whitespace",
            "# REQ-A-001 Title": "level",
            "## REQ-a-1 Title": None,
            "## REQ-A-1-x_ Title": None,
            "## REQ- Title": None,
        }
        for heading, hint in hints.items():
            with self.subTest(heading=heading):
                result = self.scan_text(self.malformed_heading_document(heading))
                self.assertEqual(self.findings(result), [("malformed-id", 3), ("proposed-rule", 6)])
                self.assertEqual(result.declarations, 1)
                self.assertEqual(result.exit_code(), 1)
                message = result.findings[0].message
                if hint:
                    self.assertIn(hint, message)
                else:
                    self.assertNotIn("whitespace", message)
        repaired = self.scan_text(self.malformed_heading_document("## REQ-A-1 - Title"))
        self.assertEqual(self.findings(repaired), [("proposed-rule", 3), ("proposed-rule", 6)])
        self.assertEqual(repaired.exit_code(), 0)

    def test_malformed_heading_suppresses_only_its_own_orphan_fields(self) -> None:
        cases = {
            "later section": ("### Notes\nBasis: x\n",
                              [("malformed-id", 3), ("unsupported-field", 6), ("proposed-rule", 8)]),
            "quoted declaration": ("> ### REQ-X-1\nBasis: x\n",
                                   [("malformed-id", 3), ("unsupported-declaration", 5), ("proposed-rule", 8)]),
            "table field": ("\n| Field |\n| --- |\nBasis: x\n",
                            [("malformed-id", 3), ("unsupported-field", 8), ("proposed-rule", 10)]),
        }
        for label, (extra, expected) in cases.items():
            with self.subTest(case=label):
                result = self.scan_text(self.malformed_heading_document("## REQ-A-1: Title", extra))
                self.assertEqual(self.findings(result), expected)

    def test_placeholder_values_are_reported_once_without_cascading(self) -> None:
        base = self.document("The alarm service shall stop.")
        cases = {
            "Statement": (base.replace("Statement: The alarm service shall stop.", "Statement: [EARS sentence]"), 4),
            "Basis": (base.replace("Basis: SRC-TEST-001", "Basis: [Q or SRC IDs]"), 5),
            "Rationale": (base.replace("SRC-TEST-001\n", "SRC-TEST-001\nRationale: [Why]\n", 1), 6),
            "Covers": (self.document("The alarm service shall stop.", acceptance="Covers: [REQ IDs]\n"), 13),
            "Expected": (base.replace("Expected: The agreed observation.", "Expected: [Observation]"), 8),
            "bracketed literal": (base.replace("Expected: The agreed observation.", "Expected: [1, 2]"), 8),
        }
        for label, (text, line) in cases.items():
            with self.subTest(field=label):
                result = self.scan_text(text)
                self.assertEqual(self.findings(result), [("placeholder-value", line)])
                self.assertEqual(result.exit_code(), 1)
        message = self.scan_text(cases["bracketed literal"][0]).findings[0].message
        self.assertIn("backticks", message)

    def test_bracketed_text_that_is_not_a_whole_field_placeholder_is_allowed(self) -> None:
        base = self.document("The alarm service shall stop.")
        cases = {
            "bracket inside a field": base.replace("SRC-TEST-001\n", "SRC-TEST-001\nRationale: See [x] in the source.\n", 1),
            "link": base.replace("Oracle: The alarm specification.", "Oracle: [ADR 7](https://example.org/adr/7)"),
            "quoted literal": base.replace("Expected: The agreed observation.", "Expected: `[1, 2]`"),
            "fenced template": base + "\n```markdown\n### REQ-TEMPLATE-001\nBasis: [Authorised decision]\n```\n",
        }
        for label, text in cases.items():
            with self.subTest(case=label):
                self.assertEqual(self.scan_text(text).findings, [])
        empty = self.scan_text(base.replace("Basis: SRC-TEST-001", "Basis:"))
        self.assertEqual(self.findings(empty), [("proposed-rule", 3)])

    def test_reference_and_declaration_errors_are_located(self) -> None:
        base = self.document("The alarm service shall stop.")
        cases = {
            "dangling reference in Rationale": (
                base.replace("SRC-TEST-001\n", "SRC-TEST-001\nRationale: It extends REQ-NONE-001.\n", 1),
                [("dangling-reference", 6)],
            ),
            "duplicate id": (
                base + "\n### REQ-TEST-001\nStatement: The alarm service shall stop.\n",
                [("duplicate-id", 3), ("duplicate-id", 16)],
            ),
            "duplicate source": (
                base + self.SOURCE,
                [("duplicate-id", 14), ("duplicate-id", 16), ("ambiguous-reference", 5)],
            ),
        }
        for label, (text, expected) in cases.items():
            with self.subTest(case=label):
                result = self.scan_text(text)
                errors = [(f.code, f.line) for f in result.findings if f.severity == "error"]
                self.assertEqual(errors, expected)
                self.assertEqual(result.exit_code(), 1)

    def test_a_rule_without_basis_is_proposed(self) -> None:
        for kind in ("REQ", "INV"):
            with self.subTest(kind=kind):
                result = self.scan_text(self.document("The alarm service shall stop.", kind=kind, basis=None))
                self.assertEqual([(f.severity, f.code, f.line) for f in result.findings], [("warning", "proposed-rule", 3)])
                self.assertEqual(result.exit_code(), 0)
                self.assertEqual(result.exit_code(strict=True), 1)

    def test_each_declaration_kind_accepts_only_its_own_fields(self) -> None:
        statement = "The alarm service shall stop."
        rule = self.document(statement)

        def in_rule(line: str) -> str:
            return rule.replace("Basis: SRC-TEST-001\n", "Basis: SRC-TEST-001\n" + line + "\n")

        def in_term(line: str) -> str:
            return rule + "\n### TERM-TEST-001 - Alarm\n\nA signal that rings.\n\n" + line + "\n"

        rejected = {
            "Status on a rule": (in_rule("Status: accepted"), 6),
            "Status before a Statement": (rule.replace("### REQ-TEST-001\n", "### REQ-TEST-001\nStatus: proposed\n"), 4),
            "Status on an AC": (self.document(statement, acceptance="Status: accepted\n"), 13),
            "Expected on a rule": (in_rule("Expected: The alarm stops."), 6),
            "Oracle on a rule": (in_rule("Oracle: The product owner's decision."), 6),
            "Covers on a rule": (in_rule("Covers: REQ-TEST-001"), 6),
            "an unknown name on a rule": (in_rule("Owner: The alarm team."), 6),
            "Statement on an AC": (self.document(statement, acceptance="Statement: The alarm service shall start.\n"), 13),
            "Basis on an AC": (self.document(statement, acceptance="Basis: SRC-TEST-001\n"), 13),
            "Rationale on an AC": (self.document(statement, acceptance="Rationale: The owner asked for it.\n"), 13),
            "an unknown name on an AC": (self.document(statement, acceptance="Note: Checked by hand.\n"), 13),
            "Statement on a term": (in_term("Statement: The alarm service shall ring."), 20),
            "References on a rule": (in_rule("References: SRC-TEST-001"), 6),
        }
        for name, (text, line) in rejected.items():
            with self.subTest(name):
                result = self.scan_text(text)
                self.assertEqual(self.findings(result), [("unsupported-field", line)])
                self.assertEqual(result.exit_code(), 1)
        accepted = {
            "Rationale citing a rule": in_rule("Rationale: AC-TEST-001 shows the owner asked for it."),
            "Basis on a term": in_term("Basis: SRC-TEST-001"),
            "a named prose line in a term": in_term("Ring: the sound an alarm makes."),
        }
        for name, text in accepted.items():
            with self.subTest(name):
                self.assertEqual(self.scan_text(text).findings, [])

    def test_an_ac_must_sit_one_level_below_the_rule_it_checks(self) -> None:
        statement = "The alarm service shall stop."
        sibling = self.document(statement, acceptance="Covers: REQ-TEST-001\n").replace("#### AC-TEST-001", "### AC-TEST-001")
        under_section = self.document(statement).replace("#### AC-TEST-001", "#### Examples\n\n##### AC-TEST-001")
        under_ac = self.document(statement, acceptance=(
            "\n##### AC-TEST-002\nExpected: The alarm stays stopped.\nBoundary: The alarm service API.\n"
            "Situation: The alarm was stopped.\nOracle: The alarm specification.\nCounterexample: The alarm rings again.\n"))
        under_term = self.document(statement) + (
            "\n### TERM-TEST-001 - Alarm\n\nA signal that rings.\n\n"
            "#### AC-TEST-002\nCovers: REQ-TEST-001\nExpected: The alarm stays stopped.\nBoundary: The alarm service API.\n"
            "Situation: The alarm was stopped.\nOracle: The alarm specification.\nCounterexample: The alarm rings again.\n")
        skipped_level = self.document(statement).replace("#### AC-TEST-001", "##### AC-TEST-001")
        cases = {
            "a sibling of its rule, naming it in Covers": (sibling, [("ac-not-nested", 7)]),
            "two levels below its rule": (skipped_level, [("ac-not-nested", 7), ("unlinked-acceptance", 3)]),
            "under a plain sub-heading": (under_section, [("ac-not-nested", 9), ("unlinked-acceptance", 3)]),
            "under another AC": (under_ac, [("ac-not-nested", 14)]),
            "under a term": (under_term, [("ac-not-nested", 20)]),
        }
        for name, (text, expected) in cases.items():
            with self.subTest(name):
                result = self.scan_text(text)
                self.assertEqual(self.findings(result), expected)
                self.assertEqual(result.exit_code(), 1)

    def test_a_url_line_inside_a_rule_is_prose_not_a_field(self) -> None:
        text = self.document("The alarm service shall stop.").replace(
            "Basis: SRC-TEST-001\n", "Basis: SRC-TEST-001\nRationale: See the alarm guide.\n\nhttps://example.test/alarm\n")

        result = self.scan_text(text)

        self.assertEqual(self.findings(result), [])

    def test_a_question_in_rationale_resolves_against_the_decision_records(self) -> None:
        record = "## Decided\n\n### Q-T-001 - Stop\n"
        contract = self.document("The alarm service shall stop.").replace(
            "Basis: SRC-TEST-001\n", "Basis: SRC-TEST-001\nRationale: Q-T-001 explains why.\n")

        resolved = self.scan_tree({"contract.md": contract, "t.decisions.md": record})
        dangling = self.scan_tree({"contract.md": contract.replace("Q-T-001", "Q-T-002"), "t.decisions.md": record})

        self.assertEqual(self.located(resolved), [])
        self.assertEqual(self.located(dangling), [("dangling-reference", "contract.md", 6)])

    def test_a_decision_heading_that_is_not_id_then_title_is_malformed(self) -> None:
        record = "## Decided\n\n### Q-T-001: Stop\n"

        result = self.scan_tree({
            "contract.md": self.document("The alarm service shall stop."),
            "t.decisions.md": record,
        })

        self.assertEqual(self.located(result), [("malformed-id", "t.decisions.md", 3)])

    def test_a_marked_decision_record_is_read_only_as_a_decision_record(self) -> None:
        record = f"{spec_lint.MARKER}\n\n## Decided\n\n### Q-T-001 - Stop\n"

        result = self.scan_tree({
            "contract.md": self.document("The alarm service shall stop.", basis="Q-T-001").replace(
                "\n### SRC-TEST-001 - Test source\n", "\n"),
            "a.decisions.md": record,
            "b.decisions.md": record,
        })

        self.assertEqual(sorted(self.located(result)),
                         [("duplicate-id", "a.decisions.md", 5), ("duplicate-id", "b.decisions.md", 5)])

    def test_an_ac_covers_its_parent_and_the_rules_its_covers_names(self) -> None:
        def contract(covers: str, second_basis: str | None = "SRC-TEST-001") -> str:
            basis_line = f"Basis: {second_basis}\n" if second_basis else ""
            return (
                "<!-- spec-lint: active -->\n\n"
                "### REQ-TEST-001\nStatement: The alarm service shall stop.\nBasis: SRC-TEST-001\n\n"
                f"#### AC-TEST-001\n{covers}Expected: The alarm stops.\nBoundary: The alarm service API.\n"
                "Situation: The alarm rings.\nOracle: The alarm specification.\nCounterexample: The alarm keeps ringing.\n\n"
                f"### REQ-TEST-002\nStatement: The alarm service shall log each stop.\n{basis_line}"
                "\n### SRC-TEST-001 - Test source\n"
            )

        cases = {
            "another rule with no AC": (contract(""), [("unlinked-acceptance", 14)]),
            "Covers naming the other rule": (contract("Covers: REQ-TEST-002\n"), []),
            "Covers repeating the parent": (contract("Covers: REQ-TEST-001, REQ-TEST-002\n"), []),
            "Covers naming only the parent": (contract("Covers: REQ-TEST-001\n"), [("unlinked-acceptance", 15)]),
            "a proposed rule with no AC": (contract("", second_basis=None), [("proposed-rule", 14)]),
            "Covers naming an AC": (contract("Covers: AC-TEST-001\n", second_basis=None),
                                    [("invalid-covers-target", 8), ("proposed-rule", 15)]),
        }
        for name, (text, expected) in cases.items():
            with self.subTest(name):
                self.assertEqual(self.findings(self.scan_text(text)), expected)

    def evidence_fixture(self, root: Path) -> Path:
        specs = root / "specs"
        tests = root / "tests"
        specs.mkdir()
        tests.mkdir()
        contract = self.document("The alarm service shall stop.", acceptance=(
            "\n#### AC-TEST-002\nExpected: The alarm stays stopped.\nBoundary: The alarm service API.\n"
            "Situation: The alarm was stopped.\nOracle: The alarm specification.\nCounterexample: The alarm rings again.\n"
        ))
        (specs / "contract.md").write_text(contract, encoding="utf-8")
        (tests / "alarm_test.py").write_text(
            "def test_stop_silences_the_alarm():\n    pass\n\nit(\"keeps | the alarm stopped\")\n", encoding="utf-8")
        (tests / "alarm.feature").write_text("Feature: Alarm\n  Scenario: Stopping the alarm\n", encoding="utf-8")
        return specs

    def write_map(self, specs: Path, rows: str) -> Path:
        path = specs / "alarm.evidence.md"
        path.write_text("# Alarm evidence\n\n| AC | File | Test |\n| --- | --- | --- |\n" + rows, encoding="utf-8")
        return path

    def test_evidence_map_rows_link_each_ac_to_its_tests(self) -> None:
        with self.temporary_root() as name:
            specs = self.evidence_fixture(Path(name))
            evidence = self.write_map(specs, (
                "| AC-TEST-001 | ../tests/alarm_test.py | keeps \\| the alarm stopped |\n"
                "| AC-TEST-001 | ../tests/alarm_test.py | test_stop_silences_the_alarm |\n"
                "| AC-TEST-002 | ../tests/alarm.feature | Stopping the alarm |\n"
            ))
            result = spec_lint.scan([specs], untested=True)
            self.assertEqual(result.findings, [])
            self.assertEqual(result.evidence_maps, 1)
            self.assertEqual(result.skipped_documents, 0)
            self.assertEqual(result.evidence, {
                "AC-TEST-001": [
                    {"file": "../tests/alarm_test.py", "test": "keeps | the alarm stopped", "map": f"{evidence}:5"},
                    {"file": "../tests/alarm_test.py", "test": "test_stop_silences_the_alarm", "map": f"{evidence}:6"},
                ],
                "AC-TEST-002": [{"file": "../tests/alarm.feature", "test": "Stopping the alarm", "map": f"{evidence}:7"}],
            })

    def test_evidence_rows_that_do_not_resolve_are_errors(self) -> None:
        cases = {
            "undeclared ac": ("| AC-TEST-000 | ../tests/alarm_test.py | test_stop_silences_the_alarm |\n",
                              [("evidence-unknown-ac", 5)]),
            "missing file": ("| AC-TEST-001 | ../tests/gone_test.py | test_stop_silences_the_alarm |\n",
                             [("evidence-file", 5)]),
            "renamed test": ("| AC-TEST-001 | ../tests/alarm_test.py | test_stop_silences |\n",
                             [("evidence-test-missing", 5)]),
            "name inside a longer name": ("| AC-TEST-001 | ../tests/alarm_test.py | stop_silences_the_alarm |\n",
                                          [("evidence-test-missing", 5)]),
            "scenario title extended": ("| AC-TEST-001 | ../tests/alarm.feature | Stopping |\n",
                                        [("evidence-test-missing", 5)]),
            "string title extended": ("| AC-TEST-001 | ../tests/alarm_test.py | keeps \\| the alarm |\n",
                                      [("evidence-test-missing", 5)]),
            "duplicate": ("| AC-TEST-001 | ../tests/alarm_test.py | test_stop_silences_the_alarm |\n" * 2,
                          [("evidence-duplicate", 6)]),
            "absolute path": ("| AC-TEST-001 | /tests/alarm_test.py | test_stop_silences_the_alarm |\n",
                              [("evidence-malformed", 5)]),
            "not an ac": ("| REQ-TEST-001 | ../tests/alarm_test.py | test_stop_silences_the_alarm |\n",
                          [("evidence-malformed", 5)]),
            "two cells": ("| AC-TEST-001 | ../tests/alarm_test.py |\n", [("evidence-malformed", 5)]),
            "stray prose": ("Rows follow.\n", [("evidence-malformed", 5)]),
        }
        for label, (rows, expected) in cases.items():
            with self.subTest(case=label):
                with self.temporary_root() as name:
                    specs = self.evidence_fixture(Path(name))
                    self.write_map(specs, rows + "| AC-TEST-002 | ../tests/alarm.feature | Stopping the alarm |\n")
                    result = spec_lint.scan([specs])
                    self.assertEqual(self.findings(result), expected)
                    self.assertEqual(result.exit_code(), 1)

    def test_a_test_name_matches_a_whole_identifier_or_a_whole_quoted_title(self) -> None:
        cases = [
            ("alarm.test.ts", "it('keeps quiet', () => {})", "keeps quiet", True),
            ("alarm.test.ts", 'it("keeps quiet forever", () => {})', "keeps quiet", False),
            ("alarm.test.ts", "// keeps quiet when muted", "keeps quiet", False),
            ("alarm.test.ts", "it(`${unit} keeps quiet`, () => {})", "${unit} keeps quiet", True),
            ("alarm.test.ts", "it('won\\'t ring', () => {})", "won\\'t ring", True),
            ("alarm.test.ts", "it('parses JSON', () => {})", "parses", False),
            ("alarm.test.ts", "it('parses', () => {})", "parses", True),
            ("alarm.typecheck.ts", "const phaseFieldsAreExhaustive: Check = true", "phaseFieldsAreExhaustive", True),
            ("alarm.typecheck.ts", "// phaseFieldsAreExhaustive holds", "phaseFieldsAreExhaustive", False),
            ("AlarmTest.kt", "fun `keeps quiet`() {}", "keeps quiet", True),
            ("alarm.rs", "fn keeps_quiet() {}", "keeps_quiet", True),
            ("alarm.rs", "fn keeps_quiet_forever() {}", "keeps_quiet", False),
        ]
        for file, text, name, found in cases:
            with self.subTest(file=file, text=text, name=name):
                self.assertEqual(spec_lint.names_test(Path(file), text, name), found)

    def test_an_ac_whose_only_rows_are_stale_is_reported_once_by_the_row(self) -> None:
        with self.temporary_root() as name:
            specs = self.evidence_fixture(Path(name))
            self.write_map(specs, (
                "| AC-TEST-001 | ../tests/alarm_test.py | test_stop_silences |\n"
                "| AC-TEST-002 | ../tests/gone.feature | Stopping the alarm |\n"
            ))
            self.assertEqual(self.findings(spec_lint.scan([specs], untested=True)),
                             [("evidence-test-missing", 5), ("evidence-file", 6)])

    def test_evidence_rows_out_of_order_warn(self) -> None:
        with self.temporary_root() as name:
            specs = self.evidence_fixture(Path(name))
            self.write_map(specs, (
                "| AC-TEST-002 | ../tests/alarm.feature | Stopping the alarm |\n"
                "| AC-TEST-001 | ../tests/alarm_test.py | test_stop_silences_the_alarm |\n"
            ))
            result = spec_lint.scan([specs])
            self.assertEqual(self.findings(result), [("evidence-order", 6)])
            self.assertEqual(result.exit_code(), 0)

    def test_untested_acs_warn_only_when_asked(self) -> None:
        with self.temporary_root() as name:
            specs = self.evidence_fixture(Path(name))
            self.assertEqual(self.findings(spec_lint.scan([specs])), [])
            self.assertEqual(self.findings(spec_lint.scan([specs], untested=True)),
                             [("untested-ac", 7), ("untested-ac", 14)])

    def test_cli_reports_how_many_acs_have_a_test_row(self) -> None:
        with self.temporary_root() as name:
            specs = self.evidence_fixture(Path(name))
            self.write_map(specs, "| AC-TEST-002 | ../tests/alarm.feature | Stopping the alarm |\n")
            output = io.StringIO()
            with contextlib.redirect_stdout(output):
                exit_code = spec_lint.main([str(specs), "--untested"])
            self.assertEqual(exit_code, 0, output.getvalue())
            self.assertIn("Evidence: 1 of 2 ACs have a test row in 1 evidence maps; 0 have an unchecked part.", output.getvalue())
            self.assertIn("untested-ac", output.getvalue())

    def test_an_unchecked_part_is_reported_with_untested_whether_or_not_a_test_row_exists(self) -> None:
        with self.temporary_root() as name:
            specs = self.evidence_fixture(Path(name))
            self.write_map(specs, (
                "| AC-TEST-001 | ../tests/alarm_test.py | test_stop_silences_the_alarm |\n"
                "| AC-TEST-002 | ../tests/alarm.feature | Stopping the alarm |\n"
                "\n| AC | Unchecked |\n| --- | --- |\n"
                "| AC-TEST-001 | The alarm staying silent after a restart \\| reviewed only. |\n"
            ))
            self.assertEqual(self.findings(spec_lint.scan([specs])), [])
            result = spec_lint.scan([specs], untested=True)
            self.assertEqual(self.findings(result), [("partial-ac", 7)])
            self.assertIn("after a restart | reviewed only.", result.findings[0].message)
            self.assertEqual(result.unchecked, {"AC-TEST-001": "The alarm staying silent after a restart | reviewed only."})

    def test_an_untested_ac_carries_its_unchecked_part(self) -> None:
        with self.temporary_root() as name:
            specs = self.evidence_fixture(Path(name))
            self.write_map(specs, (
                "| AC-TEST-002 | ../tests/alarm.feature | Stopping the alarm |\n"
                "\n| AC | Unchecked |\n| --- | --- |\n| AC-TEST-001 | Checked by a nightly script. |\n"
            ))
            result = spec_lint.scan([specs], untested=True)
            self.assertEqual(self.findings(result), [("untested-ac", 7)])
            self.assertIn("Unchecked: Checked by a nightly script.", result.findings[0].message)

    def test_an_unchecked_part_that_names_a_test_warns(self) -> None:
        cases = {
            "The alarm staying silent after a restart; checked by review only.": [],
            "The alarm staying silent after a restart; no test checks it.": [("unchecked-names-test", 10)],
            "The restart: the tests check only the first ring.": [("unchecked-names-test", 10)],
            "The restart: the listed check covers only the first ring.": [("unchecked-names-test", 10)],
            "What test_stop_silences_the_alarm leaves out: the restart.": [("unchecked-names-test", 10)],
            "The restart; see tests/alarm_test.py.": [("unchecked-names-test", 10)],
        }
        for text, expected in cases.items():
            with self.subTest(text=text):
                with self.temporary_root() as name:
                    specs = self.evidence_fixture(Path(name))
                    self.write_map(specs, "| AC-TEST-001 | ../tests/alarm_test.py | test_stop_silences_the_alarm |\n"
                                          "| AC-TEST-002 | ../tests/alarm.feature | Stopping the alarm |\n"
                                          f"\n| AC | Unchecked |\n| --- | --- |\n| AC-TEST-001 | {text} |\n")
                    self.assertEqual(self.findings(spec_lint.scan([specs])), expected)

    def test_unchecked_rows_must_name_a_declared_ac_once(self) -> None:
        cases = {
            "unknown ac": ("| AC-TEST-009 | Something. |\n", [("evidence-unknown-ac", 9)]),
            "twice": ("| AC-TEST-001 | One. |\n| AC-TEST-001 | Two. |\n", [("evidence-duplicate", 10)]),
            "out of order": ("| AC-TEST-002 | One. |\n| AC-TEST-001 | Two. |\n", [("evidence-order", 10)]),
            "one cell": ("| AC-TEST-001 |\n", [("evidence-malformed", 9)]),
        }
        for label, (rows, expected) in cases.items():
            with self.subTest(case=label):
                with self.temporary_root() as name:
                    specs = self.evidence_fixture(Path(name))
                    self.write_map(specs, "| AC-TEST-002 | ../tests/alarm.feature | Stopping the alarm |\n"
                                          "\n| AC | Unchecked |\n| --- | --- |\n" + rows)
                    self.assertEqual(self.findings(spec_lint.scan([specs])), expected)

    def test_an_expected_that_names_a_test_or_file_warns(self) -> None:
        cases = {
            "The alarm stops within one second.": None,
            "The test fixture's alarm stops.": None,
            "Test `stop_alarm` passes.": "Test `stop_alarm` passes",
            "Tests \"stops\" and \"stays stopped\" pass.": "Tests \"stops\" and \"stays stopped\" pass",
            "The alarm stops, as alarm_test.rs shows.": "alarm_test.rs",
            "Tests \"stops\" in src/alarm.rs pass.": "Tests \"stops\" in src/alarm.rs pass",
            "The checks in src/alarm.rs hold.": "src/alarm.rs",
            "Scenario \"Stops\" in alarm.feature.": "alarm.feature",
            "The page registers sw.js as its service worker.": None,
            "The alarm.spec.ts cases hold.": "alarm.spec.ts",
            "The alarm stops; test_alarm.py agrees.": "test_alarm.py",
        }
        for expected, named in cases.items():
            with self.subTest(expected=expected):
                text = self.document("The alarm service shall stop.").replace(
                    "Expected: The agreed observation.", f"Expected: {expected}")
                result = self.scan_text(text)
                if named is None:
                    self.assertEqual(result.findings, [])
                else:
                    self.assertEqual(self.findings(result), [("expected-names-test", 8)])
                    self.assertIn(repr(named), result.findings[0].message)

    def test_an_oracle_must_not_be_a_test_and_its_citations_must_resolve(self) -> None:
        cases = {
            "The alarm specification.": [],
            "REQ-TEST-001 and the vendor's alarm guide.": [],
            "The share address `https://app.test/#r1` and the vendor's guide.": [],
            "The unit test asserts it.": [("oracle-names-test", 11)],
            "The values in tests/alarm.rs.": [("oracle-names-test", 11)],
            "REQ-TEST-404.": [("dangling-reference", 11)],
            "The owner's answer to Q-ALARM-1.": [("unresolved-oracle", 11)],
        }
        for oracle, expected in cases.items():
            with self.subTest(oracle=oracle):
                text = self.document("The alarm service shall stop.").replace(
                    "Oracle: The alarm specification.", f"Oracle: {oracle}")
                self.assertEqual(self.findings(self.scan_text(text)), expected)

    def test_a_boundary_that_names_code_files_or_dates_warns(self) -> None:
        cases = {
            "The booking service API.": None,
            "The cooking view, end to end through the import page.": None,
            "Core `cooking_view`.": "`",
            "Unit test of number_style::resolve.": "number_style",
            "recipe-core tests/temperatures.rs.": "temperatures.rs",
            "The payment page after a payment failed.": None,
            "Core API, 2026-11-12.": "2026-11-12",
        }
        for boundary, named in cases.items():
            with self.subTest(boundary=boundary):
                text = self.document("The alarm service shall stop.").replace(
                    "Boundary: The alarm service API.", f"Boundary: {boundary}")
                result = self.scan_text(text)
                if named is None:
                    self.assertEqual(result.findings, [])
                else:
                    self.assertEqual(self.findings(result), [("boundary-not-domain", 9)])
                    self.assertIn(repr(named), result.findings[0].message)

    def test_an_ac_without_a_boundary_is_an_error(self) -> None:
        text = self.document("The alarm service shall stop.").replace("Boundary: The alarm service API.\n", "")
        self.assertEqual(self.findings(self.scan_text(text)), [("missing-boundary", 7)])

if __name__ == "__main__":
    unittest.main()
