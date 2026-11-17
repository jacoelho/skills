#!/usr/bin/env python3
"""Keep the decisions under specs/: report their state, list the questions and the assumptions, apply the answers and the review.

A spec file is Markdown. Each `## <ID> <title>` section is one entry, made of labelled lines. Its first label is its state:

    Open     a question waiting for an answer: Open, Case, Options (separated by " | "), Default
    Assumed  a decision taken without an answer, waiting for review: Assumed, Case, optionally Rejected
    Rule     a settled decision: Rule, optionally Case and Rejected
"""

import argparse
import contextlib
import json
import os
import re
import stat
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

ENTRY = re.compile(r"^## +([A-Z][A-Z0-9]*-\d+)\s+(\S.*?)\s*$")
FIELD = re.compile(r"^(Open|Case|Options|Default|Reason|Assumed|Rule|Rejected|Comment):\s*(.*)$")
QUESTION_LINE = re.compile(r"^\s*(\d+)[.)]\s+\[([A-Z][A-Z0-9]*-\d+)\]\s*(.*)$")
ANSWER_START = re.compile(r"^(?:(\d+)\s*[.):]|\[([A-Z][A-Z0-9]*-\d+)\]\s*[.):]?|([A-Z][A-Z0-9]*-\d+)\s*[.):])\s*(.*)$")
OPTION_PICK = re.compile(r"^\(?([a-zA-Z])\)?(?:\s*[,.:;]\s*(.*))?$", re.S)
FENCE = re.compile(r"^\s*(```|~~~)")
LEFT_PART_OPEN = re.compile(r"\b(your call|up to you|you decide|no preference)\b", re.I)

STATES = ("Open", "Assumed", "Rule")
KIND = {"Open": "an open question", "Assumed": "an assumption", "Rule": "a rule"}
WANTED = {"Open": ("Open", "Case", "Options", "Default", "Reason"), "Assumed": ("Assumed", "Case"), "Rule": ("Rule",)}
UNWANTED = {"Open": ("Rejected", "Comment"), "Assumed": ("Options", "Default", "Reason", "Comment"),
            "Rule": ("Options", "Default", "Reason")}
LEFT_OPEN = {"", "your call", "up to you", "you decide", "no preference"}
ACCEPTS = {"default", "ok", "okay", "yes", "agreed", "accept", "accepted"}
# "Default" and "accept" can begin a rule in the owner's own words, so they accept only when punctuation sets them off.
ACCEPTS_THEN = re.compile(rf"^(?:(?:{'|'.join(sorted(ACCEPTS))})\s*[,.;:]|(?:ok|okay|yes|agreed)\s)\s*(\S.*)$", re.I | re.S)
NOTHING_ASSUMED = "Nothing was decided on your behalf."
PART_OPEN = "part of these was left open; keep what was answered and record the rest as its own assumption"
REFUSES = {"no", "nope", "wrong", "reject", "rejected"}


@dataclass
class Finding:
    """One thing to fix in a spec file. A blocking finding is a malformed entry, which no command will read past."""

    path: str
    line: int
    message: str
    fix: str
    blocking: bool = True

    def text(self):
        return f"{self.path}:{self.line}: {self.message} Fix: {self.fix}"


@dataclass
class Entry:
    path: Path
    id: str
    title: str
    start: int
    end: int = 0
    fields: dict = field(default_factory=dict)

    @property
    def state(self):
        """Returns Open, Assumed or Rule, or None for an entry that is not exactly one of them."""
        present = [label for label in STATES if label in self.fields]
        return present[0] if len(present) == 1 else None

    @property
    def text(self):
        return self.fields[self.state]

    def options(self):
        return [o.strip() for o in self.fields.get("Options", "").split(" | ") if o.strip()]


class Refused(Exception):
    """The command cannot run as asked; the message says what to change."""


def read_spec(path):
    """Returns the file's lines and its line ending, so a rewrite keeps the ending the file had."""
    try:
        with open(path, encoding="utf-8", newline="") as source:
            text = source.read()
    except UnicodeDecodeError:
        raise Refused(f"{path}: not UTF-8 text. Fix: save it as UTF-8, or move it out of the spec directory.") from None
    return text.replace("\r\n", "\n").split("\n"), "\r\n" if "\r\n" in text else "\n"


def parse(path, findings):
    entries, current, label, gap = [], None, None, True
    fence, fence_line, headings, has_fields = None, 0, [], False
    lines, _ = read_spec(path)
    for number, line in enumerate(lines, 1):
        marker = FENCE.match(line)
        if marker and fence in (None, marker[1]):
            if fence is None and current:
                findings.append(Finding(str(path), number, f"{current.id} holds a fenced block.",
                                        "move it above the first entry; an entry holds labelled lines only."))
            fence, fence_line = (marker[1], number) if fence is None else (None, 0)
            continue
        if fence:
            continue
        if line.startswith("#"):
            if current:
                current.end = number - 1
                current = None
            match = ENTRY.match(line)
            if match:
                current = Entry(path, match[1], match[2], number - 1)
                entries.append(current)
                label = None
            elif line.startswith("## "):
                headings.append(Finding(str(path), number, f"heading {line.strip()!r} is not an entry.",
                                        "name it '## <ID> <title>', such as '## TAG-3 Duplicate names', or use '###'."))
            continue
        if not current:
            has_fields = has_fields or bool(FIELD.match(line))
            continue
        if not line.strip():
            gap = True
            continue
        match = FIELD.match(line)
        if match:
            label = match[1]
            if label in current.fields:
                findings.append(Finding(str(path), number, f"{current.id} has two {label} lines.", "keep one."))
            current.fields[label] = match[2].strip()
        elif label and not gap:
            current.fields[label] = f"{current.fields[label]} {line.strip()}".strip()
        else:
            findings.append(Finding(str(path), number, f"{current.id} has text outside a labelled line.",
                                    "start it with Open:, Case:, Options:, Default:, Assumed:, Rule: or Rejected:."))
        gap = False
    if current:
        current.end = len(lines)
    if fence:
        findings.append(Finding(str(path), fence_line, "this code fence is never closed, so everything after it is ignored.",
                                f"close it with a line of {fence}."))
    # Prose kept beside the specs, such as a README, has headings that are not entries and is left alone.
    if entries or has_fields:
        findings.extend(headings)
    return entries


def check(entry):
    here = (str(entry.path), entry.start + 1)
    present = [label for label in STATES if label in entry.fields]
    if len(present) != 1:
        problem = f"has {' and '.join(present)} lines" if present else "has no Open, Assumed or Rule line"
        yield Finding(*here, f"{entry.id} {problem}.",
                      "keep exactly one: Open for a question, Assumed for a decision taken without an answer, Rule for a settled one.")
        return
    state = present[0]
    for label in WANTED[state]:
        if not entry.fields.get(label):
            yield Finding(*here, f"{entry.id} has no {label}.", f"add a '{label}:' line with its text.")
    for label in UNWANTED[state]:
        if label in entry.fields:
            yield Finding(*here, f"{entry.id} is {KIND[state]} and has a {label} line.", f"remove the {label} line.")
    if state == "Open" and entry.fields.get("Options") and len(entry.options()) < 2:
        yield Finding(*here, f"{entry.id} offers fewer than two options.",
                      "give at least two outcomes separated by ' | ', or write it as an assumption.")
    if state != "Open" and LEFT_PART_OPEN.search(entry.text):
        yield Finding(*here, f"{entry.id}: part of this was left open.",
                      "keep here what was answered, and record the part left open as its own Assumed entry.", blocking=False)
    if state == "Rule" and "Comment" in entry.fields:
        yield Finding(*here, f"{entry.id} was answered with an option and a comment.",
                      "fold the comment into the Rule where it limits the rule, then remove the Comment line.", blocking=False)


def load(directory):
    root = Path(directory)
    if not root.is_dir():
        raise Refused(f"{root}: no such directory. Fix: create it and write the first spec file, such as {root}/recipes.md.")
    findings, entries = [], []
    for path in sorted(root.rglob("*.md")):
        entries.extend(parse(path, findings))
    seen = {}
    for entry in entries:
        if entry.id in seen:
            first = seen[entry.id]
            findings.append(Finding(str(entry.path), entry.start + 1,
                                    f"{entry.id} is also at {first.path}:{first.start + 1}.", "give one of them the next free number."))
        else:
            seen[entry.id] = entry
        findings.extend(check(entry))
    return entries, findings


def squash(text):
    return " ".join(text.split())


def same(one, other):
    return squash(one).rstrip(".").lower() == squash(other).rstrip(".").lower()


def as_sent(entry):
    """Returns what a list line says of an entry after its ID. An entry that no longer matches it changed after the list was sent."""
    if entry.state == "Assumed":
        return f"{entry.title}: {entry.text}"
    options = " ".join(f"({chr(97 + i)}) {text}" for i, text in enumerate(entry.options()))
    parts = [entry.fields["Open"], f"Case: {entry.fields['Case']}", f"Options: {options}",
             f"Default if unanswered: {entry.fields['Default']}", f"Reason: {entry.fields['Reason']}"]
    return f"{entry.title}: " + " ".join(part.rstrip() for part in parts)


def in_state(entries, state):
    return [entry for entry in entries if entry.state == state]


def status(args):
    entries, findings = load(args.dir)
    ids = {state: [entry.id for entry in in_state(entries, state)] for state in STATES}
    if args.json:
        print(json.dumps({"decided": len(ids["Rule"]), "assumed": ids["Assumed"], "open": ids["Open"],
                          "findings": [vars(f) for f in findings]}))
    else:
        for finding in findings:
            print(finding.text())
        print(f"{len(ids['Rule'])} decided, {len(ids['Assumed'])} assumed, {len(ids['Open'])} open"
              + (f": {' '.join(ids['Open'])}" if ids["Open"] else ""))
    return 1 if findings else 0


def clean_entries(directory):
    entries, findings = load(directory)
    malformed = [finding for finding in findings if finding.blocking]
    if malformed:
        raise Refused("\n".join(f.text() for f in malformed))
    return entries


def questions(args):
    opened = in_state(clean_entries(args.dir), "Open")
    if args.json:
        print(json.dumps([{"number": n, "id": e.id, "title": e.title, "open": e.fields["Open"], "case": e.fields["Case"],
                           "options": e.options(), "default": e.fields["Default"], "reason": e.fields["Reason"]}
                          for n, e in enumerate(opened, 1)]))
    else:
        for number, entry in enumerate(opened, 1):
            print(f"{number}. [{entry.id}] {as_sent(entry)}")
    return 0


def review(args):
    assumed = in_state(clean_entries(args.dir), "Assumed")
    if args.json:
        print(json.dumps([{"number": n, "id": e.id, "title": e.title, "assumed": e.text} for n, e in enumerate(assumed, 1)]))
    elif not assumed:
        print(NOTHING_ASSUMED)
    else:
        print(f"Decided on your behalf: {len(assumed)}. Reply with the number of each one to change and what it should be; "
              "the rest stand.")
        for number, entry in enumerate(assumed, 1):
            print(f"{number}. [{entry.id}] {as_sent(entry)}")
    return 0


def read_answers(text, numbers):
    answers, numbered, key, gap, margin = {}, set(), None, False, None
    for line in text.replace("\r\n", "\n").split("\n"):
        indent = len(line) - len(line.lstrip())
        # A numbered point indented past the answers belongs to the answer above it.
        match = ANSWER_START.match(line.lstrip()) if margin is None or indent <= margin else None
        if not line.strip():
            gap = True
        elif line.lstrip().startswith(">"):
            continue
        elif match:
            gap, margin = False, indent if margin is None else margin
            if match[1]:
                if numbers is None:
                    raise Refused(f"answer {match[1]} is numbered, and no list says which entry that is. "
                                  "Fix: pass --questions with the list that was sent, or key each answer by entry ID.")
                if match[1] not in numbers:
                    raise Refused(f"answer {match[1]}: the list that was sent has no number {match[1]}. Fix: correct the number.")
                key = numbers[match[1]]
                numbered.add(key)
            else:
                key = match[2] or match[3]
            if key in answers:
                raise Refused(f"{key} is answered twice. Fix: keep one answer.")
            answers[key] = match[4].strip()
            if match[1] and answers[key].startswith(f"[{key}]"):
                raise Refused(f"answer {match[1]} repeats its question. Fix: keep only the answer after the number.")
        elif key and gap:
            raise Refused(f"{line.strip()!r} belongs to no answer. Fix: remove it, or start it with a question number or entry ID.")
        elif key:
            answers[key] = f"{answers[key]} {line.strip()}".strip()
    if not answers:
        raise Refused("no answers found. Fix: start each answer with its question number or entry ID, such as '3. ...' or 'TAG-3: ...'.")
    return answers, numbered


def plain(answer):
    return answer.strip().rstrip(".").lower()


def accepts(answer):
    """Returns whether the answer accepts what was proposed, and any words that follow the accepting one."""
    if plain(answer) in ACCEPTS:
        return True, None
    qualified = ACCEPTS_THEN.match(answer.strip())
    return (True, qualified[1].strip()) if qualified else (False, None)


def refuse_a_bare_no(entry, answer):
    if plain(answer) in REFUSES:
        raise Refused(f"{entry.id}: {answer.strip()!r} does not say what to build. Fix: answer with the behaviour wanted.")


def others(options, chosen):
    """Returns the options the chosen text rejects, or None when it is not one of them."""
    rejected = [option for option in options if not same(option, chosen)]
    return " | ".join(rejected) if len(rejected) < len(options) else None


def settle_question(entry, answer):
    """Returns an open question's next state, its text, what it rejects, and a comment still to fold in.

    Only an answer makes a Rule. A question left open, or not answered at all (None), becomes an assumption of its
    Default, which the review list shows.
    """
    default, options = entry.fields["Default"], entry.options()
    if answer is None or plain(answer) in LEFT_OPEN:
        return "Assumed", default, others(options, default), None
    refuse_a_bare_no(entry, answer)
    accepted, comment = accepts(answer)
    if accepted:
        return "Rule", default, others(options, default), comment
    pick = OPTION_PICK.match(answer.strip())
    if pick:
        chosen, comment = ord(pick[1].lower()) - 97, (pick[2] or "").strip()
        if chosen < len(options):
            return "Rule", options[chosen], others(options, options[chosen]), comment or None
        if not comment:
            raise Refused(f"{entry.id}: there is no option {pick[1].lower()}; it has {len(options)}. "
                          "Fix: pick one of its letters, or answer in words.")
    return "Rule", answer.strip(), others(options, answer), None


def settle_assumption(entry, reply):
    """Returns a reviewed assumption's Rule text, what it rejects, and a comment still to fold in."""
    kept = entry.fields.get("Rejected")
    if reply is None:
        return entry.text, kept, None
    refuse_a_bare_no(entry, reply)
    accepted, comment = accepts(reply)
    if accepted:
        return entry.text, kept, comment
    if OPTION_PICK.match(reply.strip()):
        raise Refused(f"{entry.id} is an assumption and offers no options. Fix: answer in words, or 'ok' to keep it.")
    text = reply.strip()
    rejected = [old for old in [entry.text, *(kept.split(" | ") if kept else [])] if not same(old, text)]
    return text, " | ".join(rejected) or None, None


def write_all(texts):
    """Replaces every file or none: all are written beside their targets first, then moved into place."""
    staged = []
    try:
        for path, text in texts.items():
            target = path.resolve()
            handle, temporary = tempfile.mkstemp(dir=target.parent, prefix=f".{target.name}.")
            staged.append((temporary, target))
            with os.fdopen(handle, "w", encoding="utf-8", newline="") as out:
                out.write(text)
            os.chmod(temporary, stat.S_IMODE(target.stat().st_mode))
    except OSError as error:
        for temporary, _ in staged:
            with contextlib.suppress(OSError):
                os.unlink(temporary)
        raise Refused(f"{path}: cannot write ({error.strerror}); nothing was changed. "
                      "Fix: check the permissions of the file and its directory.") from None
    for temporary, target in staged:
        os.replace(temporary, target)


def read_list(path):
    """Returns the numbered lines of a list that was sent, as number -> (entry ID, the rest of the line)."""
    text = Path(path).read_text(encoding="utf-8")
    lines = {}
    for match in filter(None, map(QUESTION_LINE.match, text.split("\n"))):
        if match[1] in lines or match[2] in {entry_id for entry_id, _ in lines.values()}:
            raise Refused(f"{path} has number {match[1]} or entry {match[2]} twice. Fix: pass the list as it was printed.")
        lines[match[1]] = (match[2], match[3])
    if not lines and NOTHING_ASSUMED not in text:
        raise Refused(f"{path}: no numbered lines found. Fix: pass the list 'spec questions' or 'spec review' printed.")
    return lines


def read_reply(path, numbers):
    source = sys.stdin.read() if path == "-" else Path(path).read_text(encoding="utf-8")
    return read_answers(source, numbers)


def rewrite(changes):
    """Replaces each changed entry's lines; changes are (entry, state, text, rejected, comment)."""
    by_path = {}
    for change in changes:
        by_path.setdefault(change[0].path, []).append(change)
    texts = {}
    for path, group in by_path.items():
        lines, eol = read_spec(path)
        for entry, state, text, rejected, comment in sorted(group, key=lambda change: -change[0].start):
            block = [f"## {entry.id} {entry.title}", "", f"{state}: {text}", f"Case: {entry.fields['Case']}"]
            if rejected:
                block.append(f"Rejected: {rejected}")
            if comment:
                block.append(f"Comment: {comment}")
            body_end = entry.end
            while body_end > entry.start + 1 and not lines[body_end - 1].strip():
                body_end -= 1
            lines[entry.start:body_end] = block
        texts[path] = eol.join(lines)
    write_all(texts)


def report(args, result, lines):
    if args.json:
        print(json.dumps(result))
    else:
        for label, key, counted in lines:
            ids = result[key]
            if counted:
                print(f"{label} {len(ids)}" + (f": {' '.join(ids)}" if ids else ""))
            elif ids:
                print(f"{label}: {' '.join(ids)}")
        if result["to_review"]:
            print(f"assumptions for 'spec review': {result['to_review']}")
    return 0


def answer(args):
    entries = clean_entries(args.dir)
    listed = read_list(args.questions) if args.questions else None
    sent = dict(listed.values()) if listed else {}
    numbers = {number: line[0] for number, line in listed.items()} if listed is not None else None
    if args.answers is None:
        if not args.rest_default:
            raise Refused("no answers given. Fix: pass a file of answers, - for standard input, or --rest-default alone to "
                          "assume the Default of every open question.")
        answers, numbered = {}, set()
    else:
        answers, numbered = read_reply(args.answers, numbers)
    by_id = {e.id: e for e in entries}
    unknown = sorted(set(answers) - set(by_id))
    if unknown:
        raise Refused(f"no such entry: {' '.join(unknown)}. Fix: use the IDs 'spec questions' prints.")
    changes, stale = [], []
    for entry in entries:
        given = answers.get(entry.id)
        if entry.state == "Open" and entry.id in numbered and squash(sent[entry.id]) != squash(as_sent(entry)):
            stale.append(entry.id)
        elif entry.state == "Open" and (given is not None or args.rest_default):
            changes.append((entry, *settle_question(entry, given)))
        elif entry.state == "Assumed" and given is not None and plain(given) not in LEFT_OPEN:
            # A number is a position in a list of questions, and a reply to a review list numbers its lines the same way.
            if entry.id in numbered:
                raise Refused(f"{entry.id} is an assumption, no longer an open question, and its answer is numbered. "
                              f"Fix: if this answers {entry.id}, key it by entry ID ('{entry.id}: ...'); "
                              "if it replies to a review list, use 'spec reviewed'.")
            # Nothing here shows which text the owner is accepting; the review list does.
            if accepts(given)[0]:
                raise Refused(f"{entry.id} is an assumption, and {given.strip()!r} settles one only at review. "
                              "Fix: answer with the behaviour wanted, or use 'spec reviewed' with the list that was sent.")
            changes.append((entry, "Rule", *settle_assumption(entry, given)))
    rewrite(changes)
    touched = {change[0].id for change in changes}
    assumed = [c[0].id for c in changes if c[1] == "Assumed"]
    result = {
        "decided": [c[0].id for c in changes if c[1] == "Rule"],
        "assumed": assumed,
        "not_open": sorted(i for i in answers if i not in touched and i not in stale),
        "changed_since_sent": stale,
        "part_open": [c[0].id for c in changes if LEFT_PART_OPEN.search(c[2])],
        "commented": [c[0].id for c in changes if c[4]],
        "open": [e.id for e in in_state(entries, "Open") if e.id not in touched],
        "to_review": len(assumed) + sum(e.id not in touched for e in in_state(entries, "Assumed")),
    }
    return report(args, result, [
        ("decided", "decided", True),
        ("assumed", "assumed", False),
        ("not open, left as they are", "not_open", False),
        ("changed since the list was sent, not answered; send 'spec questions' again", "changed_since_sent", False),
        (PART_OPEN, "part_open", False),
        ("answered with an option or an accepting word and a comment; fold each Comment into its Rule", "commented", False),
        ("still open", "open", False),
    ])


def reviewed(args):
    """Settles the assumptions on a review list that was sent. An assumption the list does not show is never settled."""
    entries = clean_entries(args.dir)
    listed = read_list(args.review)
    numbers = {number: line[0] for number, line in listed.items()}
    replies = read_reply(args.reply, numbers)[0] if args.reply else {}
    by_id = {e.id: e for e in entries}
    shown = dict(listed.values())
    unlisted = sorted(set(replies) - set(shown))
    if unlisted:
        raise Refused(f"not on the list that was sent: {' '.join(unlisted)}. Fix: reply only to the lines of that list.")
    changes, settled, kept, stale = [], [], [], []
    for entry_id, line in shown.items():
        entry, reply = by_id.get(entry_id), replies.get(entry_id)
        if entry is None or (entry.state == "Assumed" and squash(line) != squash(as_sent(entry))):
            stale.append(entry_id)
        elif entry.state != "Assumed":
            settled.append(entry_id)
        elif reply is not None and plain(reply) in LEFT_OPEN:
            kept.append(entry_id)
        else:
            changes.append((entry, "Rule", *settle_assumption(entry, reply)))
    rewrite(changes)
    touched = {change[0].id for change in changes}
    result = {
        "decided": [c[0].id for c in changes],
        "not_assumed": settled,
        "left_for_review": kept,
        "changed_since_sent": stale,
        "part_open": [c[0].id for c in changes if LEFT_PART_OPEN.search(c[2])],
        "commented": [c[0].id for c in changes if c[4]],
        "to_review": sum(e.id not in touched for e in in_state(entries, "Assumed")),
    }
    return report(args, result, [
        ("decided", "decided", True),
        ("not assumptions, left as they are", "not_assumed", False),
        ("left open in the reply, still assumptions", "left_for_review", False),
        ("changed since the list was sent, not settled; send 'spec review' again", "changed_since_sent", False),
        (PART_OPEN, "part_open", False),
        ("accepted with a comment; fold each Comment into its Rule", "commented", False),
    ])


def main(argv=None):
    shared = argparse.ArgumentParser(add_help=False)
    shared.add_argument("--dir", default="specs", help="the directory of spec files (default: specs)")
    shared.add_argument("--json", action="store_true", help="print one JSON value")
    parser = argparse.ArgumentParser(prog="spec", description=__doc__.split("\n")[0])
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("status", parents=[shared],
                        help="count rules, assumptions and open questions, and report what needs fixing").set_defaults(run=status)
    commands.add_parser("questions", parents=[shared],
                        help="print every open question as one numbered line").set_defaults(run=questions)
    answering = commands.add_parser("answer", parents=[shared],
                                    help="apply the owner's answers to open questions, and to assumptions answered by "
                                         "entry ID; a refused answer changes nothing")
    answering.add_argument("answers", nargs="?",
                           help="a file of answers, or - for standard input; each starts with a question number or an entry ID")
    answering.add_argument("--questions", help="the question list that was sent, which says which entry each number is")
    answering.add_argument("--rest-default", action="store_true",
                           help="also turn every question left unanswered into an assumption of its Default, "
                                "for when the round of answers is over")
    answering.set_defaults(run=answer)
    commands.add_parser("review", parents=[shared],
                        help="print every assumption as one numbered line, for the owner to review").set_defaults(run=review)
    reviewing = commands.add_parser("reviewed", parents=[shared],
                                    help="settle the assumptions on a review list that was sent; a refused reply changes nothing")
    reviewing.add_argument("review", help="the list 'spec review' printed, as it was sent")
    reviewing.add_argument("reply", nargs="?",
                           help="the owner's reply, or - for standard input, naming the lines to change; "
                                "leave it out when the owner changes nothing")
    reviewing.set_defaults(run=reviewed)
    args = parser.parse_args(argv)
    try:
        return args.run(args)
    except Refused as refusal:
        print(refusal, file=sys.stderr)
        return 2
    except OSError as error:
        print(f"{error.filename}: {error.strerror}. Fix: check the path.", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
