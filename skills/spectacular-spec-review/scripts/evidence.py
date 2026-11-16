#!/usr/bin/env python3
"""Edit evidence maps: which test checks which acceptance criterion, and which
part of an AC no listed test checks.

Every command rewrites the maps it touches in canonical form: a title, the
test table with unique rows sorted by AC, File, then Test, and the unchecked
table when any AC has an unchecked part. Paths are given as typed, relative to
the current directory, and stored relative to the map. A test name must occur
in its file as written in the source, escapes included. The linter
(spec_lint.py) checks the result; this tool only writes it.

Commands may run in parallel: each holds an exclusive lock on the directories
of the maps it rewrites, and replaces a map whole, so a reader never sees half
of one. Locking needs a POSIX system and a file system that supports flock;
where it fails the command stops without writing.
"""
from __future__ import annotations

import argparse
import contextlib
import fcntl
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Iterable, Iterator

sys.path.insert(0, str(Path(__file__).resolve().parent))
import spec_lint
from spec_lint import EvidenceRow, UncheckedPart


class EvidenceError(Exception):
    pass


@dataclass
class MapFile:
    path: Path
    title: str
    rows: set[EvidenceRow]
    unchecked: dict[str, str]

    def resolve(self, row: EvidenceRow) -> Path:
        return spec_lint.evidence_file(self.path, row.file).resolve()

    def relative(self, test_file: Path) -> str:
        return Path(os.path.relpath(test_file.resolve(), self.path.parent.resolve())).as_posix()


def map_path(contract: Path) -> Path:
    capability = contract.parent.name if contract.name == "contract.md" else contract.stem
    return contract.parent / f"{capability}{spec_lint.EVIDENCE_SUFFIX}"


def load(path: Path) -> MapFile:
    default_title = f"# {path.name.removesuffix(spec_lint.EVIDENCE_SUFFIX)} evidence"
    if not path.exists():
        return MapFile(path, default_title, set(), {})
    result = spec_lint.Result()
    parsed = spec_lint.parse_evidence(path, result)
    if result.findings:
        problems = "; ".join(f"line {f.line}: {f.message}" for f in result.findings)
        raise EvidenceError(f"{path} is not a valid evidence map, so it was left unchanged: {problems}")
    unchecked: dict[str, str] = {}
    for part in parsed.unchecked:
        if part.ac in unchecked:
            raise EvidenceError(f"{path} gives {part.ac} two unchecked parts, so it was left unchanged.")
        unchecked[part.ac] = part.text
    return MapFile(path, parsed.title or default_title, set(parsed.rows), unchecked)


def save(evidence: MapFile) -> None:
    unchecked = [UncheckedPart(ac, text) for ac, text in evidence.unchecked.items()]
    # The suffix keeps the temporary file out of every *.evidence.md search.
    temporary = evidence.path.with_name(f".{evidence.path.name}.tmp")
    try:
        temporary.write_text(spec_lint.format_evidence(evidence.title, evidence.rows, unchecked), encoding="utf-8")
        if evidence.path.exists():
            os.chmod(temporary, evidence.path.stat().st_mode & 0o7777)
        os.replace(temporary, evidence.path)
    except (OSError, ValueError) as error:
        temporary.unlink(missing_ok=True)
        raise EvidenceError(f"{evidence.path} was left unchanged: {error}.") from error


@contextlib.contextmanager
def locked(directories: Iterable[Path]) -> Iterator[None]:
    # The directory, not the map, is locked: os.replace swaps the map's inode, so a
    # waiter locking the old file would then read a stale map. One process cannot
    # lock a directory twice, and a fixed order keeps two commands from deadlocking.
    with contextlib.ExitStack() as stack:
        for directory in sorted({directory.resolve() for directory in directories}):
            try:
                descriptor = os.open(directory, os.O_RDONLY)
                stack.callback(os.close, descriptor)
                fcntl.flock(descriptor, fcntl.LOCK_EX)
            except OSError as error:
                raise EvidenceError(f"Could not lock {directory}, so nothing was written: {error}.") from error
        yield


def maps_under(root: Path) -> list[Path]:
    if not root.is_dir():
        raise EvidenceError(f"{root} is not a directory; pass --root with the directory that holds the contracts.")
    found = []
    for base, dirs, names in os.walk(root, followlinks=False):
        dirs[:] = sorted(d for d in dirs if not d.startswith(".") and d != "node_modules")
        found += [Path(base) / name for name in sorted(names) if name.endswith(spec_lint.EVIDENCE_SUFFIX)]
    return found


def declared_ac(contract: Path, ac: str) -> str:
    if not spec_lint.is_ac_id(ac):
        raise EvidenceError(f"{ac!r} is not an AC ID.")
    result = spec_lint.Result()
    blocks = spec_lint.parse_document(contract, result)
    if not result.active_documents:
        problems = "; ".join(f.message for f in result.findings) or "it has no spec-lint marker"
        raise EvidenceError(f"{contract} is not a readable contract: {problems}.")
    if ac not in {block.identifier for block in blocks}:
        raise EvidenceError(f"{contract} does not declare {ac}.")
    return ac


def one_line(text: str, what: str) -> str:
    if not text.strip() or "\n" in text.strip():
        raise EvidenceError(f"{what} must be one non-empty line.")
    return text.strip()


def checked_name(name: str) -> str:
    return one_line(name, "A test name")


def require_test(test_file: Path, name: str) -> None:
    try:
        text = spec_lint.read_test_file(test_file)
    except (OSError, UnicodeDecodeError) as error:
        raise EvidenceError(f"{test_file}: {error}.") from error
    if not spec_lint.names_test(test_file, text, name):
        raise EvidenceError(f"{test_file} does not contain the test name '{name}' as written in the source; "
                            "copy it from the file, escapes included.")


def describe(row: EvidenceRow) -> str:
    return f"{row.ac} {row.file} '{row.test}'"


def add(contract: Path, ac: str, test_file: Path, test: str) -> str:
    ac, test = declared_ac(contract, ac), checked_name(test)
    require_test(test_file, test)
    with locked([contract.parent]):
        evidence = load(map_path(contract))
        row = EvidenceRow(ac, evidence.relative(test_file), test)
        if row in evidence.rows:
            return f"{evidence.path}: already lists {describe(row)}."
        evidence.rows.add(row)
        save(evidence)
    return f"{evidence.path}: added {describe(row)}."


def add_rows(contract: Path, lines: str) -> str:
    wanted: list[tuple[str, Path, str]] = []
    problems = []
    for number, line in enumerate(lines.splitlines(), 1):
        line = line.rstrip("\r")
        if not line.strip():
            continue
        cells = line.split("\t", 2)
        try:
            if len(cells) != 3:
                raise EvidenceError("expected AC, test file and test name separated by tabs.")
            ac, test_file, test = declared_ac(contract, cells[0].strip()), Path(cells[1].strip()), checked_name(cells[2])
            require_test(test_file, test)
            wanted.append((ac, test_file, test))
        except EvidenceError as error:
            problems.append(f"line {number}: {error}")
    if problems:
        raise EvidenceError("no row was added:\n" + "\n".join(problems))
    if not wanted:
        raise EvidenceError("standard input holds no rows.")
    with locked([contract.parent]):
        evidence = load(map_path(contract))
        rows = {EvidenceRow(ac, evidence.relative(test_file), test) for ac, test_file, test in wanted}
        added = rows - evidence.rows
        evidence.rows |= added
        save(evidence)
    return f"{evidence.path}: added {len(added)} row(s); {len(rows) - len(added)} already listed."


def remove(contract: Path, ac: str, test_file: Path | None, test: str | None) -> str:
    with locked([contract.parent]):
        return remove_locked(contract, ac, test_file, test)


def remove_locked(contract: Path, ac: str, test_file: Path | None, test: str | None) -> str:
    evidence = load(map_path(contract))
    target = test_file.resolve() if test_file else None
    doomed = {row for row in evidence.rows
              if row.ac == ac
              and (target is None or evidence.resolve(row) == target)
              and (test is None or row.test == test)}
    if not doomed:
        raise EvidenceError(f"{evidence.path} has no matching row for {ac}.")
    evidence.rows -= doomed
    save(evidence)
    return f"{evidence.path}: removed {len(doomed)} row(s) for {ac}."


def unchecked(contract: Path, ac: str, text: str | None) -> str:
    if text is not None:
        ac, text = declared_ac(contract, ac), one_line(text, "The unchecked part")
    with locked([contract.parent]):
        return unchecked_locked(contract, ac, text)


def unchecked_locked(contract: Path, ac: str, text: str | None) -> str:
    evidence = load(map_path(contract))
    if text is None:
        if evidence.unchecked.pop(ac, None) is None:
            raise EvidenceError(f"{evidence.path} records no unchecked part for {ac}.")
        save(evidence)
        return f"{evidence.path}: cleared the unchecked part of {ac}."
    previous = evidence.unchecked.get(ac)
    evidence.unchecked[ac] = text
    save(evidence)
    if previous is None:
        return f"{evidence.path}: recorded the unchecked part of {ac}."
    return f"{evidence.path}: replaced the unchecked part of {ac}, which read: {previous}"


def rewrite(root: Path, change: Callable[[MapFile, EvidenceRow], EvidenceRow | None], what: str) -> str:
    for _ in range(3):
        paths = maps_under(root)
        with locked(path.parent for path in paths):
            # A map created in a new directory after the listing is unlocked, so list again.
            if maps_under(root) == paths:
                return rewrite_locked(root, paths, change, what)
    raise EvidenceError(f"Evidence maps under {root} kept appearing while locking them; nothing was written. Run again.")


def rewrite_locked(root: Path, paths: list[Path], change: Callable[[MapFile, EvidenceRow], EvidenceRow | None],
                   what: str) -> str:
    changed = []
    for path in paths:
        evidence = load(path)
        updated = {change(evidence, row) or row for row in evidence.rows}
        if updated != evidence.rows:
            evidence.rows = updated
            changed.append(evidence)
    if not changed:
        raise EvidenceError(f"No evidence map under {root} has a row for {what}.")
    # A failure part way leaves earlier maps rewritten; running the command again finishes it.
    for evidence in changed:
        save(evidence)
    return "Updated " + ", ".join(str(evidence.path) for evidence in changed) + "."


def rename(root: Path, test_file: Path, old: str, new: str) -> str:
    new = checked_name(new)
    require_test(test_file, new)
    target = test_file.resolve()
    return rewrite(root, lambda evidence, row: EvidenceRow(row.ac, row.file, new)
                   if row.test == old and evidence.resolve(row) == target else None,
                   f"{test_file} '{old}'")


def move(root: Path, old_file: Path, new_file: Path) -> str:
    target = old_file.resolve()

    def repoint(evidence: MapFile, row: EvidenceRow) -> EvidenceRow | None:
        if evidence.resolve(row) != target:
            return None
        require_test(new_file, row.test)
        return EvidenceRow(row.ac, evidence.relative(new_file), row.test)

    return rewrite(root, repoint, str(old_file))


def fmt(path: Path) -> str:
    if not path.is_file():
        raise EvidenceError(f"{path} is not an evidence map file.")
    with locked([path.parent]):
        evidence = load(path)
        save(evidence)
    return f"{path}: {len(evidence.rows)} row(s) in canonical order."


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    p = commands.add_parser("add", help="List a test for an AC in its contract's evidence map, or with - list "
                                        "every row read from standard input, one per line as AC, test file and "
                                        "test name separated by tabs; any invalid row adds none.")
    p.add_argument("contract", type=Path)
    p.add_argument("ac", help="The AC ID, or - to read rows from standard input.")
    p.add_argument("test_file", type=Path, nargs="?")
    p.add_argument("test", nargs="?")
    p = commands.add_parser("remove", help="Remove an AC's rows, optionally only for one file or test.")
    p.add_argument("contract", type=Path)
    p.add_argument("ac")
    p.add_argument("test_file", type=Path, nargs="?")
    p.add_argument("test", nargs="?")
    p = commands.add_parser("unchecked", help="Record the part of an AC no listed test checks, or clear it.")
    p.add_argument("contract", type=Path)
    p.add_argument("ac")
    p.add_argument("text", nargs="?", help="The unchecked part in domain terms, or - to read it from standard input; "
                                         "omit it with --clear.")
    p.add_argument("--clear", action="store_true", help="Remove the AC's unchecked part.")
    p = commands.add_parser("rename", help="Rename a test in every map row that names it.")
    p.add_argument("test_file", type=Path)
    p.add_argument("old")
    p.add_argument("new")
    p.add_argument("--root", type=Path, default=Path("specs"), help="Search for maps under this directory.")
    p = commands.add_parser("move", help="Point every row naming a moved test file at its new path.")
    p.add_argument("old_file", type=Path)
    p.add_argument("new_file", type=Path)
    p.add_argument("--root", type=Path, default=Path("specs"), help="Search for maps under this directory.")
    p = commands.add_parser("fmt", help="Rewrite a map in canonical form.")
    p.add_argument("map", type=Path)
    args = parser.parse_args(argv)
    if args.command == "unchecked" and (args.text is None) != args.clear:
        parser.error("unchecked takes either the text or --clear")
    if args.command == "add" and (args.test_file is None, args.test is None) != ((args.ac == "-",) * 2):
        parser.error("add takes an AC, a test file and a test name, or - alone")
    try:
        if args.command == "add" and args.ac == "-":
            message = add_rows(args.contract, sys.stdin.read())
        elif args.command == "add":
            message = add(args.contract, args.ac, args.test_file, args.test)
        elif args.command == "remove":
            message = remove(args.contract, args.ac, args.test_file, args.test)
        elif args.command == "unchecked":
            text = sys.stdin.read() if args.text == "-" else args.text
            message = unchecked(args.contract, args.ac, text)
        elif args.command == "rename":
            message = rename(args.root, args.test_file, args.old, args.new)
        elif args.command == "move":
            message = move(args.root, args.old_file, args.new_file)
        else:
            message = fmt(args.map)
    except EvidenceError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(message)
    return 0


if __name__ == "__main__":
    sys.exit(main())
