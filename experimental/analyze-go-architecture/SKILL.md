---
name: analyze-go-architecture
description: Analyze an existing Go codebase's system design, package boundaries, ownership, dependency direction, coupling, lifecycle, and change locality. Use for repository-wide Go architecture reviews and retain/repair/restructure decisions. Accept optional requirements, constraints, expected changes, and trade-offs, but inspect the repository first and never ask for information available from code, tests, documentation, configuration, history, or build tooling. Do not use for line-level bug review, formatting, or generic style cleanup.
---

# Analyze Go Architecture

Evaluate an existing Go codebase and decide whether its architecture should be **retained**, **repaired**, or **restructured**.

This is an analysis workflow. Do not modify code unless the user separately requests implementation.

## Optional inputs

The current repository is the default scope. The user may optionally provide, in any format:

- a narrower directory, module, package, service, branch, commit, or diff;
- functional or non-functional requirements;
- expected future changes;
- operational, compatibility, performance, security, or organizational constraints;
- accepted trade-offs or fixed decisions;
- out-of-scope areas;
- whether breaking changes are acceptable.

Do not require a template or ask the user to restate information already supplied.

Typical invocations:

```text
$analyze-go-architecture
$analyze-go-architecture focus on internal/broker
$analyze-go-architecture expected change: add a second persistence backend
$analyze-go-architecture constraints: preserve the public API; breaking internal changes are acceptable
$analyze-go-architecture trade-off: prefer simplicity over runtime configurability
```

Resolve conflicting information in this order:

1. explicit user requirements and constraints;
2. repository-local instructions, ADRs, specifications, and maintained documentation;
3. executable evidence from code, tests, schemas, configuration, and build tooling;
4. clearly labelled inference.

Report material conflicts rather than silently choosing one interpretation.

## Repository-first rule

Begin by inspecting the repository. Do not ask for information discoverable from:

- `AGENTS.md` or equivalent instructions;
- README files, package documentation, ADRs, specifications, comments, or issue references;
- `go.work`, `go.mod`, build scripts, CI, lint, deployment, or generated manifests;
- entry points, constructors, package imports, exported APIs, tests, examples, or benchmarks;
- schemas, migrations, protocols, configuration types, feature flags, or local Git history.

Never begin with questions such as “What does this system do?”, “Which packages matter?”, “What are the entry points?”, or “What trade-offs were intended?” before checking the repository.

Missing optional context must not block the analysis. For a genuinely external constraint that the repository cannot answer:

1. use the narrowest reasonable assumption;
2. label it **Inferred** or **Unknown external constraint**;
3. state which conclusion it could change;
4. continue.

Do not ask a clarifying question unless the user explicitly requests an interactive decision process. Even then, complete all repository-discoverable work first.

## Default scope

Unless narrowed by the user:

- analyze all first-party Go modules in the repository;
- include tests, schemas, configuration, deployment wiring, and relevant non-Go components when they define a boundary;
- ignore vendored dependencies, generated files, fixtures, and test data unless architecturally relevant;
- distinguish uncommitted changes from the committed baseline;
- do not treat directory structure alone as architecture: trace imports, construction, calls, data, state, and lifecycle.

## Workflow

Follow these phases in order. Do not produce findings before completing the architecture reconstruction.

### 1. Discover repository guidance and shape

Read the applicable repository instructions and the smallest useful set of architecture-bearing files:

- `AGENTS.md`, README files, `docs/`, ADRs, specifications, and examples;
- `go.work`, all first-party `go.mod` files, and replace directives;
- build, CI, lint, schema, migration, configuration, and deployment files;
- recent local Git history only when it explains intent or an active migration.

Prefer documented repository commands. Typical low-risk discovery commands are:

```sh
git rev-parse --show-toplevel
git status --short
go env GOMOD GOWORK
go list -f '{{.ImportPath}}\t{{.Name}}\t{{.Dir}}' ./...
go list -f '{{.ImportPath}}\t{{join .Imports " "}}' ./...
```

Adapt for workspaces, multiple modules, build tags, or repository-specific tooling. If a command fails, record the limitation and continue through source inspection. A tooling failure is not an architectural finding.

Identify:

- executable entry points and composition roots;
- first-party packages, imports, exported APIs, and principal call sites;
- external systems, transports, persistence, queues, files, and operating-system boundaries;
- construction, configuration, global state, registries, `init` functions, plugins, and side-effect imports;
- goroutines, workers, callbacks, channels, cancellation, startup, and shutdown;
- transaction, retry, acknowledgement, ordering, idempotency, and consistency boundaries;
- tests and examples that demonstrate intended client use.

### 2. Reconstruct the current architecture

Build a factual model before criticism. Explain:

- system purpose and externally visible capabilities;
- entry points, composition, and dependency direction;
- principal runtime and data flows;
- package responsibilities as implemented, not merely as named;
- ownership of mutable state, resources, and important invariants;
- persistence, transport, protocol, and external-service boundaries;
- error, failure, concurrency, cancellation, startup, and shutdown semantics.

Label material statements:

- **Observed** — directly supported by repository evidence;
- **Inferred** — best-supported interpretation of incomplete evidence;
- **Unknown external constraint** — not discoverable from the repository.

Do not report findings in this phase.

### 3. Synthesize requirements and trade-offs

Combine user-provided context with repository evidence. Classify material items as:

- required behaviour;
- non-functional or compatibility constraint;
- accepted trade-off or fixed decision;
- expected change pressure;
- out of scope;
- inferred assumption;
- unresolved external constraint.

Tests, schemas, exported APIs, deployment manifests, and repeated call patterns are stronger evidence than stale prose. When maintained documentation and code disagree, report the discrepancy.

### 4. Pressure-test the design through likely changes

Select three to five concrete changes, or fewer for a small repository. Prefer:

1. user-supplied expected changes;
2. ADRs, TODOs, issues, roadmaps, or migrations;
3. variation already visible in tests, configuration, duplicated implementations, protocol versions, build tags, or feature flags;
4. the next natural change strongly implied by the system's purpose.

Do not invent speculative extension points to justify abstractions.

For each scenario, trace:

- where the change enters;
- packages and representations that change;
- packages that must understand the concept;
- coordination or ordering required;
- policy leaking into infrastructure or infrastructure leaking into policy;
- compiler and test protection against incomplete changes;
- the desired locality under a better boundary.

Measure coupling by propagated knowledge and coordination, not import count alone.

### 5. Evaluate boundaries and falsify candidates

Read `references/go-architecture-rubric.md`. Apply only relevant sections.

A candidate issue is not a finding until it survives falsification. Check reachability, repository-defined trade-offs, existing ownership, generated or transitional code, duplicate root causes, and whether the proposed abstraction genuinely removes knowledge or merely adds indirection.

Merge symptoms with the same root cause. Report at most five primary findings. A zero-finding result is valid.

Do not report:

- local style, formatting, naming, or lint issues without architectural consequences;
- speculative extensibility;
- interfaces, factories, layers, or dependency injection justified only by convention or mocking;
- package or function size without cohesion evidence;
- alternative designs that do not improve ownership, lifecycle clarity, or change locality;
- suggestions added merely to make the review look comprehensive.

Do not impose Clean Architecture, hexagonal architecture, DDD, MVC, or another named pattern mechanically.

### 6. Decide and describe the smallest better design

Choose exactly one:

- **Retain** — current boundaries fit observed requirements and likely changes; further architecture work would cost more than it saves.
- **Repair** — the overall shape is sound, but responsibilities, representations, interfaces, or lifecycle ownership should move.
- **Restructure** — current boundaries systematically obscure authority or force broad coordination for important changes.

Breaking changes may be recommended when their architectural benefit exceeds migration cost. State the cost and a staged path; do not preserve an abstraction merely because it exists.

For **Repair** or **Restructure**, describe only enough target architecture to make the recommendation testable:

- package responsibilities and dependency rules;
- ownership of invariants, state, resources, and lifecycle;
- concrete implementations and consumer-owned interfaces;
- representation translation points;
- composition and configuration ownership;
- one or two small API sketches when useful.

Do not produce a complete rewrite.

### 7. Plan migration and verification

Order migration steps so each has one architectural purpose, is independently reviewable, preserves behaviour or names an intentional break, reduces duplicated authority or change propagation, and has a concrete verification method.

Run relevant repository tests and analysis commands when available and safe. Use them to validate architecture claims, not to expand into an unrelated bug review. Never claim a check passed unless it ran successfully.

Do not implement the migration unless requested.

### 8. Write the report

Read `references/report-template.md` and follow it.

The report must:

- lead with **Retain**, **Repair**, or **Restructure**;
- separate user-provided context, repository-derived facts, assumptions, and unknown external constraints;
- explain the current architecture before recommendations;
- use exact file, symbol, call-path, data-path, or dependency evidence;
- contain no more than five primary root-cause findings;
- include concrete change scenarios, target boundaries, trade-offs, and verification criteria;
- state what was and was not executed;
- stop once the evidence supports the decision.

## Bounded use of subagents

When subagents are available and the repository is large, use at most three bounded assignments:

1. **Repository mapper** — modules, packages, imports, entry points, and composition.
2. **Runtime tracer** — principal flows, state ownership, concurrency, and lifecycle.
3. **Finding falsifier** — reject, merge, or strengthen the main agent's candidates.

Do not ask several agents to perform independent open-ended architecture reviews. The main agent owns synthesis, findings, decision, and final report.

## Stop conditions

Stop when:

- the current architecture and principal flows are adequately reconstructed;
- relevant change pressures have been traced;
- the highest-leverage root causes have been accepted or falsified;
- the overall decision is supported by evidence;
- each accepted finding has a target boundary and verification criterion;
- residual uncertainty is explicit.

Do not start another unrestricted discovery pass after reaching a supported decision. Verify accepted findings and their direct consequences only.
