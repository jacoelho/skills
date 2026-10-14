#!/bin/sh
# Native Vale tests. No fallback to raw regex checks and no false success.
set -eu
ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$ROOT"
if ! command -v vale >/dev/null 2>&1; then
  printf '%s\n' 'Vale is not installed. Install Vale 3.24.0 before running the native tests.' >&2
  exit 127
fi
vale --version
python3 scripts/setup-dictionary.py --check
vale --no-global --config="$ROOT/.vale.ini" test --coverage styles tests/native
python3 scripts/test-profiles.py
python3 -m unittest discover -s tests/python -v
python3 -m unittest discover -s tests -p 'test_integration.py' -v
