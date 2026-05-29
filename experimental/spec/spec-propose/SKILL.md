---
name: spec-propose
description: Create a complete spec/ change proposal with proposal, delta specs, design, and tasks. Use when the user wants to propose, plan, or scope a code change before implementation, including brownfield repos.
---

# Spec Propose

Standalone proposal workflow using `spec/` paths.

This skill is copyable. Keep `shared/` beside the `spec-*` skill directories
when installing into `.agents/skills/`.

Resolve `../shared/*` paths relative to this skill directory, then run the
resolved script path from the target repo root.

## Workflow

1. Restate goal, constraints, invariants, and failure modes.
2. Run `../shared/scripts/specctl init` if `spec/specs/`, `spec/changes/`,
   or `spec/config.yaml` is missing.
3. Derive or ask for a kebab-case change id. Do not proceed without a clear
   change.
4. Run `../shared/scripts/specctl new <change-id>`.
   - Use default schema unless user explicitly provides a schema name such as
     `spec-driven`.
   - Do not pass `spec/config.yaml` as a schema value.
5. Read relevant current context:
   - `AGENTS.md`, README, docs, manifests, tests, relevant source
   - `docs/architecture/*` and `docs/adr/*` if present
   - `spec/specs/*/spec.md` for affected capabilities
   - other existing `spec/` files only as brownfield project evidence, not as
     workflow-owned artifacts
6. Replace scaffolded artifacts:
   - `spec/changes/<change-id>/proposal.md`
   - `spec/changes/<change-id>/specs/<capability>/spec.md`
   - `spec/changes/<change-id>/design.md`
   - `spec/changes/<change-id>/tasks.md`
7. Run `../shared/scripts/specctl validate <change-id>`.
8. Report files changed, validation result, and readiness for `spec-apply`.

## Artifact Rules

Read `../shared/references/conventions.md` when writing specs or merging deltas.

`proposal.md`:
- Why
- What Changes
- Capabilities: new and modified
- Impact
- Compatibility and explicit non-goals when brownfield behavior may be affected

Delta specs:
- One file per affected capability: `specs/<capability>/spec.md`.
- Use `ADDED`, `MODIFIED`, `REMOVED`, `RENAMED` sections.
- Omit empty delta sections; never write `### Requirement: None`.
- Use `MODIFIED` and `REMOVED` only for requirements already present in
  `spec/specs/<capability>/spec.md`; otherwise use `ADDED`.
- Every added/modified requirement has at least one scenario.
- Modified requirements include full replacement requirement block.

`design.md`:
- Current state and evidence
- Goals / non-goals
- Decisions and alternatives
- Risks / trade-offs
- Migration plan when relevant
- Open questions

`tasks.md`:
- Numbered checkbox tasks: `- [ ] 1.1 ...`
- Small implementation slices.
- Include tests before or with implementation.
- Include validation commands from repo evidence.

## Brownfield Discipline

- Preserve existing behavior unless proposal explicitly changes it.
- Do not invent current behavior. Cite files, tests, docs, commands, or code.
- Label facts, observations, inferences, and unknowns when evidence is weak.
- If current state is too unclear for a safe proposal, switch to `spec-bootstrap`
  or create a narrow exploration artifact before proposing.
