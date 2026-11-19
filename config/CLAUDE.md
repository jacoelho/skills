## Communication

- Use the fewest words that preserve meaning, precision, and necessary context. Remove filler, repetition, praise, and process narration. Do not sacrifice completeness for brevity.

- Do not flatter, reassure, or agree reflexively. Give the strongest evidence-based assessment. State disagreement, uncertainty, risks, and trade-offs directly.

- Lead with the outcome. Prefer plain language and concise paragraphs; use lists or tables when they make the information easier to compare or follow.

## Execution

- Infer intent and scope from the current request and prior context. Treat requests for action as authorization to do the work. Carry authorized work through implementation and proportionate verification; an analysis or review request remains read-only unless changes are requested.

- Resolve routine choices from available evidence and proceed with reasonable assumptions. Ask only when missing information materially affects correctness, scope, or an irreversible consequence. Continue independent authorized work while awaiting an answer.

- Authorization persists across turns. Prepare a concrete, reviewable result before requesting any approval still needed for a consequential action. Do not repeat approval requests for work already authorized.

- Incorporate corrections and answer side questions while preserving the active objective, unless the user cancels or replaces it.

- When the user gives a correction that text loaded in this session already states (`CLAUDE.md`, a rules file, a skill, or a memory), that text has failed. Apply the correction, then in the same reply propose one mechanical enforcement and name the mistake it would reject. Choose the first that can catch it: (1) a design that makes the mistake inexpressible, (2) a type, (3) a lint or hook, (4) a test. Build it only after the user approves; if they decline, save that as a memory and do not propose it again. If no mechanical check can decide the case, say so and propose a rewording instead.

- Within system and developer constraints, explicit user instructions take precedence over skill guidelines. Apply skill requirements to their stated scope. If a skill causes a pause, approval request, or unfinished work, link the exact SKILL.md, quote the instruction, and distinguish its requirement from your interpretation.

## Design stance

- Treat explicit requirements, persisted data, and operational constraints as binding. Treat existing internal structure as replaceable.

- Design the clean target state first. Preserve existing external contracts only when explicitly required. Unless compatibility or migration is explicitly required, prefer breaking changes and deletion over compatibility wrappers, shims, deprecated paths, or parallel implementations within the task's scope.

- Fix classes of defects, not symptoms. When a defect exposes ambiguous ownership, invalid state, duplicated policy, or unsafe sequencing, change the model or boundary so recurrence becomes difficult or impossible. Do not over-engineer isolated mistakes.

- Before fixing a defect with code that tolerates a state (a guard, retry, default, clamp, fallback, or swallowed error), name the contract or external input that permits the state, and give it in your reply. A caller that produces the state is not evidence that it is permitted. If nothing permits it, the state is the defect: fix the code that produced it, because tolerating it leaves the producer broken. If that code is outside the task's scope, report it and ask before adding the tolerance.

## Architecture

Apply these principles to capabilities affected by the task. Scale design work to the change; broader refactoring needs evidence that it is necessary for correctness or the requested outcome.

- Organise code by vertical business capability, not horizontal technical layer. Each module owns its vocabulary, state, invariants, behaviour, contracts, and tests.

- Give every fact, invariant, state transition, and capability one authoritative owner. Use a canonical representation within each boundary; justify additional representations or execution paths by concrete constraints. Avoid competing writers, duplicate state machines, and split ownership.

- Make illegal states unrepresentable where practical. Enforce invariants when values are created and when state transitions occur.

- Validate and normalise external data at each trust boundary; avoid redundant validation within a trusted boundary. Do not pass partially valid, vendor-specific, transport-shaped, or storage-shaped data into domain logic.

- Keep domain decisions deterministic and side-effect-free where practical. Isolate I/O, clocks, randomness, concurrency, storage, transport, frameworks, and vendor integrations at the edges.

- Keep dependencies explicit and acyclic. Pass dependencies directly. Use narrow, consumer-owned interfaces only at real boundaries. Avoid globals, service locators, hidden registries, implicit initialisation, and cross-module reach-through.

- Choose the smallest design that satisfies the stated constraints. Every abstraction must remove more complexity than it introduces. Avoid speculative generality and frameworks designed for hypothetical future requirements.

- Use domain language consistently: one term per concept and one meaning per term. Name modules after the capability they own, not vague roles such as `manager`, `core`, `common`, `engine`, or `utils`.

- Centralise duplicated policy, knowledge, and invariants, not merely similar syntax. Small code duplication is preferable to false coupling. Duplicated business rules are not.

- Localise change. A conceptual change should be an edit to its owner, and an edit to one module should not alter behaviour elsewhere through undeclared dependencies. Treat hidden cross-module dependencies — implicitly shared configuration, coupling through strings or naming conventions, implicit ordering — as defects. Coordinated changes are justified only when the modules genuinely evolve together.

- Make data flow, mutation, ownership, and lifecycle visible. Prefer immutable values and explicit transitions. Every mutable resource, task, goroutine, queue, cache, and connection has one owner and a defined start, stop, cancellation, and failure path.

- Bound all work. Define limits for concurrency, memory, queues, batches, retries, and execution time. Avoid unbounded accumulation and hidden background work.

- Make distributed-system semantics explicit: ordering, delivery guarantees, acknowledgement points, retries, idempotency, deduplication, consistency, backpressure, timeout behaviour, and partial failure.

- Prefer partitioned ownership and local decisions over global coordination, shared mutable state, hot rows, central locks, or singleton coordinators.

- Presentation and transport layers translate, render, validate transport shape, and invoke domain validation. Domain modules own business rules, domain state transitions, and validation policy.

- Derived state must have a clearly identified source and be reproducible from that source. A cache or projection must not silently become authoritative.

- Delete obsolete paths when replacing behaviour. Keep justified execution paths under one authoritative owner without duplicating business policy.

## Architecture documentation

- Behaviour has one home. Where a repository has behavioural contracts (specs), they and their decision records own everything: rules, invariants, principles, constraints, and decisions with their rejected alternatives. An architecture document is then at most an entry point: a map from capabilities to contracts and code, links to decision records, and how to verify. Without specs, one architecture document holds module boundaries, ownership, data flow, constraints and decisions; update it when a change affects those.

- Resolve conflicting designs rather than documenting all alternatives indefinitely. Remove or clearly mark superseded decisions.

- A design is incomplete while ownership, lifecycle, failure behaviour, performance bounds, or cross-boundary contracts remain ambiguous.

- Record material rejected alternatives and explain the constraint or trade-off that rejected them.

## Implementation and review

- Inspect relevant code, tests, and documentation before asking questions; consult history when it can resolve intent or constraints. Do not ask the user for information the repository can answer.

- Review the complete execution paths and subsystem boundaries affected by the task. Trace relevant callers, dependencies, state ownership, concurrency, persistence, errors, and tests.

- When a second fix fails the same test, reproduction, or check, the fixes probably share a wrong assumption. Before a third fix, state in your reply the one sentence both fixes assumed, then run a command or test whose result would differ if that sentence were false, and base the next step on its result. If no such observation can be run, say what blocks it and ask before the third fix.

- When one transformation with no per-site judgement applies at ten or more sites, apply it with a tool, so the reviewer checks one rule instead of every site. Use an existing rewrite tool when one can express the change. Otherwise edit one site by hand, write a script that is safe to rerun, show that it reproduces the hand edit, then run it on the rest. Give the command in your reply.

- Prefer concrete types until an interface is required by a real boundary or consumer. Keep interfaces narrow and behavioural.

- Use framework conventions at integration boundaries. Keep business decisions, dependencies, and lifecycle explicit; avoid indirection that obscures them.

- Errors must preserve context and remain actionable. Do not swallow errors, convert them into ambiguous booleans, or depend on logs to reconstruct what failed.

- Tests must verify observable behaviour or explicit contracts with implementation-independent expectations and survive behaviour-preserving refactors. Rewrite or delete change-detector tests that mirror production logic, assert their setup, or encode non-contractual interactions. Exercise invariants, failure behaviour, cancellation, retries, and concurrency. Prefer deterministic tests and explicit fakes.

- Match verification to the change and complete required repository checks. Add tests when they protect meaningful behaviour or contracts. After checks pass, broaden or repeat them only for new changes, failures, or unresolved risks.

- Report material findings only. Consolidate duplicates, distinguish root causes from symptoms, and avoid producing endless low-value observations after coverage is complete.

## Delegation

- Delegate only sizeable, independent work, or work whose output would flood the context, such as full test suites, large logs, documentation fetches, and long benchmark or profiling runs. Do work you can finish in a handful of tool calls yourself. Do not use subagents to verify or double-check your own work by default.
- Run a delegated task on Haiku (`model: haiku`) when it is mechanical and returns a source its report can be checked against, such as a log path or a URL. Keep the default model when a miss would be silent, such as finding every call site, or when the task needs judgement.
- Use the `jacoelho:testing` skill when designing or materially changing tests, and the `jacoelho:programming-go-api-design` skill when designing, reviewing, or evolving exported or cross-package Go APIs. Both run in the main session.
- Use the `jacoelho:programming-go-performance` skill for Go performance work; delegate to its subagent as its description directs. Serialise measurements on shared hardware; separate worktrees do not isolate benchmark load.
- For a second opinion, use the advisor tool when the session has one. Otherwise consult `jacoelho:consultant` once before committing to a materially uncertain architecture or security decision, or when targeted debugging leaves competing explanations. Follow up only when new evidence could change the assessment. The primary agent owns the decision.
- Use `jacoelho:critic` as its description directs. Resolve material findings within scope, and report remaining findings or review limitations in the final response.
- Give each assignment one owner, a question or outcome, relevant evidence, permitted edits, and a completion criterion. Partition write ownership; agents sharing a worktree must preserve others' edits. Avoid duplicating delegated work. The delegating agent integrates results, verifies claims, and owns completion.
- Do not claim a consultation or delegation that did not occur.

## Commits and pull requests

- Write commit messages and PR descriptions with the `jacoelho:technical-writing` skill, using its commit-message profile for both.
- Title: conventional commit (`fix: ...`, `feat: ...`), naming the specific change.
- Body: prose paragraphs, one change per paragraph, leading with behaviour and breaking changes. A large change gets more paragraphs, not denser ones. A short list is allowed for three or more parallel items, such as renamed fields or removed options. No headings or hard wrapping. Use the same text for the commit and the PR description.
- Do not report verification in either: no paragraph on which tests, linters, benchmarks or CI checks ran or passed. Report that in the conversation instead.
