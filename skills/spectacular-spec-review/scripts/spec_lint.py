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
from typing import Callable, Iterable

MARKER = "<!-- spec-lint: active -->"
PREFIXES = r"(?:REQ|INV|AC|Q|TERM|SRC)"
IDENTIFIER = re.compile(rf"{PREFIXES}(?:-[A-Z0-9]+)+\Z")
IDENTIFIER_START = re.compile(rf"{PREFIXES}(?:-[A-Z0-9]+)+")
CANDIDATE = re.compile(rf"{PREFIXES}-")
HEADING = re.compile(r"^(#{1,6})[ \t]+(.+?)\s*#*\s*$")
FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
FIELD_LABELS = r"Statement|Basis|Rationale|Covers|Situation|Expected|Oracle|Boundary|Counterexample"
RULE_FIELDS = frozenset({"Statement", "Basis", "Rationale"})
AC_FIELDS = frozenset({"Covers", "Situation", "Expected", "Oracle", "Boundary", "Counterexample"})
# The fields each declaration kind may carry; any other field line in its section is unsupported.
KIND_FIELDS = {"REQ": RULE_FIELDS, "INV": RULE_FIELDS, "AC": AC_FIELDS, "TERM": frozenset({"Basis"})}
FIELD = re.compile(rf"^({FIELD_LABELS}):[ \t]*(.*)$")
CLAUSE_SEPARATOR = re.compile(r",[ \t]+(?=(?:where|while|when|if|then|the)\b)", re.IGNORECASE)
OBLIGATION = re.compile(r"\bshall\b", re.IGNORECASE)
NAMED_FIELD = re.compile(r"^[A-Za-z][A-Za-z -]*:(?:[ \t]|$)")
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
PLACEHOLDER = re.compile(r"\[[^\[\]]*\]")
# Words that let two competent implementations disagree on acceptance. Quote a
# term with double quotes or backticks when it is defined data, not judgement.
VAGUE_TERMS = (
    "fast", "quickly", "slow", "promptly", "timely", "soon", "efficient", "efficiently",
    "user-friendly", "easy", "simple", "intuitive", "seamless", "seamlessly", "flexible",
    "robust", "appropriate", "appropriately", "adequate", "adequately", "sufficient",
    "reasonable", "reasonably", "optimal", "minimal", "normally", "usually", "generally",
    "typically", "several", "many", "few", "etc", "and/or", "as needed", "as necessary",
    "if possible", "where possible", "as far as possible",
)
VAGUE_TERM = re.compile(r"(?<![\w-])(?:" + "|".join(re.escape(t) for t in VAGUE_TERMS) + r")(?![\w-])", re.IGNORECASE)
# IDs a Statement or rule-table cell may cite. A Q belongs in Basis, never in
# the obligation itself, so it is not resolved here.
CITED_ID = re.compile(r"(?<![\w-])(?:REQ|INV|AC|TERM|SRC)(?:-[A-Z0-9]+)+(?![\w-])")
QUESTION_ID = re.compile(r"(?<![\w-])Q(?:-[A-Z0-9]+)+(?![\w-])")
DECISION_RECORD_SUFFIX = ".decisions.md"
DECISION_HEADING = re.compile(r"(Q(?:-[A-Z0-9]+)+)(?:[ \t]|\Z)")
# A decision record's level-2 sections; an entry's section is its state.
DECISION_SECTIONS = ("Policies", "Open", "Decided")
# One Basis citation: a decision or source ID, optionally narrowed to a section.
BASIS_CITATION = re.compile(r"((?:Q|SRC)(?:-[A-Z0-9]+)+)(?:[ \t]+§[ \t]+\S.*)?\Z")
RULE_TABLE_NAME = re.compile(r"\brule table\b", re.IGNORECASE)
OTHERWISE = re.compile(r"otherwise\.?", re.IGNORECASE)
LONG_STATEMENT_WORDS = 60
CASE_TABLE_REFERENCE = "every row of the case table"
EVIDENCE_SUFFIX = ".evidence.md"
EVIDENCE_HEADER = ["AC", "File", "Test"]
UNCHECKED_HEADER = ["AC", "Unchecked"]
EVIDENCE_MAX_BYTES = 1 << 20
SCRIPT_SUFFIXES = {".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx", ".mts", ".cts"}
# Candidates only: a Boundary names where a result is observed, in domain terms, so
# code names, file names, and dates point at the wrong thing.
CODE_SUFFIX = r"\.(?:rs|ts|tsx|js|jsx|mjs|py|go|java|kt|rb|cs|php|swift|vue)\b"
CODE_IN_BOUNDARY = re.compile(
    r"`|::|\b[a-z0-9]+_[a-z0-9_]+\b"
    rf"|\b[\w.-]+(?:{CODE_SUFFIX}|\.feature\b)"
    r"|\b\d{4}-\d{2}-\d{2}\b",
    re.IGNORECASE)
TEST_FILE = (rf"\b[\w.-]*(?:test|spec)[\w.-]*{CODE_SUFFIX}"
             r"|\b[\w.-]+\.feature\b"
             rf"|\b[\w.-]+/[\w./-]*{CODE_SUFFIX}")
TEST_IN_EXPECTED = re.compile(r"\btests?\b(?:[^.;]|\.(?=\S))*\bpass(?:es)?\b|" + TEST_FILE, re.IGNORECASE)
TEST_FILE_PATTERN = re.compile(TEST_FILE, re.IGNORECASE)
# In an Unchecked part, "the listed check" describes the rows, which the map already states.
LISTED_CHECK = re.compile(r"\blisted\b", re.IGNORECASE)
TEST_WORD = re.compile(r"\btests?\b", re.IGNORECASE)
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
    for cell in table_cells(literal_free(line)):
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


def literal_free(text: str) -> str:
    masked = mask_literals(text)
    return text if masked is None else masked


def vague_terms(statement: str) -> list[str]:
    masked = mask_literals(statement)
    if masked is None:
        return []
    return list(dict.fromkeys(match.group(0).lower() for match in VAGUE_TERM.finditer(masked)))


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
            if index == 0 and lower != "the":
                return "Begin with Where, While, When, or If, or write a ubiquitous 'The <system> shall' statement."
            # Parts split only at reserved delimiters. After a ubiquitous subject
            # the offending keyword starts the next part.
            delimiter = keyword if index else parts[1].split(None, 1)[0]
            if delimiter.lower() in ranks:
                # Quoting would bury a real clause inside the system name.
                return (f"Move the '{delimiter.lower()}' clause before the system; "
                        "applicability clauses precede 'the <system> shall'.")
            return (f"', {delimiter}' before 'shall' is a reserved clause delimiter; "
                    "rephrase the preceding clause or quote the literal text.")
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
    if system_words and system_words[0].lower() in ranks:
        return f"Put a comma between the '{system_words[0]}' clause and the responsible system."
    if system_words[:1] == ["then"] and activation != "if":
        return "Use 'then' only after an If clause; introduce the system with 'the'."
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
class Table:
    line: int
    columns: int
    rule: bool
    rows: list[tuple[int, list[str]]] = field(default_factory=list)


@dataclass
class Block:
    identifier: str
    path: str
    line: int
    fields: dict[str, tuple[str, int]] = field(default_factory=dict)
    # Fields holding an unfilled template placeholder; reported once as
    # placeholder-value and otherwise treated as present but empty.
    placeholders: set[str] = field(default_factory=set)
    tables: list[Table] = field(default_factory=list)
    # The REQ or INV whose section holds this declaration's heading, for a nested AC.
    parent: str | None = None

    @property
    def rule_tables(self) -> list[Table]:
        return [table for table in self.tables if table.rule]

    @property
    def case_tables(self) -> list[Table]:
        return [table for table in self.tables if not table.rule]

    def value(self, name: str) -> str:
        return self.fields.get(name, ("", self.line))[0]

    def absent(self, name: str) -> bool:
        return not self.value(name) and name not in self.placeholders


def kind_of(identifier: str) -> str:
    return identifier.split("-", 1)[0]


def ac_kind(block: Block) -> str:
    return "case-table" if block.case_tables else "ordinary"


AC_CASE_FIELDS = {"ordinary": ("Situation", "Oracle", "Counterexample"),
                  "case-table": ("Oracle", "Counterexample")}
AC_CASE_FIELD_CODE = {"Situation": "missing-situation", "Oracle": "missing-oracle",
                      "Counterexample": "missing-counterexample"}
AC_CASE_FIELD_PURPOSE = {"Situation": "the state and input the result depends on",
                         "Oracle": "the independent basis for Expected",
                         "Counterexample": "a violation the check must detect"}


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
    evidence_maps: int = 0
    evidence: dict[str, list[dict[str, str]]] = field(default_factory=dict)
    unchecked: dict[str, str] = field(default_factory=dict)

    def add(self, severity: str, code: str, path: str, line: int, message: str) -> None:
        self.findings.append(Finding(severity, code, path, line, message))

    def exit_code(self, strict: bool = False) -> int:
        if any(f.code in {"input-error", "read-error", "no-active-documents"} for f in self.findings):
            return 2
        if any(f.severity == "error" or strict for f in self.findings):
            return 1
        return 0


def collect_paths(inputs: Iterable[Path], result: Result) -> list[Path]:
    """Resolve explicit inputs; skip symlinks met during traversal.

    Every skipped link is counted. A link is reported only when its target may
    hold Markdown that this run did not check.
    """
    files: set[Path] = set()
    walked: set[Path] = set()
    skipped_links: set[Path] = set()
    skipped_non_markdown: set[Path] = set()
    skipped_hidden: set[Path] = set()
    unsupported_inputs: set[Path] = set()

    def reject(path: Path, shown: Path) -> None:
        if path not in unsupported_inputs:
            unsupported_inputs.add(path)
            result.add("error", "input-error", str(shown), 0, "Expected a regular Markdown file or directory.")

    def candidate(path: Path) -> None:
        if path.name.startswith("."):
            skipped_hidden.add(path.absolute())
        elif path.is_symlink():
            skipped_links.add(path.absolute())
        elif not path.is_file():
            reject(path, path)
        elif path.suffix.lower() == ".md":
            files.add(path)
        else:
            skipped_non_markdown.add(path.absolute())

    for raw in inputs:
        # A named input states intent, so symlinks in it are followed and the
        # target decides eligibility. Links found while walking are not
        # followed: they could pull in unrelated content.
        try:
            path = raw.resolve()
        except (OSError, RuntimeError) as error:  # RuntimeError: link loop before Python 3.13.
            result.add("error", "input-error", str(raw), 0, f"Cannot resolve input: {error}")
            continue
        if not path.exists():
            result.add("error", "input-error", str(raw), 0, "Input does not exist.")
        elif path.is_dir():
            def walk_error(error: OSError) -> None:
                result.add("error", "read-error", str(error.filename or path), 0, str(error))

            for base, dirs, names in os.walk(path, followlinks=False, onerror=walk_error):
                walked.add(Path(base))
                retained = []
                for name in dirs:
                    child = Path(base) / name
                    if name.startswith("."):
                        skipped_hidden.add(child.absolute())
                    elif child.is_symlink():
                        skipped_links.add(child.absolute())
                    else:
                        retained.append(name)
                dirs[:] = sorted(retained)
                for name in sorted(names):
                    candidate(Path(base) / name)
        elif path.is_file() and path.suffix.lower() == ".md":
            files.add(path)
        else:
            reject(path, raw)

    def unchecked(link: Path) -> bool:
        try:
            target = link.resolve(strict=True)
        except (OSError, RuntimeError):  # Dangling, or a loop (RuntimeError before Python 3.13).
            return True
        if target.is_dir():
            return target not in walked
        if target.is_file():
            return target.suffix.lower() == ".md" and target not in files
        return True

    # Decided after every input is collected, so input order cannot matter.
    for link in sorted(skipped_links):
        if unchecked(link):
            result.add("warning", "skipped-symlink", str(link), 0,
                       "Symbolic link skipped during traversal and its target was not checked; "
                       "pass the target explicitly to check it.")
    result.skipped_non_markdown = len(skipped_non_markdown)
    result.skipped_hidden = len(skipped_hidden)
    result.skipped_symlinks = len(skipped_links)
    result.unsupported_inputs = len(unsupported_inputs)
    return sorted(files)


@dataclass(frozen=True, order=True)
class EvidenceRow:
    ac: str
    file: str
    test: str
    map_path: str = field(default="", compare=False)
    line: int = field(default=0, compare=False)


@dataclass(frozen=True, order=True)
class UncheckedPart:
    ac: str
    text: str
    map_path: str = field(default="", compare=False)
    line: int = field(default=0, compare=False)


@dataclass
class EvidenceMap:
    title: str | None = None
    rows: list[EvidenceRow] = field(default_factory=list)
    unchecked: list[UncheckedPart] = field(default_factory=list)


def is_ac_id(text: str) -> bool:
    return text.startswith("AC-") and bool(IDENTIFIER.fullmatch(text))


def evidence_file(map_path: Path | str, file: str) -> Path:
    return Path(os.path.normpath(Path(map_path).parent / file))


def format_evidence(title: str, rows: Iterable[EvidenceRow], unchecked: Iterable[UncheckedPart] = ()) -> str:
    def cell(text: str) -> str:
        return text.replace("|", "\\|")

    lines = [title, "", "| " + " | ".join(EVIDENCE_HEADER) + " |", "| --- | --- | --- |"]
    lines += [f"| {row.ac} | {cell(row.file)} | {cell(row.test)} |" for row in sorted(rows)]
    parts = sorted(unchecked)
    if parts:
        lines += ["", "| " + " | ".join(UNCHECKED_HEADER) + " |", "| --- | --- |"]
        lines += [f"| {part.ac} | {cell(part.text)} |" for part in parts]
    return "\n".join(lines) + "\n"


def test_name_pattern(test_file: Path, name: str) -> str:
    if test_file.suffix == ".feature":
        # A title is whole, so a scenario renamed by appending words leaves its row stale.
        return r"(?m)^[ \t]*Scenario(?: Outline| Template)?:[ \t]*" + re.escape(name) + r"[ \t]*$"
    quoted = r"([\"'`])" + re.escape(name) + r"\1"
    if re.fullmatch(r"\w+", name) and test_file.suffix in SCRIPT_SUFFIXES:
        # A script test is a string; a type-check fixture there is a declared identifier.
        return quoted + r"|\b(?:function|const|let|var|type|interface|class)\s+" + re.escape(name) + r"(?!\w)"
    if re.fullmatch(r"\w+", name):
        return r"(?<!\w)" + re.escape(name) + r"(?!\w)"
    # Any other name is a string literal, so the quotes bound it: "keeps quiet" is not "keeps quiet forever".
    return quoted


def names_test(test_file: Path, text: str, name: str) -> bool:
    return re.search(test_name_pattern(test_file, name), text) is not None


def parse_evidence(path: Path, result: Result) -> EvidenceMap:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeDecodeError) as error:
        result.add("error", "read-error", str(path), 0, str(error))
        return EvidenceMap()
    result.evidence_maps += 1
    parsed = EvidenceMap()
    stage = "title"
    for number, line in enumerate(lines, 1):
        if not line.strip():
            continue
        cells = [cell.replace("\\|", "|") for cell in table_cells(line)] if line.lstrip().startswith("|") else []
        delimiter = bool(cells) and all(TABLE_SEPARATOR.fullmatch(cell) for cell in cells)
        if stage == "title" and line.startswith("# "):
            parsed.title = line
            stage = "header"
        elif stage in {"title", "header"} and cells == EVIDENCE_HEADER:
            stage = "delimiter"
        elif stage == "delimiter" and len(cells) == 3 and delimiter:
            stage = "rows"
        elif stage == "rows" and cells == UNCHECKED_HEADER:
            stage = "unchecked-delimiter"
        elif stage == "unchecked-delimiter" and len(cells) == 2 and delimiter:
            stage = "unchecked"
        elif stage in {"rows", "unchecked"} and len(cells) == (3 if stage == "rows" else 2) and all(cells):
            ac = cells[0]
            if not is_ac_id(ac):
                result.add("error", "evidence-malformed", str(path), number, f"{ac!r} is not an AC ID.")
            elif stage == "unchecked":
                parsed.unchecked.append(UncheckedPart(ac, cells[1], str(path), number))
            elif cells[1].startswith(("/", "~")) or "\\" in cells[1]:
                result.add("error", "evidence-malformed", str(path), number,
                           f"{ac} {cells[1]}: write the path relative to this map, with forward slashes.")
            else:
                parsed.rows.append(EvidenceRow(ac, cells[1], cells[2], str(path), number))
        else:
            expected = {"title": "a title or the header", "header": "the header", "delimiter": "the delimiter row",
                        "rows": "a row of three non-empty cells or the | AC | Unchecked | header",
                        "unchecked-delimiter": "the delimiter row", "unchecked": "a row of two non-empty cells"}[stage]
            result.add("error", "evidence-malformed", str(path), number,
                       f"Expected {expected}; got {line.strip()[:80]!r}.")
    return parsed


def evidence_target(row: EvidenceRow) -> str:
    return f"{row.ac} {row.file} {row.test!r}"


def read_test_file(path: Path) -> str:
    if not path.is_file():
        raise OSError("not a regular file")
    if path.stat().st_size > EVIDENCE_MAX_BYTES:
        raise OSError(f"larger than {EVIDENCE_MAX_BYTES} bytes")
    return path.read_text(encoding="utf-8")


def check_order(items: list[EvidenceRow] | list[UncheckedPart], result: Result,
                describe: Callable[..., str]) -> None:
    previous: dict[str, EvidenceRow | UncheckedPart] = {}
    for item in items:
        if item.map_path in previous and item < previous[item.map_path]:
            result.add("warning", "evidence-order", item.map_path, item.line,
                       f"{describe(item)} is out of order; sort rows by their cells from left to right.")
        previous[item.map_path] = item


def check_evidence(maps: list[EvidenceMap], blocks: list[Block], definitions: dict[str, list[Block]],
                   untested: bool, result: Result) -> None:
    rows = [row for evidence in maps for row in evidence.rows]
    parts = [part for evidence in maps for part in evidence.unchecked]
    check_order(rows, result, evidence_target)
    check_order(parts, result, lambda part: f"{part.ac} unchecked part")
    seen: set[EvidenceRow] = set()
    texts: dict[Path, str | Exception] = {}
    rows_by_ac: dict[str, list[EvidenceRow]] = {}
    listed: set[str] = set()
    for row in rows:
        if row in seen:
            result.add("error", "evidence-duplicate", row.map_path, row.line, f"{evidence_target(row)} is listed twice.")
            continue
        seen.add(row)
        if row.ac not in definitions:
            result.add("error", "evidence-unknown-ac", row.map_path, row.line,
                       f"{evidence_target(row)}: no checked contract declares {row.ac}.")
            continue
        listed.add(row.ac)
        target = evidence_file(row.map_path, row.file)
        if target not in texts:
            try:
                texts[target] = read_test_file(target)
            except (OSError, UnicodeDecodeError) as error:
                texts[target] = error
        text = texts[target]
        if isinstance(text, Exception):
            result.add("error", "evidence-file", row.map_path, row.line, f"{evidence_target(row)}: {text}.")
            continue
        if not names_test(target, text, row.test):
            result.add("error", "evidence-test-missing", row.map_path, row.line,
                       f"{evidence_target(row)}: the test name is not in the file; update the row.")
            continue
        rows_by_ac.setdefault(row.ac, []).append(row)
    # A name with a space or underscore is distinctive enough to find inside prose.
    listed_names = sorted({row.test for row in rows if re.search(r"[\s_]", row.test)}, key=len, reverse=True)
    unchecked: dict[str, str] = {}
    for part in parts:
        if part.ac in unchecked:
            result.add("error", "evidence-duplicate", part.map_path, part.line,
                       f"{part.ac} has more than one unchecked part; state them in one cell.")
        elif part.ac not in definitions:
            result.add("error", "evidence-unknown-ac", part.map_path, part.line,
                       f"{part.ac} unchecked part: no checked contract declares {part.ac}.")
        else:
            unchecked[part.ac] = part.text
            named = next((name for name in listed_names if name in part.text), None)
            if named is None:
                named = mentioned_test(part.text)
            if named is None:
                rows_mention = LISTED_CHECK.search(literal_free(part.text))
                named = rows_mention.group(0) if rows_mention else None
            if named:
                result.add("warning", "unchecked-names-test", part.map_path, part.line,
                           f"{part.ac} unchecked part mentions {named!r}; state only what is unchecked, in domain "
                           "terms, and any check outside the tests (review, a scheduled job, another AC), since "
                           "the rows already say what the tests check and a test change never edits this text.")
    for block in blocks:
        if not block.identifier.startswith("AC-"):
            continue
        found = rows_by_ac.get(block.identifier, [])
        result.evidence[block.identifier] = [
            {"file": row.file, "test": row.test, "map": f"{row.map_path}:{row.line}"} for row in found]
        gap = unchecked.get(block.identifier)
        if gap is not None:
            result.unchecked[block.identifier] = gap
        if block.identifier in listed and not found:
            continue
        if not untested:
            continue
        elif not found:
            result.add("warning", "untested-ac", block.path, block.line,
                       f"No evidence map row names a test for {block.identifier}."
                       + (f" Unchecked: {gap}" if gap else ""))
        elif gap is not None:
            result.add("warning", "partial-ac", block.path, block.line,
                       f"{block.identifier}: no listed test checks this part: {gap}")


def malformed_id_message(token: str, level: int) -> str:
    start = IDENTIFIER_START.match(token)
    rest = token[start.end():] if start else ""
    # A hyphen or alphanumeric remainder is a malformed segment, not a title.
    if start and not (rest[:1].isalnum() or rest[:1] == "-"):
        identifier = start[0]
        if level < 2:
            return f"Declare {identifier} in a level 2–6 heading."
        if rest:
            return (f"Separate {identifier} from the title with whitespace, "
                    f"for example '{'#' * level} {identifier} - Title'.")
    return "Use a level 2–6 heading with a supported uppercase identifier."


def name_not_allowed(block: Block, name: str) -> bool:
    return name not in KIND_FIELDS.get(kind_of(block.identifier), frozenset())


@dataclass
class Visible:
    """The lines outside fenced code blocks, numbered from 1, with the fence defects found."""
    lines: list[tuple[int, str]]
    invalid_fences: list[int]
    unclosed_fence: int


def visible_lines(lines: list[str]) -> Visible:
    visible: list[tuple[int, str]] = []
    fence_char = ""
    fence_size = 0
    fence_line = 0
    invalid_fences: list[int] = []
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
        visible.append((number, line))
    return Visible(visible, invalid_fences, fence_line if fence_char else 0)


@dataclass(frozen=True)
class Section:
    """A heading and the lines it governs: from its line to the line before the next heading at its level or above."""
    level: int
    title: str
    start: int
    end: int

    @property
    def token(self) -> str:
        parts = self.title.split()
        return parts[0] if parts else ""


def outline(lines: list[str]) -> list[Section]:
    """Every ATX heading outside fences, in order, with the span of its section."""
    headings = [(number, len(m[1]), m[2]) for number, line in visible_lines(lines).lines if (m := HEADING.match(line))]
    sections = []
    for index, (number, level, title) in enumerate(headings):
        end = next((later - 1 for later, other, _ in headings[index + 1:] if other <= level), len(lines))
        sections.append(Section(level, title, number, end))
    return sections


def parse_document(path: Path, result: Result) -> list[Block]:
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeError) as error:
        result.add("error", "read-error", str(path), 0, str(error))
        return []

    scanned = visible_lines(lines)
    visible = scanned.lines
    invalid_fences = scanned.invalid_fences
    fence_line = scanned.unclosed_fence
    active = any(line.rstrip() == MARKER for _, line in visible)

    if not active:
        result.skipped_documents += 1
        return []
    result.active_documents += 1
    for number in invalid_fences:
        result.add("error", "invalid-fence", str(path), number,
                   "A backtick fence's info string cannot contain backticks; following declarations remain visible.")
    if fence_line:
        result.add("error", "unclosed-fence", str(path), fence_line, "Unclosed fenced code block limits scanning.")

    blocks: list[Block] = []
    current: Block | None = None
    statement_open = False
    # After a rejected declaration heading, its fields would only repeat that
    # error as orphan-field findings.
    rejected_section = False
    table_active = False
    table_delimiter_line = 0
    table: Table | None = None
    # Open headings, innermost last, each with the declaration it introduced, if any.
    headings: list[tuple[int, Block | None]] = []
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
            rejected_section = False
            table_active = False
            table = None
            while headings and headings[-1][0] >= level:
                headings.pop()
            enclosing_level, enclosing = headings[-1] if headings else (0, None)
            tokens = heading[2].split()
            token = tokens[0] if tokens else ""
            if not CANDIDATE.match(token) and declaration_like(line):
                rejected_section = True
                result.add("error", "unsupported-declaration", str(path), number,
                           "Declare an unformatted identifier in a column-zero level 2–6 ATX heading.")
            if CANDIDATE.match(token):
                if level < 2 or not IDENTIFIER.fullmatch(token):
                    rejected_section = True
                    result.add("error", "malformed-id", str(path), number, malformed_id_message(token, level))
                else:
                    current = Block(token, str(path), number)
                    if (enclosing is not None and enclosing_level == level - 1
                            and kind_of(enclosing.identifier) in {"REQ", "INV"}):
                        current.parent = enclosing.identifier
                    blocks.append(current)
            headings.append((level, current))
            continue
        if declaration_like(line):
            current = None
            statement_open = False
            rejected_section = True
            table_active = False
            table = None
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
        if not table_active and table is not None:
            # Text between a rule table and the next field still continues the
            # Statement, so a rule cannot hide below the table.
            statement_open = statement_open or table.rule
            table = None
        table_active = table_active or table_header
        if table_header:
            table_delimiter_line = number + 1
            header_cells = table_cells(line)
            if (statement_open and current is not None
                    and current.identifier.startswith(("REQ-", "INV-"))
                    and not unsupported_table_field
                    and header_cells and header_cells[0].lower() == "order"):
                # Only a table directly under the Statement is a rule table; any
                # other table after a Statement is still a continuation error.
                table = Table(number, len(header_cells), rule=True)
                current.tables.append(table)
                statement_open = False
                continue
            if current is not None and current.identifier.startswith("AC-") and not unsupported_table_field:
                table = Table(number, len(header_cells), rule=False)
                current.tables.append(table)
        elif table is not None and number > table_delimiter_line:
            table.rows.append((number, table_cells(line)))
        match = FIELD.match(line)
        if unsupported_table_field or (match and table_active):
            result.add("error", "unsupported-field", str(path), number,
                       "Declare fields outside tables; table content cannot define declaration fields.")
        elif match and current is not None and name_not_allowed(current, match[1]):
            statement_open = False
            result.add("error", "unsupported-field", str(path), number,
                       f"{current.identifier}: {kind_of(current.identifier)} declarations do not carry {match[1]}.")
        elif match and current is not None:
            name, value = match.groups()
            statement_open = name == "Statement"
            value = value.strip()
            if name in current.fields:
                result.add("error", "duplicate-field", str(path), number,
                           f"{current.identifier} repeats {name}.")
            elif PLACEHOLDER.fullmatch(value):
                current.fields[name] = ("", number)
                current.placeholders.add(name)
                result.add("error", "placeholder-value", str(path), number,
                           f"{current.identifier}: replace the template placeholder in {name}; quote a "
                           "bracketed literal with backticks, or write a reference link as [text][].")
            else:
                current.fields[name] = (value, number)
        elif not table_active and field_like(line):
            if not rejected_section:
                result.add("error", "unsupported-field", str(path), number,
                           "Use a column-zero, correctly cased, single-line field inside a supported declaration.")
        elif NAMED_FIELD.match(line):
            statement_open = False
            if current is not None and kind_of(current.identifier) in {"REQ", "INV", "AC"}:
                label = line.split(":", 1)[0]
                home = "Rationale or prose outside the declaration" if kind_of(current.identifier) != "AC" else \
                    "prose outside the declaration"
                result.add("error", "unsupported-field", str(path), number,
                           f"{current.identifier}: {label} is not a {kind_of(current.identifier)} field; put "
                           f"explanation in {home}.")
        elif statement_open and line.strip():
            result.add("error", "statement-continuation", str(path), number,
                       "Keep Statement on one line; put commentary in Rationale or a separate section.")
    if not blocks:
        result.add("error", "no-declarations", str(path), 1,
                   "Active document has no supported declarations.")
    return blocks


@dataclass
class Decision:
    identifier: str
    path: str
    line: int
    section: str


def parse_decisions(path: Path, result: Result) -> list[Decision]:
    """Each entry of a decision record: a `Q-...` heading inside the Policies, Open or Decided section."""
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeError) as error:
        result.add("error", "read-error", str(path), 0, str(error))
        return []
    entries: list[Decision] = []
    section = ""
    for number, line in visible_lines(lines).lines:
        heading = HEADING.match(line)
        if not heading:
            continue
        if len(heading[1]) <= 2:
            title = heading[2].strip()
            section = title if len(heading[1]) == 2 and title in DECISION_SECTIONS else ""
            continue
        if not heading[2].startswith("Q-"):
            continue
        question = DECISION_HEADING.match(heading[2])
        if question is None:
            result.add("error", "malformed-id", str(path), number,
                       f"Write a decision entry heading as '{heading[1]} Q-ID - Title'.")
        elif not section:
            result.add("error", "decision-section", str(path), number,
                       f"{question[1]} is outside the record's sections; put it under "
                       f"{', '.join('## ' + name for name in DECISION_SECTIONS)}.")
        else:
            entries.append(Decision(question[1], str(path), number, section))
    return entries


def check_decisions(entries: list[Decision], result: Result) -> dict[str, Decision]:
    by_id: dict[str, list[Decision]] = {}
    for entry in entries:
        by_id.setdefault(entry.identifier, []).append(entry)
    for identifier, occurrences in by_id.items():
        if len(occurrences) > 1:
            locations = ", ".join(f"{e.path}:{e.line}" for e in occurrences)
            for entry in occurrences:
                result.add("error", "duplicate-id", entry.path, entry.line,
                           f"{identifier} has multiple decision-record entries: {locations}")
    return {identifier: occurrences[0] for identifier, occurrences in by_id.items()}


LINK_DESTINATION = re.compile(r"\]\([^)]*\)")


def cited_ids(text: str) -> list[str]:
    plain = literal_free(text)
    # A link destination is an address, not a citation: [REQ-A-001](c.md#REQ-A-001).
    return CITED_ID.findall(LINK_DESTINATION.sub("", plain))


def mentioned_test(text: str) -> str | None:
    """Return the test or test file prose mentions; IDs and quoted literals, such as `app.test`, are not prose."""
    found = TEST_FILE_PATTERN.search(text) or TEST_WORD.search(literal_free(QUESTION_ID.sub("", CITED_ID.sub("", text))))
    return found.group(0) if found else None


def check_citations(block: Block, text: str, line: int, definitions: dict[str, list[Block]],
                    result: Result) -> None:
    for target in dict.fromkeys(cited_ids(text)):
        matches = definitions.get(target, [])
        if not matches:
            result.add("error", "dangling-reference", block.path, line,
                       f"{block.identifier} cites {target}, which has no declaration; quote it if it is literal text.")
        elif len(matches) > 1:
            result.add("error", "ambiguous-reference", block.path, line,
                       f"{block.identifier} cites {target}, which refers to more than one declaration.")


def check_rule_text(block: Block, text: str, line: int, subject: str, split_advice: str,
                    definitions: dict[str, list[Block]], result: Result) -> None:
    terms = vague_terms(text)
    if terms:
        result.add("warning", "vague-term", block.path, line,
                   f"{block.identifier}: replace {', '.join(repr(t) for t in terms)} with a measurable bound or a "
                   "defined term, or quote it as literal data.")
    if len(text.split()) > LONG_STATEMENT_WORDS:
        result.add("warning", "long-statement", block.path, line,
                   f"{block.identifier}: {subject} exceeds {LONG_STATEMENT_WORDS} words; {split_advice}.")
    check_citations(block, text, line, definitions, result)


def check_rule_tables(block: Block, definitions: dict[str, list[Block]], result: Result) -> None:
    statement = block.value("Statement")
    named = bool(RULE_TABLE_NAME.search(literal_free(statement)))
    if not block.rule_tables:
        if named:
            result.add("error", "rule-table-missing", block.path, block.fields["Statement"][1],
                       f"{block.identifier}: the Statement names a rule table, but no table whose first "
                       "column is Order follows it.")
        return
    if not block.identifier.startswith("REQ-"):
        result.add("error", "rule-table-owner", block.path, block.rule_tables[0].line,
                   f"{block.identifier}: only a REQ may own a rule table; an invariant has no ordered outcomes.")
    if statement and not named:
        result.add("error", "rule-table-unnamed", block.path, block.rule_tables[0].line,
                   f"{block.identifier}: the Statement must say how the rule table applies, for example "
                   "\"the first row of the rule table that applies\".")
    for extra in block.rule_tables[1:]:
        result.add("error", "rule-table-duplicate", block.path, extra.line,
                   f"{block.identifier} has more than one rule table; split the requirement.")
    table = block.rule_tables[0]
    if table.columns < 3:
        result.add("error", "rule-table-columns", block.path, table.line,
                   f"{block.identifier}: a rule table needs Order, a condition column, and at least one "
                   "outcome column.")
    if not table.rows:
        result.add("error", "rule-table-empty", block.path, table.line, f"{block.identifier}: the rule table has no rows.")
        return
    for position, (line, cells) in enumerate(table.rows, 1):
        if position < len(table.rows) and len(cells) > 1 and OTHERWISE.fullmatch(cells[1]):
            result.add("error", "rule-table-otherwise", block.path, line,
                       f"{block.identifier}: only the last row may be Otherwise; later rows would never apply.")
        if not cells or cells[0] != str(position):
            result.add("error", "rule-table-order", block.path, line,
                       f"{block.identifier}: rule-table rows are numbered 1, 2, 3 in order; expected {position}.")
        for cell in cells[1:]:
            if OBLIGATION.search(literal_free(cell)):
                result.add("error", "rule-table-obligation", block.path, line,
                           f"{block.identifier}: a rule-table cell states an outcome, not a second obligation; "
                           "remove \"shall\".")
            check_rule_text(block, cell, line, "a rule-table cell", "define a term or cite a requirement instead",
                            definitions, result)
    last_line, last_cells = table.rows[-1]
    if len(last_cells) < 2 or not OTHERWISE.fullmatch(last_cells[1]):
        result.add("error", "rule-table-otherwise", block.path, last_line,
                   f"{block.identifier}: the last row's condition must be Otherwise, so every case has an outcome.")


HIDDEN_CITATION = re.compile(r";[ \t]*(?:Q|SRC)-")


def basis_citations(text: str) -> list[str] | str:
    """The ;-separated citations of a Basis, or why they cannot be split: a `;` inside straight double quotes or
    backticks belongs to the quoted section text."""
    masked = mask_literals(text)
    if masked is None:
        return "a quote or backtick is not closed; escape a literal one as \\\""
    parts, start = [], 0
    for index, character in enumerate(masked):
        if character == ";":
            parts.append(text[start:index])
            start = index + 1
    parts.append(text[start:])
    for quoted in re.finditer(r'"(?:\\.|[^"\\])*"|`[^`]*`', text):
        if HIDDEN_CITATION.search(quoted[0]):
            return f"the quoted text {quoted[0][:40]!r} holds another citation; check the quotes are paired"
    return [part.strip() for part in parts]


def check_basis(block: Block, definitions: dict[str, list[Block]], decisions: dict[str, Decision],
                result: Result) -> None:
    text, line = block.fields["Basis"]
    deciding = False
    sound = True
    parts = basis_citations(text)
    if isinstance(parts, str):
        result.add("error", "malformed-reference", block.path, line, f"{block.identifier}: Basis cannot be read: {parts}.")
        return
    for part in parts:
        citation = BASIS_CITATION.match(part)
        if citation is None:
            sound = False
            result.add("error", "malformed-reference", block.path, line,
                       f"{block.identifier}: Basis cites {part!r}; write ;-separated Q or SRC IDs, each optionally "
                       "followed by \"§ section\" (quote section text that holds a ;), and put any reason in "
                       "Rationale.")
            continue
        cited = citation[1]
        if cited.startswith("Q-"):
            decision = decisions.get(cited)
            if decision is None:
                sound = False
                result.add("error", "dangling-reference", block.path, line,
                           f"{block.identifier}: Basis cites {cited}, which is in no *{DECISION_RECORD_SUFFIX} "
                           "under the checked paths; pass the folder that holds its decision record.")
            elif decision.section == "Decided":
                deciding = True
            continue
        matches = definitions.get(cited, [])
        if len(matches) == 1:
            deciding = True
        else:
            sound = False
            result.add("error", "dangling-reference" if not matches else "ambiguous-reference", block.path, line,
                       f"{block.identifier}: Basis cites {cited}, which has "
                       f"{'no declaration' if not matches else 'more than one declaration'}.")
    if sound and not deciding:
        result.add("error", "basis-not-deciding", block.path, line,
                   f"{block.identifier}: Basis cites no decided entry or source; a policy says who decides, not "
                   "what was decided, and an open question decides nothing.")


def scan(inputs: Iterable[Path], untested: bool = False) -> Result:
    result = Result()
    blocks: list[Block] = []
    entries: list[Decision] = []
    evidence_maps: list[EvidenceMap] = []
    for path in collect_paths(inputs, result):
        if path.name.endswith(EVIDENCE_SUFFIX):
            evidence_maps.append(parse_evidence(path, result))
            continue
        if path.name.endswith(DECISION_RECORD_SUFFIX):
            entries.extend(parse_decisions(path, result))
            continue
        blocks.extend(parse_document(path, result))
    result.declarations = len(blocks)
    decisions = check_decisions(entries, result)
    if not result.active_documents:
        result.add("error", "no-active-documents", "", 0,
                   f"No active documents were checked (skipped {result.skipped_documents} unmarked, "
                   f"{result.skipped_symlinks} symlinks, {result.skipped_hidden} hidden, and "
                   f"{result.skipped_non_markdown} non-Markdown entries); this is not a successful review. "
                   f"Mark each maintained spec with the exact line {MARKER}.")
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
        kind = kind_of(block.identifier)
        if kind in {"REQ", "INV"}:
            if block.absent("Statement"):
                result.add("error", "missing-statement", block.path, block.line,
                           f"{block.identifier} needs a Statement field.")
            elif block.value("Statement"):
                error = ears_error(block.value("Statement"), invariant=kind == "INV")
                if error:
                    result.add("error", "invalid-ears", block.path, block.fields["Statement"][1],
                               f"{block.identifier}: {error}")
                check_rule_text(block, block.value("Statement"), block.fields["Statement"][1], "the Statement",
                                "split independent obligations, move a list of forms into a TERM, or put an "
                                "ordered choice in a rule table", definitions, result)
            check_rule_tables(block, definitions, result)
            if block.absent("Basis"):
                result.add("warning", "proposed-rule", block.path, block.line,
                           f"{block.identifier} has no Basis, so it is proposed and not ready to implement.")
        if kind in {"REQ", "INV", "TERM"} and block.value("Basis"):
            check_basis(block, definitions, decisions, result)
        if kind in {"REQ", "INV"} and block.value("Rationale"):
            rationale, rationale_line = block.fields["Rationale"]
            check_citations(block, rationale, rationale_line, definitions, result)
            for question in dict.fromkeys(QUESTION_ID.findall(literal_free(rationale))):
                if question not in decisions:
                    result.add("error", "dangling-reference", block.path, rationale_line,
                               f"{block.identifier}: Rationale cites {question}, which is in no "
                               f"*{DECISION_RECORD_SUFFIX} under the checked paths.")
        if kind == "AC":
            if block.parent is None:
                result.add("error", "ac-not-nested", block.path, block.line,
                           f"{block.identifier}: put the AC heading one level below the REQ or INV it checks.")
            else:
                covered.add(block.parent)
            if block.absent("Expected"):
                result.add("error", "missing-expected", block.path, block.line,
                           f"{block.identifier} needs an Expected field.")
            if block.absent("Boundary"):
                result.add("error", "missing-boundary", block.path, block.line,
                           f"{block.identifier} needs a Boundary field.")
            ac = ac_kind(block)
            refers_to_table = CASE_TABLE_REFERENCE in block.value("Expected").lower()
            if refers_to_table and not any(table.rows for table in block.case_tables):
                result.add("error", "case-table-missing", block.path, block.fields["Expected"][1],
                           f"{block.identifier}: Expected points to a case table, but no table with rows follows.")
            if ac == "case-table":
                if not refers_to_table and "Expected" in block.fields:
                    result.add("error", "case-table-unreferenced", block.path, block.case_tables[0].line,
                               f"{block.identifier} has a case table, so Expected must say \"Every row of the case "
                               "table below.\"; split an AC that also states a result of its own.")
                for table in block.case_tables:
                    for row_line, cells in table.rows:
                        for cell in cells:
                            check_citations(block, cell, row_line, definitions, result)
            named_test = TEST_IN_EXPECTED.search(block.value("Expected"))
            if named_test:
                result.add("warning", "expected-names-test", block.path, block.fields["Expected"][1],
                           f"{block.identifier}: Expected names the test or test file {named_test.group(0)!r}; state "
                           "the result the test observes, and list the test in the evidence map.")
            if "Oracle" in block.fields:
                oracle, oracle_line = block.fields["Oracle"]
                oracle_text = literal_free(oracle)
                named_test = mentioned_test(oracle)
                if named_test:
                    result.add("warning", "oracle-names-test", block.path, oracle_line,
                               f"{block.identifier}: Oracle names {named_test!r}; a check cannot be the basis "
                               "for its own expected result, so name the rule, decision, source, worked example, "
                               "or reference model Expected comes from.")
                check_citations(block, oracle, oracle_line, definitions, result)
                for question in dict.fromkeys(QUESTION_ID.findall(oracle_text)):
                    if question not in decisions:
                        result.add("warning", "unresolved-oracle", block.path, oracle_line,
                                   f"{block.identifier}: Oracle cites {question}, which is in no "
                                   f"*{DECISION_RECORD_SUFFIX} under the checked paths.")
            code = CODE_IN_BOUNDARY.search(block.value("Boundary"))
            if code:
                result.add("warning", "boundary-not-domain", block.path, block.fields["Boundary"][1],
                           f"{block.identifier}: Boundary names {code.group(0)!r}; name where the result is observed "
                           "in domain terms, and leave tests and code to the evidence map.")
            for name in AC_CASE_FIELDS[ac]:
                if block.absent(name):
                    result.add("warning", AC_CASE_FIELD_CODE[name], block.path, block.line,
                               f"{block.identifier} needs {'an' if name == 'Oracle' else 'a'} {name}: "
                               f"{AC_CASE_FIELD_PURPOSE[name]}.")
        for name in ("Covers",):
            if name not in block.fields or name in block.placeholders:
                continue
            text, line = block.fields[name]
            targets = [part.strip() for part in text.split(",")]
            if not all(IDENTIFIER.fullmatch(target) for target in targets):
                result.add("error", "malformed-reference", block.path, line,
                           f"{name} must be a non-empty comma-separated list of local IDs.")
                continue
            for target in targets:
                if kind_of(target) == "Q":
                    if target not in decisions:
                        result.add("error", "dangling-reference", block.path, line,
                                   f"{target} is in no *{DECISION_RECORD_SUFFIX} under the checked paths.")
                    elif name == "Covers":
                        result.add("error", "invalid-covers-target", block.path, line,
                                   f"Coverage must target REQ or INV, not {target}.")
                    continue
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
                    elif kind == "AC":
                        covered.add(target)

    for block in blocks:
        if (kind_of(block.identifier) in {"REQ", "INV"}
                and block.value("Basis")
                and block.identifier not in covered):
            result.add("warning", "unlinked-acceptance", block.path, block.line,
                       f"No AC checks {block.identifier}: nest one under it or name it in another AC's Covers.")
    check_evidence(evidence_maps, blocks, definitions, untested, result)
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="+", type=Path)
    parser.add_argument("--json", action="store_true", help="Emit counts and findings as JSON.")
    parser.add_argument("--untested", action="store_true",
                        help="Warn for each AC that no evidence map row names a test for.")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as a non-zero result.")
    args = parser.parse_args(argv)
    result = scan(args.paths, args.untested)
    if args.json:
        print(json.dumps(asdict(result), indent=2, ensure_ascii=False))
    else:
        print(f"Checked {result.active_documents} active documents; {result.declarations} declarations; "
              f"skipped {result.skipped_documents} unmarked documents, "
              f"{result.skipped_non_markdown} non-Markdown entries, "
              f"{result.skipped_hidden} hidden entries, and {result.skipped_symlinks} symlinks; "
              f"rejected {result.unsupported_inputs} unsupported inputs.")
        if result.evidence_maps or args.untested:
            print(f"Evidence: {sum(1 for rows in result.evidence.values() if rows)} of {len(result.evidence)} ACs "
                  f"have a test row in {result.evidence_maps} evidence maps; {len(result.unchecked)} have an "
                  "unchecked part.")
        for finding in result.findings:
            print(f"{finding.path}:{finding.line}: {finding.severity} {finding.code}: {finding.message}")
        if not result.findings:
            print("No declaration, EARS syntax, or traceability findings. Semantic correctness and overlap were not assessed.")
    return result.exit_code(args.strict)


if __name__ == "__main__":
    sys.exit(main())
