---
name: pr-review-feedback-generalizer
description: Turn human review-card feedback into scoped candidate rules and findings. Use after a reviewer accepts, rejects, requests a change, skips, or asks to generalise feedback during a PR review loop.
---

# PR Review Feedback Generalizer

Use this skill after the human gives feedback on a review card.

The goal is to turn human judgement into scoped, testable candidate rules without over-generalising.

## Inputs

- Card ID and content.
- Human feedback.
- Relevant diff context.
- Existing project rules.
- Existing rejected rules.
- Existing branch learnings.

## Outputs

Update:

```text
human-feedback.md
candidate-rules.md
findings.jsonl
session.jsonl
.agents/reviews/<safe-branch>/branch-learnings.md
```

Do not patch code.

## Prompt discipline

- Preserve the human's exact feedback before normalising it.
- Distinguish local findings from reusable rules before searching or editing.
- Make each candidate rule specific enough to test, with scope, non-scope, positive examples, and negative examples.
- Do not generalise from style preference to behaviour rule unless the reviewer explicitly asks.
- Do not request hidden reasoning. Record decision, evidence, uncertainty, and the next explicit command options.

## Accepted shorthand

Normalise shorthand before processing feedback.

For a single active card:

```text
y / yes / accept        -> accept <active-card>
n: <reason>             -> reject <active-card>: <reason>
change: <instruction>   -> needs-change <active-card>: <instruction>
gen: <instruction>      -> generalise <active-card>: <instruction>
skip: <reason>          -> skip <active-card>: <reason>
clarify: <question>     -> clarify <active-card>: <question>
```

For batches, accept either `R-0001 y` or `1 y` only if the visible card numbering is clear. If the response is ambiguous, ask for the card ID.

## Feedback command meanings

```text
accept R-0001
```

The human accepts the change or the agent concern is resolved. Mark the card accepted. Do not create a rule unless the human also provided reusable reasoning.

```text
reject R-0001: <reason>
```

The agent concern is wrong. Mark rejected. Consider adding a rejected-rule entry if this false positive could recur.

```text
needs-change R-0001: <instruction>
```

The human found a real issue. Create or update a finding. Decide whether the instruction is local-only or may generalise.

```text
generalise R-0001: <scope/instruction>
```

Create a candidate rule. Do not apply it until the similarity sweep and human confirmation are complete.

```text
skip R-0001: <reason>
```

Mark skipped and update coverage.

```text
clarify R-0001: <question>
```

The human is unsure or needs explanation before deciding. Record the exact question, answer from available code/diff/test evidence, keep the card pending, and do not create a finding, candidate rule, sweep, or fix plan.

## Candidate rule format

```text
## CR-0001: <short name>

Status: proposed | approved-for-sweep | approved-for-fix | rejected | promoted
Source card: R-0001
Source feedback:

### Proposed rule

<One precise rule.>

### Scope

- Include:
- Exclude:

### Non-scope

<Where this must not be applied.>

### Why this matters

<Behavioural risk, not style preference only.>

### Positive examples

<Patterns that should match.>

### Negative examples

<Patterns that should not match.>

### Search strategy

- Text search:
- Git diff search:
- AST/search shape:
- Test/verification hints:

### Similarity sweep result

Pending.

### Human decision

Pending.

### How to answer this rule

- `approve-sweep CR-0001` — search for similar cases.
- `edit-rule CR-0001: <change>` — revise scope or wording.
- `branch-only CR-0001` — keep only for this branch.
- `promote CR-0001` — after validation, add to project rules.
- `reject-rule CR-0001: <reason>` — reject the generalisation.
- `defer CR-0001: <reason>` — leave unresolved for now.
```

## Generalisation discipline

Avoid these bad rules:

```text
Always avoid wrappers.
Always accumulate errors.
Never return early.
Always use options.
```

Prefer scoped rules:

```text
In streaming validation runtime code, recoverable validation errors should be accumulated when the validator can safely continue. Fatal XML/tokenisation errors may abort.
```

```text
In public Go APIs, avoid unnamed boolean parameters when both values are plausible at call sites; prefer a named type, constant, or option struct.
```

```text
In this package, wrapper functions should add a named semantic boundary, validation, instrumentation, or argument transformation. Wrappers that forward unchanged arguments and are always called from one place should be removed or inlined.
```

## Rule promotion

Promote to project rules only when the human approves.

Promotion entry must include:

- scope;
- non-scope;
- example positive pattern;
- example false positive;
- verification method;
- source session.

Rejected generalisations should be preserved to avoid repeated noise.
