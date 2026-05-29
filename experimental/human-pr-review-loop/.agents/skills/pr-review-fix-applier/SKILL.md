---
name: pr-review-fix-applier
description: Apply only human-approved fixes from a PR review loop. Use when Codex has an approved finding, rule, or fix plan and must make the smallest scoped code change, update review state, run checks, and create follow-up review cards for agent patches.
---

# PR Review Fix Applier

Use this skill to apply human-approved fixes discovered during the review loop.

This skill is intentionally conservative.

## Inputs

- Approved finding or candidate rule.
- Human instruction approving the fix.
- Files to edit.
- Similarity sweep result, if any.
- Verification plan.

## Outputs

Update:

```text
fix-plan.md
findings.jsonl
session.jsonl
coverage.md
verification.md
cards/
```

Edit production/test files only when approved.

## Prompt discipline

- Treat the approved finding or rule as the boundary of the task.
- State non-goals and verification commands before editing.
- Keep patches small and behaviour-focused. Avoid opportunistic cleanup.
- Report command results and exact failures; do not explain hidden reasoning.
- If approval text is ambiguous, ask for the finding, rule, or card ID before touching files.

## Before editing

Write a fix plan:

```text
# Fix Plan

Approved by:
Source cards:
Source findings:
Files to edit:
Non-goals:
Expected behaviour after fix:
Verification commands:
Rollback note:

## How to answer this fix plan

- `approve-fix F-0001` or `approve-plan` — apply the proposed patch.
- `change-plan F-0001: <instruction>` — revise the plan before editing.
- `comments-only F-0001` — create review comments instead of patching.
- `reject-fix F-0001: <reason>` — do not apply this fix.
- `defer F-0001: <reason>` — leave unresolved for now.
```

Do not bundle unrelated cleanup.

## Approval protocol

A patch is approved only by an explicit fix-plan command such as `approve-fix F-0001`, `approve-plan`, or an equally direct human instruction.

`y` is not enough to approve a patch when several findings, rules, or cards are active. Ask for the finding/rule/card ID before editing.

## Editing rules

- Fix only the approved issue.
- Prefer the smallest semantic change that satisfies the human feedback.
- Preserve public API unless the human approved API change.
- Preserve existing style unless the feedback is about style.
- Add or update tests when behaviour changes and a reasonable test seam exists.
- Do not hide uncertainty by adding broad comments.
- Do not suppress errors to make checks pass.

## After editing

Run relevant checks.

For Go, prefer:

```bash
go test ./...
go vet ./...
```

For targeted changes, also run focused tests when available.

Append events:

```json
{"type":"patch_applied","cards":["R-0001"],"files":["path/file.go"]}
{"type":"checks_run","command":"go test ./...","status":"passed|failed|skipped"}
```

## Re-review requirement

Any agent patch that changes behaviour must create at least one follow-up review card.

The follow-up card asks:

```text
Does this patch correctly implement the approved feedback without changing unrelated behaviour?
```

Do not mark the follow-up accepted automatically.
