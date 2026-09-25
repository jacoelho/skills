---
name: prose-review
description: Review and minimally edit prose that feels generic, over-regularised, assistant-like, or detached from the author's thought. Uses five independent editorial facets and iterates until material findings converge. Optimises for reader experience and authorship, never AI-detector scores.
---
# Prose Review

## Purpose
Improve AI-generated, AI-edited, or ordinary prose whose structure or voice feels generic or synthetic. The target is not “human-looking” text. The target is prose whose form follows its thought.

Optimise for clear intellectual movement, concrete claims and mechanisms, asymmetric emphasis where warranted, calibrated uncertainty, useful author judgement, semantic progress, and writer-specific voice when samples exist. Do not optimise against an AI detector.

## Core hypothesis
A common defect in LLM prose is regularisation: arguments, paragraphs, sentences, transitions, qualifications, and conclusions converge on safe reusable patterns. Correct the underlying regularisation, not isolated “AI words”.

## Inputs
Required: `TEXT`.
Optional: `PURPOSE`, `AUDIENCE`, `VOICE_SAMPLES`, `CONSTRAINTS`, `FACTS`, `SOURCES`.
Voice samples are stronger evidence of voice than generic style advice.

## Invariants
Unless explicitly instructed otherwise, preserve factual and technical meaning; citations and quotations; numbers; uncertainty and confidence; distinctions and exceptions; exact terminology. Never invent evidence, mechanisms, examples, opinions, personal experience, or certainty.

## Non-goals
Never manufacture humanity with typos, grammatical mistakes, random fragments, arbitrary sentence-length variation, synonym spinning, eccentric vocabulary, fake anecdotes/opinions, foreign slang, or punctuation changes made only to appear less machine-generated. Irregularity must come from thought, not noise.

## Facets
Run five independent reviewers against the same revision:
1. `facets/argument-shape.md`
2. `facets/semantic-density.md`
3. `facets/voice-rhythm.md`
4. `facets/specificity-epistemics.md`
5. `facets/stochastic-parrot.md`

Reviewers diagnose. They MUST NOT rewrite the document. Do not expose one reviewer's findings to another before all five complete.

## Finding contract
Each reviewer returns only actionable findings with: `id`, `severity` (blocker|major|minor), `location`, `evidence`, `diagnosis`, `reader_cost`, `operation` (delete|merge|move|split|substantiate|qualify|simplify|rewrite), `constraints`, `confidence` (high|medium|low).

A preference is not a finding. Every finding needs an identifiable reader, reasoning, or authorship cost.

`blocker`: misleading, incoherent, unsupported certainty, lost central argument, or material meaning regression.
`major`: likely to feel vague, repetitive, formulaic, evasive, over-engineered, or unnecessarily difficult.
`minor`: local improvement without material effect.

## Orchestration

### Phase 0 — Establish the contract
Recover the central claim, intended reader effect, supporting claims, evidence, genuine uncertainties, author judgements already supplied, and immutable facts/terminology. Create an internal claim map. If no coherent claim can be recovered, report a blocker rather than inventing one.

### Phase 1 — Independent diagnosis
Run all five facets on the current text.

### Phase 2 — Causal synthesis
Cluster findings by underlying cause. Do not count duplicate symptoms as independent votes. Repeated transitions + equal paragraph lengths + recap conclusion may share one cause: a generic essay template.

Resolve conflicts by: semantic correctness > argument integrity > specificity > information density > voice fidelity > rhythm > cosmetic preference.

### Phase 3 — Editorial plan
Accept only findings whose remedy is supported by supplied text, sources, or author context. Prefer: delete > merge > move > expose an existing relationship > replace abstraction with known specifics > rewrite.

Do not rewrite unaffected passages for consistency. Uniform polish is itself a failure mode.

### Phase 4 — Minimal revision
The orchestrator creates one coherent revision. Preserve useful idiosyncrasy. Do not flatten unusual but effective prose merely because reviewers noticed it.

### Phase 5 — Fresh adversarial review
Discard previous conclusions. Run fresh instances of all five facets against the revision. Check regressions: changed facts/confidence, lost nuance, invented specificity, excessive compression, new symmetry, voice drift, or conclusions stronger than evidence.

### Phase 6 — Convergence
Repeat diagnosis → synthesis → minimal revision until acceptable or five cycles complete.

Accept when: zero blockers; zero unresolved high-confidence majors; no meaning regression; no invented information; central claim recoverable without headings; each substantive paragraph performs new intellectual work; structural symmetry has semantic justification; important uncertainty has an identifiable object; conclusion resolves, narrows, or advances rather than merely recaps.

Minor findings MAY remain. Stop early when remaining findings are subjective, low-confidence, cosmetic, contradictory, or would erase authentic voice. After five cycles, return unresolved material findings instead of forcing convergence.

## Final acceptance question
Does the shape of this prose appear to be caused by what the author is trying to say, or by a reusable writing template? Accept the former; revisit the latter.

## Output
Return final revised text; unresolved blocker/major findings only; compact material-change summary when useful. Do not dump internal reasoning, reviewer transcripts, detector scores, or detector predictions.
