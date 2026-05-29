---
name: spec-sync
description: Sync delta specs from spec/changes/<change-id>/specs into current specs under spec/specs without archiving. Use after implementation or when main specs need to reflect accepted change behavior.
---

# Spec Sync

Sync change deltas into current specs while leaving the change active.

This skill is copyable. Keep `shared/` beside the `spec-*` skill directories
when installing into `.agents/skills/`.

Resolve `../shared/*` paths relative to this skill directory, then run the
resolved script path from the target repo root.

## Workflow

1. Select change id. If ambiguous, run `../shared/scripts/specctl status --json`
   and ask.
2. Read `../shared/references/conventions.md`.
3. Read delta specs under `spec/changes/<change-id>/specs/*/spec.md`.
4. Read matching current specs under `spec/specs/<capability>/spec.md`.
5. Run `../shared/scripts/specctl sync <change-id>`.
6. Inspect updated specs for correctness and idempotence.
7. Run `../shared/scripts/specctl validate <change-id>`.

## Merge Semantics

- `ADDED`: append new requirement, or replace identical existing header if it is
  already present.
- `MODIFIED`: replace matching current requirement with full delta block.
- `REMOVED`: remove matching current requirement.
- `RENAMED`: rename header first, then apply modifications against new name.

## Guardrails

- Do not choose code over spec silently. Record drift when evidence conflicts.
- Preserve current spec content not mentioned by delta.
- Stop on missing modified/removed requirements; do not invent matches.
- Do not archive; use `spec-archive` after sync if requested.
