---
name: typescript-best-practices
description: Write or review TypeScript type contracts, runtime validation, asynchronous code, and module configuration across projects and frameworks.
metadata:
  upstream: jwynia/agent-skills
  upstream-author: agent-skills
  upstream-commit: e02ec7e226a6e4f8419fd3b88a1d8e472d421b32
  comparison-source: cursor/plugins/pstack
  comparison-commit: d7cde2b84eadbcd6fd890302c876f4436ccb6d82
---

# TypeScript best practices

Apply this guidance to the requested change. Keep reviews read-only unless edits are requested. Explicit user instructions and project contracts take precedence over these defaults.

Establish the selected TypeScript version, runtime, active configuration, and available checks from project files. If they are absent, report that limit; this skill does not authorise installing a runtime, scaffolding modules, or choosing dependencies. Use the applicable framework's guidance for compiler extensions, templates, reactivity, and integration-specific behaviour.

## Read for the affected concern

| Concern | Reference |
| --- | --- |
| External data, narrowing, brands, state/collection invariants, ownership, inference | [Types and boundaries](references/types-and-boundaries.md) |
| Errors, retries, cancellation, deadlines, concurrency | [Asynchronous behaviour](references/async-and-errors.md) |
| Compiler settings, imports, package boundaries, emitted code | [Modules and configuration](references/modules-and-config.md) |

Keep types aligned with the owning contract. A new interface, class, `Result` type, generic utility, or service abstraction needs a concrete consumer; it is not required simply because a template contains one.

## Completion

Use the project's configured type check and affected behaviour tests in proportion to the change. Verify runtime boundary and asynchronous failure behaviour where types alone cannot establish correctness. Report executed checks and evidence limits; do not substitute style heuristics for compiler or runtime evidence.
