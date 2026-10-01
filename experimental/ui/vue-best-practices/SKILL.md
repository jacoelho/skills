---
name: vue-best-practices
description: Write, review, or debug Vue 3 components, composables, and their TypeScript, template checking, and tests. Use for Vue frontend work, not unrelated TypeScript or backend changes.
metadata:
  upstream: ejirocodes/agent-skills
  upstream-commit: 6e805e4cc8a4378444c791d4a08e304347152bd0
  comparison-source: vuejs-ai/skills
  comparison-commit: c9d355ff23f654309dd02006be671859df0a134c
---

# Vue and TypeScript best practices

Apply the guidance to the requested frontend change. A review remains read-only unless changes are requested. Explicit user instructions and project contracts take precedence over these defaults.

Use the package manifest, lockfile, and active TypeScript configuration to establish supported APIs and available checks. If they do not exist, state that versions and checks are unconfigured; examples here do not establish installed dependencies or authorise scaffolding. Prefer Composition API with `<script setup lang="ts">` for new components.

## Read for the affected concern

Load only the relevant references; their examples and version gates are conditional.

| Concern | Reference |
| --- | --- |
| Props, defaults, generics, component types, template refs | [TypeScript](references/typescript.md) |
| Models, watchers, cleanup, shared state, DOM IDs, Teleport, rendering security, KeepAlive/SSR lifecycles | [Components](references/components.md) |
| Template diagnostics, compiler options, editor integration | [Vue language tools](references/volar.md) |
| Build configuration, module resolution, routes, HMR | [Tooling](references/tooling.md) |
| Component behaviour, optional Pinia stores, asynchronous tests | [Testing](references/testing.md) |

## Completion

Use the project's configured type check and affected behaviour tests when implementation changes warrant them; a successful bundler build alone does not establish Vue template type safety. Report the result and any checks that could not run. For reviews, report material findings with file locations and consequences.
