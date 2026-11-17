#!/usr/bin/env python3
import contextlib
import io
import itertools
import json
import os
import stat
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import spec  # noqa: E402  # importable only after the sys.path insert above

REC_1_QUESTION = (
    "Open: Two recipes in one group get the same name.\n"
    'Case: create "Pancakes" twice.\n'
    "Options: The second is refused with 409. | The second gets the slug pancakes-2.\n"
    "Default: The second is refused with 409.\n"
    "Reason: A rename hides the clash.\n"
)

RECIPES = f"""# Recipes

Sources: requirements.md.

## REC-1 Duplicate names

{REC_1_QUESTION}
## REC-2 Search terms

Open: A search has several words.
Case: search "lemon beef".
Options: A recipe must contain every word. | A recipe may contain any word. | Only the first word counts.
Default: A recipe must contain every word, in any order.
Reason: It is what a search box does.

## REC-3 Slug form

Rule: A slug is the lowercased name with other characters turned into hyphens.

## REC-4 Renamed recipe

Assumed: Renaming a recipe changes its slug.
Case: rename "Pancakes" to "Crepes".
"""

SHR_1_QUESTION = (
    "Open: A share link is created with no expiry.\n"
    "Case: POST with no expiresAt.\n"
    "Options: It never expires. | It expires after 30 days.\n"
    "Default: It expires after 30 days.\n"
    "Reason: A link nobody remembers should not last.\n"
)

SHARING = f"""# Sharing

## SHR-1 Link expiry

{SHR_1_QUESTION}
## SHR-2 Link identifier

Assumed: A link's identifier is 32 random hex characters.
Case: two links to one recipe.
Rejected: A counter.
"""

QUESTIONS = (
    '1. [REC-1] Duplicate names: Two recipes in one group get the same name. Case: create "Pancakes" twice. '
    "Options: (a) The second is refused with 409. (b) The second gets the slug pancakes-2. "
    "Default if unanswered: The second is refused with 409. Reason: A rename hides the clash.\n"
    '2. [REC-2] Search terms: A search has several words. Case: search "lemon beef". '
    "Options: (a) A recipe must contain every word. (b) A recipe may contain any word. (c) Only the first word counts. "
    "Default if unanswered: A recipe must contain every word, in any order. Reason: It is what a search box does.\n"
    "3. [SHR-1] Link expiry: A share link is created with no expiry. Case: POST with no expiresAt. "
    "Options: (a) It never expires. (b) It expires after 30 days. Default if unanswered: It expires after 30 days. "
    "Reason: A link nobody remembers should not last.\n"
)

REVIEW = (
    "Decided on your behalf: 2. Reply with the number of each one to change and what it should be; the rest stand.\n"
    "1. [REC-4] Renamed recipe: Renaming a recipe changes its slug.\n"
    "2. [SHR-2] Link identifier: A link's identifier is 32 random hex characters.\n"
)

START = "1 decided, 2 assumed, 3 open: REC-1 REC-2 SHR-1\n"
TO_REVIEW = "assumptions for 'spec review': 2\n"


class SpecTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.specs = self.root / "specs"
        self.specs.mkdir()
        (self.specs / "recipes.md").write_text(RECIPES)
        (self.specs / "sharing.md").write_text(SHARING)
        (self.root / "QUESTIONS.md").write_text(QUESTIONS)
        (self.root / "REVIEW.md").write_text(REVIEW)

    def run_spec(self, *argv):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = spec.main([argv[0], "--dir", str(self.specs), *argv[1:]])
        return code, out.getvalue(), err.getvalue()

    def answer(self, text, *flags):
        answers = self.root / "ANSWERS.md"
        answers.write_text(text)
        return self.run_spec("answer", str(answers), *flags)

    def with_questions(self, text, *flags):
        return self.answer(text, "--questions", str(self.root / "QUESTIONS.md"), *flags)

    def reviewed(self, reply=None):
        if reply is None:
            return self.run_spec("reviewed", str(self.root / "REVIEW.md"))
        (self.root / "REPLY.md").write_text(reply)
        return self.run_spec("reviewed", str(self.root / "REVIEW.md"), str(self.root / "REPLY.md"))

    def entry(self, name, entry_id):
        text = (self.specs / name).read_text()
        start = text.index(f"## {entry_id} ")
        end = text.find("\n## ", start)
        return text[start:] if end < 0 else text[start:end + 1]

    def files(self):
        return {path.name: path.read_text() for path in self.specs.iterdir()}


class StatusTest(SpecTest):
    def test_rules_assumptions_and_questions_are_counted_without_failing(self):
        self.assertEqual(self.run_spec("status"), (0, START, ""))

    def test_json_lists_the_same_state(self):
        code, out, _ = self.run_spec("status", "--json")
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(out), {"decided": 1, "assumed": ["REC-4", "SHR-2"],
                                           "open": ["REC-1", "REC-2", "SHR-1"], "findings": []})

    def test_each_malformed_entry_is_reported_at_its_line_with_a_fix(self):
        cases = {
            "an open question without a default": (
                "## TAG-1 Case\n\nOpen: q\nCase: c\nOptions: x | y\nReason: r\n", 1, "TAG-1 has no Default."),
            "an open question without a reason": (
                "## TAG-1 Case\n\nOpen: q\nCase: c\nOptions: x | y\nDefault: x\n", 1, "TAG-1 has no Reason."),
            "an assumption that kept its reason": (
                "## TAG-1 Case\n\nAssumed: a\nCase: c\nReason: r\n", 1, "TAG-1 is an assumption and has a Reason line."),
            "an open question with one option": (
                "## TAG-1 Case\n\nOpen: q\nCase: c\nOptions: only one\nDefault: d\nReason: r\n", 1, "TAG-1 offers fewer than two options."),
            "a question that is also a rule": ("# Tags\n\n## TAG-1 Case\n\nOpen: q\nRule: r\n", 3, "TAG-1 has Open and Rule lines."),
            "an assumption that is also a rule": (
                "## TAG-1 Case\n\nAssumed: a\nRule: r\nCase: c\n", 1, "TAG-1 has Assumed and Rule lines."),
            "an entry in no state": ("## TAG-1 Case\n\nCase: c\n", 1, "TAG-1 has no Open, Assumed or Rule line."),
            "an assumption without a case": ("## TAG-1 Case\n\nAssumed: a\n", 1, "TAG-1 has no Case."),
            "an assumption that kept its options": (
                "## TAG-1 Case\n\nAssumed: a\nCase: c\nOptions: x | y\n", 1, "TAG-1 is an assumption and has a Options line."),
            "a rule that kept its default": ("## TAG-1 Case\n\nRule: r\nDefault: d\n", 1, "TAG-1 is a rule and has a Default line."),
            "a heading that is not an entry": ("# Tags\n\n## Tag one\n\nRule: r\n", 3, "heading '## Tag one' is not an entry."),
            "text outside a labelled line": ("## TAG-1 Case\n\nSome prose.\n\nRule: r\n", 3, "TAG-1 has text outside a labelled line."),
            "the same label twice": ("## TAG-1 Case\n\nRule: r\nRule: s\n", 4, "TAG-1 has two Rule lines."),
            "an ID another file already uses": ("## REC-1 Again\n\nRule: r\n", 1, "REC-1 is also at"),
            "a rule with part left open": (
                "## TAG-1 Case\n\nRule: Tags are refused. For tools: Your call.\n", 1, "TAG-1: part of this was left open."),
            "a rule with a comment still to fold in": (
                "## TAG-1 Case\n\nRule: r\nComment: only on weekdays\n", 1, "TAG-1 was answered with an option and a comment."),
        }
        for name, (text, line, message) in cases.items():
            with self.subTest(name):
                path = self.specs / "tags.md"
                path.write_text(text)
                code, out, _ = self.run_spec("status")
                self.assertEqual(code, 1)
                findings = [row for row in out.splitlines() if " Fix: " in row]
                self.assertEqual(len(findings), 1, out)
                self.assertTrue(findings[0].startswith(f"{path}:{line}: {message}"), findings[0])

    def test_a_heading_inside_a_code_fence_is_not_an_entry(self):
        for fence in ("```", "~~~"):
            with self.subTest(fence):
                (self.specs / "notes.md").write_text(f"# Notes\n\n{fence}markdown\n## TAG-9 Example\n\nOpen: q\n{fence}\n")
                self.assertEqual(self.run_spec("status"), (0, START, ""))

    def test_a_fence_that_never_closes_is_reported_where_it_opens(self):
        path = self.specs / "aaa.md"
        path.write_text("# Notes\n\n```\nexample\n\n## TAG-1 Hidden\n\nOpen: q\n")
        code, out, _ = self.run_spec("status")
        self.assertEqual(code, 1)
        self.assertIn(f"{path}:3: this code fence is never closed", out)

    def test_a_fenced_block_inside_an_entry_is_reported_and_never_deleted(self):
        path = self.specs / "sharing.md"
        text = SHARING + "\n```json\n{\"length\": 32}\n```\n"
        path.write_text(text)
        code, out, _ = self.run_spec("status")
        self.assertEqual(code, 1)
        self.assertIn(f"{path}:17: SHR-2 holds a fenced block.", out)
        code, _, err = self.reviewed("2. ok\n")
        self.assertEqual(code, 2)
        self.assertIn("SHR-2 holds a fenced block.", err)
        self.assertEqual(path.read_text(), text)

    def test_prose_kept_beside_the_specs_is_left_alone(self):
        (self.specs / "README.md").write_text("# Specs\n\n## Layout\n\nOne file per capability.\n")
        self.assertEqual(self.run_spec("status"), (0, START, ""))
        self.assertEqual(self.run_spec("questions")[0], 0)

    def test_a_rule_that_only_resembles_one_left_open_is_accepted(self):
        (self.specs / "hooks.md").write_text("## HOOK-1 Delivery\n\nRule: A webhook posts to your callback URL.\n")
        self.assertEqual(self.run_spec("status")[0], 0)
        (self.specs / "hooks.md").write_text("## HOOK-1 Delivery\n\nRule: Retries: three. Backoff: up to you.\n")
        code, out, _ = self.run_spec("status")
        self.assertEqual(code, 1)
        self.assertIn("HOOK-1: part of this was left open.", out)

    def test_a_file_that_is_not_text_is_refused_by_name(self):
        path = self.specs / "binary.md"
        path.write_bytes(b"\xff\xfe## A-1 x\n")
        code, out, err = self.run_spec("status")
        self.assertEqual((code, out), (2, ""))
        self.assertIn(f"{path}: not UTF-8 text. Fix:", err)

    def test_a_missing_directory_is_refused_with_what_to_do(self):
        out, err = io.StringIO(), io.StringIO()
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = spec.main(["status", "--dir", str(self.root / "absent")])
        self.assertEqual((code, out.getvalue()), (2, ""))
        self.assertIn("no such directory. Fix:", err.getvalue())


class QuestionsTest(SpecTest):
    def test_every_open_question_is_one_numbered_line_in_file_order(self):
        self.assertEqual(self.run_spec("questions"), (0, QUESTIONS, ""))

    def test_a_line_continued_below_its_label_belongs_to_it(self):
        (self.specs / "sharing.md").write_text(SHARING.replace("Case: POST with no expiresAt.", "Case: POST with\nno expiresAt."))
        self.assertEqual(self.run_spec("questions")[1], QUESTIONS)

    def test_malformed_entries_are_reported_and_no_list_is_printed(self):
        (self.specs / "sharing.md").write_text(SHARING.replace("Default: It expires after 30 days.\n", ""))
        code, out, err = self.run_spec("questions")
        self.assertEqual((code, out), (2, ""))
        self.assertIn("SHR-1 has no Default.", err)


class ReviewTest(SpecTest):
    def test_every_assumption_is_one_numbered_line_under_a_count(self):
        self.assertEqual(self.run_spec("review"), (0, REVIEW, ""))

    def test_no_assumptions_is_said_plainly(self):
        self.reviewed()
        self.assertEqual(self.run_spec("review"), (0, "Nothing was decided on your behalf.\n", ""))

    def test_malformed_entries_are_reported_and_no_list_is_printed(self):
        (self.specs / "tags.md").write_text("## TAG-1 Case\n\nCase: c\n")
        code, out, err = self.run_spec("review")
        self.assertEqual((code, out), (2, ""))
        self.assertIn("TAG-1 has no Open, Assumed or Rule line.", err)


class AnswerTest(SpecTest):
    def test_the_answer_replaces_the_question_with_no_record_of_who_gave_it(self):
        code, out, _ = self.with_questions("1. The second succeeds with the slug `pancakes-1`.\n")
        self.assertEqual((code, out), (0, "decided 1: REC-1\nstill open: REC-2 SHR-1\n" + TO_REVIEW))
        self.assertEqual((self.specs / "recipes.md").read_text(), RECIPES.replace(
            REC_1_QUESTION, 'Rule: The second succeeds with the slug `pancakes-1`.\nCase: create "Pancakes" twice.\n'))
        self.assertEqual((self.specs / "sharing.md").read_text(), SHARING)
        self.assertEqual(self.run_spec("status"), (0, "2 decided, 2 assumed, 2 open: REC-2 SHR-1\n", ""))

    def test_an_option_letter_picks_that_option_and_rejects_the_others(self):
        for letter in ("b", "(b)", "B."):
            with self.subTest(letter):
                (self.specs / "recipes.md").write_text(RECIPES)
                self.with_questions(f"2. {letter}\n")
                self.assertEqual(self.entry("recipes.md", "REC-2"),
                                 "## REC-2 Search terms\n\n"
                                 "Rule: A recipe may contain any word.\n"
                                 'Case: search "lemon beef".\n'
                                 "Rejected: A recipe must contain every word. | Only the first word counts.\n\n")

    def test_a_comment_on_a_picked_option_is_kept_on_its_own_line_until_folded_in(self):
        code, out, _ = self.with_questions("2. b, but only for signed-in users\n")
        self.assertEqual(code, 0)
        self.assertIn("Rule: A recipe may contain any word.\n", self.entry("recipes.md", "REC-2"))
        self.assertIn("Comment: but only for signed-in users\n", self.entry("recipes.md", "REC-2"))
        self.assertIn("answered with an option or an accepting word and a comment; fold each Comment into its Rule: REC-2\n", out)
        code, out, _ = self.run_spec("status")
        self.assertEqual(code, 1)
        self.assertIn("REC-2 was answered with an option and a comment.", out)

    def test_a_letter_the_question_does_not_offer_is_refused(self):
        before = self.files()
        code, out, err = self.with_questions("1. a\n3. c\n")
        self.assertEqual((code, out), (2, ""))
        self.assertIn("SHR-1: there is no option c; it has 2.", err)
        self.assertEqual(self.files(), before)

    def test_a_sentence_starting_with_an_article_is_not_an_option_letter(self):
        self.with_questions("2. a recipe matches on its name only\n")
        self.assertIn("Rule: a recipe matches on its name only\n", self.entry("recipes.md", "REC-2"))

    def test_accepting_the_default_settles_it_and_leaving_it_open_assumes_it(self):
        code, out, _ = self.with_questions("1. Your call.\n3. ok\n")
        self.assertEqual((code, out), (0, "decided 1: SHR-1\nassumed: REC-1\nstill open: REC-2\nassumptions for 'spec review': 3\n"))
        self.assertEqual(self.entry("recipes.md", "REC-1"),
                         "## REC-1 Duplicate names\n\n"
                         "Assumed: The second is refused with 409.\n"
                         'Case: create "Pancakes" twice.\n'
                         "Rejected: The second gets the slug pancakes-2.\n\n")
        self.assertEqual(self.entry("sharing.md", "SHR-1"),
                         "## SHR-1 Link expiry\n\nRule: It expires after 30 days.\nCase: POST with no expiresAt.\n"
                         "Rejected: It never expires.\n\n")

    def test_a_default_that_is_none_of_the_options_rejects_nothing(self):
        self.with_questions("2. ok\n")
        self.assertEqual(self.entry("recipes.md", "REC-2"),
                         "## REC-2 Search terms\n\n"
                         "Rule: A recipe must contain every word, in any order.\n"
                         'Case: search "lemon beef".\n\n')

    def test_an_answer_with_nothing_after_its_number_leaves_the_question_to_be_assumed(self):
        code, out, _ = self.with_questions("1. a\n3.\n")
        self.assertEqual((code, out), (0, "decided 1: REC-1\nassumed: SHR-1\nstill open: REC-2\nassumptions for 'spec review': 3\n"))

    def test_an_accepting_word_with_more_after_it_keeps_the_rest_as_a_comment_to_fold_in(self):
        code, out, _ = self.with_questions("3. ok, but 7 days for guests\n")
        self.assertEqual(code, 0)
        self.assertEqual(self.entry("sharing.md", "SHR-1"),
                         "## SHR-1 Link expiry\n\nRule: It expires after 30 days.\nCase: POST with no expiresAt.\n"
                         "Rejected: It never expires.\nComment: but 7 days for guests\n\n")
        self.assertIn("fold each Comment into its Rule: SHR-1\n", out)

    def test_an_accepting_word_without_punctuation_still_keeps_the_rest_as_a_comment(self):
        self.with_questions("3. ok but 7 days for guests\n")
        self.assertIn("Rule: It expires after 30 days.\n", self.entry("sharing.md", "SHR-1"))
        self.assertIn("Comment: but 7 days for guests\n", self.entry("sharing.md", "SHR-1"))

    def test_a_rule_that_begins_with_accept_or_default_is_the_owners_own_words(self):
        self.with_questions("1. Accept the second and merge them.\n3. Default links last a year.\n")
        self.assertIn("Rule: Accept the second and merge them.\n", self.entry("recipes.md", "REC-1"))
        self.assertIn("Rule: Default links last a year.\n", self.entry("sharing.md", "SHR-1"))

    def test_a_bare_no_is_refused_because_it_names_no_behaviour(self):
        before = self.files()
        code, out, err = self.with_questions("1. a\n3. No.\n")
        self.assertEqual((code, out), (2, ""))
        self.assertIn("SHR-1: 'No.' does not say what to build.", err)
        self.assertEqual(self.files(), before)

    def test_a_comment_still_to_fold_in_does_not_stop_later_answers(self):
        self.with_questions("2. b, but only for signed-in users\n")
        after = self.files()
        code, out, _ = self.with_questions("2. b, but only for signed-in users\n")
        self.assertEqual((code, out), (0, "decided 0\nnot open, left as they are: REC-2\nstill open: REC-1 SHR-1\n" + TO_REVIEW))
        self.assertEqual(self.files(), after)
        self.assertEqual(self.with_questions("1. a\n")[0], 0)

    def test_an_answer_may_run_over_several_lines(self):
        self.with_questions("3. It expires after 7 days,\n   and never later than 30.\n")
        self.assertIn("Rule: It expires after 7 days, and never later than 30.\n", self.entry("sharing.md", "SHR-1"))

    def test_an_indented_numbered_point_stays_inside_its_answer(self):
        self.with_questions("1. Refuse it, checking in this order:\n   2) trimmed name\n   3) slug\n")
        self.assertIn("Rule: Refuse it, checking in this order: 2) trimmed name 3) slug\n", self.entry("recipes.md", "REC-1"))
        self.assertIn("Open: A search has several words.\n", self.entry("recipes.md", "REC-2"))

    def test_answers_may_be_indented_as_a_block(self):
        code, out, _ = self.with_questions("Answers:\n\n  1. Refuse it.\n  3. a\n")
        self.assertEqual((code, out), (0, "decided 2: REC-1 SHR-1\nstill open: REC-2\n" + TO_REVIEW))

    def test_a_quoted_question_is_not_part_of_the_answer_before_it(self):
        self.with_questions("1. Refuse it.\n> " + QUESTIONS.splitlines()[2] + "\n3. a\n")
        self.assertIn("Rule: Refuse it.\n", self.entry("recipes.md", "REC-1"))
        self.assertIn("Rule: It never expires.\n", self.entry("sharing.md", "SHR-1"))

    def test_text_that_is_no_answer_is_refused_and_nothing_changes(self):
        before = self.files()
        cases = {
            "a sign-off after the answers": ("Hi, answers below.\n\n1. b\n\nThanks,\nAna\n", "'Thanks,' belongs to no answer."),
            "the question repeated before its answer": (QUESTIONS.splitlines()[0] + "\nb\n", "answer 1 repeats its question."),
        }
        for name, (answers, message) in cases.items():
            with self.subTest(name):
                code, out, err = self.with_questions(answers)
                self.assertEqual((code, out), (2, ""))
                self.assertIn(message, err)
                self.assertEqual(self.files(), before)

    def test_a_rewritten_file_keeps_its_line_endings_and_permissions(self):
        path = self.specs / "sharing.md"
        path.write_bytes(SHARING.replace("\n", "\r\n").encode())
        path.chmod(0o640)
        self.with_questions("3. a\n")
        expected = SHARING.replace(
            SHR_1_QUESTION, "Rule: It never expires.\nCase: POST with no expiresAt.\nRejected: It expires after 30 days.\n")
        self.assertEqual(path.read_bytes(), expected.replace("\n", "\r\n").encode())
        self.assertEqual(stat.S_IMODE(path.stat().st_mode), 0o640)

    def test_a_file_that_cannot_be_written_leaves_the_others_unchanged(self):
        locked = self.specs / "zz"
        locked.mkdir()
        (locked / "tools.md").write_text("## TOOL-1 On hand\n\nOpen: q\nCase: c\nOptions: x. | y.\nDefault: x.\nReason: r.\n")
        before = {path: path.read_text() for path in self.specs.rglob("*.md")}
        locked.chmod(0o555)
        self.addCleanup(locked.chmod, 0o755)
        code, out, err = self.run_spec("answer", "--rest-default")
        self.assertEqual((code, out), (2, ""))
        self.assertIn("cannot write", err)
        self.assertIn("nothing was changed", err)
        self.assertEqual({path: path.read_text() for path in self.specs.rglob("*.md")}, before)
        self.assertEqual([name for name in os.listdir(self.specs) if name.startswith(".")], [])

    def test_numbers_follow_the_list_that_was_sent_after_earlier_answers(self):
        self.with_questions("1. a\n")
        self.with_questions("2. c\n")
        self.assertIn("Rule: Only the first word counts.\n", self.entry("recipes.md", "REC-2"))
        self.assertIn("Open: A share link is created with no expiry.\n", self.entry("sharing.md", "SHR-1"))

    def test_applying_the_same_answers_again_changes_nothing(self):
        answers = "1. b\n2. Your call.\n3. It expires after 7 days.\n"
        self.with_questions(answers)
        before = self.files()
        code, out, _ = self.with_questions(answers)
        self.assertEqual((code, out), (0, "decided 0\nnot open, left as they are: REC-1 REC-2 SHR-1\n"
                                          "assumptions for 'spec review': 3\n"))
        self.assertEqual(self.files(), before)

    def test_one_bad_answer_leaves_every_file_unchanged(self):
        before = self.files()
        cases = {
            "a number the list does not have": ("1. a\n9. b\n", "the list that was sent has no number 9"),
            "an unknown entry": ("1. a\nXX-4: b\n", "no such entry: XX-4"),
            "a question answered twice": ("1. a\n1. b\n", "REC-1 is answered twice"),
            "no answers at all": ("thanks, will reply tomorrow\n", "no answers found"),
        }
        for name, (answers, message) in cases.items():
            with self.subTest(name):
                code, out, err = self.with_questions(answers)
                self.assertEqual((code, out), (2, ""))
                self.assertIn(message, err)
                self.assertEqual(self.files(), before)

    def test_numbered_answers_need_the_list_and_answers_by_id_do_not(self):
        before = self.files()
        code, _, err = self.answer("1. a\n")
        self.assertEqual(code, 2)
        self.assertIn("pass --questions with the list that was sent", err)
        self.assertEqual(self.files(), before)
        code, out, _ = self.answer("SHR-1: a\n[REC-1] b\n")
        self.assertEqual((code, out), (0, "decided 2: REC-1 SHR-1\nstill open: REC-2\n" + TO_REVIEW))
        self.assertIn("Rule: It never expires.\n", self.entry("sharing.md", "SHR-1"))
        self.assertIn("Rule: The second gets the slug pancakes-2.\n", self.entry("recipes.md", "REC-1"))

    def test_unanswered_questions_stay_open_until_the_round_is_over_and_then_are_assumed(self):
        self.with_questions("1. a\n")
        self.assertEqual(self.run_spec("status")[1], "2 decided, 2 assumed, 2 open: REC-2 SHR-1\n")
        code, out, _ = self.with_questions("1. a\n", "--rest-default")
        self.assertEqual((code, out), (0, "decided 0\nassumed: REC-2 SHR-1\nnot open, left as they are: REC-1\n"
                                          "assumptions for 'spec review': 4\n"))
        self.assertEqual(self.entry("sharing.md", "SHR-1"),
                         "## SHR-1 Link expiry\n\nAssumed: It expires after 30 days.\nCase: POST with no expiresAt.\n"
                         "Rejected: It never expires.\n\n")
        self.assertEqual(self.run_spec("status"), (0, "2 decided, 4 assumed, 0 open\n", ""))

    def test_every_question_can_be_assumed_with_no_answers_at_all(self):
        code, out, _ = self.run_spec("answer", "--rest-default")
        self.assertEqual((code, out), (0, "decided 0\nassumed: REC-1 REC-2 SHR-1\nassumptions for 'spec review': 5\n"))
        self.assertEqual(self.run_spec("status"), (0, "1 decided, 5 assumed, 0 open\n", ""))

    def test_answering_with_nothing_to_apply_is_refused(self):
        before = self.files()
        code, out, err = self.run_spec("answer")
        self.assertEqual((code, out), (2, ""))
        self.assertIn("no answers given. Fix:", err)
        self.assertEqual(self.files(), before)

    def test_an_answer_by_id_to_a_question_already_assumed_replaces_the_assumption(self):
        self.with_questions("1. Your call.\n")
        code, out, _ = self.answer("REC-1: The second gets the slug pancakes-2.\n")
        self.assertEqual((code, out), (0, "decided 1: REC-1\nstill open: REC-2 SHR-1\n" + TO_REVIEW))
        self.assertEqual(self.entry("recipes.md", "REC-1"),
                         "## REC-1 Duplicate names\n\n"
                         "Rule: The second gets the slug pancakes-2.\n"
                         'Case: create "Pancakes" twice.\n'
                         "Rejected: The second is refused with 409.\n\n")

    def test_an_assumption_is_not_settled_by_an_answer_that_only_accepts_it_or_picks_a_letter(self):
        self.with_questions("1. Your call.\n")
        before = self.files()
        cases = {
            "REC-1: ok\n": "REC-1 is an assumption, and 'ok' settles one only at review.",
            "REC-1: b, but only on weekdays\n": "REC-1 is an assumption and offers no options.",
        }
        for answers, message in cases.items():
            with self.subTest(answers):
                code, out, err = self.answer(answers)
                self.assertEqual((code, out), (2, ""))
                self.assertIn(message, err)
                self.assertEqual(self.files(), before)

    def test_an_answer_in_the_words_of_an_option_rejects_the_others(self):
        self.with_questions("2. a recipe may contain any word\n")
        self.assertEqual(self.entry("recipes.md", "REC-2"),
                         "## REC-2 Search terms\n\n"
                         "Rule: a recipe may contain any word\n"
                         'Case: search "lemon beef".\n'
                         "Rejected: A recipe must contain every word. | Only the first word counts.\n\n")

    def test_a_numbered_answer_to_a_question_changed_since_the_list_was_sent_is_not_applied(self):
        path = self.specs / "sharing.md"
        path.write_text(SHARING.replace("Options: It never expires. | It expires after 30 days.",
                                        "Options: It expires after 30 days. | It never expires."))
        before = self.files()
        code, out, _ = self.with_questions("1. a\n3. a\n", "--rest-default")
        self.assertEqual(code, 0)
        self.assertIn("decided 1: REC-1\n", out)
        self.assertIn("changed since the list was sent, not answered; send 'spec questions' again: SHR-1\n", out)
        self.assertIn("still open: SHR-1\n", out)
        self.assertEqual(path.read_text(), before["sharing.md"])

    def test_a_list_that_names_an_entry_twice_is_refused(self):
        before = self.files()
        (self.root / "QUESTIONS.md").write_text(QUESTIONS + "4. [REC-1] Duplicate names: something else\n")
        code, out, err = self.with_questions("4. a\n")
        self.assertEqual((code, out), (2, ""))
        self.assertIn("has number 4 or entry REC-1 twice.", err)
        self.assertEqual(self.files(), before)

    def test_a_numbered_answer_to_a_question_already_assumed_is_refused_and_nothing_changes(self):
        self.with_questions("1. Your call.\n")
        before = self.files()
        code, out, err = self.with_questions("1. Use a counter instead.\n3. a\n")
        self.assertEqual((code, out), (2, ""))
        self.assertIn("REC-1 is an assumption, no longer an open question, and its answer is numbered.", err)
        self.assertEqual(self.files(), before)

    def test_a_partly_answered_question_is_named_and_stops_nothing(self):
        code, out, _ = self.with_questions("1. For recipes: refused. For cookbooks: Your call.\n")
        self.assertEqual(code, 0)
        self.assertIn("part of these was left open; keep what was answered and record the rest as its own assumption: REC-1\n", out)
        code, out, _ = self.run_spec("status")
        self.assertEqual(code, 1)
        self.assertIn("REC-1: part of this was left open.", out)
        self.assertEqual(self.with_questions("3. a\n")[0], 0)
        self.assertEqual(self.run_spec("review")[0], 0)


class ReviewedTest(SpecTest):
    def test_a_changed_assumption_takes_the_reply_and_keeps_what_it_replaced(self):
        code, out, _ = self.reviewed("1. The old slug keeps working.\n2. Use a counter after all.\n")
        self.assertEqual((code, out), (0, "decided 2: REC-4 SHR-2\n"))
        self.assertEqual(self.entry("recipes.md", "REC-4"),
                         "## REC-4 Renamed recipe\n\n"
                         "Rule: The old slug keeps working.\n"
                         'Case: rename "Pancakes" to "Crepes".\n'
                         "Rejected: Renaming a recipe changes its slug.\n")
        self.assertIn("Rejected: A link's identifier is 32 random hex characters. | A counter.\n", self.entry("sharing.md", "SHR-2"))

    def test_a_reply_keyed_by_entry_id_changes_that_assumption(self):
        code, out, _ = self.reviewed("REC-4: The old slug keeps working.\n")
        self.assertEqual((code, out), (0, "decided 2: REC-4 SHR-2\n"))
        self.assertIn("Rule: The old slug keeps working.\n", self.entry("recipes.md", "REC-4"))

    def test_a_rule_never_lists_its_own_text_as_rejected(self):
        self.reviewed("2. A counter.\n")
        self.assertEqual(self.entry("sharing.md", "SHR-2"),
                         "## SHR-2 Link identifier\n\n"
                         "Rule: A counter.\n"
                         "Case: two links to one recipe.\n"
                         "Rejected: A link's identifier is 32 random hex characters.\n")

    def test_a_review_with_nothing_on_its_list_settles_nothing(self):
        (self.root / "REVIEW.md").write_text("Nothing was decided on your behalf.\n")
        before = self.files()
        self.assertEqual(self.reviewed(), (0, "decided 0\n" + TO_REVIEW, ""))
        self.assertEqual(self.files(), before)

    def test_a_listed_entry_that_no_longer_exists_is_named_and_the_rest_are_settled(self):
        (self.specs / "sharing.md").write_text(SHARING[:SHARING.index("## SHR-2")])
        code, out, _ = self.reviewed("1. The old slug keeps working.\n")
        self.assertEqual((code, out), (0, "decided 1: REC-4\n"
                                          "changed since the list was sent, not settled; send 'spec review' again: SHR-2\n"))

    def test_assumptions_the_reply_approves_or_leaves_out_become_rules_as_they_stand(self):
        for name, reply in {"approved": "2. ok\n", "no reply at all": None}.items():
            with self.subTest(name):
                (self.specs / "recipes.md").write_text(RECIPES)
                (self.specs / "sharing.md").write_text(SHARING)
                self.assertEqual(self.reviewed(reply), (0, "decided 2: REC-4 SHR-2\n", ""))
                self.assertEqual(self.entry("sharing.md", "SHR-2"),
                                 "## SHR-2 Link identifier\n\n"
                                 "Rule: A link's identifier is 32 random hex characters.\n"
                                 "Case: two links to one recipe.\n"
                                 "Rejected: A counter.\n")
                self.assertEqual(self.run_spec("status"), (0, "3 decided, 0 assumed, 3 open: REC-1 REC-2 SHR-1\n", ""))

    def test_a_review_never_touches_an_open_question(self):
        self.reviewed("1. The old slug keeps working.\n")
        self.assertEqual(self.entry("recipes.md", "REC-1"), "## REC-1 Duplicate names\n\n" + REC_1_QUESTION + "\n")

    def test_an_assumption_left_open_in_the_reply_stays_for_review_while_the_rest_stand(self):
        for reply in ("1. Your call.\n", "1.\n"):
            with self.subTest(reply):
                (self.specs / "recipes.md").write_text(RECIPES)
                (self.specs / "sharing.md").write_text(SHARING)
                code, out, _ = self.reviewed(reply)
                self.assertEqual((code, out), (0, "decided 1: SHR-2\nleft open in the reply, still assumptions: REC-4\n"
                                                  "assumptions for 'spec review': 1\n"))
                self.assertEqual((self.specs / "recipes.md").read_text(), RECIPES)

    def test_an_assumption_made_after_the_list_was_sent_is_not_settled(self):
        self.run_spec("answer", "--rest-default")
        code, out, _ = self.reviewed()
        self.assertEqual((code, out), (0, "decided 2: REC-4 SHR-2\nassumptions for 'spec review': 3\n"))
        self.assertEqual(self.run_spec("status"), (0, "3 decided, 3 assumed, 0 open\n", ""))

    def test_an_assumption_rewritten_after_the_list_was_sent_is_not_settled_even_by_a_reply(self):
        rewrites = {
            "its text": RECIPES.replace("Assumed: Renaming a recipe changes its slug.", "Assumed: Renaming a recipe keeps its slug."),
            "its title": RECIPES.replace("## REC-4 Renamed recipe", "## REC-4 Renamed cookbook"),
        }
        for (name, rewritten), reply in itertools.product(rewrites.items(), (None, "1. ok\n", "1. The old slug redirects.\n")):
            with self.subTest(changed=name, reply=reply):
                (self.specs / "recipes.md").write_text(rewritten)
                (self.specs / "sharing.md").write_text(SHARING)
                code, out, _ = self.reviewed(reply)
                self.assertEqual((code, out), (0, "decided 1: SHR-2\n"
                                                  "changed since the list was sent, not settled; send 'spec review' again: REC-4\n"
                                                  "assumptions for 'spec review': 1\n"))
                self.assertEqual((self.specs / "recipes.md").read_text(), rewritten)

    def test_a_reply_numbered_against_the_question_list_settles_nothing(self):
        self.with_questions("1. Your call.\n")
        before = self.files()
        (self.root / "REPLY.md").write_text("1. Use a counter instead.\n")
        code, out, _ = self.run_spec("reviewed", str(self.root / "QUESTIONS.md"), str(self.root / "REPLY.md"))
        self.assertEqual(code, 0)
        self.assertIn("changed since the list was sent, not settled; send 'spec review' again: REC-1\n", out)
        self.assertEqual(self.files(), before)
        self.assertEqual(self.files(), before)

    def test_a_reply_that_cannot_be_applied_is_refused_and_nothing_changes(self):
        before = self.files()
        cases = {
            "an entry the list did not show": ("REC-1: b\n", "not on the list that was sent: REC-1."),
            "a bare letter, when an assumption has no options": ("1. b\n", "REC-4 is an assumption and offers no options."),
            "a letter with a comment": ("1. b, but only on weekdays\n", "REC-4 is an assumption and offers no options."),
            "a bare no": ("2. no\n", "SHR-2: 'no' does not say what to build."),
            "no reply lines": ("Looks fine, thanks.\n", "no answers found"),
        }
        for name, (reply, message) in cases.items():
            with self.subTest(name):
                code, out, err = self.reviewed(reply)
                self.assertEqual((code, out), (2, ""))
                self.assertIn(message, err)
                self.assertEqual(self.files(), before)

    def test_an_approval_with_more_after_it_keeps_the_rest_as_a_comment_to_fold_in(self):
        for reply in ("2. ok, but 16 characters is enough\n", "2. ok but 16 characters is enough\n"):
            with self.subTest(reply):
                (self.specs / "sharing.md").write_text(SHARING)
                code, out, _ = self.reviewed(reply)
                self.assertEqual(code, 0)
                self.assertIn("Rule: A link's identifier is 32 random hex characters.\n", self.entry("sharing.md", "SHR-2"))
                self.assertIn("Comment: but 16 characters is enough\n", self.entry("sharing.md", "SHR-2"))
                self.assertIn("accepted with a comment; fold each Comment into its Rule: SHR-2\n", out)

    def test_a_reply_that_leaves_part_open_is_named(self):
        code, out, _ = self.reviewed("1. The old slug redirects; for how long is your call.\n")
        self.assertEqual(code, 0)
        self.assertIn("part of these was left open; keep what was answered and record the rest as its own assumption: REC-4\n", out)

    def test_applying_a_reply_with_a_line_left_open_and_a_comment_again_changes_nothing(self):
        reply = "1. Your call.\n2. ok, but 16 characters is enough\n"
        self.reviewed(reply)
        after = self.files()
        code, out, _ = self.reviewed(reply)
        self.assertEqual((code, out), (0, "decided 0\nnot assumptions, left as they are: SHR-2\n"
                                          "left open in the reply, still assumptions: REC-4\n"
                                          "assumptions for 'spec review': 1\n"))
        self.assertEqual(self.files(), after)

    def test_applying_the_same_review_again_changes_nothing(self):
        self.reviewed("1. The old slug keeps working.\n")
        after = self.files()
        code, out, _ = self.reviewed("1. The old slug keeps working.\n")
        self.assertEqual((code, out), (0, "decided 0\nnot assumptions, left as they are: REC-4 SHR-2\n"))
        self.assertEqual(self.files(), after)


if __name__ == "__main__":
    unittest.main()
