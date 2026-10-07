#!/usr/bin/env python3
"""Check local bundle structure. This does not evaluate an agent or fetch sources."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path


def main() -> int:
    root = Path(__file__).resolve().parents[1]
    problems: list[str] = []
    skill = root / "SKILL.md"
    text = skill.read_text(encoding="utf-8")
    if not text.startswith("---\n") or "\n---\n" not in text[4:]:
        problems.append("SKILL.md is missing front matter")
    if "name: programming-go-api-design\n" not in text:
        problems.append("SKILL.md has an unexpected name")
    if "description:" not in text.split("---", 2)[1]:
        problems.append("SKILL.md is missing a description")

    for page in root.rglob("*.md"):
        body = page.read_text(encoding="utf-8")
        for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", body):
            target = target.split("#", 1)[0]
            if not target or "://" in target or target.startswith("mailto:"):
                continue
            resolved = (page.parent / target).resolve()
            if not resolved.is_relative_to(root):
                problems.append(f"{page.relative_to(root)}: link escapes bundle: {target}")
            elif not resolved.exists():
                problems.append(f"{page.relative_to(root)}: missing link target: {target}")

    data = json.loads((root / "evals/cases.json").read_text(encoding="utf-8"))
    cases = data["cases"]
    ids: set[str] = set()
    for case in cases:
        for field in ("id", "mode", "prompt", "must", "must_not"):
            if not case.get(field):
                problems.append(f"evaluation case missing {field}: {case.get('id')}")
        if case["id"] in ids:
            problems.append(f"duplicate evaluation id: {case['id']}")
        ids.add(case["id"])
        if case["mode"] not in ("design", "review", "evolve"):
            problems.append(f"invalid mode: {case['id']}")
    if len(cases) != 12:
        problems.append(f"expected 12 evaluation cases, found {len(cases)}")

    if problems:
        for problem in problems:
            print(f"ERROR: {problem}", file=sys.stderr)
        return 1
    print(f"PASS: local structure, Markdown link targets, and {len(cases)} evaluation cases")
    print("Not checked: agent behaviour, external URLs, or the hypothetical parser implementation")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
