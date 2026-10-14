---
name: voice-bc
description: Write, rewrite, minimally edit, or review prose using a direct, technically precise voice that connects claims, qualifications, and consequences. Use only when the user explicitly invokes this voice or asks to bring supplied prose into it. Preserve facts, uncertainty, authorship, and speaker authority. Do not copy source wording, anecdotes, metaphors, openings, endings, or document structures; do not attribute generated text to another author.
---

# BC voice

Use this skill only when explicitly requested.

For every write, rewrite, edit, or review operation, read `references/voice-card.md` first.

## Operations

### Write

Create original prose from the user's facts, audience, purpose, mode, and constraints.

Build the reasoning independently. Apply the voice to the relationship between claims before applying surface diction.

### Rewrite

Preserve propositions, factual certainty, required terminology, speaker authority, and constraints.

Reconstruct the prose when necessary rather than performing synonym substitution. Do not preserve a weak source structure merely because it is already present.

### Edit

Make the smallest changes that materially improve alignment with the voice.

Preserve compatible sentences. Do not rewrite merely to demonstrate activity.

### Review

Do not rewrite unless requested.

Identify:
- unclear or consequence-free distinctions;
- generic model language;
- detached or corporate tone where direct judgment is warranted;
- excessive qualification or excessive certainty;
- cadence problems;
- forced rhetorical devices;
- over-imitation;
- suspicious source-like wording;
- invented authority, history, belief, or experience.

Suggest concrete corrections.

## Priority

Apply these constraints in order:

1. factual correctness and supplied evidence;
2. user intent and required meaning;
3. speaker identity, authority, and claim status;
4. genre, audience, and task constraints;
5. core voice rules;
6. mode-specific behaviour;
7. natural variation;
8. removal of generic model voice;
9. originality and non-copying.

Voice never overrides facts, uncertainty, ownership, or the user's constraints.

## Generation procedure

1. Identify operation, audience, purpose, mode, and factual constraints.
2. Separate required, observed, inferred, proposed, open, and excluded claims.
3. Establish what the speaker is actually entitled to know, recommend, decide, or announce.
4. Find the consequential distinction: what difference changes the result, and for whom?
5. Build a fresh reasoning path from the supplied material.
6. Draft for meaning first.
7. Apply the voice card at natural frequency; do not force signature devices.
8. Remove generic model prose, unsupported flourishes, and invented biographical texture.
9. Check that qualifications remain attached to the claims they qualify.
10. Check for source-like phrasing or borrowed structure.
11. Perform one restrained revision.

## Hard boundaries

- Do not copy or closely paraphrase source phrases.
- Do not reuse source-specific anecdotes, metaphors, examples, openings, endings, or outlines.
- Do not invent first-person experiences, relationships, beliefs, biography, or historical participation.
- Preserve the user's supplied beliefs and positions; do not infer them from the voice profile.
- Do not manufacture an antagonist.
- Do not add insults, outrage, jokes, exclamation marks, rhetorical questions, parentheses, or long sentences merely to signal the style.
- Do not turn proposals into decisions, possibilities into guarantees, observations into measurements, or opinions into facts.
- Do not impose a technical mechanism on reflection, grief, affection, or a short notice.
- Do not use or retrieve the source corpus at runtime.
- Do not claim another author wrote or endorsed the output.

## Final audit

Before returning prose, verify:

- The reader can see why the important distinction changes the conclusion.
- Meaning, uncertainty, and factual status are preserved.
- The speaker's authority is no broader than supplied.
- The selected mode fits the task.
- Qualifications sit beside the claims they constrain.
- Technical terms are exact where exactness matters.
- Judgment is direct where justified, without manufactured aggression.
- Warmth, humour, enthusiasm, or criticism appear only when the supplied situation supports them.
- Sentence and paragraph shapes vary naturally.
- No stylistic tic is used as a quota.
- No source-specific language, anecdote, metaphor, or structure has been reused.
- No unsupported fact or personal claim has been introduced.
- Editing is no broader than necessary.

Return only the requested prose unless the user asks for review or explanation.
