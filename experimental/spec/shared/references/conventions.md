# Spec Conventions

Use `spec/`, not `openspec/`.

```text
spec/
|-- specs/
|   `-- <capability>/spec.md
`-- changes/
    |-- <change-id>/
    |   |-- .spec.yaml
    |   |-- proposal.md
    |   |-- design.md
    |   |-- tasks.md
    |   `-- specs/<capability>/spec.md
    `-- archive/YYYY-MM-DD-<change-id>/
```

Current specs in `spec/specs/` describe deployed behavior. Change specs in
`spec/changes/<change>/specs/` are deltas only.

Brownfield repos may already have a top-level `spec/` for product docs,
protocol specs, fixtures, or standards text. Preserve those files. This workflow
owns only `spec/specs/`, `spec/changes/`, and `spec/config.yaml`.
`spec/config.yaml` stores project workflow config. It is not a schema name.
Use `schema: spec-driven` in change metadata unless another schema name is
explicitly configured.

Delta sections:
- `## ADDED Requirements`
- `## MODIFIED Requirements`
- `## REMOVED Requirements`
- `## RENAMED Requirements`

Requirement format:

```markdown
### Requirement: Name
The system SHALL ...

#### Scenario: Main case
- **WHEN** ...
- **THEN** ...
```

Trackable task formats:
- Numbered checkbox style: `- [ ] 1.1 Do the thing` / `- [x] 1.1 Do the thing`.
- Brownfield task style: `### TASK-001: Do the thing` with `Status: pending`
  or `Status: completed`.

Rules:
- Behavior in specs, implementation choices in `design.md`, execution in `tasks.md`.
- `MODIFIED` requirements must include the full updated requirement block.
- Use `MODIFIED` and `REMOVED` only for requirement headers already present in
  `spec/specs/<capability>/spec.md`; otherwise use `ADDED`.
- Omit empty delta sections. Never write `### Requirement: None`.
- Do not include a literal `Replace with:` line inside `MODIFIED`
  requirements.
- Do not include placeholder requirements such as `None`, `N/A`, or angle-bracket
  examples in final artifacts.
- `REMOVED` requirements need reason and migration when relevant.
- Header text after `### Requirement:` is the requirement identity.
- Each requirement needs at least one `#### Scenario:`.
- Prefer concise specs with testable scenarios.
- Preserve existing behavior unless a proposal explicitly changes it.
