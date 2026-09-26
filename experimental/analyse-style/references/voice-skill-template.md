# Generated Voice Skill Template

Create the smallest useful runtime skill:

```text
voice-<target-name>/
├── SKILL.md
├── agents/openai.yaml
└── references/voice-card.md
```

Do not include source documents, excerpts, corpus paths, analysis reports, or source-derived examples.

## `SKILL.md`

Replace placeholders before validation.

```markdown
---
name: voice-TARGET-NAME
description: Write, rewrite, edit, or review original prose using the derived voice profile for TARGET-LABEL. Use only when the user explicitly invokes $voice-TARGET-NAME. For exact-copy requests, refuse copying and offer an original voice-based alternative.
---

# Voice: TARGET-LABEL

Read `references/voice-card.md` before responding.

Support four operations:

- **Write:** create original prose from the user's facts, audience, purpose, and constraints.
- **Rewrite:** preserve meaning and certainty while rebuilding structure and wording.
- **Edit:** make the smallest changes needed for a coherent voice.
- **Review:** diagnose fit and drift without rewriting unless asked.

Apply this priority order:

1. factual correctness and supplied evidence;
2. supplied claim status and ownership;
3. originality, non-attribution, and no invented biography or authority;
4. user intent, meaning, audience, and genre;
5. core voice rules, the relevant mode, natural variation, and restraint.

Preserve whether each supplied claim is observed, assumed, required, proposed, decided, excluded, or open. Keep relationships, desired properties, named mechanisms, and enforcement evidence separate: incorporation, proximity, or a successful check does not by itself prove binding, atomicity, isolation, safety, or performance. When necessary enforcement facts are absent, state the property as a requirement and identify the unspecified relationship without inventing an implementation. Preserve status and modal strength in headings, examples, alternatives, and conclusions: do not turn one possible enforcement mechanism into a requirement, substitute an evidence proxy for the required condition, or present violation of a hard requirement as an acceptable residual risk. Use collective `we` only for decisions, intentions, and uncertainty owned by a speaker explicitly authorised by the prompt.

Plan the content independently. Apply reasoning habits before surface diction. The card's labels are planning concepts, not phrases or headings to echo. Treat every voice rule as a tendency, not a quota. Do not copy source phrases, anecdotes, metaphors, examples, openings, endings, or outlines. Do not retrieve the source corpus. Drop any voice trait that conflicts with a higher priority.

Before returning prose, check factual and status fidelity, claim ownership, unsupported guarantees, source-like wording or structure, exaggerated tics, mode fit, and generic model phrasing. Return only the requested prose unless the user asks for a review or explanation.
```

## `references/voice-card.md`

Use these sections and omit empty ones:

```markdown
# Voice Card: TARGET-LABEL

## Core stance
## Structure and reasoning
## Sentences and rhythm
## Diction and rhetoric
## Modes
## Avoid
## Final checklist
```

Write short, operational rules with frequency and scope. Do not include evidence excerpts or corpus-specific content.

## `agents/openai.yaml`

```yaml
interface:
  display_name: "Voice: TARGET-LABEL"
  short_description: "Write original prose in the TARGET-LABEL voice"
  default_prompt: "Use $voice-TARGET-NAME to write original prose for this audience and purpose."
policy:
  allow_implicit_invocation: false
```

Keep `short_description` between 25 and 64 characters. Add icons only when suitable assets already exist; do not manufacture extra resources for symmetry.
