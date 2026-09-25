#!/usr/bin/env python3
"""Regression tests for the structural linter's documented contracts."""
from __future__ import annotations

import contextlib
import io
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

    def test_reports_active_skipped_and_unsupported_entries(self) -> None:
        with self.temporary_root() as root_name:
            root = Path(root_name)
            (root / "active.md").write_text(
                """<!-- spec-lint: active -->

### REQ-BOOK-001 — Cancel
Status: accepted
Statement: A pending booking can be cancelled.
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

    def test_nested_heading_does_not_extend_a_declaration(self) -> None:
        with self.temporary_root() as root_name:
            path = Path(root_name) / "contract.md"
            path.write_text(
                """<!-- spec-lint: active -->

### REQ-BOOK-001 — Cancel
Status: accepted
Statement: A pending booking can be cancelled.
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
        self.assertEqual(result.declarations, 2)
        self.assertEqual(result.exit_code(), 0)

    def test_overlapping_roots_count_skipped_entries_once(self) -> None:
        with self.temporary_root() as root_name:
            root = Path(root_name)
            nested = root / "nested"
            nested.mkdir()
            (nested / "active.md").write_text(
                """<!-- spec-lint: active -->

### REQ-BOOK-001
Status: proposed
Statement: A pending booking can be cancelled.
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
Statement: A pending booking can be cancelled.
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
