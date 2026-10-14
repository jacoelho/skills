#!/usr/bin/env python3
"""Exercise complete profiles through Vale. Standard library only.

Run after dictionary setup. This script calls the real binary; it is not a
mock linter. It checks exit levels, not just whether pattern strings match.
"""
from __future__ import annotations
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def lint(profile: str, text: str) -> tuple[int, list[dict]]:
    with tempfile.TemporaryDirectory(prefix="vale-profile-") as tmp:
        document = Path(tmp) / "document.md"
        document.write_text(text, encoding="utf-8")
        result = subprocess.run(
            ["vale", "--no-global", f"--config={ROOT / profile}", "--output=JSON", str(document)],
            cwd=ROOT, text=True, capture_output=True, timeout=60, check=False,
        )
    if result.returncode not in (0, 1):
        raise RuntimeError(f"Vale could not run ({result.returncode}): {result.stderr or result.stdout}")
    if result.stderr.strip():
        raise RuntimeError(f"Unexpected Vale diagnostic: {result.stderr}")
    report = json.loads(result.stdout)
    if not isinstance(report, dict) or not all(isinstance(v, list) for v in report.values()):
        raise RuntimeError("Unexpected Vale JSON format")
    return result.returncode, [alert for alerts in report.values() for alert in alerts]


def main() -> None:
    if shutil.which("vale") is None:
        raise SystemExit("Vale is unavailable; profile tests were not run.")
    count = 0
    for profile in (".vale.ini", ".vale.final.ini", ".vale.metrics.ini"):
        code, alerts = lint(profile, "The colour and behaviour are correct.\n")
        assert not any(a["Check"] == "Technical.Spelling" for a in alerts), (profile, alerts)
        count += 1
        code, alerts = lint(profile, "The color is red.\n")
        assert any(a["Check"] == "Technical.Spelling" for a in alerts), (profile, alerts)
        count += 1
    for profile, severity, expected_exit in ((".vale.ini", "warning", 0), (".vale.final.ini", "error", 1)):
        code, alerts = lint(profile, "[[TODO]]\n")
        assert code == expected_exit, (profile, code, alerts)
        assert any(a["Check"] == "Workflow.EditorialMarkers" and a["Severity"] == severity for a in alerts), alerts
        count += 1
    code, alerts = lint(".vale.final.ini", "## Open questions\n\nThe retention period remains undecided.\n")
    assert code == 0 and not any(a["Check"] == "Workflow.EditorialMarkers" for a in alerts), alerts
    count += 1
    text = " ".join(["Institutionalisation"] * 40) + "."
    for profile, expected in ((".vale.ini", False), (".vale.metrics.ini", True)):
        _, alerts = lint(profile, text)
        assert any(a["Check"] == "Metrics.ReadingLevel" for a in alerts) == expected, alerts
        count += 1
    print(json.dumps({"native_profile_checks_passed": count}, indent=2))


if __name__ == "__main__":
    main()
