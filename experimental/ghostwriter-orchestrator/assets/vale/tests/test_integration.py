"""Exercise the installed lint boundary with real Vale, not copied patterns."""
from pathlib import Path
import json
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
RUNNER = ROOT / "scripts/lint.py"


class LintIntegrationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if shutil.which("vale") is None:
            raise RuntimeError("Vale is unavailable; integration checks cannot run")

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="ghostwriter-vale-test-")
        self.addCleanup(self.temp.cleanup)
        self.directory = Path(self.temp.name)
        self.document = self.directory / "article.md"
        self.document.write_text("The worker retries.\n")

    def run_lint(self, *args, document=None):
        return subprocess.run(
            [sys.executable, str(RUNNER), str(document or self.document), *map(str, args)],
            capture_output=True, text=True, timeout=10, check=False,
        )

    def alerts(self, result):
        return [alert for alerts in json.loads(result.stdout).values() for alert in alerts]

    def fake_executable(self, body):
        executable = self.directory / "fake-vale"
        executable.write_text(f"#!{sys.executable}\n{body}\n")
        executable.chmod(0o755)
        return executable

    def test_article_fallback_checks_surface_without_selecting_language(self):
        self.document.write_text(
            "The color and colour are fine.\n\nHere is the revised article.\n\n"
            "The the worker retries in order to recover.\n\n[[TODO]]\n"
        )
        result = self.run_lint()
        self.assertEqual(result.returncode, 0, result.stderr)
        alerts = self.alerts(result)
        checks = {alert["Check"] for alert in alerts}
        self.assertTrue({"Vale.Repetition", "Clarity.PlainLanguage", "Workflow.ProcessLeakage", "Workflow.EditorialMarkers"} <= checks, checks)
        self.assertFalse(any(check.startswith(("Technical.", "Requirements.", "Metrics.")) for check in checks), checks)
        self.assertFalse(any(alert["Severity"] == "error" for alert in alerts))

    def test_explicit_project_profile_overrides_fallback_without_modification(self):
        styles = self.directory / "styles/House"
        styles.mkdir(parents=True)
        rule = styles / "Local.yml"
        rule.write_text("extends: existence\nmessage: 'Inspect %s'\nlevel: error\ntokens:\n  - flarble\n")
        config = self.directory / ".vale.ini"
        config.write_text("StylesPath = styles\n[*.md]\nBasedOnStyles = House\n")
        originals = {path: path.read_bytes() for path in (rule, config)}
        text = "The flarble is here. Here is the revised article.\n"
        self.document.write_text(text)
        result = self.run_lint("--config", config)
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertEqual({alert["Check"] for alert in self.alerts(result)}, {"House.Local"})
        self.assertEqual(self.document.read_text(), text)
        for path, original in originals.items():
            self.assertEqual(path.read_bytes(), original)

    def test_final_profile_preserves_lint_error_status(self):
        self.document.write_text("[[TODO]]\n")
        result = self.run_lint("--config", ROOT / ".vale.final.ini")
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertTrue(any(alert["Check"] == "Workflow.EditorialMarkers" and alert["Severity"] == "error" for alert in self.alerts(result)))

    def test_missing_document_is_not_linted_as_literal_text(self):
        result = self.run_lint(document=self.directory / "nonexistent.md")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, "")
        self.assertIn("missing document", result.stderr)

    def test_fallback_rejects_files_outside_its_configured_format(self):
        for suffix in (".txt", ".MD"):
            with self.subTest(suffix=suffix):
                document = self.directory / ("article" + suffix)
                document.write_text("Here is the revised article.\n")
                result = self.run_lint(document=document)
                self.assertEqual(result.returncode, 2)
                self.assertEqual(result.stdout, "")
                self.assertIn("requires a lowercase Markdown extension", result.stderr)

    def test_missing_and_broken_configurations_are_runtime_failures(self):
        result = self.run_lint("--config", self.directory / "missing.ini")
        self.assertEqual(result.returncode, 2)
        self.assertIn("missing configuration", result.stderr)
        config = self.directory / "broken.ini"
        config.write_text("StylesPath = missing-styles\n[*.md]\nBasedOnStyles = Nonexistent\n")
        result = self.run_lint("--config", config)
        self.assertEqual(result.returncode, 2)
        self.assertTrue(result.stderr or result.stdout)

    def test_unavailable_binary_is_not_a_clean_report(self):
        result = self.run_lint("--vale", self.directory / "missing-vale")
        self.assertEqual(result.returncode, 2)
        self.assertEqual(result.stdout, "")
        self.assertIn("executable unavailable", result.stderr)

    def test_timed_out_check_is_not_a_clean_report(self):
        fake = self.fake_executable("import time\ntime.sleep(5)")
        result = self.run_lint("--vale", fake, "--timeout", "0.05")
        self.assertEqual(result.returncode, 2)
        self.assertIn("timed out", result.stderr)

    def test_invalid_report_is_not_a_successful_check(self):
        fake = self.fake_executable("print('not a Vale JSON report')")
        result = self.run_lint("--vale", fake)
        self.assertEqual(result.returncode, 2)
        self.assertIn("not run reliably", result.stderr)


if __name__ == "__main__":
    unittest.main()
