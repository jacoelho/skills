"""Exercise independently supplied acceptance values at the callable boundary."""

import argparse
import importlib
import json
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--implementation", choices=("good", "bad"), required=True)
    args = parser.parse_args()
    implementation = importlib.import_module(args.implementation)
    cases = json.loads(Path(__file__).with_name("expected.json").read_text())
    failures = []
    for case in cases:
        actual = implementation.download(case["path"], case["access"], "invoice-42")
        expected = (case["status"], case["body"])
        if actual != expected:
            failures.append({"case": case, "actual": actual})
    print(json.dumps({"implementation": args.implementation, "cases": len(cases),
                      "failures": failures}, indent=2))
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
