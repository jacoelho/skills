#!/usr/bin/env python3
"""Install the pinned British dictionary. Python 3.9+, standard library only.

Downloads data files, not executable code. A network failure is an error, never
permission to enable the built-in American dictionary. --check is offline.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import os
from pathlib import Path
import sys
import tempfile
import urllib.error
import urllib.request
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
MAX_BYTES = 2_000_000


def git_blob_id(data: bytes) -> str:
    """Match Git's blob identity, not a plain file SHA-1."""
    return hashlib.sha1(b"blob " + str(len(data)).encode("ascii") + b"\0" + data).hexdigest()


def validate(data: bytes, entry: dict[str, Any]) -> None:
    if len(data) != entry["bytes"] or git_blob_id(data) != entry["git_blob_sha1"]:
        raise ValueError(f"Pinned content check failed for {entry['target']}")


def load_lock(path: Path) -> dict[str, Any]:
    lock = json.loads(path.read_text(encoding="utf-8"))
    if lock.get("repository") != "wooorm/dictionaries":
        raise ValueError("Unexpected dictionary repository")
    commit = lock.get("commit", "")
    if len(commit) != 40 or any(c not in "0123456789abcdef" for c in commit):
        raise ValueError("Dictionary commit must be a full Git commit ID")
    expected = {"en_GB.aff", "en_GB.dic", "en_GB.LICENSE"}
    files = lock.get("files", [])
    if len(files) != 3 or {e.get("target") for e in files} != expected:
        raise ValueError("Lock must contain the dictionary, affixes and licence")
    for entry in files:
        if entry["source"] not in {"dictionaries/en-GB/index.aff", "dictionaries/en-GB/index.dic", "dictionaries/en-GB/license"}:
            raise ValueError("Unexpected dictionary source path")
        if not isinstance(entry.get("bytes"), int) or not 0 < entry["bytes"] <= MAX_BYTES:
            raise ValueError("Invalid dictionary size")
        digest = entry.get("git_blob_sha1", "")
        if len(digest) != 40 or any(c not in "0123456789abcdef" for c in digest):
            raise ValueError("Invalid Git blob identity")
    return lock


def fetch(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": "ghostwriter-vale-dictionary/1.2.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        data = response.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError("Dictionary response exceeded size limit")
    return data


def collect(lock: dict[str, Any], destination: Path, check_only: bool = False) -> dict[str, bytes]:
    """Verify the entire set before the caller writes any downloaded files."""
    verified: dict[str, bytes] = {}
    for entry in lock["files"]:
        target = destination / entry["target"]
        if target.is_file():
            data = target.read_bytes()
            try:
                validate(data, entry)
                verified[entry["target"]] = data
                continue
            except ValueError:
                if check_only:
                    raise
        if check_only:
            raise ValueError(f"Missing pinned dictionary file: {target}. Run setup-dictionary.py first.")
        url = f"https://raw.githubusercontent.com/{lock['repository']}/{lock['commit']}/{entry['source']}"
        data = fetch(url)
        validate(data, entry)
        verified[entry["target"]] = data
    return verified


def install(verified: dict[str, bytes], destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    # Validate all files before reaching here, then replace each file atomically.
    # Do not run linting concurrently with dictionary installation.
    with tempfile.TemporaryDirectory(prefix=".dictionary-", dir=destination) as directory:
        staging = Path(directory)
        for name, data in verified.items():
            if Path(name).name != name:
                raise ValueError("Invalid target filename")
            (staging / name).write_bytes(data)
        for name in verified:
            os.replace(staging / name, destination / name)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="verify an existing installation without network access")
    args = parser.parse_args()
    try:
        lock = load_lock(ROOT / "dictionary.lock.json")
        destination = ROOT / "styles/config/dictionaries"
        verified = collect(lock, destination, args.check)
        if not args.check:
            install(verified, destination)
        print(f"Verified {len(verified)} British dictionary/licence files at commit {lock['commit']}.")
        return 0
    except (OSError, ValueError, KeyError, TypeError, urllib.error.URLError) as exc:
        print(f"Dictionary setup failed: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
