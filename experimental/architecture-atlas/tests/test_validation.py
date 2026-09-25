"""Regression checks for the strict JSON boundary and reusable diagnostics."""
from __future__ import annotations

import copy
import hashlib
import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("atlas_validation", ROOT / "scripts/atlas.py")
atlas = importlib.util.module_from_spec(spec)
spec.loader.exec_module(atlas)
BASE = json.loads((ROOT / "examples/reference-skill.model.json").read_text())


def cli(*args):
    return subprocess.run([sys.executable, str(ROOT / "scripts/atlas.py"), *map(str, args)],
                          text=True, capture_output=True, timeout=45)


def issues(model):
    found = atlas.schema_diagnostics(model)
    return found or atlas.semantic_diagnostics(model)


class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.model = copy.deepcopy(BASE)

    def test_all_bundled_examples_are_valid(self):
        for source in (ROOT/"examples").glob("*.model.json"):
            with self.subTest(source=source.name):
                self.assertEqual(atlas.validate(atlas.load_model(source))[0], [])

    def test_current_scenario_rejects_planned_relation_endpoint(self):
        sc = self.model["scenarios"][0]
        view = next(v for v in self.model["views"] if v["id"] == sc["view"])
        edge = next(e for e in self.model["relations"] if e["id"] == view["relations"][0])
        next(n for n in self.model["entities"] if n["id"] == edge["to"])["status"] = "planned"
        sc["steps"][0]["relations"] = [edge["id"]]
        self.assertTrue(any(d["code"] == "scenario.status" for d in issues(self.model)))

    def test_bundled_schema_is_valid(self):
        self.assertIsInstance(atlas.schema_validator(), atlas.Draft202012Validator)

    def test_schema_check_cli(self):
        result = cli("schema-check", "--json")
        self.assertEqual(result.returncode, 0, result.stderr)
        report = json.loads(result.stdout)
        self.assertTrue(report["ok"])
        self.assertEqual(report["checks"]["model"], "not_run")

    def test_unknown_fields_fail_at_every_fixed_object(self):
        targets = [(), ("source",), ("entities", 0), ("relations", 0), ("views", 0),
                   ("evidence", 0), ("scenarios", 0), ("scenarios", 0, "steps", 0)]
        for path in targets:
            model = copy.deepcopy(BASE)
            target = model
            for part in path:
                target = target[part]
            target["misspelled_property"] = True
            with self.subTest(path=path):
                found = atlas.schema_diagnostics(model)
                self.assertTrue(any(d["code"] == "schema.additionalProperties" and
                                    d["path"] == atlas.pointer(path) for d in found), found)

    def test_nested_field_typo_rejected(self):
        self.model["entities"][0]["fields"] = [{"name":"x", "type":"string", "meaning":"Identifier", "mutablee": True}]
        self.assertEqual(issues(self.model)[0]["code"], "schema.additionalProperties")

    def test_boolean_version_is_not_integer_one(self):
        self.model["version"] = True
        self.assertTrue(atlas.schema_diagnostics(self.model))

    def test_id_with_trailing_newline_is_rejected(self):
        self.model["entities"][0]["id"] += "\n"
        self.assertTrue(atlas.schema_diagnostics(self.model))

    def test_duplicate_view_relation_rejected(self):
        self.model["views"][0]["relations"] *= 2
        self.assertTrue(any(d["code"] == "schema.uniqueItems" for d in issues(self.model)))

    def test_duplicate_field_name_rejected(self):
        self.model["entities"][0]["fields"] = [{"name":"x", "type":"str", "meaning":"A"}, {"name":"x", "type":"int", "meaning":"B"}]
        self.assertTrue(any(d["code"] == "model.duplicate-field" for d in issues(self.model)))

    def test_empty_view_rejected(self):
        self.model["views"][1]["entities"] = []
        self.model["views"][1]["relations"] = []
        self.assertTrue(any(d["code"] == "schema.minItems" for d in issues(self.model)))

    def test_missing_required_collections_rejected(self):
        for key in ("entities", "relations", "views", "evidence"):
            model = copy.deepcopy(BASE)
            model.pop(key)
            with self.subTest(key=key):
                self.assertTrue(atlas.schema_diagnostics(model))

    def test_optional_scenarios_accepted(self):
        self.model.pop("scenarios")
        self.assertEqual(issues(self.model), [])

    def test_contextual_focus_does_not_have_to_be_a_drawn_node(self):
        # This is intentional hierarchy, not a dangling visible endpoint.
        view = next(v for v in self.model["views"] if v["id"] == "validator-flow")
        self.assertNotIn(view["focus"], view["entities"])
        self.assertEqual(issues(self.model), [])

    def test_nested_boolean_number_mismatch_rejected(self):
        step = self.model["scenarios"][0]["steps"][0]
        step["set"]["decoded"] = {"value":[True]}
        step["expect"] = {"decoded":{"value":[1]}}
        found = issues(self.model)
        self.assertTrue(any(d["code"] == "scenario.assertion" and d["path"].endswith("/expect/decoded") for d in found))
        with self.assertRaises(atlas.AtlasError):
            atlas.replay(self.model["scenarios"][0], 0)

    def test_json_equality_contract(self):
        pairs = [(True, 1, False), (False, 0, False), (1, 1.0, True), (-0.0, 0, True),
                 ({"a":1,"b":[True]}, {"b":[True],"a":1.0}, True),
                 ({"a":1}, {"a":True}, False), ([1,2], [2,1], False),
                 (None, None, True), (None, False, False), ("1", 1, False)]
        for a, b, expected in pairs:
            with self.subTest(a=a, b=b):
                self.assertEqual(atlas.json_equal(a,b), expected)

    def test_large_exact_integers_require_strings(self):
        for value in (2**53, -(2**53), float(2**53)):
            self.model["scenarios"][0]["initial"]["id"] = value
            self.assertTrue(issues(self.model))
        self.model["scenarios"][0]["initial"]["id"] = str(2**60)
        self.assertEqual(issues(self.model), [])

    def test_nested_non_finite_values_rejected(self):
        for value in (float("inf"),float("nan"),float("-inf")):
            self.model["scenarios"][0]["initial"]["value"] = [value]
            self.assertTrue(any(d["code"] == "input.number" for d in issues(self.model)))

    def test_exponent_overflow_and_surrogates_return_json_failure(self):
        for raw in (b'{"x":1e309}', b'{"x":"\\ud800"}', b'\xff'):
            with tempfile.TemporaryDirectory() as tmp:
                source = Path(tmp)/"bad.json";source.write_bytes(raw)
                result = cli("validate",source,"--json")
                self.assertEqual(result.returncode,1,result.stdout)
                self.assertFalse(json.loads(result.stdout)["ok"])
                self.assertNotIn("Traceback",result.stderr)

    def test_deep_state_rejected_before_recursive_schema_walk(self):
        value = None
        for _ in range(70):
            value = {"nested":value}
        self.model["scenarios"][0]["initial"]["deep"] = value
        self.assertEqual(issues(self.model)[0]["code"], "input.depth")

    def test_model_schema_hint_is_not_fetched(self):
        self.model["$schema"] = "https://never-fetch.invalid/schema"
        with patch("socket.socket.connect", side_effect=AssertionError("network attempted")):
            self.assertEqual(issues(self.model), [])

    def test_unused_local_ref_is_checked_and_remote_ref_rejected(self):
        for reference in ("#/$defs/not-present", "https://never-fetch.invalid/schema"):
            with tempfile.TemporaryDirectory() as tmp:
                schema = json.loads(atlas.SCHEMA_PATH.read_text())
                schema["$defs"]["unused"] = {"$ref":reference}
                source = Path(tmp)/"schema.json";source.write_text(json.dumps(schema))
                atlas.schema_validator.cache_clear()
                try:
                    with patch.object(atlas,"SCHEMA_PATH",source):
                        with self.assertRaises(atlas.AtlasError):
                            atlas.schema_validator()
                finally:
                    atlas.schema_validator.cache_clear()

    def test_schema_definition_errors_are_not_accepted(self):
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(tmp)/"bad.schema.json";source.write_text('{"type":"not-a-json-type"}')
            atlas.schema_validator.cache_clear()
            try:
                with patch.object(atlas,"SCHEMA_PATH",source):
                    with self.assertRaises(atlas.SchemaError):
                        atlas.schema_validator()
            finally:
                atlas.schema_validator.cache_clear()

    def test_json_diagnostic_has_exact_path_and_identity(self):
        self.model["relations"][0]["to"]="absent"
        d=next(d for d in issues(self.model) if d["code"]=="model.endpoint")
        self.assertEqual(d["path"],"/relations/0/to")
        self.assertEqual(d["subject"], self.model["relations"][0]["id"])
        self.assertTrue(d["fix"])

    def test_schema_only_does_not_claim_semantic_validation(self):
        self.model["relations"][0]["to"]="absent"
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(tmp)/"model.json";source.write_text(json.dumps(self.model))
            result=cli("validate",source,"--schema-only","--json")
            self.assertEqual(result.returncode,0,result.stderr)
            report=json.loads(result.stdout)
            self.assertEqual(report["checks"]["schema"],"passed")
            self.assertEqual(report["checks"]["model"],"not_run")
            result=cli("validate",source,"--json")
            self.assertEqual(result.returncode,1)

    def test_byte_hash_and_unperformed_checks_are_explicit(self):
        path=ROOT/"examples/reference-skill.model.json"
        result=cli("validate",path,"--json")
        self.assertEqual(result.returncode,0,result.stderr)
        report=json.loads(result.stdout)
        self.assertEqual(report["input"]["sha256"],hashlib.sha256(path.read_bytes()).hexdigest())
        for key in ("sources","build","browser","visual_review"):
            self.assertEqual(report["checks"][key],"not_run")

    def test_duplicate_json_keys_return_clean_failure(self):
        with tempfile.TemporaryDirectory() as tmp:
            source=Path(tmp)/"model.json";source.write_text('{"x":1,"x":2}')
            result=cli("validate",source,"--json")
            self.assertEqual(result.returncode,1)
            self.assertEqual(json.loads(result.stdout)["diagnostics"][0]["code"],"input.failure")

    def test_evidence_path_and_url_are_exclusive(self):
        self.model["evidence"][0]["url"]="https://example.invalid/reference"
        self.assertTrue(any(d["code"] == "schema.oneOf" for d in issues(self.model)))

    def test_partial_line_range_rejected(self):
        self.model["evidence"][0]["start"]=1
        self.assertTrue(any(d["code"] == "schema.dependentRequired" for d in issues(self.model)))

    def test_url_with_empty_username_and_password_is_rejected(self):
        self.assertFalse(atlas.safe_url("https://:password@example.invalid"))

    @unittest.skipUnless(shutil.which("git"),"Git not available")
    def test_source_check_rejects_tree_as_file_or_commit(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo=Path(tmp);(repo/"nested").mkdir();(repo/"nested/file.txt").write_text("content\n")
            def git(*args):
                return subprocess.run(["git","-C",str(repo),*args],capture_output=True,text=True,check=True).stdout.strip()
            git("init","-q");git("add","nested")
            git("-c","user.name=Atlas fixture","-c","user.email=fixture@example.invalid","commit","-qm","fixture")
            self.model["source"]["commit"]=git("rev-parse","HEAD")
            self.model["evidence"]=[{"id":"folder","path":"nested"}]
            self.assertEqual(atlas.source_diagnostics(self.model,repo)[0]["code"],"source.read")
            self.model["source"]["commit"]=git("rev-parse","HEAD^{tree}")
            self.assertEqual(atlas.source_diagnostics(self.model,repo)[0]["code"],"source.commit")

    def test_atomic_write_failure_keeps_last_good_file(self):
        with tempfile.TemporaryDirectory() as tmp:
            target=Path(tmp)/"index.html";target.write_bytes(b"last-good")
            with patch.object(atlas.os,"replace",side_effect=OSError("injected failure")):
                with self.assertRaises(OSError):
                    atlas.atomic_write(target,b"candidate")
            self.assertEqual(target.read_bytes(),b"last-good")
            self.assertEqual(list(Path(tmp).iterdir()),[target])

    @unittest.skipUnless(shutil.which("dot"),"Graphviz not available")
    def test_render_failure_does_not_publish_any_candidate_files(self):
        with tempfile.TemporaryDirectory() as tmp:
            output=Path(tmp)/"output";output.mkdir()
            target=output/"index.html";target.write_bytes(b"last-good")
            with patch.object(atlas,"make_svg",side_effect=AtlasRendererFailure):
                with self.assertRaises(RuntimeError):
                    atlas.build(self.model,output)
            self.assertEqual(target.read_bytes(),b"last-good")
            self.assertEqual(list(output.iterdir()),[target])

    @unittest.skipUnless(shutil.which("dot"),"Graphviz not available")
    def test_template_markers_in_prose_are_not_replaced_again(self):
        self.model["title"]="Literal @@MODEL@@ marker"
        self.model.pop("scenarios")
        with tempfile.TemporaryDirectory() as tmp:
            html=atlas.build(self.model,Path(tmp)).read_text()
            self.assertIn('<title>Literal @@MODEL@@ marker</title>',html)
            self.assertIn('"scenarios":[]',html)


AtlasRendererFailure = RuntimeError("injected Graphviz failure")


if __name__ == "__main__":
    unittest.main(verbosity=2)
