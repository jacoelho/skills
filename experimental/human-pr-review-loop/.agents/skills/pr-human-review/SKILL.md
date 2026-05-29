---
name: pr-human-review
description: Run a local human-in-the-loop PR or branch review. Use when Codex should inspect the current git branch against a base ref, create auditable review state, show focused review cards, capture human feedback, generalise approved feedback into scoped rules, apply only explicitly approved fixes, and produce a final review report.
---

# PR Human Review

Run a standalone, local, human-in-the-loop review of the current branch or PR.

This is the entrypoint skill. When invoked as `pr-human-review`, start the review automatically. The human should not need to paste a long bootstrap prompt.

This skill owns the loop. It may delegate role-specific work to other review skills if the agent environment supports subagents. If not, run the roles sequentially in the same agent.

## Invocation contract

Accepted invocations:

```text
pr-human-review
pr-human-review <base-branch>
pr-human-review origin/<base-branch>
pr-human-review --base=<ref>
```

Base-ref rules:

1. If no argument is provided, use `origin/main`.
2. If the argument is `--base=<ref>`, use `<ref>` exactly.
3. If the argument already starts with `origin/`, `refs/`, or `HEAD`, use it exactly.
4. Otherwise treat the argument as a remote branch name and use `origin/<argument>`.
5. For an exact commit SHA or arbitrary ref, use `--base=<ref>`.

Examples:

```text
pr-human-review                 # base ref: origin/main
pr-human-review main            # base ref: origin/main
pr-human-review develop         # base ref: origin/develop
pr-human-review release/1.4     # base ref: origin/release/1.4
pr-human-review origin/develop  # base ref: origin/develop
pr-human-review --base=abc1234  # base ref: abc1234
```

Do not silently change the base ref. If the selected base ref does not exist, show the failing ref and likely available alternatives from `git branch -r`, then ask for a corrected invocation.

## Default behaviour on invocation

When this skill is invoked, immediately do the following unless the human explicitly asks for a different mode:

1. Determine the base ref from the invocation contract.
2. Determine the merge-base commit with `git merge-base <base-ref> HEAD`.
3. Determine the current head with `git rev-parse HEAD`.
4. Determine the current branch with `git rev-parse --abbrev-ref HEAD`.
5. Create or reuse local state under `.agents/reviews/`.
6. Build the diff map and risk register.
7. Show the first batch of highest-risk review cards.
8. End the card batch with a visible `How to answer` menu.
9. Do not patch code until the human explicitly approves a fix.

The first human-facing result after startup should normally be review cards, not a broad explanation of the workflow.

## Prompt discipline

- Keep prompts to subagents and humans simple, direct, and delimited with headings or fenced blocks.
- State the role, inputs, expected output files, and success criteria for each delegated task.
- Pass raw evidence and current state, not conclusions that would bias the role.
- Keep large diffs, command output, and generated artifacts in session files. Pass paths plus focused snippets to subagents instead of pasting full artifacts into the parent context.
- Prefer subagents for role-specific analysis when available so the parent context keeps only orchestration state, human decisions, and concise summaries.
- Ask for one human decision per card. In batches, make each card independently answerable.
- Do not ask for chain-of-thought or hidden reasoning. Ask for conclusions, evidence, commands run, and unresolved uncertainty.
- Explain major tool use briefly before running it, then record results in session files before asking the next question.

## Goal

Review a branch with minimal human effort while preserving human judgement.

The review is an interactive loop:

1. Map the diff.
2. Categorise risk.
3. Ask the human focused questions using small review cards.
4. Capture feedback.
5. Convert feedback into scoped candidate rules.
6. Search for similar cases.
7. Apply only approved changes.
8. Verify and produce an audit trail.

## Non-negotiable constraints

- Do not install packages or tools.
- Use only local repository files, git, shell commands already available, and files created under `.agents/reviews/`.
- Do not patch code until the human explicitly approves a fix.
- Do not silently generalise one comment into broad edits.
- Always record review state locally.
- Always re-review agent-generated patches before marking the review complete.
- Prefer concrete snippets and exact questions over broad summaries.
- Review branch-introduced risk first. Do not turn review into unrelated cleanup.

## State location

Create or reuse:

```text
.agents/reviews/<safe-branch>/sessions/<base-short>..<head-short>/
```

Branch-level aggregation:

```text
.agents/reviews/<safe-branch>/branch-learnings.md
.agents/reviews/<safe-branch>/branch-rejected-rules.md
```

Durable project rules:

```text
.agents/review-rules/project-review-rules.md
.agents/review-rules/rejected-review-rules.md
```

## Session bootstrap

Resolve base ref using the invocation contract. Then determine the merge-base commit:

```bash
git merge-base <base-ref> HEAD
```

Determine head:

```bash
git rev-parse HEAD
```

Determine branch:

```bash
git rev-parse --abbrev-ref HEAD
```

Sanitise the branch name for a path by replacing slashes, whitespace, and punctuation with `-`.

Create the session directory and these files:

```text
metadata.json
changed-files.txt
diff-map.md
risk-register.md
session.jsonl
findings.jsonl
coverage.md
human-feedback.md
candidate-rules.md
similar-sweep.md
fix-plan.md
verification.md
final-report.md
cards/
```

Append a `session_started` event to `session.jsonl`.

`metadata.json` must record:

```json
{
  "base_ref": "origin/main",
  "base_sha": "<merge-base-sha>",
  "head_sha": "<head-sha>",
  "branch": "<current-branch>",
  "safe_branch": "<safe-branch>",
  "status": "active",
  "patch_without_explicit_approval": false
}
```

## Required initial evidence

Collect and write evidence from:

```bash
git status --short
git diff --name-status --find-renames BASE...HEAD
git diff --numstat --find-renames BASE...HEAD
git diff --stat --find-renames BASE...HEAD
git diff --find-renames --unified=80 BASE...HEAD
```

Use the merge-base SHA as `BASE`. If the diff is too large, store only the summary files and inspect per-file diffs on demand. Do not flood the human.

## Role delegation

If subagents are available:

1. Send changed file evidence to `pr-review-diff-cartographer`.
2. Send the cartography result to `pr-review-card-questioner`.
3. When the human gives feedback, send it to `pr-review-feedback-generalizer`.
4. Send approved candidate rules to `pr-review-similarity-sweeper`.
5. Send approved fixes to `pr-review-fix-applier`.
6. Send final state to `pr-review-verifier-reporter`.

Delegation boundaries:

- Give each subagent one role, the session directory path, relevant file paths, and the smallest needed snippets.
- Ask subagents to write their outputs to the required session files and return only changed file paths, IDs created, commands run, and blocking uncertainty.
- Do not broadcast the full unified diff to every subagent. Store it once, then pass targeted hunks by cluster or card.
- Keep the parent agent responsible for human interaction, approvals, sequencing, and final integration.

If subagents are not available, execute those roles yourself using the corresponding skill instructions.

## Review loop

Show 3-5 review cards at a time. Prioritise:

1. Critical risk.
2. High risk.
3. Broad semantic changes.
4. Changes without tests.
5. Repeated patterns.
6. Medium and low risk.

After showing cards, always include a compact reply menu. The human should never have to infer the command syntax.

## Human response protocol

Use short aliases, but only when unambiguous.

For a single active card, accept these replies:

```text
y | yes | accept
n: <reason> | reject: <reason>
change: <instruction> | needs-change: <instruction>
gen: <scope/instruction> | generalise: <scope/instruction>
skip: <reason>
clarify: <question>
more
next
stop
```

For a batch of cards, require a card ID or visible number:

```text
R-0001 y
1 y
R-0002 n: <reason>
2 reject: <reason>
R-0003 change: <instruction>
3 gen: <scope/instruction>
R-0004 skip: <reason>
R-0004 clarify: <question>
all y
more R-0002
focus <file/category>
next
stop
```

If the human replies with bare `y`, `n`, `change`, `gen`, `skip`, or `clarify` while multiple cards are active, do not guess. Ask which card the response applies to and repeat the batch menu.

Every candidate rule, similarity sweep, fix plan, and final report must also end with explicit options. Use `templates/reply-menu.md` as the canonical menu.

Recognise these canonical commands and aliases:

```text
accept R-0001                         # alias: R-0001 y, 1 y
reject R-0001: <reason>               # alias: R-0001 n: <reason>
needs-change R-0001: <instruction>    # alias: R-0001 change: <instruction>
generalise R-0001: <scope/instruction># alias: R-0001 gen: <scope/instruction>
skip R-0001: <reason>
clarify R-0001: <question>            # alias: R-0001 clarify: <question>
all y                                 # accept all cards in the current visible batch
more R-0001                           # show more context
show next                             # alias: next
focus <file/category>
stop
final report
```

For every human response:

1. Append an event to `session.jsonl`.
2. Update the card file.
3. Update `human-feedback.md`.
4. Update `findings.jsonl` if the feedback identifies a real issue.
5. If the feedback might apply elsewhere, create a candidate rule.
6. Search similar cases only after creating a scoped candidate rule.
7. Ask for confirmation before broad application.

Clarification responses are not decisions. If the human asks `clarify`, answer using the card, focused diff, nearby code, tests, and recorded evidence. Keep the card pending, append `clarification_requested` and `clarification_answered` events, do not create a finding or candidate rule, then repeat the card's answer menu.

## Review card requirements

Each card must include:

- ID, status, risk, confidence, cluster.
- Files and line ranges.
- Why this card exists.
- The exact question for the human.
- A focused snippet.
- Behavioural context.
- Test or verification evidence.
- Possible similar areas.
- Suggested feedback commands and aliases.
- A visible `How to answer` section after every card or batch.

Bad card:

```text
This file changed a lot. Please review it.
```

Good card:

```text
R-0007 asks whether a new early return changes recoverable error accumulation in streaming validation.
```

## Rule promotion policy

Promote a rule to `.agents/review-rules/project-review-rules.md` only when:

- the human explicitly approves promotion; or
- the same feedback appears repeatedly and the human accepts the candidate rule; and
- the rule has clear scope, non-scope, examples, and verification.

Rejected generalisations go into:

```text
.agents/review-rules/rejected-review-rules.md
```

## Patch policy

Never patch from assumption alone.

Before editing:

1. Write `fix-plan.md`.
2. Explain which cards/findings will be fixed.
3. State files to edit.
4. State verification commands.
5. Obtain explicit approval unless the human already gave a direct edit instruction.

After editing:

1. Run relevant checks.
2. Append `patch_applied` and `checks_run` events.
3. Create review cards for the patch if behaviour changed.
4. Do not mark those cards accepted automatically.

## Completion criteria

The review is complete only when:

- all critical/high-risk clusters are accepted, rejected, skipped, fixed, or deferred;
- all human feedback has a recorded resolution;
- accepted generalisations were searched across the branch;
- no unreviewed agent patch remains;
- verification was run or explicitly skipped with reason;
- `final-report.md` exists and includes coverage, findings, rules learned, rejected rules, and residual risk.

## Final report structure

```text
# Final Review Report

Base ref:
Base commit:
Head:
Branch:
Session:
Status:

## Coverage

## Human decisions

## Findings

## Fixes applied

## Similarity sweeps

## Rules learned

## Rejected generalisations

## Verification

## Residual risk

## Recommended next review focus
```
