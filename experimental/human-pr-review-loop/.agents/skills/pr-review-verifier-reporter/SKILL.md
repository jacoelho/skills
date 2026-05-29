---
name: pr-review-verifier-reporter
description: Verify and close a human PR review loop. Use when Codex needs to audit session files, confirm unresolved cards, findings, sweeps, patches, checks, and promoted rules, then write a final review report with residual risk and next commands.
---

# PR Review Verifier Reporter

Use this skill to close or summarise a review session.

It verifies that the review loop has an auditable result, not just a chat transcript.

## Inputs

- metadata.json
- diff-map.md
- risk-register.md
- coverage.md
- session.jsonl
- findings.jsonl
- human-feedback.md
- candidate-rules.md
- similar-sweep.md
- fix-plan.md
- verification.md
- card files

## Outputs

Write:

```text
final-report.md
```

Update:

```text
metadata.json
.agents/reviews/index.jsonl
.agents/reviews/<safe-branch>/branch-learnings.md
.agents/review-rules/project-review-rules.md
.agents/review-rules/rejected-review-rules.md
```

Only update durable project rules if the human approved promotion.

## Prompt discipline

- Report status from session artifacts, not chat memory alone.
- Use exact file paths, card IDs, rule IDs, finding IDs, and command results.
- Keep the executive result short and decision-oriented.
- State skipped checks and residual risk plainly.
- Do not ask for hidden reasoning; ask for the next explicit review command.

## Verification checks

Confirm:

- all critical/high-risk cards have decisions;
- all human feedback has a resolution;
- all accepted candidate rules had similarity sweeps;
- all patches were re-reviewed or are explicitly marked pending;
- relevant checks were run or skipped with reason;
- residual risk is stated plainly.

## Final report format

```text
# Final Review Report

Base:
Head:
Branch:
Session directory:
Status: complete | incomplete | stopped-by-human | blocked

## Executive review result

<One paragraph. State whether this branch is review-clean, review-incomplete, or has unresolved issues.>

## Coverage

- Changed files:
- Changed clusters:
- Cards created:
- Cards shown:
- Critical/high cards resolved:
- Skipped areas and reasons:

## Human decisions

| Card | Decision | Summary |

## Findings

| Finding | Risk | Status | Files | Summary |

## Fixes applied

## Similarity sweeps

## Rules learned

## Rejected generalisations

## Verification

| Command | Result | Notes |

## Residual risk

## Suggested next review focus

## How to answer this report

- `complete` — accept the review status as final.
- `continue high` — continue with unresolved high-risk areas.
- `continue all` — continue until all cards are resolved.
- `show unresolved` — list remaining findings, cards, and risks.
- `export comments` — prepare PR-review comments from accepted findings.
- `stop` — stop and keep the report as incomplete or stopped-by-human.
```

## Completion status rules

Use `complete` only when completion criteria are met.

Use `incomplete` when review remains useful but unresolved areas exist.

Use `stopped-by-human` when the human says stop before completion.

Use `blocked` when the repository state prevents reliable review.
