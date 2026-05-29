---
name: pr-review-card-questioner
description: Create focused human review cards from a PR risk cluster. Use when Codex has a diff map, risk register, snippets, or feedback and needs small decision-oriented cards with exact questions, evidence, context, and one-at-a-time interactive reply prompts.
---

# PR Review Card Questioner

Use this skill to turn a risk cluster into small human review cards.

A review card is not a summary. It is a decision request.

## Inputs

- Diff map.
- Risk register.
- Relevant diff snippets.
- Existing human feedback.
- Project review rules and rejected rules.

## Outputs

Write card files under:

```text
.agents/reviews/<safe-branch>/sessions/<base>..<head>/cards/R-0001.md
```

Append `card_created` events to `session.jsonl` when cards are created.

## Card principles

Each card should ask one clear question.

Prompt-quality rules:

- Use headings and fenced snippets to separate evidence, context, and the human question.
- Make the success criterion explicit: what decision would resolve the card.
- Ask for reviewer judgement, not broad review or hidden reasoning.
- Include only examples that match the card's requested decision.
- Keep snippets focused enough that the reviewer can answer without reading the whole diff.

Good card questions:

- Does this early return preserve recoverable error accumulation semantics?
- Is this wrapper still adding value, or is it hiding an unchanged call?
- Should this new boolean parameter be a named type or option because call sites are ambiguous?
- Does this cache key include all data that affects the computed result?
- Is this test asserting behaviour or only implementation shape?

Bad card questions:

- Is this file okay?
- Please review this diff.
- Are there any bugs here?

## Interactive prompt requirement

Every card file must include an explicit `How to answer` menu. Do not rely on the human remembering the command syntax.

Human-facing prompts should ask one card at a time by default. Keep the displayed prompt compact: card ID, risk, files, one-sentence reason, exact question, and answer options. Full evidence belongs in the card file.

If the host exposes a structured user-input tool with choice buttons/select boxes and free text, use it for each card. Prefer three primary choices:

```text
Accept / OK
Needs change
Need more context
```

Use the free-text or Other field for `reject: <reason>`, `skip: <reason>`, `gen: <scope>`, `more`, `batch`, `stop`, or detailed instructions.

If structured input is unavailable, show a compact text menu. For one active card, allow bare shorthand such as `y`, `n: reason`, `change: ...`, `gen: ...`, and `skip: ...`.

Batch mode is opt-in. For multiple cards, require the card ID or visible number, for example `R-0001 y`, `1 y`, `R-0002 change: ...`, or `3 gen: ...`. Bare `y` or `n` in a batch is ambiguous and must not be guessed.

## Card format

```text
# Review Card R-0001

Status: pending
Risk: critical | high | medium | low
Confidence: high | medium | low
Cluster: C-0001 <name>
Files:
- path/to/file.go:10-80

## Why this card exists

<Explain the risk, not just the edit.>

## Human question

<One precise question.>

## Snippet

```language
<focused code>
```

## Context

- Old behaviour:
- New behaviour:
- Callers affected:
- Test evidence:
- Missing evidence:

## How to answer

Single-card shorthand is allowed when this is the only active card:

- `y` / `yes` / `accept` — accept this card.
- `n: <reason>` / `reject: <reason>` — reject the concern.
- `change: <instruction>` / `needs-change: <instruction>` — request a local fix.
- `gen: <scope/instruction>` / `generalise: <scope/instruction>` — create a candidate rule and search similar cases.
- `skip: <reason>` — mark out of scope.
- `clarify: <question>` — ask for explanation or more evidence while keeping the card pending.
- `more` — show more context.
- `next` — show the next card or batch.
- `stop` — stop and write current status.

Batch form requires an ID or number: `R-0001 y`, `1 y`, `R-0002 change: ...`, `3 gen: ...`, `R-0004 clarify: ...`.

## Similarity hints

- Search pattern:
- Related files:
- Possible AST shape:
```

## Question cadence

Create an ordered card queue, but show only the next highest-value card by default.

If the branch is large, queue cards in this order:

1. one critical/high card from the riskiest cluster;
2. one repeated-pattern card;
3. one test-evidence card;
4. one API/contract card if present;
5. one low-risk skip candidate to reduce review surface.

Show 3-5 cards only when the human asks for `batch`, `show batch`, or `show 3-5`.

## Hidden pattern to look for

The most valuable cards are usually not the largest diffs. They are small changes that alter assumptions:

- `continue` becomes `return`;
- `nil` handling changes;
- a default changes;
- an error is swallowed or wrapped differently;
- a cache key loses a field;
- a public type grows an ambiguous parameter;
- a test is weakened while production code changes;
- a helper becomes a wrapper with no semantic value;
- one branch of a state machine is updated but sibling branches are not.
