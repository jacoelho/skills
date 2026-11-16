#!/usr/bin/env python3
"""Read and change an implementation record's state: its status, its units and their notes.

show   prints the record's status, changes and units as JSON.
apply  reads one JSON object on standard input and writes it into the record:

         {"status": "implementing",
          "units": [{"change": "C-1", "id": "U-1.2", "state": "blocked", "reason": "...",
                     "kind": "impl", "title": "...", "after": [], "owner": "booking/", "edits": ["booking/"]}],
          "notes": [{"change": "C-1", "text": "..."}]}

       Every field is optional. A unit the record does not hold is added to its change; only
       the STACK change is created, after the last change, when missing. Every status and unit move is checked
       against the transitions below before anything is written; one illegal move writes
       nothing. Writing the same object twice changes nothing the second time. With --sum,
       the payload must match that FNV-1a checksum, so a mistyped payload is refused.
       On success it prints the record's state after the write as one line of JSON.

The gap map, design and test design are the planner's; this tool never changes them.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

# The transitions references/execution.md describes; test_record.py keeps the two in step.
STATUS_MOVES = {
    "planning": {"approved"},
    "approved": {"implementing", "blocked", "discard-ready", "accepted", "planning"},
    "implementing": {"blocked", "discard-ready", "accepted", "planning"},
    "blocked": {"implementing", "discard-ready", "accepted", "planning"},
    "discard-ready": {"implementing", "blocked", "accepted", "planning"},
    "accepted": {"implementing", "blocked", "discard-ready", "planning"},
}
UNIT_MOVES = {
    "pending": {"in-progress", "done", "blocked"},
    "in-progress": {"done", "blocked", "pending"},
    "done": {"accepted", "pending"},
    "blocked": {"pending"},
    "accepted": {"pending"},
}
MARKERS = {"pending": " ", "in-progress": "~", "done": "x", "accepted": "a", "blocked": "!"}
STATES = {marker: state for state, marker in MARKERS.items()}

STATUS_LINE = re.compile(r"^Status: (\S+)\s*$")
ANY_CHANGE_HEADING = re.compile(r"^#{1,6}[ \t]+((?:C-\d+)|STACK)\b")
UNIT_ID = re.compile(r"^[A-Za-z][\w.-]*$")
# The only change apply may create; every other change comes from the planner.
STACK = "STACK"
CHANGE_HEADING = re.compile(r"^## ((?:C-\d+)|STACK)\b(.*)$")
UNIT_LINE = re.compile(r"^[-*+] \[(.)\] ?(\S*)(.*)$")
NOTES_LINE = re.compile(r"^Notes:")


class RecordError(Exception):
    pass


@dataclass
class Unit:
    id: str
    state: str
    line: int


@dataclass
class Change:
    id: str
    heading: int
    end: int
    units: list[Unit] = field(default_factory=list)
    notes_line: int | None = None


@dataclass
class Record:
    lines: list[str]
    status: str
    status_line: int
    changes: list[Change]

    def unit(self, identifier: str) -> tuple[Change, Unit] | None:
        for change in self.changes:
            for unit in change.units:
                if unit.id == identifier:
                    return change, unit
        return None


def parse(text: str, path: Path) -> Record:
    lines = text.splitlines()
    status, status_line = "", -1
    changes: list[Change] = []
    fenced = False
    for number, line in enumerate(lines):
        if line.startswith("```"):
            fenced = not fenced
        if fenced:
            continue
        if line.startswith("#"):
            stray = ANY_CHANGE_HEADING.match(line)
            if stray and not line.startswith("## "):
                raise RecordError(f"{path}:{number + 1}: change {stray.group(1)} must be a level-2 heading, '## {stray.group(1)} <title>'")
        if line.startswith("## "):
            if changes and changes[-1].end == -1:
                changes[-1].end = number
            heading = CHANGE_HEADING.match(line)
            if heading:
                changes.append(Change(heading.group(1), number, -1))
            continue
        if status_line < 0 and (found := STATUS_LINE.match(line)):
            status, status_line = found.group(1), number
            continue
        found = UNIT_LINE.match(line)
        if found and (not changes or changes[-1].end != -1):
            raise RecordError(f"{path}:{number + 1}: unit line outside a change section; units go under '## C-<n>' or '## STACK'")
        if not changes or changes[-1].end != -1:
            continue
        if found:
            marker, identifier = found.group(1), found.group(2)
            if not UNIT_ID.match(identifier):
                raise RecordError(f"{path}:{number + 1}: unit line must read '- [<marker>] <unit id> <title>'; got {line.strip()!r}")
            if marker not in STATES:
                raise RecordError(f"{path}:{number + 1}: unknown unit marker [{marker}]; use one of "
                                  + ", ".join(f"[{m}] {s}" for s, m in MARKERS.items()))
            changes[-1].units.append(Unit(identifier, STATES[marker], number))
        elif NOTES_LINE.match(line):
            changes[-1].notes_line = number
    if changes and changes[-1].end == -1:
        changes[-1].end = len(lines)
    if status_line < 0:
        raise RecordError(f"{path}: no 'Status: <status>' line")
    if status not in STATUS_MOVES:
        raise RecordError(f"{path}:{status_line + 1}: unknown status {status!r}; use one of {', '.join(STATUS_MOVES)}")
    return Record(lines, status, status_line, changes)


def state_of(record: Record) -> dict:
    return {
        "status": record.status,
        "changes": [{"id": c.id, "units": {u.id: u.state for u in c.units}} for c in record.changes],
    }


def one_line(text: str) -> str:
    return " ".join(str(text).split())


def unit_text(spec: dict) -> str:
    parts = [one_line(spec.get("title") or ("Write failing tests" if spec.get("kind") == "tests" else "Fix"))]
    if spec.get("after"):
        parts.append("after: " + ", ".join(spec["after"]))
    if spec.get("owner"):
        parts.append("owner: " + spec["owner"])
    if spec.get("edits"):
        parts.append("edits: " + ", ".join(spec["edits"]))
    return " - ".join(parts)


def fnv1a(text: str) -> str:
    value = 0x811C9DC5
    data = text.encode("utf-16-le")
    for unit in (int.from_bytes(data[i:i + 2], "little") for i in range(0, len(data), 2)):
        value = ((value ^ unit) * 0x01000193) & 0xFFFFFFFF
    return f"{value:08x}"


def check_moves(record: Record, payload: dict) -> list[str]:
    errors = []
    known = {c.id for c in record.changes}
    status = payload.get("status")
    if status is not None:
        if status not in STATUS_MOVES:
            errors.append(f"unknown status {status!r}")
        elif status != record.status and status not in STATUS_MOVES[record.status]:
            errors.append(f"status {record.status} cannot become {status}; "
                          f"it can become {', '.join(sorted(STATUS_MOVES[record.status]))}")
    for spec in payload.get("units", []):
        identifier, state = spec.get("id"), spec.get("state")
        if not identifier or state not in UNIT_MOVES:
            errors.append(f"unit {identifier!r}: needs an id and a state among {', '.join(UNIT_MOVES)}")
            continue
        found = record.unit(identifier)
        if found is None:
            if not spec.get("change"):
                errors.append(f"unit {identifier} is not in the record; give its change to add it")
            elif not UNIT_ID.match(identifier):
                errors.append(f"unit id {identifier!r} must start with a letter and hold only letters, digits, '.', '_' or '-'")
            elif spec["change"] not in known and spec["change"] != STACK:
                errors.append(f"unit {identifier}: change {spec['change']} is not in the record; only {STACK} is added")
            continue
        current = found[1].state
        if state != current and state not in UNIT_MOVES[current]:
            errors.append(f"unit {identifier} is {current} and cannot become {state}; "
                          f"it can become {', '.join(sorted(UNIT_MOVES[current]))}")
    for note in payload.get("notes", []):
        if not note.get("change") or not str(note.get("text", "")).strip():
            errors.append(f"note {note!r}: needs a change and a text")
        elif note["change"] not in known and note["change"] != STACK:
            errors.append(f"note for change {note['change']}: it is not in the record")
    return errors


def apply(record: Record, payload: dict) -> list[str]:
    lines = record.lines
    if payload.get("status") is not None:
        lines[record.status_line] = f"Status: {payload['status']}"
    by_change: dict[str, list[str]] = {}
    pending_units: dict[str, list[str]] = {}
    for spec in payload.get("units", []):
        found = record.unit(spec["id"])
        reason = one_line(spec.get("reason") or "")
        if found:
            change, unit = found
            if unit.state != spec["state"]:
                lines[unit.line] = f"- [{MARKERS[spec['state']]}]" + lines[unit.line][5:]
                unit.state = spec["state"]
            if spec["state"] == "blocked" and reason:
                by_change.setdefault(change.id, []).append(f"{spec['id']} blocked: {reason}")
        else:
            pending_units.setdefault(spec["change"], []).append(
                f"- [{MARKERS[spec['state']]}] {spec['id']} {unit_text(spec)}")
            if spec["state"] == "blocked" and reason:
                by_change.setdefault(spec["change"], []).append(f"{spec['id']} blocked: {reason}")
    for note in payload.get("notes", []):
        by_change.setdefault(note["change"], []).append(one_line(note["text"]))

    # Insert from the bottom up so earlier line numbers stay valid.
    known = {c.id: c for c in record.changes}
    new_changes = [c for c in {**pending_units, **by_change} if c not in known]
    tail: list[str] = []
    for change_id in new_changes:
        last = record.changes[-1].id if record.changes else "-"
        tail += ["", f"## {change_id} Whole-stack conformance fixes - after: {last}", "",
                 *pending_units.get(change_id, []), "", "Notes:",
                 *[f"- {n}" for n in dict.fromkeys(by_change.get(change_id, []))]]
    for change in sorted(record.changes, key=lambda c: c.heading, reverse=True):
        notes = [n for n in dict.fromkeys(by_change.get(change.id, []))
                 if f"- {n}" not in lines[change.heading:change.end]]
        if notes:
            if change.notes_line is None:
                at = change.end
                while at > change.heading and not lines[at - 1].strip():
                    at -= 1
                lines[at:at] = ["", "Notes:", *[f"- {n}" for n in notes]]
            else:
                at = change.notes_line + 1
                while at < change.end and lines[at].startswith("- "):
                    at += 1
                lines[at:at] = [f"- {n}" for n in notes]
        units = pending_units.get(change.id, [])
        if units:
            at = change.units[-1].line + 1 if change.units else change.heading + 1
            lines[at:at] = units
    if tail:
        while lines and not lines[-1].strip():
            lines.pop()
        lines += tail
    return lines


def write_atomically(path: Path, text: str) -> None:
    mode = path.stat().st_mode & 0o777
    handle, temporary = tempfile.mkstemp(dir=path.parent, prefix=f".{path.name}.")
    try:
        with os.fdopen(handle, "w", encoding="utf-8", newline="") as out:
            out.write(text)
        os.chmod(temporary, mode)
        os.replace(temporary, path)
    except BaseException:
        Path(temporary).unlink(missing_ok=True)
        raise


def read(path: Path) -> tuple[str, Record]:
    try:
        text = path.read_bytes().decode("utf-8")
    except OSError as error:
        raise RecordError(f"{path}: {error.strerror}") from error
    except UnicodeDecodeError as error:
        raise RecordError(f"{path}: not UTF-8 ({error})") from error
    return text, parse(text, path)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    commands = parser.add_subparsers(dest="command", required=True)
    p = commands.add_parser("show", help="Print the record's status, changes and units as JSON.")
    p.add_argument("record", type=Path)
    p = commands.add_parser("apply", help="Write a JSON state change read from standard input into the record.")
    p.add_argument("record", type=Path)
    p.add_argument("--sum", help="FNV-1a checksum of the payload; a payload that does not match is refused.")
    args = parser.parse_args(argv)
    try:
        text, record = read(args.record)
        if args.command == "show":
            print(json.dumps(state_of(record)))
            return 0
        raw = sys.stdin.read().strip()
        if args.sum and fnv1a(raw) != args.sum.lower():
            raise RecordError(f"the payload's checksum is {fnv1a(raw)}, not {args.sum}; pass the payload exactly as given")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError as error:
            raise RecordError(f"the payload is not JSON: {error}") from error
        if not isinstance(payload, dict):
            raise RecordError("the payload must be a JSON object")
        errors = check_moves(record, payload)
        if errors:
            raise RecordError("nothing written: " + "; ".join(errors))
        lines = apply(record, payload)
        newline = "\r\n" if "\r\n" in text else "\n"
        updated = newline.join(lines) + (newline if text.endswith("\n") or not text else "")
        if updated != text:
            write_atomically(args.record, updated)
        print(json.dumps(state_of(parse(updated, args.record))))
    except RecordError as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
