---
name: spectacular
description: Finds the behavioural decisions that software requirements leave open, asks the decision owner about the ones that need them, builds the rest on recorded assumptions, lists those assumptions for the owner to review when the work is done, and keeps every decision under specs/. Use before building from a brief, spec, ticket or change request that leaves behaviour unstated, when asked to clarify, grill or pin down requirements, when the user asks what should happen in a specific case or debates two behaviours, and when a change alters a behaviour that specs/ records. Not for general plan or design critique, or for mechanical changes that alter no behaviour.
argument-hint: "[requirements | change]"
---

# Spectacular

A decision nobody asked about becomes a rule the implementer invents, and it surfaces after the code exists. This skill finds those decisions first, asks the owner about the ones that need them, records the rest as assumptions, and gives the owner one list of those assumptions to review when the work is built. Each decision is one entry under `specs/`.

Scale it to the work. A mechanical change needs none of it: say so and stop. A small change needs one or two questions.

Run the tool as `python3 "${CLAUDE_SKILL_DIR}/scripts/spec.py" <command>`, from the repository root. It needs only Python 3. Run it and act on what it prints: its messages say what to fix, so its source is not worth reading.

## 1. Sweep

List every operation in scope: each thing a user or another system can do. Sweep every operation against the gap classes below, and keep each gap that is consequential and that the sources do not settle. A gap is consequential when two careful implementers could build observably different behaviour from the same sources. Read the sources first (the request, existing `specs/`, the code and tests the change touches), and look facts up instead of asking for them.

Trade depth for coverage: recording a gap costs a line; a missed decision costs a rewrite after the code exists.

Each class names the decision most often left to the implementer:

- **Identity and normalisation:** which inputs count as the same (case, accents, whitespace, punctuation), and how names become keys such as slugs.
- **Uniqueness and collisions:** what a duplicate is, its scope (per owner, per group, global), and whether it is refused, renamed or merged.
- **Defaults:** the value of every optional input, default ordering, page size, expiry, and limits.
- **Deletion and merge:** what happens to everything that refers to a deleted or merged item: refused, cascaded, detached, or repointed, and which side's attributes survive a merge.
- **Copy or reference:** whether derived data copies its source when created or follows later changes to it.
- **Matching and search:** which fields a search reads, how several terms or filters combine (all or any), and what an empty filter returns.
- **Aggregation and rounding:** how a combined value is computed (mean, sum, latest), what counts toward it, and how it is rounded.
- **Rendering formats:** the full format of every derived text or number field, not one facet of it: units, plurals, fractions or decimals, order of parts.
- **Validity and permissions:** which inputs are invalid, who may change or delete each thing, and which response each refusal gets.

## 2. Record each gap, as a question or an assumption

Write one file per capability, `specs/<capability>.md`, with one entry per gap. Record every gap you kept: the only choice is whether the owner answers it now or reviews it later.

- **A question**, when a wrong guess would be costly to undo once code and data exist (it shapes identity, stored data, or what is deleted or refused), or when the options are real preferences and no convention picks between them.
- **An assumption** otherwise: you choose the behaviour and build it, and the owner sees it in the review list.

When in doubt, ask. A whole product should come to about 20 questions; a single change to one or two, or none.

One entry holds one decision. Do not fold several points into one entry to shorten a list: the figure of 20 is for questions only, and an assumption costs the owner one line to review.

A question is a `## <ID> <title>` heading and labelled lines:

```markdown
## EXP-2 Reused idempotency key

Open: Two requests carry the same idempotency key but different content.
Case: request A creates invoice 17; request B arrives with A's key and a different amount.
Options: B is rejected with a conflict | B returns invoice 17 unchanged | B is treated as a new request
Default: B is rejected with a conflict.
Reason: The API already treats keys as identity.
```

- **Case** is a small input, timeline or failure that separates the plausible answers. Without one, a question reads like "should retries be robust?" and gets an answer nobody can build.
- **Options** are materially different observable outcomes, each a full sentence that could stand as the rule.
- **Default** is what you will build if nobody answers: one of the options, word for word, when it is one. It becomes an assumption when the owner leaves the question open, so it carries no reason.
- **Reason** is why you chose that default. The owner reads it with the question, and it is dropped once the question is settled.
- A question that depends on another states the answer it assumes.

An assumption states what you will build in one sentence of at most 25 words that could stand as the rule, with no reason attached, and the case that shows it. The owner reviews dozens of these, so each must read at a glance; a sentence that needs a semicolon or a second clause to join two behaviours is two entries:

```markdown
## IMP-4 Rows that fail to parse

Assumed: Nothing is imported, and the tool exits 1 naming row 412.
Case: a 1,000-row CSV whose row 412 has a malformed date.
```

The same shapes fit any kind of software: an HTTP API above, a command-line tool, a library:

```markdown
## CACHE-3 Read at the moment of expiry

Open: An entry is read at exactly the time it expires.
Case: an entry stored at 12:00:00 with a 60-second lifetime is read at 12:01:00.
Options: The read returns the entry. | The read misses.
Default: The read misses.
Reason: A lifetime of 60 seconds promises nothing at the sixty-first.
```

IDs are a short prefix for the capability and a number; never reuse one.

## 3. Ask

- **The owner answers in one round** (a written list, an unattended session, or a request for all questions at once): `spec.py questions > QUESTIONS.md` prints every open question as one numbered line. Send that list, then stop and wait. Stopping with open questions is the correct end of this step: the questions are the product.
- **The owner is in the session:** ask one question at a time, the costliest wrong answer first, with its case and options.

## 4. Apply the answers

`spec.py answer ANSWERS.md --questions QUESTIONS.md` turns each answered question into a rule. If it refuses an answer it changes nothing, and it names any question that changed since the list was sent and leaves it open. An answer is the owner's own words, an option letter, or "your call", which turns your default into an assumption. Answers keyed by entry ID (`EXP-2: b`) need no question list. Add `--rest-default` only when the round is over and the owner will answer nothing more: every question left unanswered becomes an assumption of its default. When the owner later answers a question that became an assumption, key that answer by entry ID and give it in words: the options are gone.

A rule replaces its question:

```markdown
## EXP-2 Reused idempotency key

Rule: B is rejected with a conflict.
Case: request A creates invoice 17; request B arrives with A's key and a different amount.
Rejected: B returns invoice 17 unchanged | B is treated as a new request
```

Then run `spec.py status` and fix what it reports. Where the owner answered part of a question, keep their part as the Rule and record the part they left open as a new assumption, so it reaches the review list.

## 5. Build, and keep the decisions true

Build however you and the user choose; this skill has no implementation method. Rules and assumptions are both what you build. Two things keep `specs/` worth reading:

- When a change alters a recorded behaviour, rewrite that entry in the same change. Search `specs/` for every entry that states the behaviour first: the same rule is often recorded under more than one capability. Replace the old text; do not append a note beside it, because a reader cannot tell which one holds. Change only what the request changes, and keep the rest of the entry as it was. A detail you chose to make the change work, such as a status code, a boundary, or what happens to existing data, goes in its own Assumed entry, so it reaches the review list.
- A new gap found while building is a new entry in the same files: a question when the owner is there to ask, an assumption when not. A new entry is a Rule only when it says what the request itself states. Keep no second list of decisions outside `specs/`.

`spec.py status` shows the state at any time, so a later session can pick up from it.

## 6. Hand over the assumptions for review

When the work is built, the owner reviews what was decided on their behalf. `spec.py review` prints every assumption as one numbered line.

- **The owner answers in one round:** `spec.py review > REVIEW.md`, send that list, and end your turn. Do not print the list again while a reply is pending: the reply's numbers refer to the list that was sent.
- **The owner is in the session:** `spec.py review > REVIEW.md`, and show that list. Keep the file until the reply is applied: it records what the owner saw.

The reply names only the assumptions to change. Apply it with `spec.py reviewed REVIEW.md REPLY.md`: each assumption the owner changed becomes a rule in their words, one they left open stays an assumption, and the others on that list become rules as they stand. When the owner changes nothing, run `spec.py reviewed REVIEW.md` alone. An assumption made or rewritten after the list was sent stays an assumption until a later review. Then change the code and tests to match every changed rule, and run `spec.py status`.

Once the reply is applied, delete `REVIEW.md` and the reply. `specs/` holds the result, and a list left in the repository contradicts it after the next change.
