# Examples

Each pair shows a repair on PR or commit text and names the rule that fired. The rewrites keep every fact, condition and judgement in the original. Where the original lacks a fact, the rewrite reports the gap instead of inventing one.

## A worry the reader did not have

Before:

> Adds a `--dry-run` flag to `sync` that prints the files it would delete. This does not change the default behaviour, and existing scripts will not delete anything they did not delete before.

After:

> Adds a `--dry-run` flag to `sync` that prints the files it would delete.

The second sentence ruled out a failure nothing suggested, so it planted the worry it denied (Remove). A new flag leaves the default alone, so the sentence goes. Had the default changed, the sentence would have stayed and moved to the top.

## A mannered figure and a staged question

Before:

> The retry budget is the load-bearing piece of this change. Why? Without it, a slow dependency turns every request into three.

After:

> Without the retry budget, a slow dependency turns every request into three.

"Load-bearing" stood in for "necessary", and the question staged a reveal the reader did not ask for (sentence rules, Remove). The fact that made the budget necessary was already in the text, so the rewrite keeps only that fact.

## Fragments after a cut

Before, after a first repair pass:

> Cache moved to Redis. Two days. No downtime. Boring wins.

After:

> The cache moved to Redis. The move took two days and caused no downtime.

The first pass cut the connectives and turned the outcome into a slogan (repair check). "Boring wins" was a moral, so it goes. The rewrite restores complete sentences. Reading "Two days" as the length of the move is an interpretation, so check it against the notes before keeping it.

## A contrast against a claim nobody made

Before:

> This isn't just a refactor, it's a fix for the duplicate-charge bug, because the old path retried without the idempotency key.

After:

> Fixes the duplicate-charge bug, which happened because the old path retried without the idempotency key.

The opening ruled out a claim the reviewer never held (`Register.Contrast`). The rewrite opens with the fix, as the PR profile requires, and keeps the "because" the source gave.
