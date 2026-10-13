#!/usr/bin/env python3
"""Check opted-in Markdown declarations, EARS syntax, and traceability."""
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
FIELD_LABELS = r"Status|Statement|Basis|References|Covers|Expected"
FIELD = re.compile(rf"^({FIELD_LABELS}):[ \t]*(.*)$")
CLAUSE_SEPARATOR = re.compile(r",[ \t]+(?=(?:where|while|when|if|then|the)\b)", re.IGNORECASE)
OBLIGATION = re.compile(r"\bshall\b", re.IGNORECASE)
NAMED_FIELD = re.compile(r"^[A-Za-z][A-Za-z -]*:")
FORMATTED_LABEL = re.compile(rf"^(?:[`*_\[]|<[^>]+>)*(?P<label>{FIELD_LABELS})(?![A-Za-z0-9])", re.IGNORECASE)
CLOSING_TAG = re.compile(r"</[^>]+>")
FIELD_WRAPPER = re.compile(r"^(?:>[ \t]*|[-+*][ \t]+|\d+[.)][ \t]+|<[^>]+>[ \t]*)")
DECLARATION_LIKE = re.compile(
    rf"^(?:#{{1,6}}\s+|<h[1-6]\b[^>]*>)(?:[`*_\[]|<[^>]+>)*{PREFIXES}-",
    re.IGNORECASE,
)
TABLE_STATEMENT = re.compile(r"Statement[ \t]*(?::|$)", re.IGNORECASE)
TABLE_SEPARATOR = re.compile(r":?-+:?")
SETEXT_UNDERLINE = re.compile(r"(?:-+|=+)")
TABLE_BREAK = re.compile(r" {0,3}(?:>[ \t]?|[-+*][ \t]+|\d+[.)][ \t]+|(?:\*[ \t]*){3,}$|(?:_[ \t]*){3,}$|(?:-[ \t]*){3,}$)")


def unwrapped_lines(line: str) -> Iterable[str]:
    candidate = line.lstrip()
    yield candidate
    while wrapper := FIELD_WRAPPER.match(candidate):
        candidate = candidate[wrapper.end():]
        yield candidate


def link_suffix_end(text: str, start: int) -> int | None:
    """Consume a balanced link suffix without interpreting its destination."""
    opener = text[start]
    closer = ")" if opener == "(" else "]"
    depth = 1
    quote = ""
    index = start + 1
    while index < len(text):
        char = text[index]
        if char == "\\":
            index += 2
            continue
        if quote:
            if char == quote:
                quote = ""
        elif opener == "(" and (index == start + 1 or text[index - 1].isspace()) and char in {'"', "'", "<"}:
            quote = ">" if char == "<" else char
        elif char == opener:
            depth += 1
        elif char == closer:
            depth -= 1
            if depth == 0:
                return index + 1
        index += 1
    return None


def formatted_label(text: str) -> tuple[str, int] | None:
    match = FORMATTED_LABEL.match(text)
    if match is None:
        return None
    index = match.end()
    while index < len(text):
        if text[index] in "`*_]":
            index += 1
        elif closing := CLOSING_TAG.match(text, index):
            index = closing.end()
        elif text[index] in "([":
            end = link_suffix_end(text, index)
            if end is None:
                return None
            index = end
        else:
            break
    return match["label"].lower(), index


def field_like(line: str) -> bool:
    for candidate in unwrapped_lines(line):
        label = formatted_label(candidate)
        if label is not None and candidate[label[1]:].lstrip().startswith(":"):
            return True
    return False


def declaration_like(line: str) -> bool:
    return any(DECLARATION_LIKE.match(candidate) for candidate in unwrapped_lines(line))


def table_cells(line: str) -> list[str]:
    """Split on unescaped pipes; retain escaped text for label recognition."""
    cells = []
    start = index = 0
    while index < len(line):
        if line[index] == "\\":
            index += 2
            continue
        if line[index] == "|":
            cells.append(line[start:index].strip())
            start = index + 1
        index += 1
    if not cells:
        return [line.strip()]
    cells.append(line[start:].strip())
    if not cells[0]:
        cells.pop(0)
    if cells and not cells[-1]:
        cells.pop()
    return cells


def is_table_header(line: str, following_line: str) -> bool:
    # Setext headings take precedence over table and field-shaped-row checks.
    if SETEXT_UNDERLINE.fullmatch(following_line.strip()):
        return False
    cells = table_cells(line)
    separator_cells = table_cells(following_line)
    return (
        len(separator_cells) == len(cells)
        and all(TABLE_SEPARATOR.fullmatch(cell) for cell in separator_cells)
    )


def table_statement(line: str, *, header: bool, in_table: bool) -> bool:
    cells = table_cells(line)
    if header:
        for cell in cells:
            label = formatted_label(cell)
            if label is not None and label[0] == "statement" and (
                    not cell[label[1]:].strip() or cell[label[1]:].lstrip().startswith(":")):
                return True
    if not header and not in_table and not line.lstrip().startswith("|"):
        return False
    # Literal examples in illustrative rows are excluded from field checks.
    masked = mask_literals(line)
    for cell in table_cells(masked if masked is not None else line):
        if TABLE_STATEMENT.match(cell) or field_like(cell):
            return True
    return False


def mask_literals(text: str) -> str | None:
    """Hide quoted data from the grammar while preserving character positions."""
    masked = list(text)
    index = 0
    while index < len(text):
        delimiter = text[index]
        if delimiter not in {'"', '`'}:
            index += 1
            continue
        end = index + 1
        while end < len(text):
            if text[end] == "\\":
                end += 2
            elif text[end] == delimiter:
                break
            else:
                end += 1
        if end >= len(text):
            return None
        for position in range(index, end + 1):
            masked[position] = " " if position in {index, end} or text[position].isspace() else "_"
        index = end + 1
    return "".join(masked)


def ears_error(statement: str, *, invariant: bool) -> str | None:
    masked = mask_literals(statement)
    if masked is None:
        return "Close every double-quoted or backtick literal."
    if not masked.endswith("."):
        return "End the EARS statement with an unquoted full stop."
    body = masked[:-1]
    for index, char in enumerate(body):
        if char in "!?" or (char == "." and not (
                index > 0 and index + 1 < len(body)
                and body[index - 1].isascii() and body[index - 1].isalnum()
                and body[index + 1].isascii() and body[index + 1].isalnum())):
            return "Use one sentence; quote literal punctuation or abbreviations with ambiguous full stops."
    obligations = list(OBLIGATION.finditer(body))
    if len(obligations) != 1 or obligations[0][0] != "shall":
        return "Use exactly one unquoted lowercase 'shall' obligation."
    obligation = obligations[0]
    if not (obligation.start() > 0 and statement[obligation.start() - 1].isspace()
            and obligation.end() < len(body) and statement[obligation.end()].isspace()):
        return "Separate the system, 'shall', and response with whitespace."
    response = body[obligation.end():].strip()
    if not response or response == "not":
        return "State a non-empty response or prohibited effect after 'shall' or 'shall not'."
    if response.split(None, 1)[0].lower() == "not" and not response.startswith("not"):
        return "Use lowercase 'not' in a 'shall not' prohibition."
    parts = CLAUSE_SEPARATOR.split(body[:obligation.start()].strip())
    previous_rank = -1
    activation = ""
    ranks = {"where": 0, "while": 1, "when": 2, "if": 2}
    for index, part in enumerate(parts[:-1]):
        pieces = part.split(None, 1)
        keyword = pieces[0] if pieces else ""
        lower = keyword.lower()
        if lower not in ranks:
            return "Use only ordered Where, While, and When or If applicability clauses."
        expected = lower.capitalize() if index == 0 else lower
        if keyword != expected:
            return f"Use '{expected}' for this applicability keyword."
        if len(pieces) != 2 or not pieces[1].strip():
            return f"State a non-empty condition after '{keyword}'."
        if ranks[lower] <= previous_rank:
            return "Order clauses as configuration, state, then one event or unwanted condition; use each once."
        previous_rank = ranks[lower]
        if lower in {"when", "if"}:
            activation = lower
    system = parts[-1]
    prefix = "The" if len(parts) == 1 else ("then the" if activation == "if" else "the")
    prefix_words = prefix.split()
    system_words = system.split()
    if system_words[:len(prefix_words)] != prefix_words:
        return f"Introduce the responsible system with '{prefix}' in this pattern."
    if len(system_words) == len(prefix_words):
        return "Name the responsible system before 'shall'."
    if invariant and activation:
        return "An invariant may be configuration- or state-scoped, but cannot have a When or If activation clause."
    return None


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
        elif not explicit and path.name.startswith("."):
            skipped_hidden.add(path.absolute())
        elif not path.is_file() or (explicit and path.suffix.lower() != ".md"):
            if path not in unsupported_inputs:
                unsupported_inputs.add(path)
                result.add("error", "input-error", str(path), 0, "Expected a regular Markdown file or directory.")
        elif path.suffix.lower() == ".md":
            files.add(path.resolve())
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
                    candidate(Path(base) / name)
        else:
            candidate(path, explicit=True)
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
    invalid_fences: list[int] = []
    active = False
    for number, line in enumerate(lines, 1):
        match = FENCE.match(line)
        if fence_char:
            if match and match[1][0] == fence_char and len(match[1]) >= fence_size and not match[2].strip():
                fence_char = ""
            continue
        if match:
            if match[1][0] == "`" and "`" in match[2]:
                invalid_fences.append(number)
                continue
            fence_char, fence_size, fence_line = match[1][0], len(match[1]), number
            continue
        if line == MARKER:
            active = True
        visible.append((number, line))

    if not active:
        result.skipped_documents += 1
        return []
    result.active_documents += 1
    for number in invalid_fences:
        result.add("error", "invalid-fence", str(path), number,
                   "A backtick fence's info string cannot contain backticks; following declarations remain visible.")
    if fence_char:
        result.add("error", "unclosed-fence", str(path), fence_line, "Unclosed fenced code block limits scanning.")

    blocks: list[Block] = []
    current: Block | None = None
    statement_open = False
    table_active = False
    table_delimiter_line = 0
    previous_line = 0
    for position, (number, line) in enumerate(visible):
        # Short delimiter rows can resemble list markers but belong to the table.
        if number != previous_line + 1 or not line.strip() or (
                number != table_delimiter_line and TABLE_BREAK.match(line)):
            table_active = False
        previous_line = number
        heading = HEADING.match(line)
        if heading:
            level = len(heading[1])
            # Declaration fields are single-line content in the declaration's
            # own section. A nested or sibling heading starts a new section;
            # it must not leave later fields attached to the parent block.
            current = None
            statement_open = False
            table_active = False
            tokens = heading[2].split()
            token = tokens[0] if tokens else ""
            if not CANDIDATE.match(token) and declaration_like(line):
                result.add("error", "unsupported-declaration", str(path), number,
                           "Declare an unformatted identifier in a column-zero level 2–6 ATX heading.")
            if CANDIDATE.match(token):
                if level < 2 or not IDENTIFIER.fullmatch(token):
                    result.add("error", "malformed-id", str(path), number,
                               "Use a level 2–6 heading with a supported uppercase identifier.")
                    current = None
                else:
                    current = Block(token, str(path), number)
                    blocks.append(current)
            continue
        if declaration_like(line):
            current = None
            statement_open = False
            table_active = False
            result.add("error", "unsupported-declaration", str(path), number,
                       "Declare an unformatted identifier in a column-zero level 2–6 ATX heading.")
            continue
        following_line = ""
        if position + 1 < len(visible) and visible[position + 1][0] == number + 1:
            following_line = visible[position + 1][1]
        table_header = not table_active and is_table_header(line, following_line)
        setext_heading = not table_active and SETEXT_UNDERLINE.fullmatch(following_line.strip())
        unsupported_table_field = not setext_heading and table_statement(
            line, header=table_header, in_table=table_active,
        )
        table_active = table_active or table_header
        if table_header:
            table_delimiter_line = number + 1
        match = FIELD.match(line)
        if unsupported_table_field or (match and table_active):
            result.add("error", "unsupported-field", str(path), number,
                       "Declare fields outside tables; table content cannot define declaration fields.")
        elif match and current is not None:
            name, value = match.groups()
            statement_open = name == "Statement"
            if name in current.fields:
                result.add("error", "duplicate-field", str(path), number,
                           f"{current.identifier} repeats {name}.")
            else:
                current.fields[name] = (value.strip(), number)
            if name == "Statement" and not current.identifier.startswith(("REQ-", "INV-")):
                result.add("error", "invalid-statement-owner", str(path), number,
                           "Only REQ and INV declarations may define a Statement.")
        elif not table_active and field_like(line):
            result.add("error", "unsupported-field", str(path), number,
                       "Use a column-zero, correctly cased, single-line field inside a supported declaration.")
        elif NAMED_FIELD.match(line):
            statement_open = False
        elif statement_open and line.strip():
            result.add("error", "statement-continuation", str(path), number,
                       "Keep Statement on one line; put commentary in another named field or section.")
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
            else:
                error = ears_error(block.value("Statement"), invariant=kind == "INV")
                if error:
                    result.add("error", "invalid-ears", block.path, block.fields["Statement"][1],
                               f"{block.identifier}: {error}")
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
            print("No declaration, EARS syntax, or traceability findings. Semantic correctness and overlap were not assessed.")
    return result.exit_code(args.strict)


if __name__ == "__main__":
    sys.exit(main())
