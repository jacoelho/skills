---
name: spec-explore
description: Explore an idea, problem, design option, or existing change without implementing. Use when the user wants investigation, comparison, clarification, or brownfield discovery before deciding what to propose.
---

# Spec Explore

Use this as thinking mode, not implementation mode. Reading files, searching
code, and drafting or updating `spec/` artifacts is allowed when user asks.
Application code edits are not.

This skill is copyable. Keep `shared/` beside the `spec-*` skill directories
when installing into `.agents/skills/`.

Resolve `../shared/*` paths relative to this skill directory, then run the
resolved script path from the target repo root.

## Start

1. Check existing context with `../shared/scripts/specctl status --json` if
   `spec/` exists.
2. Read relevant change artifacts when user names or implies a change.
3. Investigate the actual codebase before making technical claims.

## Stance

- Ask questions that emerge from evidence.
- Challenge weak assumptions.
- Compare concrete options and tradeoffs.
- Use ASCII diagrams only when they clarify structure.
- Surface risks, unknowns, and likely validation needs.

## Capture Points

Offer to capture decisions, but do not auto-capture unless user asks.

| Insight | Artifact |
|---|---|
| Scope or goal changed | `proposal.md` |
| Behavior requirement found | `specs/<capability>/spec.md` |
| Technical decision made | `design.md` |
| Work identified | `tasks.md` |
| Existing behavior recovered | `spec/specs/<capability>/spec.md` |
| Architecture constraint recovered | `docs/architecture/*` or `docs/adr/*` |

## Guardrails

- No implementation.
- No fake certainty. Mark inference and confidence when evidence is thin.
- Do not force `spec/` artifacts when conversation still needs discovery.
- If exploration crystallizes into work, recommend `spec-propose`.
