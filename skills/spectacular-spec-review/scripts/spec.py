#!/usr/bin/env python3
"""Read and change spectacular specs without opening whole files.

show     prints declarations or decision entries with what a reader needs beside
         them: the ACs that check a rule, the decision entries its Basis cites,
         the terms it uses, a heading line for every other ID it cites, and the
         evidence rows of its ACs. Every block starts with its path and line
         span, so an edit needs only a ranged read.
outline  lists a contract's or decision record's sections and declarations
         with their lines, marks proposed rules, and gives the next free
         number for each kind of ID.
decide   moves an open decision entry to its record's Decided section with
         the answer read from standard input, in one write.
reopen   moves a decided entry back to Open with the question read from
         standard input, and lists every section that cites it.
new      adds an acceptance criterion under a rule with the next free AC ID
         and every required field as a placeholder the linter rejects until
         it is filled.

The section boundaries come from spec_lint's outline, so this tool and the
linter read headings and fences the same way. Evidence maps are edited with
evidence.py.
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import tempfile
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import spec_lint
from spec_lint import Section

ANY_ID = re.compile(r"(?<![\w-])(?:REQ|INV|AC|Q|TERM|SRC)(?:-[A-Z0-9]+)+(?![\w-])")
DEFAULT_MAX_BYTES = 16_000


class SpecError(Exception):
    pass


@dataclass(frozen=True)
class Home:
    """Where an ID's heading is, and the lines of its section."""
    identifier: str
    path: Path
    section: Section
    lines: tuple[str, ...]

    @property
    def text(self) -> str:
        return "\n".join(self.lines[self.section.start - 1:self.section.end]).rstrip("\n")

    @property
    def heading(self) -> str:
        return self.lines[self.section.start - 1]

    def location(self) -> str:
        return f"{self.path}:{self.section.start}-{self.section.end}"


@dataclass
class Tree:
    homes: dict[str, list[Home]]
    evidence: dict[str, list[spec_lint.EvidenceRow]]
    # Every ID written anywhere under the root, retired ones in a mapping included, so none is issued twice.
    mentioned: set[str]


def read_lines(path: Path) -> list[str]:
    try:
        return path.read_text(encoding="utf-8").splitlines()
    except (OSError, UnicodeError) as error:
        raise SpecError(f"cannot read {path}: {error}") from error


def load_tree(root: Path) -> Tree:
    if not root.is_dir():
        raise SpecError(f"{root} is not a directory; pass the spec root with --root.")
    homes: dict[str, list[Home]] = {}
    evidence: dict[str, list[spec_lint.EvidenceRow]] = {}
    mentioned: set[str] = set()
    for path in sorted(root.rglob("*.md")):
        if any(part.startswith(".") for part in path.relative_to(root).parts) or path.is_symlink():
            continue
        if path.name.endswith(spec_lint.EVIDENCE_SUFFIX):
            parsed = spec_lint.parse_evidence(path, spec_lint.Result())
            for row in parsed.rows:
                evidence.setdefault(row.ac, []).append(row)
            continue
        lines = tuple(read_lines(path))
        mentioned.update(m[0] for line in lines for m in ANY_ID.finditer(line))
        for section in spec_lint.outline(list(lines)):
            if spec_lint.IDENTIFIER.fullmatch(section.token):
                homes.setdefault(section.token, []).append(Home(section.token, path, section, lines))
    return Tree(homes, evidence, mentioned)


def home_of(tree: Tree, identifier: str) -> Home:
    found = tree.homes.get(identifier)
    if not found:
        raise SpecError(f"{identifier} has no heading under the root.")
    if len(found) > 1:
        raise SpecError(f"{identifier} has {len(found)} headings: " + ", ".join(h.location() for h in found))
    return found[0]


def field_values(text: str, name: str) -> list[str]:
    return [line.split(":", 1)[1].strip() for line in text.splitlines() if line.startswith(f"{name}:")]


def own_text(home: Home, tree: Tree) -> str:
    """The section without nested declarations, so a rule's fields are not mixed with its ACs'."""
    end = home.section.end
    for other in tree.homes.values():
        for nested in other:
            if nested.path == home.path and home.section.start < nested.section.start <= end:
                end = min(end, nested.section.start - 1)
    return "\n".join(home.lines[home.section.start - 1:end])


def nested_acs(home: Home, tree: Tree) -> list[str]:
    return [h.identifier for found in tree.homes.values() for h in found
            if h.identifier.startswith("AC-") and h.path == home.path
            and home.section.start < h.section.start <= home.section.end]


def covering_acs(identifier: str, home: Home, tree: Tree) -> list[Home]:
    covering = []
    for found in tree.homes.values():
        for ac in found:
            if not ac.identifier.startswith("AC-"):
                continue
            inside = ac.path == home.path and home.section.start < ac.section.start <= home.section.end
            covers = [part.strip() for value in field_values(own_text(ac, tree), "Covers") for part in value.split(",")]
            if identifier in covers and not inside:
                covering.append(ac)
    return sorted(covering, key=lambda h: (str(h.path), h.section.start))


def evidence_lines(acs: list[str], tree: Tree) -> list[str]:
    return [f"| {row.ac} | {row.file} | {row.test} |" for ac in acs for row in tree.evidence.get(ac, [])]


class Output:
    """Blocks printed once per call, within a byte budget; later mentions become one-line pointers."""

    def __init__(self, max_bytes: int):
        self.max_bytes = max_bytes
        self.parts: list[str] = []
        self.size = 0
        self.printed: list[tuple[Path, int, int]] = []
        self.dropped: list[str] = []

    def write(self, text: str) -> None:
        self.parts.append(text)
        self.size += len(text.encode("utf-8")) + 1

    def shown(self, home: Home) -> bool:
        """Whether the section was printed already, alone or inside an enclosing section."""
        return any(path == home.path and start <= home.section.start and home.section.end <= end
                   for path, start, end in self.printed)

    def block(self, label: str, home: Home, essential: bool = False) -> None:
        if self.shown(home):
            self.write(f"{label} {home.identifier}: printed above, {home.location()}")
            return
        text = f"{label} {home.location()}\n{home.text}\n"
        if not essential and self.size + len(text.encode("utf-8")) > self.max_bytes:
            self.write(f"{label} {home.location()}: {home.heading} (omitted, over --max-bytes)")
            self.dropped.append(home.identifier)
            return
        self.printed.append((home.path, home.section.start, home.section.end))
        self.write(text)


def show(tree: Tree, identifiers: list[str], cited_by: bool, max_bytes: int) -> tuple[str, list[str]]:
    out = Output(max_bytes)
    missing: list[str] = []
    for identifier in identifiers:
        try:
            home = home_of(tree, identifier)
        except SpecError as error:
            missing.append(str(error))
            continue
        out.write(f"## {identifier}")
        out.block("==", home, essential=True)
        acs = nested_acs(home, tree)
        for ac in covering_acs(identifier, home, tree):
            out.block("-- checked by", ac)
            acs.append(ac.identifier)
        own = own_text(home, tree)
        basis = [match[0] for value in field_values(own, "Basis") for match in ANY_ID.finditer(value)]
        for cited in dict.fromkeys(basis):
            if cited.startswith("Q-") and cited in tree.homes:
                out.block("-- basis", tree.homes[cited][0])
        cited_ids = dict.fromkeys(m[0] for m in ANY_ID.finditer(home.text))
        for cited in cited_ids:
            if cited == identifier or cited in acs or cited not in tree.homes:
                continue
            target = tree.homes[cited][0]
            if cited.startswith("TERM-"):
                out.block("-- term", target)
            elif not out.shown(target):
                out.write(f"-- cites {target.path}:{target.section.start}: {target.heading}")
        rows = evidence_lines(acs, tree)
        if rows:
            out.write("-- evidence\n" + "\n".join(rows))
        if cited_by:
            for citing in citing_sections(identifier, tree):
                out.write(f"-- cited by {citing.path}:{citing.section.start}: {citing.heading}")
        out.write("")
    if out.dropped:
        out.write(f"Omitted to stay under {max_bytes} bytes: {', '.join(out.dropped)}; show them by ID.")
    return "\n".join(out.parts), missing


def citing_sections(identifier: str, tree: Tree) -> list[Home]:
    pattern = re.compile(rf"(?<![\w-]){re.escape(identifier)}(?![\w-])")
    citing = []
    for found in tree.homes.values():
        for home in found:
            if home.identifier != identifier and pattern.search(own_text(home, tree)):
                citing.append(home)
    return sorted(citing, key=lambda h: (str(h.path), h.section.start))


def next_free(tree: Tree, identifiers: list[str]) -> dict[str, str]:
    """For each prefix-and-capability used in the file, the number after the highest written in the file or
    anywhere under the root."""
    shape = re.compile(r"^((?:REQ|INV|AC|Q|TERM|SRC)-[A-Z0-9]+)-(\d+)$")
    families = {m[1]: len(m[2]) for i in identifiers if (m := shape.match(i))}
    result = {}
    for family, width in families.items():
        highest = max(int(m[2]) for i in (*tree.mentioned, *identifiers) if (m := shape.match(i)) and m[1] == family)
        result[family] = f"{family}-{highest + 1:0{width}d}"
    return result


def outline_text(path: Path, tree: Tree) -> str:
    lines = read_lines(path)
    rows = []
    identifiers = []
    for section in spec_lint.outline(lines):
        token = section.token
        is_id = bool(spec_lint.IDENTIFIER.fullmatch(token))
        if not is_id and section.level > 2:
            continue
        mark = ""
        if is_id:
            identifiers.append(token)
            home = next((h for h in tree.homes.get(token, []) if h.path.resolve() == path.resolve()), None)
            if home and token.startswith(("REQ-", "INV-")) and not field_values(own_text(home, tree), "Basis"):
                mark = "  [proposed]"
        rows.append(f"{section.start:>5}-{section.end:<5} {'  ' * (section.level - 2)}{section.title}{mark}")
    free = next_free(tree, identifiers)
    if free:
        rows.append("next free: " + ", ".join(free.values()))
    return "\n".join(rows)


def write_atomically(path: Path, text: str) -> None:
    mode = path.stat().st_mode & 0o7777
    descriptor, temporary = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="") as handle:
            handle.write(text)
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    except BaseException:
        Path(temporary).unlink(missing_ok=True)
        raise


# The record's sections in file order, and the move each command makes between them.
SECTION_ORDER = spec_lint.DECISION_SECTIONS
MOVES = {"decide": ("Open", "Decided"), "reopen": ("Decided", "Open")}


def move_entry(root: Path, command: str, identifier: str, body: str) -> str:
    """Move a decision entry along one of MOVES, replacing its body; the section is the entry's state."""
    source, target = MOVES[command]
    if not identifier.startswith("Q-"):
        raise SpecError(f"{identifier} is not a decision entry; {command} takes a Q ID.")
    if not body.strip():
        raise SpecError("nothing on standard input; write the question, its answer and who decided it."
                        if command == "decide" else
                        "nothing on standard input; write the question as it now stands and what reopened it.")
    home = home_of(load_tree(root), identifier)
    with home.path.open(encoding="utf-8", newline="") as handle:
        raw = handle.read()
    newline = "\r\n" if "\r\n" in raw else "\n"
    lines = raw.splitlines()
    sections = spec_lint.outline(lines)
    enclosing = [s for s in sections if s.level == 2 and s.start < home.section.start <= s.end]
    current = enclosing[-1].title.strip() if enclosing else ""
    if current != source:
        where = f"under {current}" if current else "outside the record's sections"
        verb = "decided" if command == "decide" else "reopened"
        raise SpecError(f"{identifier} is {where}; only an entry under ## {source} can be {verb}.")
    entry = [home.heading, "", *body.strip("\n").splitlines()]
    del lines[home.section.start - 1:home.section.end]
    # The source section stays until the entry is placed, so a missing target always has a neighbour to sit by.
    sections = spec_lint.outline(lines)
    destination = next((s for s in sections if s.level == 2 and s.title.strip() == target), None)
    if destination is None:
        earlier = SECTION_ORDER[:SECTION_ORDER.index(target)]
        later = SECTION_ORDER[SECTION_ORDER.index(target) + 1:]
        preceding = [s for s in sections if s.level == 2 and s.title.strip() in earlier]
        following = [s for s in sections if s.level == 2 and s.title.strip() in later]
        if preceding:
            start, at = preceding[-1].start, preceding[-1].end
        else:
            start = at = following[0].start - 1
        entry = [f"## {target}", "", *entry]
    else:
        start, at = destination.start, destination.end
    while at > start and not lines[at - 1].strip():
        at -= 1
    following_blank = at < len(lines) and not lines[at].strip()
    lines[at:at] = ["", *entry, *([] if following_blank or at == len(lines) else [""])]
    sections = spec_lint.outline(lines)
    emptied = next(s for s in sections if s.level == 2 and s.title.strip() == source)
    if not any(s.level > 2 and emptied.start < s.start <= emptied.end for s in sections):
        del lines[emptied.start - 1:emptied.end]
    text = newline.join(lines) + (newline if raw.endswith(("\n", "\r")) else "")
    write_atomically(home.path, text)
    moved = next(s for s in spec_lint.outline(text.splitlines()) if s.token == identifier)
    report = [f"{home.path}:{moved.start}-{moved.end}: {identifier} is {'decided' if command == 'decide' else 'open'}."]
    if command == "reopen":
        tree = load_tree(root)
        for c in citing_sections(identifier, tree):
            basis = " ".join(field_values(own_text(c, tree), "Basis"))
            if c.identifier.startswith("Q-"):
                advice = f"reconsider it, and reopen it too when its answer rests on {identifier}"
            elif re.search(rf"(?<![\w-]){re.escape(identifier)}(?![\w-])", basis):
                advice = "drop the citation from its Basis until the entry is decided again"
            else:
                advice = "check whether its text still holds"
            report.append(f"{c.path}:{c.section.start}: {c.identifier} mentions {identifier}; {advice}")
    return "\n".join(report)


# The template's order (assets/capability.md); each placeholder fails lint until it is replaced.
AC_SKELETON = (
    ("Situation", "[Input, relevant state, and triggering event.]"),
    ("Expected", "[Observable accepted result and prohibited result where relevant.]"),
    ("Oracle", "[Why this expectation is justified independently of the implementation.]"),
    ("Boundary", "[Where the result is observed, in domain terms.]"),
    ("Counterexample", "[A violation this check must detect.]"),
)
ID_SHAPE = re.compile(r"^(REQ|INV|AC|Q|TERM|SRC)-([A-Z0-9]+)-(\d+)$")


def new_ac(root: Path, rule: str, title: str) -> str:
    """Append an AC skeleton at the end of a rule's section, after its fields, rule table and ACs."""
    title = " ".join(title.split())
    if not title:
        raise SpecError("give the AC a title: the case or property it checks.")
    shape = ID_SHAPE.match(rule)
    if not shape or shape[1] not in {"REQ", "INV"}:
        raise SpecError(f"{rule} is not a rule; an AC goes under a REQ or INV shaped like REQ-CAP-001.")
    tree = load_tree(root)
    home = home_of(tree, rule)
    if home.section.level >= 6:
        raise SpecError(f"{rule} is a level-6 heading, so an AC cannot nest under it; move the rule up a level.")
    family = f"AC-{shape[2]}"
    numbers = [int(m[3]) for i in tree.mentioned if (m := ID_SHAPE.match(i)) and f"{m[1]}-{m[2]}" == family]
    identifier = f"{family}-{max(numbers, default=0) + 1:0{len(shape[3])}d}"
    with home.path.open(encoding="utf-8", newline="") as handle:
        raw = handle.read()
    newline = "\r\n" if "\r\n" in raw else "\n"
    lines = raw.splitlines()
    at = home.section.end
    while at > home.section.start and not lines[at - 1].strip():
        at -= 1
    block = ["", f"{'#' * (home.section.level + 1)} {identifier} - {title}"]
    for name, placeholder in AC_SKELETON:
        block += ["", f"{name}: {placeholder}"]
    following = lines[at:at + 1]
    lines[at:at] = block + ([""] if following and following[0].strip() else [])
    text = newline.join(lines) + (newline if raw.endswith(("\n", "\r")) or not raw else "")
    write_atomically(home.path, text)
    return f"{home.path}:{at + 2}-{at + len(block)}: {identifier} added under {rule}; replace each [placeholder]."


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--root", type=Path, default=Path("specs"), help="The spec root (default: specs).")
    commands = parser.add_subparsers(dest="command", required=True)
    p = commands.add_parser("show", help="Print declarations or decision entries with what a reader needs beside them.")
    p.add_argument("ids", nargs="+")
    p.add_argument("--cited-by", action="store_true", help="Also list every section that cites each ID.")
    p.add_argument("--max-bytes", type=int, default=DEFAULT_MAX_BYTES,
                   help="Byte budget; supporting blocks past it shrink to their heading (default: %(default)s).")
    p = commands.add_parser("outline", help="List a file's sections and declarations with lines and next free IDs.")
    p.add_argument("file", type=Path)
    p = commands.add_parser("decide", help="Move an Open entry to Decided with the answer read from standard input.")
    p.add_argument("id")
    p = commands.add_parser("new", help="Add an AC skeleton under a REQ or INV with the next free AC ID.")
    p.add_argument("kind", choices=["AC"])
    p.add_argument("rule")
    p.add_argument("title")
    p = commands.add_parser("reopen", help="Move a Decided entry back to Open with the question read from standard "
                                           "input, and list the sections that cite it.")
    p.add_argument("id")
    args = parser.parse_args(argv)
    try:
        tree = load_tree(args.root)
        if args.command == "show":
            text, missing = show(tree, args.ids, args.cited_by, args.max_bytes)
            print(text)
            for message in missing:
                print(f"error: {message}", file=sys.stderr)
            return 1 if missing else 0
        if args.command == "outline":
            print(outline_text(args.file, tree))
        elif args.command == "new":
            print(new_ac(args.root, args.rule, args.title))
        else:
            print(move_entry(args.root, args.command, args.id, sys.stdin.read()))
    except SpecError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
