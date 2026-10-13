#!/usr/bin/env python3
"""Distribute the canonical EARS reference into standalone skill payloads."""

import argparse
import sys
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Report drift without writing files.")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    source = root / "spectacular-spec-writing/references/ears.md"
    try:
        content = source.read_bytes()
        different = []
        for skill in ("spectacular-spec-grilling", "spectacular-spec-review", "spectacular-bdd-gherkin"):
            target = root / skill / "references/ears.md"
            try:
                matches = target.read_bytes() == content
            except FileNotFoundError:
                matches = False
            if not matches:
                if args.check:
                    different.append(str(target.relative_to(root)))
                else:
                    target.parent.mkdir(parents=True, exist_ok=True)
                    target.write_bytes(content)
        if different:
            print("EARS reference differs or is missing: " + ", ".join(different), file=sys.stderr)
            return 1
    except OSError as error:
        print(f"Cannot synchronise EARS references: {error}", file=sys.stderr)
        return 2
    print("EARS references match." if args.check else "EARS references synchronised.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
