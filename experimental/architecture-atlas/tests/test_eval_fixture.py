"""Check synthetic source semantics used by prompt evals; no agent is run here."""
from __future__ import annotations
import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('atlas_eval_pipeline', ROOT / 'evals/fixtures/pipeline/pipeline.py')
pipeline = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = pipeline
spec.loader.exec_module(pipeline)


class EvalFixtureTests(unittest.TestCase):
    def setUp(self):
        self.raw = {'request_id': 'r1', 'amount_cents': '1250'}
        self.records = {}
        self.events = []

    def test_decode_changes_representation_without_mutating_wire(self):
        command = pipeline.decode(self.raw)
        self.assertIsInstance(command, pipeline.Command)
        self.assertEqual(command.amount_cents, 1250)
        self.assertIs(type(command.amount_cents), int)
        self.assertEqual(self.raw['amount_cents'], '1250')

    def test_success_records_before_publishing_id_only(self):
        def publish(event):
            self.assertEqual(self.records['r1'].amount_cents, 1250)
            self.events.append(event)
        self.assertEqual(pipeline.handle(self.raw, self.records, publish), 'accepted')
        self.assertEqual(self.events, [{'request_id': 'r1'}])

    def test_nonpositive_input_has_no_effect(self):
        for amount in ['0', '-1']:
            with self.subTest(amount=amount):
                self.raw['amount_cents'] = amount
                with self.assertRaises(ValueError):
                    pipeline.handle(self.raw, self.records, self.events.append)
                self.assertEqual(self.records, {})
                self.assertEqual(self.events, [])

    def test_invalid_amount_has_no_effect(self):
        self.raw['amount_cents'] = 'invalid'
        with self.assertRaises(ValueError):
            pipeline.handle(self.raw, self.records, self.events.append)
        self.assertEqual(self.records, {})
        self.assertEqual(self.events, [])

    def test_publish_failure_leaves_record_and_has_no_retry(self):
        calls = []
        def failing_publish(event):
            calls.append(event)
            raise RuntimeError('publisher unavailable')
        with self.assertRaisesRegex(RuntimeError, 'publisher unavailable'):
            pipeline.handle(self.raw, self.records, failing_publish)
        self.assertEqual(len(calls), 1)
        self.assertIn('r1', self.records)
        self.assertEqual(pipeline.handle(self.raw, self.records, failing_publish), 'duplicate')
        self.assertEqual(len(calls), 1)

    def test_duplicate_does_not_publish_again(self):
        pipeline.handle(self.raw, self.records, self.events.append)
        self.assertEqual(pipeline.handle(self.raw, self.records, self.events.append), 'duplicate')
        self.assertEqual(len(self.events), 1)

    def test_separate_mapping_does_not_share_deduplication(self):
        pipeline.handle(self.raw, self.records, self.events.append)
        other_records = {}
        self.assertEqual(pipeline.handle(self.raw, other_records, self.events.append), 'accepted')
        self.assertEqual(len(self.events), 2)


if __name__ == '__main__':
    unittest.main()
