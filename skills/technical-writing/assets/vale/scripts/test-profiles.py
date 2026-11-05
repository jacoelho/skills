#!/usr/bin/env python3
"""Exercise the bundled profile through Vale. Standard library only.

Run after dictionary setup. This calls the real binary, because severity
overrides in .vale.ini are invisible to the native rule tests.
"""
from __future__ import annotations
import json
from pathlib import Path
import shutil
import subprocess
import tempfile

ROOT = Path(__file__).resolve().parents[1]

# Triggers each rule family without any production marker.
ALERTING = """# Title

## Installing The Tool

The the color is robust. We retry in order to recover. The service MUST be scalable.

Here is the revised article. Certainly! It is done.

We delve into the design, which plays a pivotal role. Written by [YOUR NAME].

See [the docs](https://go.dev/doc?utm_source=chatgpt.com).

""" + " ".join(["word"] * 41) + ".\n"

# Wording the profile must leave alone.
# The last paragraph is a positive control, so a guard cannot pass because Register failed to load.
HUMAN = """# Retry policy

## Conclusion

Use a literal, not a regex. The organisation keeps the behaviour from 2019–2023, see pages 10–12.
Add the host to the Kerberos realm. Retry with the same key, ensuring idempotency.
The job may fail when the disk is full. Ultimately, the owner decides.
Let me know if the migration fails. I hope this helps. Would you like me to open a PR?
Open [YOUR ACCOUNT](https://example.com) first. [ADD] support for retries.
Register the bot as an AI provider. Attach Delve to the running process.
Separate words with underscores. The object is promoted to the next generation.
The operation represents a shift of two bits. The dashboard refreshes, reflecting the new values.
IPv6 is not widely available on our hosts. Do not just restart the pod but drain it first.
It is not only faster but also safer.

- ✓ passed → next

Run `delve` or:

```text
I hope this helps — delve 🚀
```

## Final thoughts

The design stands as a testament to care.
"""
# Each phrase is flagged by exactly one rule, so a finding is never reported twice.
ONE_OWNER = [
    "Let's delve into the design.", "The team shipped, underscoring its focus.",
    "The release shipped, showcasing the API.", "In today's digital landscape, teams ship.",
    "In today's rapidly evolving landscape, teams ship.", "The code plays a pivotal role.",
    "It stands as a testament to care.", "The tool is a game-changing, game changer.",
]
GUARDED = ("Register.", "Workflow.ProcessLeakage", "Workflow.GeneratedMarkup", "Workflow.Placeholder",
           "Clarity.UnsupportedQuality")


def lint(text: str) -> tuple[int, list[dict]]:
    with tempfile.TemporaryDirectory(prefix="vale-profile-") as tmp:
        document = Path(tmp) / "document.md"
        document.write_text(text, encoding="utf-8")
        result = subprocess.run(
            ["vale", "--no-global", f"--config={ROOT / '.vale.ini'}", "--output=JSON", str(document)],
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


def effective_levels() -> dict[str, str]:
    """Levels after .vale.ini overrides, for every rule the Markdown profile loads."""
    result = subprocess.run(
        ["vale", "--no-global", f"--config={ROOT / '.vale.ini'}", "ls-config"],
        cwd=ROOT, text=True, capture_output=True, timeout=60, check=True,
    )
    config = json.loads(result.stdout)
    (syntax,) = config["SBaseStyles"]
    # Built-in Vale rules have no file under styles/ and default to error.
    levels = {f"Vale.{rule}": "error" for rule in ("Spelling", "Terms", "Avoid", "Repetition")
              if config["SChecks"][syntax].get(f"Vale.{rule}", True) and "Vale" in config["SBaseStyles"][syntax]}
    for style in config["SBaseStyles"][syntax]:
        for rule in sorted((ROOT / "styles" / style).glob("*.yml")):
            line = next(l for l in rule.read_text(encoding="utf-8").splitlines() if l.startswith("level:"))
            levels[f"{style}.{rule.stem}"] = line.split(":", 1)[1].strip()
    levels.update(config["SLevels"][syntax])
    return levels


def main() -> None:
    if shutil.which("vale") is None:
        raise SystemExit("Vale is unavailable; profile tests were not run.")

    _, alerts = lint("The colour and behaviour are correct.\n")
    assert not any(a["Check"] == "Technical.Spelling" for a in alerts), alerts

    _, alerts = lint("The color is red.\n")
    assert any(a["Check"] == "Technical.Spelling" for a in alerts), alerts

    code, alerts = lint("## Open questions\n\nThe retention period remains undecided.\n")
    assert code == 0 and not any(a["Check"] == "Workflow.EditorialMarkers" for a in alerts), alerts

    code, alerts = lint(ALERTING)
    checks = {a["Check"] for a in alerts}
    expected = {
        "Technical.HeadingCase", "Technical.Spelling", "Vale.Repetition", "Clarity.LongSentence",
        "Clarity.PlainLanguage", "Clarity.UnsupportedQuality", "Requirements.VagueRequirement",
        "Workflow.ProcessLeakage", "Workflow.GeneratedMarkup", "Workflow.Placeholder",
        "Register.StockVocabulary", "Register.Significance",
    }
    assert expected <= checks, expected - checks
    assert code == 0 and not any(a["Severity"] == "error" for a in alerts), alerts

    levels = effective_levels()
    assert {rule for rule, level in levels.items() if level == "error"} == {"Workflow.EditorialMarkers"}, levels
    assert all(level == "suggestion" for rule, level in levels.items() if rule.startswith("Register.")), levels

    for phrase in ONE_OWNER:
        _, alerts = lint(phrase + "\n")
        owners = [a["Check"] for a in alerts if a["Check"].startswith(GUARDED)]
        assert len(owners) == len(set(owners)) and len(set(owners)) >= 1, (phrase, owners)
        spans = [range(a["Span"][0], a["Span"][1] + 1) for a in alerts if a["Check"].startswith(GUARDED)]
        assert all(not set(x) & set(y) for i, x in enumerate(spans) for y in spans[i + 1:]), (phrase, alerts)

    code, alerts = lint(HUMAN)
    flagged = [(a["Check"], a["Line"]) for a in alerts if a["Check"].startswith(GUARDED)]
    control = HUMAN.splitlines().index("The design stands as a testament to care.") + 1
    assert flagged == [("Register.Significance", control)], flagged
    assert code == 0, alerts

    code, alerts = lint(ALERTING + "\n[[TODO]]\n")
    assert code == 1, alerts
    assert {a["Check"] for a in alerts if a["Severity"] == "error"} == {"Workflow.EditorialMarkers"}, alerts
    print("profile checks passed")


if __name__ == "__main__":
    main()
