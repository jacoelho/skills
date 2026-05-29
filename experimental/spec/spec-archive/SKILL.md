---
name: spec-archive
description: Finalize and archive a completed spec/ change. Use when the user wants to archive spec/changes/<change-id> after implementation and spec sync are ready.
---

# Spec Archive

Archive a completed change to `spec/changes/archive/YYYY-MM-DD-<change-id>/`.

This skill is copyable. Keep `shared/` beside the `spec-*` skill directories
when installing into `.agents/skills/`.

Resolve `../shared/*` paths relative to this skill directory, then run the
resolved script path from the target repo root.

## Workflow

1. Select change id. If ambiguous, run `../shared/scripts/specctl status --json`
   and ask.
2. Run `../shared/scripts/specctl validate <change-id>`.
3. Read `tasks.md`; if checkbox tasks or `TASK-*` statuses are incomplete, ask
   before using `--yes`.
4. Assess whether delta specs are synced:
   - read delta specs and current specs
   - if unsynced, run `../shared/scripts/specctl sync <change-id>` or ask if
     user wants `--skip-sync`
5. Archive:
   - complete tasks: `../shared/scripts/specctl archive <change-id>`
   - incomplete but approved: `../shared/scripts/specctl archive <change-id> --yes`
   - already synced or intentionally skipped: add `--skip-sync` as needed
6. Report archive path, sync status, warnings, and validation run.

## Guardrails

- Do not archive unvalidated changes unless user explicitly asks.
- Do not overwrite existing archives.
- Do not hide incomplete tasks or skipped sync.
- Preserve archived change directory exactly by moving it.
- If sync fails, fix spec deltas or current specs before archiving.
