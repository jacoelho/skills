---
name: spec-apply
description: Implement pending tasks from a spec/ change. Use when the user wants to apply, continue, or complete implementation for spec/changes/<change-id>.
---

# Spec Apply

Implement tasks from one `spec/` change.

This skill is copyable. Keep `shared/` beside the `spec-*` skill directories
when installing into `.agents/skills/`.

Resolve `../shared/*` paths relative to this skill directory, then run the
resolved script path from the target repo root.

## Workflow

1. Select change:
   - Use user-provided change id.
   - Else infer only when unambiguous.
   - Else run `../shared/scripts/specctl status --json` and ask.
2. Run `../shared/scripts/specctl validate <change-id>` before editing.
3. Read all context:
   - `proposal.md`
   - `design.md`
   - `tasks.md`
   - all delta specs under `specs/*/spec.md`
   - relevant current specs, ADRs, architecture docs, source, and tests
4. Work through pending tasks in order unless dependencies say otherwise.
5. For each task:
   - Add/update tests first when practical.
   - Implement smallest correct change.
   - Run targeted validation.
   - Mark only completed task checkbox from `[ ]` to `[x]`, or set only that
     task's `Status:` to `completed` for `### TASK-*` plans.
6. If implementation contradicts proposal/spec/design, stop and update artifacts
   before continuing.
7. At pause or completion, run relevant tests and
   `../shared/scripts/specctl validate <change-id>`.

## Guardrails

- Do not implement future tasks.
- No unrelated refactors.
- No placeholder behavior.
- Do not weaken tests.
- Do not change public API unless task and spec require it.
- Preserve brownfield behavior unless explicitly changed.
- If a new architectural decision is required, draft or update ADR before code.

## Task Formats

Support both:
- `- [ ] 1.1 Task` / `- [x] 1.1 Task`
- `### TASK-001: Task` with `Status: pending|completed`

## Final Response

Report:
- change id
- tasks completed
- files changed
- requirements covered
- validation run, exact command and result
- remaining risks and next task
