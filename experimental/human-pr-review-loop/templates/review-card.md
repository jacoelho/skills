# Review Card R-0000

Status: pending
Risk: critical | high | medium | low
Confidence: high | medium | low
Cluster: <category>
Files:
- path/to/file.go:10-80

## Why this card exists

<One or two sentences. Explain the risk, not the diff.>

## Human question

<The exact decision you need from the reviewer.>

State the success criterion in the question when useful, for example what acceptance, rejection, or requested change would resolve the card.

## Snippet

```text
<small focused snippet>
```

## Context

- Changed behaviour:
- Old behaviour, if visible:
- Tests affected:
- Callers affected:

## How to answer

When this is the only active card, shorthand is allowed:

- `y` / `yes` / `accept` — accept this card; no change needed.
- `n: <reason>` / `reject: <reason>` — reject the concern.
- `change: <instruction>` / `needs-change: <instruction>` — request a local fix.
- `gen: <scope/instruction>` / `generalise: <scope/instruction>` — create a candidate rule and search similar cases.
- `skip: <reason>` — mark out of scope.
- `clarify: <question>` — ask for explanation or more evidence before deciding.
- `more` — show more context.
- `next` — show the next card or batch.
- `stop` — stop and write current status.

When shown in a batch, include the card ID or number: `R-0000 y`, `1 y`, `R-0000 change: ...`, `1 gen: ...`, `R-0000 clarify: ...`.

## Similarity hints

Search terms, AST shapes, files, or categories that may contain similar cases.
