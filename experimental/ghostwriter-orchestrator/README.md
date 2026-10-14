# Ghostwriter Orchestrator

Version 1.2.1 — 14 October 2026.

One skill for turning notes, outlines, and editorial
conversations into readable articles. It targets dense explanations, missing
or altered ideas, awkward language, and conversation notes leaking into the
published text.

## What changed in 1.2.1

Fidelity review checks newly introduced frequency and prevalence claims as
well as preserved ones. Plausible opening language must not add a claim about
how often an outcome occurs when the selected material does not establish it.
This repair addresses a material defect in the matched development comparison.

## What changed in 1.2.0

Fidelity review now checks qualitative frequency separately from certainty:
a recurring observation must not become merely a possibility. This addresses
a material defect found by independent source comparison.

The editing route includes Vale as an advisory surface check after semantic
review. Existing project configuration takes precedence. A bundled article
profile leaves spelling variant unselected; British spelling is an optional
profile. The prose owner accepts or rejects findings and rechecks meaning.
Vale does not replace reader or fidelity review.

The bounded helper rejects missing documents/configuration and distinguishes
lint findings from a check that could not run. Bundled rules and profiles were
executed with Vale 3.24.0 and the pinned British dictionary. See
[Vale surface review](references/vale-review.md) and
[asset provenance](assets/vale/PROVENANCE.md).

## What changed in 1.1.0

The brief can record what essential support establishes and how the reader's
understanding progresses. Drafting preserves that explanatory function without
requiring a fixed article shape. Reader review tests questions raised by the
text or the user's explicit task, not an invented teaching objective. The
writer can make connections entailed by supplied premises without inventing
new facts. Evidence is not interchangeable with illustrative examples.

See [the changelog](CHANGELOG.md) for version history.

## Architecture

One skill contains five facets: briefing, drafting, reader review, fidelity
review, and editing. A single agent runs them by default. Hosts that support
actual context-limited delegation can use a controller, one writer, and two
read-only reviewers. Facets are instructions, not automatically registered
agents.

The writer gets selected article material and editorial directions in separate
blocks, not a transcript of the editing conversation. The reader reviewer gets
only the draft and audience. The fidelity reviewer gets the original material
as well, so a lossy brief cannot silently redefine the task. Only the writer
changes the prose.

For a paragraph edit, use just the relevant checks. The workflow does not
require five separate calls, a completed briefing form, or user approval at
every step. In one shared conversation, reader review is self-review rather
than genuinely blind review.

## Install in Codex

Copy the skill folder into your user-scoped skills directory. From the root of
this repository:

```sh
mkdir -p "$HOME/.agents/skills"
cp -R experimental/ghostwriter-orchestrator "$HOME/.agents/skills/"
```

The resulting path is:

```text
~/.agents/skills/ghostwriter-orchestrator/SKILL.md
```

For repository scope, copy into the repository's `.agents/skills` instead.
Check the current host documentation when using another skill system. This
is a skill folder, not a registered ChatGPT plugin or an executable
multi-agent application. Installation and source guidance are recorded in
[the OpenAI design notes](references/openai-design-notes.md).

## Use

Start with the material already available; no mandatory form is required.

```text
$ghostwriter-orchestrator

Write an article from the outline and notes below.
Audience: experienced software engineers.
Use British English. Keep technical precision, but unpack dense explanations.
Separate the article material from my editorial comments before drafting.
Return only the article unless a material factual gap needs a separate note.

[Outline, notes, and relevant source material]
```

For an existing draft:

```text
$ghostwriter-orchestrator

Revise this draft. The recurring problems are dense explanations and editorial
notes leaking into the text. Preserve the claims and essential qualifications.
Change effective passages only when a concrete defect requires it.

[Draft and, when available, the original notes]
```

For a fresh-session hand-off:

```text
$ghostwriter-orchestrator

Brief only: turn this discussion into a clean writing packet. Separate selected
article material from editorial directions. Put unresolved matters and the
source/disposition record outside the writer's packet.

[Relevant discussion]
```

Check the packet before passing it to a new writer. For a truly draft-only
review, start a separate context with the reader-review facet and only the
draft, audience, and genre. Do not include the writing packet or conversation.

## Existing ghostwriter skills

This is a new entry point; it does not modify `ghostwriter-article`,
`ghostwriter-line-edit`, or `ghostwriter-readme`.

Choose one end-to-end owner rather than automatically chaining this workflow
with the old article workflow. The old line-edit skill can remain useful for
isolated wording tasks, and the README skill for repository documentation.
This pack has no dependency on either. A supplied `writing-voice-jacoelho`
reference or other voice card can guide the writer, but is not bundled and is
not invented from its name.

## Files

`SKILL.md` is the compact runtime router. The five facet files in `references`
load only when needed. `references/orchestration.md` defines optional agent
packets. `assets` contains working templates, not article boilerplate.
`references/examples.md` provides optional editorial calibration.

## Verification and limits

The bundled Vale rules, profiles, dictionary and lint helper have automated
checks. With Vale installed, run them from this skill's directory:

```sh
bash assets/vale/scripts/test-with-vale.sh
```

Evaluation datasets, generated articles, source archives and review reports
are intentionally excluded from this repository copy. Vale checks surface
issues; clean lint does not establish factual fidelity or explanatory quality.
Structural validation does not establish writing quality, and same-context
review does not establish generalisation.
