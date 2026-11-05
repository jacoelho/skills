---
name: technical-writing
description: Write, improve, reorganise, review or lint READMEs, guides, tutorials, runbooks, articles, blog posts and PR descriptions, from notes, a diff or existing text. Use when asked to draft, edit or restructure one of these documents, or to check it with Vale. Not for requirements or acceptance criteria (use jacoelho:spectacular-spec-writing), API reference, or commit messages.
argument-hint: "[document path | notes | diff]"
---

# Technical writing

Produce text a reader can follow and act on, saying what the source material says and nothing more. The user's explicit instructions and repository conventions, including PR templates and Vale configuration, take precedence over this workflow.

## Select the route

- **Draft:** from notes, a diff or sources. Follow all steps.
- **Improve:** existing text, when asked to improve, edit, tidy or polish it. Follow steps 1, 2, 4, 5 and 7. Edit only what would mislead the reader or make their task fail. Keep the structure, headings, lists, voice and first-person asides. Profile rules and the reader pass find problems; report the rest as findings.
- **Reorganise:** existing text, when asked to restructure it or improve its organisation. Follow all steps, using the existing text as the source material.
- **Review:** when asked to review or check a document. Follow steps 1, 2, 4 and 5, and return findings only. Do not rewrite unless asked.
- **Lint:** when asked to run Vale or lint a document. Follow [Vale review](references/vale-review.md) only.

Good text is a valid result: when a document already does its job, leave it alone and say so. Do not change wording to show that a review happened.

## Contract

These rules apply on every route and outrank every other rule in this skill.

1. **Keep the kind of each claim.** Observation, report, inference, assumption, proposal, decision, requirement, forecast, risk, unknown and action stay what they are. A proposal does not become a decision, a report does not become an observation, and a forecast does not become a guarantee.
2. **Keep what limits a claim.** Conditions, exceptions, scope, negation, actors, timing, quantities and uncertainty stay attached to the claim they limit. A length limit does not excuse dropping one: cut something else, or report that the content does not fit.
3. **Keep frequency separate from certainty.** "Often fails" is stronger than "can fail" and weaker than "always fails". Keep supplied frequency, including qualitative frequency. Add a frequency or prevalence word only when the source supports it.
4. **Add no substance.** No new facts, causes, mechanisms, numbers, commands, test results or first-person experience. A connective such as "therefore" or "because" needs support in the source. Two facts placed side by side are not a cause.
5. **Surface what is missing.** When sources conflict or a required fact is absent, leave the gap visible and report it. Never choose a side silently or fill the gap with something plausible.
6. **Change the writing, not the subject.** Editorial directions shape the text and never appear in it. Do not narrate them, rebut them or turn them into claims. The document contains no notes to the writer, revision summaries or session references.

Text about a reader-facing subject is not leakage: a scope statement that helps the reader stays, and an article about editing can discuss editorial notes.

## Steps

1. **Select one profile** and read it, plus [organisation rules](references/organisation.md):
   - [README](references/readme.md)
   - [Guide](references/guide.md)
   - [Article](references/article.md)
   - [PR description](references/pr-description.md)

   If the document is none of these, use the organisation rules alone and say so.
2. **Inventory the source.** Identify the reader, their task, the claims and their kinds, and what is missing or in conflict. Keep this inventory out of the document.
3. **Draft or reorganise.** Use the profile's required questions to find gaps, not as a template to fill. Omit a section when the source has nothing true to put in it.
4. **Reader pass.** Read the text as someone who has only the text. State what it actually establishes. Look for unstated premises, unclear references, terms used before they are explained and transitions that assert something unproven. This is same-context self-review: prior knowledge remains, so do not describe it as blind or independent. Then read only the shape: the headings and where the paragraph breaks fall should follow the argument in order. Record a mismatch as a finding; step 6 repairs it as a connections problem.
5. **Fidelity pass.** Check each material claim, condition and example against the source, then check the reverse direction for anything the source does not support. A keyword match is not coverage; the relationship and its qualification must survive.
6. **Repair in order:** meaning, connections, density, surface. Correct the claim itself rather than appending a contradicting caveat. Change the smallest coherent passage. Stop after two repair rounds and report what remains.
7. **Lint** with [Vale review](references/vale-review.md) when a command tool is available, after substantive repairs. If Vale cannot run, continue without it and report that separately.

## Output

Return the document alone, in the requested format. Put findings, unverified claims and "Vale not run" after it, under a separate label, and never inside it. The one exception is a conflict the text cannot settle: keep a single reader-facing marker at the affected claim, plus a finding. Omit that section when there is nothing to report. Do not add a process summary, a rating or an offer of further work.

For a review, return findings ordered by effect on the reader. Quote the passage, state the problem and name the repair. If there are none, say so.
