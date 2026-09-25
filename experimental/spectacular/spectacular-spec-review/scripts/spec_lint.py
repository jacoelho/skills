#!/usr/bin/env python3
"""Check opted-in Markdown identifiers and traceability, not requirement semantics."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Iterable

MARKER = "<!-- spec-lint: active -->"
PREFIXES = r"(?:REQ|INV|AC|DEC|Q|TERM|SRC)"
IDENTIFIER = re.compile(rf"{PREFIXES}(?:-[A-Z0-9]+)+\Z")
CANDIDATE = re.compile(rf"{PREFIXES}-")
HEADING = re.compile(r"^(#{1,6})[ \t]+(.+?)\s*#*\s*$")
FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
FIELD = re.compile(r"^(Status|Statement|Basis|References|Covers|Expected):[ \t]*(.*)$")


@dataclass
class Finding:
    severity: str
    code: str
    path: str
    line: int
    message: str


@dataclass
class Block:
    identifier: str
    path: str
    line: int
    level: int
    fields: dict[str, tuple[str, int]] = field(default_factory=dict)

    def value(self, name: str) -> str:
        return self.fields.get(name, ("", self.line))[0]


@dataclass
class Result:
    active_documents: int = 0
    skipped_documents: int = 0
    skipped_non_markdown: int = 0
    skipped_hidden: int = 0
    skipped_symlinks: int = 0
    unsupported_inputs: int = 0
    declarations: int = 0
    findings: list[Finding] = field(default_factory=list)

    def add(self, severity: str, code: str, path: str, line: int, message: str) -> None:
        self.findings.append(Finding(severity, code, path, line, message))

    def exit_code(self, strict: bool = False) -> int:
        if any(f.code in {"input-error", "read-error", "no-active-documents"} for f in self.findings):
            return 2
        if any(f.severity == "error" or strict for f in self.findings):
            return 1
        return 0


def collect_paths(inputs: Iterable[Path], result: Result) -> list[Path]:
    """Avoid duplicate scans and implicit traversal of symlinked paths."""
    files: set[Path] = set()
    skipped_links: set[Path] = set()
    skipped_non_markdown: set[Path] = set()
    skipped_hidden: set[Path] = set()
    unsupported_inputs: set[Path] = set()

    def candidate(path: Path, *, explicit: bool = False) -> None:
        if path.is_symlink():
            skipped_links.add(path.absolute())
        elif path.suffix.lower() == ".md":
            files.add(path.resolve())
        elif explicit:
            unsupported_inputs.add(path.absolute())
        else:
            skipped_non_markdown.add(path.absolute())

    for raw in inputs:
        # Reject traversal through a symlink in an explicitly supplied path too.
        path = raw.absolute()
        if any(part.is_symlink() for part in (path, *path.parents)):
            skipped_links.add(path)
            continue
        if not path.exists():
            result.add("error", "input-error", str(raw), 0, "Input does not exist.")
        elif path.is_file():
            if path.suffix.lower() != ".md":
                unsupported_inputs.add(path)
                result.add("error", "input-error", str(raw), 0, "Expected a Markdown file or directory.")
            else:
                candidate(path, explicit=True)
        elif path.is_dir():
            def walk_error(error: OSError) -> None:
                result.add("error", "read-error", str(error.filename or path), 0, str(error))

            for base, dirs, names in os.walk(path, followlinks=False, onerror=walk_error):
                retained = []
                for name in dirs:
                    child = Path(base) / name
                    if child.is_symlink():
                        skipped_links.add(child.absolute())
                    elif not name.startswith("."):
                        retained.append(name)
                    else:
                        skipped_hidden.add(child.absolute())
                dirs[:] = sorted(retained)
                for name in sorted(names):
                    child = Path(base) / name
                    if child.is_symlink():
                        skipped_links.add(child.absolute())
                    elif name.startswith("."):
                        skipped_hidden.add(child.absolute())
                    else:
                        candidate(child)
        else:
            unsupported_inputs.add(path)
            result.add("error", "input-error", str(raw), 0, "Unsupported input type.")
    result.skipped_non_markdown = len(skipped_non_markdown)
    result.skipped_hidden = len(skipped_hidden)
    result.skipped_symlinks = len(skipped_links)
    result.unsupported_inputs = len(unsupported_inputs)
    return sorted(files)


def parse_document(path: Path, result: Result) -> list[Block]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeError) as error:
        result.add("error", "read-error", str(path), 0, str(error))
        return []

    visible: list[tuple[int, str]] = []
    fence_char = ""
    fence_size = 0
    fence_line = 0
    active = False
    for number, line in enumerate(lines, 1):
        match = FENCE.match(line)
        if fence_char:
            if match and match[1][0] == fence_char and len(match[1]) >= fence_size and not match[2].strip():
                fence_char = ""
            continue
        if match:
            fence_char, fence_size, fence_line = match[1][0], len(match[1]), number
            continue
        if line == MARKER:
            active = True
        visible.append((number, line))

    if not active:
        result.skipped_documents += 1
        return []
    result.active_documents += 1
    if fence_char:
        result.add("error", "unclosed-fence", str(path), fence_line, "Unclosed fenced code block limits scanning.")

    blocks: list[Block] = []
    current: Block | None = None
    for number, line in visible:
        heading = HEADING.match(line)
        if heading:
            level = len(heading[1])
            # Declaration fields are single-line content in the declaration's
            # own section. A nested or sibling heading starts a new section;
            # it must not leave later fields attached to the parent block.
            current = None
            token = heading[2].split()[0]
            if CANDIDATE.match(token):
                if level < 2 or not IDENTIFIER.fullmatch(token):
                    result.add("error", "malformed-id", str(path), number,
                               "Use a level 2–6 heading with a supported uppercase identifier.")
                    current = None
                else:
                    current = Block(token, str(path), number, level)
                    blocks.append(current)
            continue
        match = FIELD.match(line)
        if current is not None and match:
            name, value = match.groups()
            if name in current.fields:
                result.add("error", "duplicate-field", str(path), number,
                           f"{current.identifier} repeats {name}.")
            else:
                current.fields[name] = (value.strip(), number)
    if not blocks:
        result.add("error", "no-declarations", str(path), 1,
                   "Active document has no supported declarations.")
    return blocks


def scan(inputs: Iterable[Path]) -> Result:
    result = Result()
    blocks: list[Block] = []
    for path in collect_paths(inputs, result):
        blocks.extend(parse_document(path, result))
    result.declarations = len(blocks)
    if not result.active_documents:
        result.add("error", "no-active-documents", "", 0,
                   "No active documents were checked; this is not a successful review.")
        return result

    definitions: dict[str, list[Block]] = {}
    for block in blocks:
        definitions.setdefault(block.identifier, []).append(block)
    for identifier, occurrences in definitions.items():
        if len(occurrences) > 1:
            locations = ", ".join(f"{b.path}:{b.line}" for b in occurrences)
            for block in occurrences:
                result.add("error", "duplicate-id", block.path, block.line,
                           f"{identifier} has multiple maintained homes: {locations}")

    covered: set[str] = set()
    for block in blocks:
        kind = block.identifier.split("-", 1)[0]
        if kind in {"REQ", "INV"}:
            if not block.value("Statement"):
                result.add("error", "missing-statement", block.path, block.line,
                           f"{block.identifier} needs a Statement field.")
            if block.value("Status") not in {"proposed", "accepted"}:
                result.add("error", "invalid-status", block.path, block.line,
                           f"{block.identifier} needs Status: proposed or Status: accepted.")
            if block.value("Status") == "accepted" and not block.value("Basis"):
                result.add("error", "missing-basis", block.path, block.line,
                           f"{block.identifier} claims acceptance without a recorded basis.")
        if kind == "AC":
            for name in ("Covers", "Expected"):
                if not block.value(name):
                    result.add("error", f"missing-{name.lower()}", block.path, block.line,
                               f"{block.identifier} needs a {name} field.")
        if "Covers" in block.fields and kind != "AC":
            result.add("error", "invalid-covers-owner", block.path, block.fields["Covers"][1],
                       "Only AC declarations may use Covers.")
        for name in ("References", "Covers"):
            if name not in block.fields:
                continue
            text, line = block.fields[name]
            targets = [part.strip() for part in text.split(",")]
            if not all(IDENTIFIER.fullmatch(target) for target in targets):
                result.add("error", "malformed-reference", block.path, line,
                           f"{name} must be a non-empty comma-separated list of local IDs.")
                continue
            for target in targets:
                matches = definitions.get(target, [])
                if not matches:
                    result.add("error", "dangling-reference", block.path, line, f"No declaration for {target}.")
                elif len(matches) > 1:
                    result.add("error", "ambiguous-reference", block.path, line,
                               f"{target} refers to more than one declaration.")
                elif name == "Covers":
                    if target.split("-", 1)[0] not in {"REQ", "INV"}:
                        result.add("error", "invalid-covers-target", block.path, line,
                                   f"Coverage must target REQ or INV, not {target}.")
                    elif kind == "AC" and block.value("Expected"):
                        covered.add(target)

    for block in blocks:
        if (block.identifier.startswith(("REQ-", "INV-"))
                and block.value("Status") == "accepted"
                and block.identifier not in covered):
            result.add("warning", "unlinked-acceptance", block.path, block.line,
                       f"No AC with an expected result declares coverage of {block.identifier}.")
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--json", action="store_true", help="Emit counts and findings as JSON.")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as a non-zero result.")
    args = parser.parse_args(argv)
    result = scan(args.paths)
    if args.json:
        print(json.dumps(asdict(result), indent=2, ensure_ascii=False))
    else:
        print(f"Checked {result.active_documents} active documents; {result.declarations} declarations; "
              f"skipped {result.skipped_documents} unmarked documents, "
              f"{result.skipped_non_markdown} non-Markdown entries, "
              f"{result.skipped_hidden} hidden entries, and {result.skipped_symlinks} symlinks; "
              f"rejected {result.unsupported_inputs} unsupported inputs.")
        for finding in result.findings:
            print(f"{finding.path}:{finding.line}: {finding.severity} {finding.code}: {finding.message}")
        if not result.findings:
            print("No structural findings. Semantic correctness and overlap were not assessed.")
    return result.exit_code(args.strict)


if __name__ == "__main__":
    sys.exit(main())
