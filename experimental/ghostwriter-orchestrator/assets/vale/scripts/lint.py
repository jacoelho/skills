#!/usr/bin/env python3
"""Lint one existing Markdown document with an explicit, bounded Vale run.

Emit Vale JSON on stdout and diagnostics on stderr. Exit 0 means no lint
errors, 1 means lint errors, and 2 means the check could not run reliably.
Configuration selection belongs to the prose owner; no project files change.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("document", type=Path)
    profile = parser.add_mutually_exclusive_group()
    profile.add_argument("--config", type=Path, help="reviewed project configuration")
    profile.add_argument("--british", action="store_true", help="British article fallback")
    parser.add_argument("--vale", default="vale", help="Vale executable")
    parser.add_argument("--timeout", type=float, default=60, help="deadline in seconds, at most 60")
    args = parser.parse_args()
    if not 0 < args.timeout <= 60:
        parser.error("timeout must be greater than zero and at most 60 seconds")
    document = args.document.resolve()
    config = (args.config or ROOT / (".vale.article-british.ini" if args.british else ".vale.article.ini")).resolve()
    for description, path in (("document", document), ("configuration", config)):
        if not path.is_file():
            print(f"Vale check not run: missing {description}: {path}", file=sys.stderr)
            return 2
    if args.config is None and document.suffix not in {".md", ".markdown", ".mdown", ".markdn"}:
        print("Vale check not run: the bundled article profile requires a lowercase Markdown extension", file=sys.stderr)
        return 2
    executable = shutil.which(args.vale)
    if executable is None:
        print(f"Vale check not run: executable unavailable: {args.vale}", file=sys.stderr)
        return 2
    try:
        result = subprocess.run(
            [executable, "--no-global", f"--config={config}", "--output=JSON", str(document)],
            cwd=config.parent, capture_output=True, text=True, timeout=args.timeout, check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        print(f"Vale check not run: {exc}", file=sys.stderr)
        return 2
    sys.stdout.write(result.stdout)
    sys.stderr.write(result.stderr)
    if result.returncode in (0, 1):
        try:
            report = json.loads(result.stdout)
            if not isinstance(report, dict) or not all(isinstance(alerts, list) for alerts in report.values()):
                raise ValueError("expected a Vale JSON object of alert lists")
        except (ValueError, TypeError) as exc:
            print(f"Vale check not run reliably: {exc}", file=sys.stderr)
            return 2
        return result.returncode
    if result.returncode != 2:
        print(f"Vale check not run reliably: unexpected process status {result.returncode}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
