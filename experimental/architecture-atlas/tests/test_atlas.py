#!/usr/bin/env python3
"""Run with uv run scripts/atlas.py test. Graphviz tests skip without dot."""
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

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('atlas', ROOT / 'scripts/atlas.py')
atlas = importlib.util.module_from_spec(spec)
spec.loader.exec_module(atlas)
BASE = json.loads((ROOT / 'examples/reference-skill.model.json').read_text())


class ModelTests(unittest.TestCase):
    def setUp(self):
        self.model = copy.deepcopy(BASE)

    def bad(self, text):
        errors, _ = atlas.validate(self.model)
        self.assertTrue(any(text.lower() in e.lower() for e in errors), errors)

    def test_malformed_reference_shapes(self):
        for collection, field, value in [('entities','parent',[]),('relations','from',{}),('views','entities',None),('scenarios','view',[]),('entities','kind',[])]:
            with self.subTest(collection=collection, field=field):
                model=copy.deepcopy(BASE)
                model[collection][0][field]=value
                self.assertTrue(atlas.validate(model)[0])

    def test_malformed_root(self):
        self.assertTrue(atlas.validate([])[0])
        self.model['root_view']=[]
        self.bad("is not of type 'string'")

    def test_example_valid(self):
        self.assertEqual(atlas.validate(self.model)[0], [])

    def test_duplicate_id(self):
        self.model['entities'].append(copy.deepcopy(self.model['entities'][0]))
        self.bad('duplicate id')

    def test_invalid_id(self):
        self.model['entities'][0]['id'] = '../node'
        self.bad('/entities/0/id')

    def test_dangling_edge(self):
        self.model['relations'][0]['to'] = 'absent'
        self.bad('dangling to')

    def test_missing_evidence(self):
        self.model['entities'][0]['evidence'] = ['absent']
        self.bad('unknown evidence')

    def test_verified_requires_evidence(self):
        self.model['entities'][0]['evidence'] = []
        self.bad('/entities/0/evidence')

    def test_uncertainty_is_separate(self):
        self.model['entities'][0]['certainty'] = 'planned'
        self.bad('certainty')

    def test_path_traversal(self):
        for path in ['../secret', '/etc/passwd', 'x/../../secret', 'a\\b', 'a//b']:
            with self.subTest(path=path):
                self.model['evidence'][0]['path'] = path
                self.bad('unsafe repository path')

    def test_url_scheme(self):
        self.model['evidence'][0] = {'id':'ev-wrapper','kind':'code','label':'Unsafe','url':'javascript:alert(1)'}
        self.bad('unsafe evidence URL')

    def test_line_range(self):
        self.model['evidence'][0].update(start=10,end=2)
        self.bad('invalid source line range')

    def test_pinned_commit(self):
        self.model['source']['commit'] = 'main'
        self.bad('/source/commit')

    def test_entity_parent_cycle(self):
        self.model['entities'][0]['parent'] = self.model['entities'][0]['id']
        self.bad('parent cycle')

    def test_view_parent_cycle(self):
        self.model['views'][1]['parent'] = self.model['views'][1]['id']
        self.bad('parent cycle')

    def test_non_root_needs_parent(self):
        self.model['views'][1].pop('parent')
        self.bad('navigation anchor')

    def test_view_edge_membership(self):
        self.model['views'][0]['entities'].remove('request')
        self.bad('endpoints must be visible')

    def test_current_scenario_excludes_planned(self):
        next(n for n in self.model['entities'] if n['id']=='required')['status']='planned'
        self.bad('includes non-current')

    def test_declared_state(self):
        self.model['scenarios'][0]['steps'][0]['set']['invented'] = 1
        self.bad('undeclared state keys')

    def test_bad_assertion(self):
        self.model['scenarios'][0]['steps'][-1]['expect']['exit_code'] = 42
        self.bad('assertion failed')

    def test_active_entity_in_view(self):
        self.model['scenarios'][0]['steps'][0]['entities'] = ['guide']
        self.bad('not in its view')

    def test_replay_deterministic_and_immutable(self):
        for scenario in self.model['scenarios']:
            original = copy.deepcopy(scenario)
            expected = [atlas.replay(scenario, i) for i in range(-1, len(scenario['steps']))]
            for i in [5, 0, 4, -1, 3, 2, 5, 1, -1]:
                self.assertEqual(atlas.replay(scenario, i), expected[i+1])
            self.assertEqual(scenario, original)
            expected[-1]['errors'].append('mutated outside')
            self.assertNotIn('mutated outside', atlas.replay(scenario, 5)['errors'])

    def test_replay_range(self):
        for i in [-2, 200]:
            with self.assertRaises(atlas.AtlasError):
                atlas.replay(self.model['scenarios'][0], i)

    def test_duplicate_json_key(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'model.json';path.write_text('{"x":1,"x":2}')
            with self.assertRaises(atlas.AtlasError):atlas.load_model(path)

    def test_non_finite_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'model.json';path.write_text('{"x":NaN}')
            with self.assertRaises(atlas.AtlasError):atlas.load_model(path)

    def test_invalid_utf8_clean_cli_error(self):
        with tempfile.TemporaryDirectory() as tmp:
            path=Path(tmp)/'model.json';path.write_bytes(b'\xff')
            p=subprocess.run([sys.executable,str(ROOT/'scripts/atlas.py'),'validate',str(path)],capture_output=True,text=True)
            self.assertEqual(p.returncode,1)
            self.assertNotIn('Traceback',p.stderr)

    @unittest.skipUnless(shutil.which('dot'), 'Graphviz not available')
    def test_build_reproducible_and_escaped(self):
        self.model['summary']='Text </script><script>window.INJECTED=true</script> & content'
        self.model['entities'][0]['label']='<img src=x onerror="window.INJECTED=true">'
        with tempfile.TemporaryDirectory() as tmp:
            a=atlas.build(self.model,Path(tmp)/'a')
            b=atlas.build(self.model,Path(tmp)/'b')
            self.assertEqual(a.read_bytes(),b.read_bytes())
            text=a.read_text()
            self.assertNotIn('<script>window.INJECTED=true</script>',text)
            self.assertNotIn('<img src=x',text)
            self.assertIn('\\u003c/script\\u003e',text)
            self.assertEqual(len(list(a.parent.joinpath('diagrams').glob('*.svg'))),len(self.model['views']))

    @unittest.skipUnless(shutil.which('git'), 'Git not available')
    def test_pinned_source_range_and_hash(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo=Path(tmp);(repo/'example.txt').write_text('first\nsecond\n')
            def git(*args):return subprocess.run(['git','-C',str(repo),*args],capture_output=True,text=True,check=True)
            git('init','-q');git('add','example.txt')
            git('-c','user.name=Atlas test fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture')
            self.model['source']['commit']=git('rev-parse','HEAD').stdout.strip()
            self.model['evidence']=[{'id':'e','path':'example.txt','start':1,'end':2,'sha256':hashlib.sha256((repo/'example.txt').read_bytes()).hexdigest()}]
            # A dirty working-tree edit must not change the pinned source being checked.
            (repo/'example.txt').write_text('working copy differs\n')
            self.assertEqual(atlas.check_sources(self.model,repo),[])
            self.model['evidence'][0]['end']=200
            self.assertIn('line range exceeds',atlas.check_sources(self.model,repo)[0].lower())
            self.model['evidence'][0]['end']=2;self.model['evidence'][0]['sha256']='0'*64
            self.assertIn('hash mismatch',atlas.check_sources(self.model,repo)[0].lower())


if __name__ == '__main__':
    unittest.main(verbosity=2)
