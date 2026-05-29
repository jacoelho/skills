# Reply Menu Template

Use this template whenever the agent asks the human to decide something.

The agent must not end a review-card batch, candidate-rule question, similarity sweep, fix plan, or final-review prompt without showing a compact answer menu.

## Review card reply menu

For a single card:

```text
How to answer:
- `y` / `yes` / `accept` — accept this card; no change needed.
- `n: <reason>` / `reject: <reason>` — reject the concern as a false positive or intentional design.
- `change: <instruction>` — the code needs a local change.
- `gen: <scope/instruction>` / `generalise: <scope/instruction>` — turn the feedback into a candidate rule and search similar cases.
- `skip: <reason>` — mark this card out of scope, generated, mechanical, or not worth reviewing.
- `clarify: <question>` — ask for explanation or more evidence before deciding.
- `more` — show more context for this card.
- `next` — show the next card or batch.
- `stop` — stop the review and write the current status.
```

For a batch of cards, bare `y` or `n` is ambiguous. Require a card ID or number:

```text
How to answer this batch:
- `R-0001 y` or `1 y` — accept card 1.
- `R-0002 n: <reason>` or `2 reject: <reason>` — reject card 2.
- `R-0003 change: <instruction>` or `3 needs-change: <instruction>` — request a local fix.
- `R-0004 gen: <scope/instruction>` or `4 generalise: <scope/instruction>` — create a rule and search for similar cases.
- `R-0005 skip: <reason>` or `5 skip: <reason>` — mark out of scope.
- `R-0002 clarify: <question>` or `2 clarify: <question>` — ask about one card before deciding.
- `all y` — accept all cards in the current batch.
- `more R-0002` — show more context for one card.
- `next` — show the next batch.
- `focus <file/category>` — review a narrower area.
- `stop` — stop and write the current status.
```

If the human replies with an ambiguous shorthand in a batch, ask for the card ID instead of guessing.

## Candidate rule reply menu

```text
How to answer this rule:
- `approve-sweep CR-0001` — search for similar cases using this rule.
- `edit-rule CR-0001: <change>` — narrow, broaden, or rewrite the rule before search.
- `branch-only CR-0001` — keep the rule only for this branch review.
- `promote CR-0001` — after validation, add it to `.agents/review-rules/project-review-rules.md`.
- `reject-rule CR-0001: <reason>` — reject the generalisation.
- `defer CR-0001: <reason>` — keep it unresolved without applying it.
```

## Similarity sweep reply menu

```text
How to answer this sweep:
- `apply likely CR-0001` — apply fixes/comments to likely matches only.
- `apply CR-0001: 1,3,5` — apply only selected matches.
- `comments-only CR-0001` — produce review comments but do not patch.
- `narrow CR-0001: <scope>` — adjust scope and rerun the sweep.
- `reject-matches CR-0001: <reason>` — reject the sweep result.
- `defer CR-0001: <reason>` — leave as follow-up.
```

## Fix plan reply menu

```text
How to answer this fix plan:
- `approve-fix F-0001` or `approve-plan` — apply the proposed patch.
- `change-plan F-0001: <instruction>` — revise the plan before editing.
- `comments-only F-0001` — create review comments instead of patching.
- `reject-fix F-0001: <reason>` — do not apply this fix.
- `defer F-0001: <reason>` — leave it unresolved for now.
```

## Final report reply menu

```text
How to answer the final report:
- `complete` — accept the review status as final.
- `continue high` — continue with unresolved high-risk areas.
- `continue all` — continue until all cards are resolved.
- `show unresolved` — list remaining findings, cards, and risks.
- `export comments` — prepare PR-review comments from accepted findings.
- `stop` — stop and keep the report as incomplete or stopped-by-human.
```
