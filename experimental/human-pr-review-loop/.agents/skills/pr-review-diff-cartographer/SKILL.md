---
name: pr-review-diff-cartographer
description: Convert a branch or PR diff into a semantic risk map and review plan. Use when Codex needs to classify changed files, group behavioural clusters, score review risk, record coverage, and propose high-value review-card candidates without editing code.
---

# PR Review Diff Cartographer

Use this skill to convert a branch diff into a risk map and review plan.

This skill does not patch code. It writes analysis for the `pr-human-review` main skill.

## Inputs

- Base SHA/ref.
- Head SHA/ref.
- Changed file list.
- Diff stat and numstat.
- Relevant unified diffs.
- Existing project review rules, if present.
- Branch learnings, if present.

## Outputs

Write or update:

```text
.agents/reviews/<safe-branch>/sessions/<base>..<head>/diff-map.md
.agents/reviews/<safe-branch>/sessions/<base>..<head>/risk-register.md
.agents/reviews/<safe-branch>/sessions/<base>..<head>/coverage.md
```

## Evidence discipline

- Separate inputs with clear headings or fenced blocks when this role is delegated.
- Prefer explicit facts from git output, code snippets, and tests over inferred intent.
- Mark uncertainty plainly instead of filling gaps with guesses.
- Do not ask for or emit chain-of-thought. Output findings, evidence, risk, and next review-card candidates.
- Treat generated, vendored, and mechanical-looking changes as unproven until source or command evidence confirms them.

## Classification model

Classify each changed area into one or more clusters:

- security/auth/permissions
- persistence/migrations/data-loss
- public API/contract
- parsing/validation/serialisation
- error handling/diagnostics
- concurrency/state/cache/lifecycle
- performance/allocation/hot path
- dependency/config/build/CI
- tests/fixtures
- mechanical rename/format/generated/docs

## Risk scoring

Use this scale:

```text
critical: could cause security breach, data loss, broken public contract, production outage, or silent corruption
high: meaningful behaviour change, correctness risk, concurrency/state risk, missing tests around changed semantics
medium: local behaviour change with bounded blast radius
low: mechanical, docs, formatting, test-only, generated, or low-semantic impact
```

Escalate risk when:

- public API behaviour changes;
- error handling changes;
- validation/parsing logic changes;
- state lifetime or cache invalidation changes;
- concurrency or shared mutable state changes;
- tests were removed or narrowed;
- change is broad but described as mechanical;
- generated-looking code was hand-edited;
- a pattern repeats across files.

Reduce risk when:

- change is generated and source generator is unchanged;
- tests clearly encode the changed behaviour;
- change is a pure rename verified by references;
- change is isolated to documentation or comments.

## Diff map format

```text
# Diff Map

Base:
Head:
Branch:

## Summary

## Changed files

| File | Status | Lines +/- | Primary cluster | Risk | Notes |

## Behavioural clusters

### Cluster C-0001: <name>

Risk:
Files:
Symbols:
Changed behaviour:
Old behaviour:
Potential breakage:
Test evidence:
Missing evidence:
Recommended review cards:

## Mechanical changes

## Generated or vendored changes

## Files needing human attention

## Files probably safe to batch-skip
```

## Coverage format

```text
# Review Coverage

## Unreviewed clusters

## Shown cards

## Human-reviewed files

## Skipped files with reason

## Agent-patched files requiring re-review
```

## Instructions

- Prefer semantic clusters over file-by-file summaries.
- Do not assume a large diff is high risk if it is mechanical; prove or classify uncertainty.
- Do not assume a small diff is low risk if it touches validation, auth, persistence, or state.
- Identify repeated patterns that may benefit from one human decision and a similarity sweep.
- Return the highest-value review-card candidates to `pr-human-review`.
