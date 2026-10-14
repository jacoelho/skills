"""Offline tests of installer mechanics; these do not validate the real dictionary."""
from __future__ import annotations
import importlib.util
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location("dictionary_setup", ROOT / "scripts/setup-dictionary.py")
assert spec is not None and spec.loader is not None
setup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(setup)


class DictionarySetupTests(unittest.TestCase):
    def fixture(self):
        data = {"en_GB.aff": b"SET UTF-8\n", "en_GB.dic": b"1\ncolour\n", "en_GB.LICENSE": b"Test fixture only.\n"}
        sources = ["dictionaries/en-GB/index.aff", "dictionaries/en-GB/index.dic", "dictionaries/en-GB/license"]
        lock = {"repository": "wooorm/dictionaries", "commit": "0" * 40, "files": []}
        for (name, content), source in zip(data.items(), sources):
            lock["files"].append({"target": name, "source": source, "bytes": len(content), "git_blob_sha1": setup.git_blob_id(content)})
        return lock, data

    def test_known_git_blob_identity(self):
        self.assertEqual(setup.git_blob_id(b"hello\n"), "ce013625030ba8dba906f756967f9e9ca394464a")

    def test_shipped_lock_is_structurally_valid(self):
        self.assertEqual(setup.load_lock(ROOT / "dictionary.lock.json")["repository"], "wooorm/dictionaries")

    def test_cached_files_need_no_network(self):
        lock, data = self.fixture()
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp)
            setup.install(data, dest)
            with patch.object(setup, "fetch", side_effect=AssertionError("network must not be used")):
                self.assertEqual(setup.collect(lock, dest, check_only=True), data)

    def test_missing_file_fails_offline(self):
        lock, _ = self.fixture()
        with tempfile.TemporaryDirectory() as tmp, patch.object(setup, "fetch", side_effect=AssertionError("network must not be used")):
            with self.assertRaises(ValueError):
                setup.collect(lock, Path(tmp), check_only=True)

    def test_tampered_file_fails_offline(self):
        lock, data = self.fixture()
        with tempfile.TemporaryDirectory() as tmp:
            dest = Path(tmp)
            setup.install(data, dest)
            (dest / "en_GB.dic").write_bytes(b"1\ncolor\n")
            with self.assertRaises(ValueError):
                setup.collect(lock, dest, check_only=True)

    def test_downloads_are_verified_before_installation(self):
        lock, data = self.fixture()
        with tempfile.TemporaryDirectory() as tmp, patch.object(setup, "fetch", side_effect=list(data.values())):
            dest = Path(tmp)
            verified = setup.collect(lock, dest)
            self.assertEqual(list(dest.iterdir()), [])
            setup.install(verified, dest)
            self.assertEqual((dest / "en_GB.dic").read_bytes(), data["en_GB.dic"])

    def test_invalid_download_is_rejected(self):
        lock, data = self.fixture()
        with tempfile.TemporaryDirectory() as tmp, patch.object(setup, "fetch", return_value=b"untrusted content"):
            dest = Path(tmp)
            with self.assertRaises(ValueError):
                setup.collect(lock, dest)
            self.assertEqual(list(dest.iterdir()), [])

    def test_network_failure_does_not_write_a_partial_set(self):
        lock, data = self.fixture()
        with tempfile.TemporaryDirectory() as tmp, patch.object(setup, "fetch", side_effect=[data["en_GB.aff"], OSError("offline")]):
            dest = Path(tmp)
            with self.assertRaises(OSError):
                setup.collect(lock, dest)
            self.assertEqual(list(dest.iterdir()), [])


if __name__ == "__main__":
    unittest.main()
