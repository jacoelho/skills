# Human PR Review Loop Prompt Pack

A standalone prompt/skill collection for human-in-the-loop review of a branch or PR.

No npm. No service. No external review product. The agent uses the repository, `git`, normal shell commands, and files it creates under `.agents/reviews/`.

## Main entrypoint

Use this skill:

```text
pr-human-review
```

No bootstrap prompt should be necessary. Calling the skill starts the default workflow:

1. Use `origin/main` as the default base ref.
2. Create or reuse local state under `.agents/reviews/`.
3. Build a diff map and risk register.
4. Show the first batch of review cards.
5. Include a `How to answer` menu.
6. Refuse to patch code until the human explicitly approves a fix.

## Invocation

```text
pr-human-review
pr-human-review <base-branch>
pr-human-review origin/<base-branch>
pr-human-review --base=<ref>
```

Base-ref rules:

| Invocation | Base ref used |
|---|---|
| `pr-human-review` | `origin/main` |
| `pr-human-review main` | `origin/main` |
| `pr-human-review develop` | `origin/develop` |
| `pr-human-review release/1.4` | `origin/release/1.4` |
| `pr-human-review origin/develop` | `origin/develop` |
| `pr-human-review --base=abc1234` | `abc1234` |

The skill then computes the actual diff base with:

```bash
git merge-base <base-ref> HEAD
```

If the selected base ref does not exist, the agent should show the failing ref and likely alternatives from `git branch -r`. It should not silently fall back to a different base.

## What this does

The workflow turns review into a loop:

1. Map the branch diff.
2. Categorise risk.
3. Show small review cards to the human.
4. Capture feedback as local review state.
5. Generalise feedback into scoped candidate rules.
6. Search the branch for similar cases.
7. Apply only approved fixes.
8. Re-review agent changes.
9. Produce a final review ledger.

The review state is local and auditable. It is intentionally boring: Markdown, JSONL, and normal git output.

## Pack layout

Skill directories live directly under this folder:

```text
human-pr-review-loop/
  pr-human-review/
  pr-review-diff-cartographer/
  pr-review-card-questioner/
  pr-review-feedback-generalizer/
  pr-review-similarity-sweeper/
  pr-review-fix-applier/
  pr-review-verifier-reporter/
```

Default review-rule seeds belong to the main skill:

```text
pr-human-review/references/review-rules/
```

## Runtime directory model

The main skill creates this structure inside the reviewed repository:

```text
.agents/reviews/
  index.jsonl
  <safe-branch>/
    branch-learnings.md
    branch-rejected-rules.md
    sessions/
      <base-short>..<head-short>/
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
          R-0001.md
          R-0002.md
```

Reusable, accepted rules can be promoted into:

```text
.agents/review-rules/project-review-rules.md
.agents/review-rules/rejected-review-rules.md
```

If those files do not exist, `pr-human-review` seeds them from `pr-human-review/references/review-rules/`.

## How to use with a skill-aware agent

Copy the skill directories into the agent's skill location or expose this folder as a skill source. No pack-level `.agents/` directory is required.

Then invoke:

```text
pr-human-review
```

For a PR targeting another base branch:

```text
pr-human-review develop
```

For an exact base ref or commit:

```text
pr-human-review --base=abc1234
```

Named skills are the supported path. There is no separate long-form bootstrap prompt.

## Human response menus

Every human-facing review message should include a compact answer menu so the reviewer knows exactly how to respond. The reviewer may use short aliases, but the agent must avoid guessing.

Single-card shorthand:

```text
y                         # accept the currently shown single card
n: <reason>               # reject the concern
change: <instruction>     # request a local change
gen: <scope/instruction>  # create a candidate rule and search similar cases
skip: <reason>            # mark out of scope
clarify: <question>       # ask for explanation or evidence before deciding
more                      # show more context
next                      # show the next card or batch
stop                      # stop and write current status
```

Batch shorthand requires a card ID or visible number:

```text
R-0001 y
1 y
R-0002 change: preserve accumulated errors
3 gen: apply this to validation runtime code only
R-0004 clarify: what caller path reaches this branch?
all y
more R-0002
focus internal/runtime
```

Bare `y` or `n` is valid only when exactly one card is active. In a batch, the agent should ask for the card ID instead of guessing.

## Human feedback commands

Use terse commands while reviewing cards:

```text
accept R-0001
reject R-0002: this is intentional because ...
needs-change R-0003: preserve accumulated errors; do not return after first recoverable validation error
generalise R-0003: apply this to validation runtime code, not compile-time parser errors
clarify R-0003: where is this error recovered?
skip R-0004: generated code
show next
focus internal/runtime
stop
final report
```

Clarification is not a decision. The agent answers from code, diff, tests, and recorded evidence, keeps the card pending, records the clarification events, then shows the answer menu again.

## Subagent-compatible, but not subagent-dependent

The skills are split into roles:

- `pr-human-review`: owns the loop, invocation defaults, local state, and human interaction.
- `pr-review-diff-cartographer`: maps the branch into risk clusters.
- `pr-review-card-questioner`: creates review cards.
- `pr-review-feedback-generalizer`: converts feedback into scoped candidate rules.
- `pr-review-similarity-sweeper`: searches for similar cases.
- `pr-review-fix-applier`: applies approved patches only.
- `pr-review-verifier-reporter`: reruns checks and writes the final ledger.

If the agent supports subagents, `pr-human-review` delegates role-specific work to them. The parent agent keeps orchestration, human approval, and final integration.

To minimise context load:

- Store large diffs, command output, and generated artifacts in `.agents/reviews/`.
- Pass subagents session paths, relevant file paths, and focused snippets instead of whole diffs.
- Ask subagents to write outputs to session files and return only changed paths, IDs created, commands run, and unresolved uncertainty.
- Do not send every artifact to every role.

If subagents are unavailable, the same agent runs the roles sequentially with the same file-backed boundaries.

## Design principle

Do not ask the human to review every changed line equally. Ask the human to validate high-value hypotheses, then use their feedback to search the branch.

This is closer to testing equivalence classes than reading a diff linearly.
