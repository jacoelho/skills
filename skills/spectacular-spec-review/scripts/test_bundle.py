#!/usr/bin/env python3
"""Contract tests for files the Spectacular skills ship together."""
from __future__ import annotations

import re
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import spec_lint  # noqa: E402


REVIEW = Path(__file__).resolve().parents[1]
SKILLS = REVIEW.parent
SIBLINGS = ("spectacular-bdd-gherkin", "spectacular-spec-grilling", "spectacular-spec-writing")
# Each skill is standalone, so these references are copied rather than linked.
SHARED_REFERENCES = ("references/ears.md", "references/mismatch.md")
LINTABLE_FENCE = re.compile(r"^```markdown spec-lint\n(.*?)^```$", re.MULTILINE | re.DOTALL)
# Any recognised field that still contains a bracket is unfilled template text.
UNFILLED_FIELD = re.compile(r"^(?:Status|Statement|Basis|References|Covers|Expected): .*\[")


def installed_sibling(name: str) -> Path:
    # Skip only for a standalone install; a present skill missing a file fails.
    directory = SKILLS / name
    if not directory.is_dir():
        raise unittest.SkipTest(f"{name} is not installed beside spectacular-spec-review")
    return directory


class BundleTests(unittest.TestCase):
    def test_shared_references_are_identical_across_installed_skills(self) -> None:
        for reference in SHARED_REFERENCES:
            canonical = (REVIEW / reference).read_bytes()
            for name in SIBLINGS:
                with self.subTest(reference=reference, skill=name):
                    directory = SKILLS / name
                    if not directory.is_dir():
                        self.skipTest(f"{name} is not installed")
                    copy = directory / reference
                    self.assertTrue(copy.is_file(), f"{copy} is missing")
                    self.assertEqual(copy.read_bytes(), canonical, f"{copy} differs from {REVIEW / reference}")

    def test_worked_examples_lint_clean_together_under_strict(self) -> None:
        examples = installed_sibling("spectacular-spec-writing") / "examples"
        for contract in ("booking-cancellation/contract.md", "stock/contract.md"):
            self.assertTrue((examples / contract).is_file(), f"{examples / contract} is missing")

        result = spec_lint.scan([examples])

        self.assertEqual(result.findings, [])
        self.assertEqual(result.exit_code(strict=True), 0)
        self.assertEqual(result.active_documents, 2)

    def test_booking_example_depends_on_the_stock_invariant_it_references(self) -> None:
        booking = installed_sibling("spectacular-spec-writing") / "examples" / "booking-cancellation"

        result = spec_lint.scan([booking])

        self.assertTrue(result.findings, "booking example no longer references the stock contract")
        self.assertEqual({f.code for f in result.findings}, {"dangling-reference"})
        for finding in result.findings:
            self.assertIn("INV-STOCK-001", finding.message)

    def test_unfilled_contract_template_fails_on_each_placeholder(self) -> None:
        template = installed_sibling("spectacular-spec-writing") / "assets" / "capability.md"
        unfilled = {
            number for number, line in enumerate(template.read_text(encoding="utf-8").splitlines(), 1)
            if UNFILLED_FIELD.match(line)
        }
        self.assertTrue(unfilled, "template has no unfilled recognised fields")

        result = spec_lint.scan([template])

        self.assertEqual(result.active_documents, 1)
        self.assertEqual(result.exit_code(), 1)
        # Exactly one placeholder error per unfilled field, and nothing cascades from them.
        self.assertEqual(
            sorted((f.code, f.line) for f in result.findings),
            sorted(("placeholder-value", number) for number in unfilled),
        )

    def test_linter_guide_examples_lint_clean(self) -> None:
        guide = REVIEW / "references" / "lint-format.md"
        examples = LINTABLE_FENCE.findall(guide.read_text(encoding="utf-8"))
        self.assertTrue(examples, f"{guide} has no ```markdown spec-lint example")
        for example in examples:
            with self.subTest(example=example.splitlines()[0]):
                with tempfile.TemporaryDirectory() as name:
                    path = Path(name) / "example.md"
                    path.write_text(f"{spec_lint.MARKER}\n\n{example}", encoding="utf-8")
                    result = spec_lint.scan([path])
                self.assertEqual(result.findings, [], example)
                self.assertEqual(result.exit_code(strict=True), 0)


if __name__ == "__main__":
    unittest.main()
