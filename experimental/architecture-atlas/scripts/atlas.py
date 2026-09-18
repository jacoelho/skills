#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# dependencies = ["jsonschema==4.26.0"]
# ///
"""Validate an architecture atlas and build its offline, model-driven explorer.

Use `uv run scripts/atlas.py --help`. Graphviz is required only by build.
The JSON schema owns shapes; Python owns graph constraints, sources and replay.
"""
from __future__ import annotations

import argparse
import copy
import hashlib
import html
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import textwrap
import unittest
import xml.etree.ElementTree as ET
from functools import lru_cache
from pathlib import Path
from urllib.parse import quote, urlsplit

from jsonschema import Draft202012Validator
from jsonschema.exceptions import SchemaError

ROOT = Path(__file__).resolve().parent.parent
SCHEMA_PATH = ROOT / "schemas" / "atlas.schema.json"
MAX_INPUT = 5_000_000
MAX_SAFE_INTEGER = 2**53 - 1
MAX_DEPTH = 64


class AtlasError(ValueError):
    """Readable input or build error."""


def diagnostic(code: str, message: str, path: str = "", subject: str = "",
               fix: str = "", severity: str = "error") -> dict:
    return {"code": code, "severity": severity, "path": path,
            "subject": subject, "message": message, "fix": fix}


def pointer(parts) -> str:
    return "".join("/" + str(p).replace("~", "~0").replace("/", "~1") for p in parts)


def subject_at(model, parts) -> str:
    current, subject = model, ""
    for part in parts:
        try:
            current = current[part]
        except (KeyError, IndexError, TypeError):
            break
        if isinstance(current, dict) and isinstance(current.get("id"), str):
            subject = current["id"]
    return subject


def read_json(path: Path):
    """Read once, rejecting duplicate keys and non-JSON constants."""
    with path.open("rb") as stream:
        raw = stream.read(MAX_INPUT + 1)
    if len(raw) > MAX_INPUT:
        raise AtlasError("Input exceeds the 5 MB limit; split the atlas by scope.")
    def unique_pairs(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise AtlasError(f"Duplicate JSON key: {key!r}")
            result[key] = value
        return result
    def bad_constant(value):
        raise AtlasError(f"Non-JSON numeric constant: {value}")
    try:
        value = json.loads(raw.decode("utf-8"), object_pairs_hook=unique_pairs,
                           parse_constant=bad_constant)
    except RecursionError as exc:
        raise AtlasError("JSON nesting exceeds the parser limit.") from exc
    return value, raw


def load_model(path: Path) -> dict:
    model, _ = read_json(path)
    if not isinstance(model, dict):
        raise AtlasError("The model root must be an object.")
    return model


def value_diagnostics(value, parts=(), depth=0) -> list[dict]:
    """Keep authored values portable between Python and browser JSON runtimes."""
    if depth > MAX_DEPTH:
        return [diagnostic("input.depth", f"JSON nesting exceeds {MAX_DEPTH} levels.",
                           pointer(parts), fix="Flatten the example state or split the model.")]
    if isinstance(value, str):
        if any(0xD800 <= ord(c) <= 0xDFFF for c in value):
            return [diagnostic("input.unicode", "Unpaired Unicode surrogate.", pointer(parts),
                               fix="Use valid Unicode text.")]
    elif type(value) is int and abs(value) > MAX_SAFE_INTEGER:
        return [diagnostic("input.integer-range", "Integer exceeds JavaScript's safe integer range.",
                           pointer(parts), fix="Encode exact large identifiers or quantities as strings.")]
    elif isinstance(value, float) and (not math.isfinite(value) or
                                      (value.is_integer() and abs(value) > MAX_SAFE_INTEGER)):
        return [diagnostic("input.number", "Number is non-finite or an unsafe whole-number value.",
                           pointer(parts), fix="Use a finite safe number, or an exact-value string.")]
    elif isinstance(value, dict):
        issues = []
        for key, item in value.items():
            if not isinstance(key, str):
                issues.append(diagnostic("input.key", "Object keys must be strings.", pointer(parts)))
                continue
            issues.extend(value_diagnostics(key, (*parts, key), depth + 1))
            issues.extend(value_diagnostics(item, (*parts, key), depth + 1))
        return issues
    elif isinstance(value, list):
        return [d for i, item in enumerate(value)
                for d in value_diagnostics(item, (*parts, i), depth + 1)]
    elif value is not None and type(value) not in (bool, int, float, str):
        return [diagnostic("input.type", "Value is not JSON data.", pointer(parts))]
    return []


@lru_cache(maxsize=1)
def schema_validator():
    schema, _ = read_json(SCHEMA_PATH)
    Draft202012Validator.check_schema(schema)
    # Check even unused references. This skill needs no schema server or network.
    def walk(node):
        if isinstance(node, dict):
            if "$ref" in node:
                target = node["$ref"]
                if not isinstance(target, str) or not target.startswith("#/"):
                    raise AtlasError("Bundled schema references must be local JSON pointers.")
                current = schema
                for part in target[2:].split("/"):
                    part = part.replace("~1", "/").replace("~0", "~")
                    try:
                        current = current[int(part)] if isinstance(current, list) else current[part]
                    except (KeyError, IndexError, ValueError, TypeError) as exc:
                        raise AtlasError(f"Unresolved bundled schema reference: {target}") from exc
                if not isinstance(current, (dict, bool)):
                    raise AtlasError(f"Schema reference does not target a schema: {target}")
            for child in node.values():
                walk(child)
        elif isinstance(node, list):
            for child in node:
                walk(child)
    walk(schema)
    return Draft202012Validator(schema)


def schema_diagnostics(model) -> list[dict]:
    issues = value_diagnostics(model)
    if issues:
        return issues
    fixes = {
        "additionalProperties": "Remove or correct the unrecognised property; do not change facts to hide the error.",
        "required": "Add the required field using the bundled schema and inspected source.",
        "type": "Use the JSON type declared in the bundled schema.",
        "const": "Use the supported model version.",
        "enum": "Choose one of the documented values.",
        "uniqueItems": "Remove the duplicate reference; retain the relationship definition.",
        "minItems": "Supply the required entries; verified claims require evidence.",
        "oneOf": "Specify either a repository path or an external URL, not both.",
        "dependentRequired": "Supply both source line endpoints with a repository path.",
    }
    for error in schema_validator().iter_errors(model):
        parts = list(error.absolute_path)
        issues.append(diagnostic("schema." + str(error.validator), error.message,
                                 pointer(parts), subject_at(model, parts),
                                 fixes.get(error.validator, "Match the bundled schema at this path.")))
    return sorted(issues, key=lambda d: (d["path"], d["code"], d["message"]))


def safe_path(value: object) -> bool:
    return (isinstance(value, str) and bool(value) and not value.startswith("/")
            and "\\" not in value and ":" not in value
            and not any(ord(c) < 32 for c in value)
            and all(part not in {"", ".", ".."} for part in value.split("/")))


def safe_url(value: object) -> bool:
    if not isinstance(value, str) or any(ord(c) < 32 for c in value):
        return False
    try:
        parsed = urlsplit(value)
        return parsed.scheme in {"http", "https"} and bool(parsed.hostname) and parsed.username is None and parsed.password is None
    except ValueError:
        return False


def json_equal(left, right) -> bool:
    """JSON equality: bool != number; object order is irrelevant; 1 == 1.0."""
    if type(left) is bool or type(right) is bool:
        return type(left) is type(right) and left == right
    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
        return left == right
    if type(left) is not type(right):
        return False
    if isinstance(left, dict):
        return left.keys() == right.keys() and all(json_equal(left[k], right[k]) for k in left)
    if isinstance(left, list):
        return len(left) == len(right) and all(json_equal(a, b) for a, b in zip(left, right))
    return left == right


def replay(scenario: dict, step: int) -> dict:
    """Recompute a snapshot from initial JSON state; no code, clocks or I/O."""
    if type(step) is not int or not -1 <= step < len(scenario["steps"]):
        raise AtlasError("Scenario step is out of bounds.")
    state = copy.deepcopy(scenario["initial"])
    for item in scenario["steps"][:step + 1]:
        for key, value in item.get("set", {}).items():
            if key not in state:
                raise AtlasError(f"Undeclared state key: {key}")
            state[key] = copy.deepcopy(value)
        for key, expected in item.get("expect", {}).items():
            if key not in state or not json_equal(state[key], expected):
                raise AtlasError(f"Scenario {scenario['id']}: assertion failed for {key}")
    return state


def semantic_diagnostics(model: dict) -> list[dict]:
    """Graph and replay rules only. Call after the schema gate succeeds."""
    issues, indexes = [], {}
    def add(code, message, parts=(), subject="", fix="", severity="error"):
        issues.append(diagnostic(code, message, pointer(parts), subject, fix, severity))
    for collection in ("evidence", "entities", "relations", "views", "scenarios"):
        index = {}
        for i, item in enumerate(model.get(collection, [])):
            ident = item["id"]
            if ident in index:
                add("model.duplicate-id", f"{collection}: duplicate id {ident}", (collection, i, "id"), ident,
                    "Keep one definition per identity; update references for genuinely different concepts.")
            index[ident] = item
        indexes[collection] = index
    ev, nodes, edges, views, scenarios = (indexes[x] for x in
                                         ("evidence", "entities", "relations", "views", "scenarios"))
    if model["root_view"] not in views:
        add("model.root", "root_view does not exist", ("root_view",), fix="Reference an existing overview view.")
    if not safe_url(model["source"]["repository"]):
        add("source.url", "source.repository must be an HTTP(S) URL", ("source", "repository"))

    def evidence_refs(item, parts):
        for j, ref in enumerate(item["evidence"]):
            if ref not in ev:
                add("model.evidence-ref", f"Unknown evidence {ref}", (*parts, "evidence", j),
                    subject_at(model, parts), "Correct the reference or add inspected evidence to the registry.")

    for i, item in enumerate(model["evidence"]):
        parts, ident = ("evidence", i), item["id"]
        if "path" in item and not safe_path(item["path"]):
            add("source.path", "Unsafe repository path", (*parts, "path"), ident,
                "Use a normal repository-relative path without traversal or control characters.")
        if "url" in item and not safe_url(item["url"]):
            add("source.url", "Unsafe evidence URL", (*parts, "url"), ident, "Use an explicit HTTP(S) URL.")
        if "end" in item and item["end"] < item["start"]:
            add("source.line-range", "Invalid source line range: end precedes start", (*parts, "end"), ident,
                "Use an inclusive one-based range from the pinned file.")
    for i, node in enumerate(model["entities"]):
        parts, ident = ("entities", i), node["id"]
        evidence_refs(node, parts)
        if "parent" in node and node["parent"] not in nodes:
            add("model.parent", "Missing structural parent", (*parts, "parent"), ident)
        seen_fields = set()
        for j, field in enumerate(node.get("fields", [])):
            if field["name"] in seen_fields:
                add("model.duplicate-field", f"Duplicate field name {field['name']}", (*parts, "fields", j, "name"), ident,
                    "Keep one definition for each field in this type.")
            seen_fields.add(field["name"])
    for i, edge in enumerate(model["relations"]):
        parts, ident = ("relations", i), edge["id"]
        evidence_refs(edge, parts)
        for endpoint in ("from", "to"):
            if edge[endpoint] not in nodes:
                add("model.endpoint", f"Dangling {endpoint} endpoint: {edge[endpoint]}", (*parts, endpoint), ident,
                    "Reference an existing entity; add a new one only when the source supports it.")
    for i, view in enumerate(model["views"]):
        parts, ident, members = ("views", i), view["id"], view["entities"]
        for j, member in enumerate(members):
            if member not in nodes:
                add("model.view-entity", f"Unknown entity {member}", (*parts, "entities", j), ident)
        for j, edge in enumerate(view["relations"]):
            if edge not in edges:
                add("model.view-relation", f"Unknown relation {edge}", (*parts, "relations", j), ident)
            elif edges[edge]["from"] not in members or edges[edge]["to"] not in members:
                add("model.view-endpoints", f"Relation endpoints must be visible: {edge}",
                    (*parts, "relations", j), ident,
                    "Include the existing endpoints, or move the relation to a view that explains them.")
        if len(members) > (9 if view["level"] == 0 else 12):
            add("view.density", f"{len(members)} nodes; consider another focused view", parts, ident,
                "Split by reader question, not by deleting important relationships.", "warning")
        if "parent" in view and view["parent"] not in views:
            add("model.view-parent", "Missing parent view", (*parts, "parent"), ident)
        if ident != model["root_view"] and "parent" not in view:
            add("model.view-parent", "Non-root view requires a parent navigation anchor", parts, ident)
        if "focus" in view and view["focus"] not in nodes:
            add("model.focus", "Unknown focus entity", (*parts, "focus"), ident)
        # Focus may be the contextual entity whose internals the view explains.
        # It need not be rendered as another box alongside its own implementation.
        for j, target in enumerate(view.get("links", [])):
            if target not in views:
                add("model.view-link", f"Broken view link {target}", (*parts, "links", j), ident)
    for collection, index in (("entities", nodes), ("views", views)):
        for i, item in enumerate(model[collection]):
            seen, current = set(), item["id"]
            while current in index:
                if current in seen:
                    add("model.parent-cycle", "Parent cycle detected", (collection, i, "parent"), item["id"],
                        "Correct the parent chain. Cross-cutting relationships belong in relations or view links.")
                    break
                seen.add(current)
                current = index[current].get("parent")
    if views.get(model["root_view"], {}).get("parent"):
        add("model.root-parent", "root_view cannot have a parent", ("root_view",))
    for i, sc in enumerate(model.get("scenarios", [])):
        parts, ident = ("scenarios", i), sc["id"]
        view = views.get(sc["view"])
        if view is None:
            add("scenario.view", "Missing scenario view", (*parts, "view"), ident)
            continue
        can_replay = True
        for j, step in enumerate(sc["steps"]):
            step_path = (*parts, "steps", j)
            evidence_refs(step, step_path)
            for collection, index in (("entities", nodes), ("relations", edges)):
                for k, active in enumerate(step.get(collection, [])):
                    if active not in view[collection] or active not in index:
                        add("scenario.membership", f"Active {collection} {active} is not in its view",
                            (*step_path, collection, k), ident)
                    elif sc["status"] == "current" and index[active]["status"] != "current":
                        add("scenario.status", f"Current scenario includes non-current {active}",
                            (*step_path, collection, k), ident,
                            "Separate the proposed walkthrough from current behaviour.")
            if sc["status"] == "current":
                for active in step.get("relations", []):
                    edge = edges.get(active)
                    if edge:
                        for endpoint in (edge["from"], edge["to"]):
                            if endpoint in nodes and nodes[endpoint]["status"] != "current":
                                add("scenario.status", f"Current relation activates non-current endpoint {endpoint}",
                                    (*step_path, "relations"), ident,
                                    "Keep current and proposed execution paths separate.")
            for operation in ("set", "expect"):
                for key in step.get(operation, {}):
                    if key not in sc["initial"]:
                        can_replay = False
                        add("scenario.state-key", f"{operation} uses undeclared state keys: {key}",
                            (*step_path, operation, key), ident, "Declare initial state or correct the key.")
        if can_replay:
            # Replay reports each failing assertion with its exact JSON path.
            state = copy.deepcopy(sc["initial"])
            for j, step in enumerate(sc["steps"]):
                state.update(copy.deepcopy(step.get("set", {})))
                for key, expected in step.get("expect", {}).items():
                    if not json_equal(state[key], expected):
                        add("scenario.assertion", f"Assertion failed for {key}",
                            (*parts, "steps", j, "expect", key), ident,
                            "Reconcile the transition and expected result with source evidence; do not just weaken the assertion.")
    used = {ident for view in views.values() for ident in view["entities"]}
    for i, node in enumerate(model["entities"]):
        if node["id"] not in used:
            add("view.unused", "Entity is not shown in any view", ("entities", i), node["id"],
                "Add a relevant view or retain explicitly as unexplored context.", "warning")
    return sorted(issues, key=lambda d: (d["path"], d["code"], d["message"]))


def validate(model: dict) -> tuple[list[str], list[str]]:
    """Compatibility API; CLI uses the same diagnostics with stable codes/paths."""
    issues = schema_diagnostics(model)
    if not issues:
        issues = semantic_diagnostics(model)
    def text(d):
        return f"{d['path'] or '/'}{(' (' + d['subject'] + ')') if d['subject'] else ''}: {d['message']}"
    return ([text(d) for d in issues if d["severity"] == "error"],
            [text(d) for d in issues if d["severity"] == "warning"])


def source_diagnostics(model: dict, repo_root: Path) -> list[dict]:
    """Read pinned Git objects only. No target code, hooks, fetch or HTTP requests."""
    issues, cache = [], {}
    commit = model["source"]["commit"]
    def git(*args):
        return subprocess.run(["git", "-C", str(repo_root), *args], capture_output=True,
                              timeout=15, check=True).stdout
    try:
        if git("cat-file", "-t", commit).strip() != b"commit":
            raise AtlasError("The source revision is not a commit object.")
    except (AtlasError, subprocess.SubprocessError, OSError) as exc:
        return [diagnostic("source.commit", f"Cannot read pinned commit: {exc}", "/source/commit",
                           fix="Provide the correct local repository and an existing full commit hash.")]
    for i, item in enumerate(model["evidence"]):
        if "path" not in item:
            continue
        path = item["path"]
        if not safe_path(path):
            issues.append(diagnostic("source.path", "Unsafe repository path", pointer(("evidence", i, "path")), item["id"]))
            continue
        try:
            if path not in cache:
                if git("cat-file", "-t", f"{commit}:{path}").strip() != b"blob":
                    raise AtlasError("Evidence path is not a file blob.")
                cache[path] = git("cat-file", "blob", f"{commit}:{path}")
            raw = cache[path]
            lines = raw.decode("utf-8").splitlines()
            if item.get("end", 0) > len(lines):
                issues.append(diagnostic("source.line-range", f"Line range exceeds {len(lines)} lines",
                                         pointer(("evidence", i, "end")), item["id"]))
            if item.get("sha256") and hashlib.sha256(raw).hexdigest() != item["sha256"]:
                issues.append(diagnostic("source.hash", "Source hash mismatch",
                                         pointer(("evidence", i, "sha256")), item["id"]))
        except (AtlasError, subprocess.SubprocessError, OSError, UnicodeError) as exc:
            issues.append(diagnostic("source.read", f"Cannot read pinned UTF-8 file blob: {exc}",
                                     pointer(("evidence", i, "path")), item["id"]))
    return issues


def check_sources(model: dict, repo_root: Path) -> list[str]:
    return [d["subject"] + ": " + d["message"] for d in source_diagnostics(model, repo_root)]


def evidence_url(model: dict, item: dict) -> str:
    if "path" not in item:
        return item["url"]
    base = model["source"]["repository"].rstrip("/")
    value = f"{base}/blob/{model['source']['commit']}/{quote(item['path'], safe='/')}"
    if "start" in item:
        value += f"#L{item['start']}-L{item['end']}"
    return value


def q(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def wrapped(value: str, width: int) -> str:
    return "\n".join(textwrap.wrap(value, width=width, break_long_words=True) or [value])


def render_dot(model: dict, view: dict) -> str:
    nodes = {n["id"]: n for n in model["entities"]}
    edges = {e["id"]: e for e in model["relations"]}
    lines = ["digraph atlas {", f'graph [rankdir={view.get("direction", "TB")}, bgcolor="transparent", pad="0.25", nodesep="0.35", ranksep="0.55", outputorder="edgesfirst"];',
             'node [fontname="Arial", fontsize=13, shape=box, style="rounded,filled", fillcolor="#f1f5f9", color="#64748b", fontcolor="#172033", margin="0.18,0.12"];',
             'edge [fontname="Arial", fontsize=10, color="#64748b", fontcolor="#334155", arrowsize=0.65];']
    shapes = {"actor": "ellipse", "document": "note", "artifact": "note", "store": "cylinder", "type": "box", "boundary": "hexagon"}
    for ident in view["entities"]:
        node = nodes[ident]
        label = wrapped(node["label"], 25) + "\n[" + node["kind"] + "]"
        if node["status"] != "current":
            label += "\n" + node["status"]
        if node["certainty"] != "verified":
            label += " / " + node["certainty"]
        style = "rounded,filled" + (",dashed" if node["status"] != "current" or node["certainty"] != "verified" else "")
        lines.append(f'{q(ident)} [id={q("n_" + ident)}, label={q(label)}, shape={shapes.get(node["kind"], "box")}, style={q(style)}];')
    for ident in view.get("relations", []):
        edge = edges[ident]
        style = "solid" if edge["status"] == "current" and edge["certainty"] == "verified" else "dashed"
        lines.append(f'{q(edge["from"])} -> {q(edge["to"])} [id={q("e_" + ident)}, label={q(wrapped(edge["label"], 24))}, style={style}];')
    lines.append("}")
    return "\n".join(lines) + "\n"


def make_svg(dot: str, view_id: str) -> str:
    proc = subprocess.run(["dot", "-Tsvg"], input=dot, text=True, capture_output=True,
                          check=True, timeout=30)
    tree = ET.fromstring(proc.stdout)
    # Graphviz receives only generated DOT with plain labels; still strip titles and
    # annotate the controlled SVG for keyboard-accessible selection.
    for element in tree.iter():
        ident = element.get("id", "")
        if ident.startswith(("n_", "e_")):
            kind = "entity" if ident.startswith("n_") else "relation"
            element.set(f"data-{kind}", ident[2:])
            element.set("tabindex", "0")
            element.set("role", "button")
            title = next((child.text for child in element if child.tag.endswith("title")), ident[2:])
            element.set("aria-label", f"Inspect {kind} {title}")
        if ident:
            element.set("id", view_id + "_" + ident)
    ET.register_namespace("", "http://www.w3.org/2000/svg")
    tree.set("role", "group")
    tree.set("aria-label", "Interactive architecture diagram. Select a node or edge to inspect it.")
    return ET.tostring(tree, encoding="unicode")


def atomic_write(path: Path, content: bytes) -> None:
    """Replace one file only after its complete candidate has been written."""
    path.parent.mkdir(parents=True, exist_ok=True)
    candidate = None
    try:
        with tempfile.NamedTemporaryFile(prefix=".atlas-", dir=path.parent, delete=False) as stream:
            candidate = Path(stream.name)
            stream.write(content)
        os.replace(candidate, path)
    finally:
        if candidate is not None:
            candidate.unlink(missing_ok=True)


def build(model: dict, output: Path) -> Path:
    errors, _ = validate(model)
    if errors:
        raise AtlasError("\n".join(errors))
    if shutil.which("dot") is None:
        raise AtlasError("Graphviz 'dot' is required to build diagrams; viewing needs only a browser.")
    payload = copy.deepcopy(model)
    payload.setdefault("scenarios", [])
    svgs, files = {}, {}
    # Render every view before touching the current output. Geometry stays in DOT/SVG,
    # not in a second authored JSON representation.
    for view in model["views"]:
        dot = render_dot(model, view)
        svg = make_svg(dot, view["id"])
        files[Path("diagrams") / f"{view['id']}.dot"] = dot.encode("utf-8")
        files[Path("diagrams") / f"{view['id']}.svg"] = svg.encode("utf-8")
        svgs[view["id"]] = svg
    for item in payload["evidence"]:
        item["resolved_url"] = evidence_url(model, item)
    payload["rendered_views"] = svgs
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":"), allow_nan=False)
    encoded = encoded.replace("&", "\\u0026").replace("<", "\\u003c").replace(">", "\\u003e").replace("\u2028", "\\u2028").replace("\u2029", "\\u2029")
    template = (ROOT / "assets" / "explorer.html").read_text(encoding="utf-8")
    replacements = {"TITLE": html.escape(model["title"]), "SUMMARY": html.escape(model["summary"]), "MODEL": encoded}
    result = re.sub(r"@@(TITLE|SUMMARY|MODEL)@@", lambda match: replacements[match.group(1)], template)
    files[Path("model.json")] = (json.dumps(model, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode("utf-8")
    # Sidecars are generated exports, not an atomic directory transaction. Publish the
    # self-contained entrypoint last; a failed render/write cannot truncate the old HTML.
    for relative, content in files.items():
        atomic_write(output / relative, content)
    target = output / "index.html"
    atomic_write(target, result.encode("utf-8"))
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("schema-check", "validate", "build", "test"))
    parser.add_argument("model", type=Path, nargs="?")
    parser.add_argument("--output", type=Path, default=Path("atlas-output"))
    parser.add_argument("--repo-root", type=Path, help="Check evidence in a local Git repository; never fetch or execute it")
    parser.add_argument("--schema-only", action="store_true", help="For validate: check JSON/schema without graph or replay rules")
    parser.add_argument("--json", action="store_true", dest="json_output", help="Emit machine-readable diagnostics and check coverage")
    args = parser.parse_args()
    if args.command in {"validate", "build"} and args.model is None:
        parser.error("validate and build require a model path")
    if args.command in {"schema-check", "test"} and (args.model or args.repo_root or args.schema_only):
        parser.error("schema-check and test do not accept model/source options")
    if args.schema_only and (args.command != "validate" or args.repo_root):
        parser.error("--schema-only requires validate without --repo-root")
    if args.command == "test":
        if args.json_output:
            parser.error("test uses unittest output; omit --json")
        tests = unittest.defaultTestLoader.discover(str(ROOT / "tests"), pattern="test_*.py")
        return 0 if unittest.TextTestRunner(verbosity=2).run(tests).wasSuccessful() else 1
    report = {
        "ok": False,
        "command": args.command,
        "checks": {name: "not_run" for name in ("schema", "model", "sources", "build", "browser", "visual_review")},
        "diagnostics": [],
        "limits": [
            "Schema validation does not establish that the model matches the source code.",
            "Source checks verify pinned file objects, line ranges and optional hashes; not claim meaning.",
            "Browser behaviour and perceptual review are separate checks, not implied by build success.",
        ],
    }
    phase = "schema"
    try:
        schema_validator()
        if args.command == "schema-check":
            report["checks"]["schema"] = "passed"
        else:
            phase = "input"
            model, raw = read_json(args.model)
            report["input"] = {"path": str(args.model), "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw)}
            phase = "schema"
            report["diagnostics"] = schema_diagnostics(model)
            report["checks"]["schema"] = "failed" if report["diagnostics"] else "passed"
            if not report["diagnostics"] and not args.schema_only:
                phase = "model"
                report["diagnostics"] = semantic_diagnostics(model)
                report["checks"]["model"] = "failed" if any(d["severity"] == "error" for d in report["diagnostics"]) else "passed"
                if report["checks"]["model"] == "passed" and args.repo_root:
                    phase = "sources"
                    issues = source_diagnostics(model, args.repo_root)
                    report["diagnostics"].extend(issues)
                    report["checks"]["sources"] = "failed" if issues else "passed"
                    report["source_scope"] = {
                        "pinned_files": len({e["path"] for e in model["evidence"] if "path" in e}),
                        "external_urls_not_fetched": sum("url" in e for e in model["evidence"]),
                    }
                if args.command == "build" and not any(d["severity"] == "error" for d in report["diagnostics"]):
                    phase = "build"
                    artifact = build(model, args.output)
                    artifact_bytes = artifact.read_bytes()
                    report["artifact"] = {"path": str(artifact), "sha256": hashlib.sha256(artifact_bytes).hexdigest(), "bytes": len(artifact_bytes)}
                    report["checks"]["build"] = "passed"
        report["ok"] = not any(d["severity"] == "error" for d in report["diagnostics"])
    except (AtlasError, OSError, UnicodeError, json.JSONDecodeError, SchemaError,
            subprocess.SubprocessError, ET.ParseError, RecursionError) as exc:
        if phase in report["checks"]:
            report["checks"][phase] = "failed"
        report["diagnostics"].append(diagnostic(phase + ".failure", str(exc),
                                                fix="Correct this failure, then rerun the same command."))
    if args.json_output:
        print(json.dumps(report, ensure_ascii=True, indent=2, allow_nan=False))
    else:
        for item in report["diagnostics"]:
            print(f"{item['severity'].upper()} [{item['code']}] {item['path'] or '/'}: {item['message']}",
                  file=sys.stderr if item["severity"] == "error" else sys.stdout)
        print(("PASS" if report["ok"] else "FAIL") + ": " + ", ".join(f"{k}={v}" for k, v in report["checks"].items()))
        if "artifact" in report:
            print(report["artifact"]["path"])
        for note in report["limits"]:
            print("NOTE: " + note)
    return 0 if report["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
