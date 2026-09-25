"""Static package checks, not an evaluation of agent invocation or reasoning."""
from __future__ import annotations
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


class SkillContractTests(unittest.TestCase):
    def test_frontmatter_has_bounded_routing_metadata(self):
        text = (ROOT / 'SKILL.md').read_text(encoding='utf-8')
        # This package deliberately uses single-line scalar metadata; this is
        # a local contract check, not a general-purpose YAML parser.
        match = re.match(r'\A---\nname: ([^\n]+)\ndescription: ([^\n]+)\n---\n', text)
        self.assertIsNotNone(match)
        self.assertEqual(match[1], ROOT.name)
        self.assertLessEqual(len(match[2]), 280)  # Project budget, not an OpenAI limit.
        self.assertLessEqual(len(text.split()), 1000)

    def test_runtime_markdown_links_resolve_inside_package(self):
        docs = [ROOT / 'SKILL.md', *sorted((ROOT / 'references').glob('*.md'))]
        for doc in docs:
            for raw in re.findall(r'\[[^\]]+\]\(([^)]+)\)', doc.read_text()):
                if re.match(r'\w+://', raw) or raw.startswith('#'):
                    continue
                target = (doc.parent / raw.split('#', 1)[0]).resolve()
                with self.subTest(document=str(doc.relative_to(ROOT)), link=raw):
                    self.assertTrue(target.is_relative_to(ROOT.resolve()))
                    self.assertTrue(target.is_file())

    def test_optional_agent_metadata_matches_skill(self):
        lines = (ROOT / 'agents/openai.yaml').read_text().splitlines()
        self.assertEqual(lines[0], 'interface:')
        values = {}
        for line in lines[1:]:
            key, value = line.strip().split(': ', 1)
            values[key] = json.loads(value)  # Quoted YAML scalars are JSON strings here.
        self.assertEqual(set(values), {'display_name', 'short_description', 'default_prompt'})
        self.assertIn('$architecture-atlas', values['default_prompt'])
        self.assertLessEqual(len(values['short_description']), 64)

    def test_corpus_shape_and_unique_cases(self):
        cases = [json.loads(line) for line in (ROOT / 'evals/cases.jsonl').read_text().splitlines()]
        self.assertEqual(len(cases), 14)
        self.assertEqual(len({c['id'] for c in cases}), len(cases))
        for case in cases:
            with self.subTest(case=case['id']):
                self.assertEqual(set(case), {'id', 'kind', 'prompt', 'setup', 'checks'})
                self.assertRegex(case['id'], r'^[a-z][a-z0-9-]*$')
                self.assertIn(case['kind'], {'positive', 'boundary', 'negative'})
                for key in ('prompt', 'setup'):
                    self.assertIsInstance(case[key], str)
                    self.assertTrue(case[key].strip())
                self.assertGreaterEqual(len(case['checks']), 2)
                self.assertTrue(all(isinstance(c, str) and c.strip() for c in case['checks']))

    def test_corpus_covers_bounded_and_adversarial_requests(self):
        cases = [json.loads(line) for line in (ROOT / 'evals/cases.jsonl').read_text().splitlines()]
        kinds = [c['kind'] for c in cases]
        self.assertEqual({k: kinds.count(k) for k in set(kinds)},
                         {'positive': 6, 'boundary': 4, 'negative': 4})
        ids = {c['id'] for c in cases}
        self.assertTrue({'validate-only', 'dirty-worktree', 'code-doc-conflict',
                         'untrusted-excerpt', 'tools-unavailable', 'single-static-diagram',
                         'generic-schema-validation', 'refresh-commit'} <= ids)

    def test_fixture_and_runtime_assets_present(self):
        for path in ['schemas/atlas.schema.json', 'scripts/atlas.py', 'assets/explorer.html',
                     'examples/minimal.model.json', 'examples/reference-skill.model.json',
                     'evals/fixtures/pipeline/pipeline.py', 'evals/fixtures/pipeline/README.md',
                     'evals/fixtures/pipeline/third-party-note.txt']:
            with self.subTest(path=path):
                self.assertTrue((ROOT / path).is_file())


if __name__ == '__main__':
    unittest.main()
