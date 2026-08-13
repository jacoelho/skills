# Go Architecture Rubric

Use this rubric to evaluate demonstrated architectural pressure. It is not a checklist that must produce findings.

A finding is architectural only when it affects ownership, boundaries, dependency knowledge, runtime lifecycle, failure semantics, or the locality of meaningful changes.

## 1. Package cohesion and public APIs

For each important package, determine:

- What capability, resource, state, or invariant does it own?
- Can its primary responsibility be stated in one precise sentence?
- Who are its principal callers?
- Does its exported API serve those callers, or expose implementation structure?
- Can callers mutate state or bypass invariants through exported fields, maps, slices, channels, callbacks, or concrete records?
- Does it contain unrelated reasons to change?
- Do other packages duplicate, override, or bypass its decisions?
- Does the package name provide useful context at call sites?

Do not use file count or line count as a proxy for cohesion. A larger cohesive package is preferable to several small packages that must coordinate to preserve one concept.

Treat generic packages such as `util`, `common`, `shared`, `types`, `interfaces`, `service`, `manager`, `domain`, `application`, `adapters`, or `infrastructure` as investigation signals only. Demonstrate the hidden ownership or change-coupling problem before reporting a finding.

Watch for conceptual cycles even when the Go import graph is acyclic. Examples include packages exchanging callbacks, shared registries, or data structures because neither can own the complete operation.

## 2. Ownership of state and invariants

Every important invariant should have one authoritative owner.

Inspect:

- who validates and constructs valid values;
- who is allowed to mutate them;
- whether invalid intermediate states escape;
- whether several packages must coordinate to preserve one rule;
- whether storage, transport, and orchestration code each reinterpret the same rule;
- who owns transactions, retries, acknowledgements, deduplication, ordering, and idempotency;
- who owns cleanup and recovery after partial failure.

A boundary is weak when callers must know undocumented rules such as:

- call `Start` before `Add`;
- never call `Close` concurrently;
- save record A before publishing event B;
- update two packages' state in the same order;
- set a mode flag so a downstream package selects the right policy.

The fix is usually to move authority, not merely to add another interface.

## 3. Dependency direction and composition

Map both compile-time dependencies and runtime knowledge.

Check:

- whether entry points act as visible composition roots;
- whether construction is explicit;
- whether business or protocol policy depends on storage, transport, framework, generated-client, or deployment representations;
- whether infrastructure packages make policy decisions they cannot own;
- whether generic orchestration packages contain the real behaviour;
- whether global variables, registries, service locators, side-effect imports, or `init` functions hide dependencies;
- whether a large configuration object transmits policy across unrelated packages;
- whether dependency inversion removes knowledge or merely relocates names.

The composition root may depend on concrete implementations. This is not coupling to eliminate; it is the place where concrete system knowledge belongs.

Do not require all dependencies to point toward a generic `domain` layer. Choose dependency direction based on ownership, stability, and caller needs.

## 4. Interfaces and abstraction cost

Use concrete types by default.

An interface is justified when a consumer needs a smaller behavioural contract because of demonstrated variation, isolation, or boundary semantics.

Check:

- whether the interface is defined near the consumer;
- whether it contains only methods that consumer uses;
- whether multiple consumers have been forced into one overly broad contract;
- whether the interface mirrors a concrete implementation;
- whether the interface exists solely to satisfy a mocking framework;
- whether factories, adapters, decorators, or plugin registries add meaningful substitution or only indirection;
- whether a concrete parameter would be simpler and preserve the same change locality;
- whether an interface leaks infrastructure nouns into policy code.

A single implementation does not prove an interface is wrong. Several implementations do not prove it is right. Judge by consumer needs and change pressure.

Prefer multiple small consumer-specific interfaces over a shared provider-owned “repository” or “service” interface when consumers need materially different behaviour.

## 5. Data and representation boundaries

Trace important concepts across packages.

Check whether the same struct is used as:

- a transport request or response;
- a database record;
- an event payload;
- configuration;
- mutable internal state;
- a public behavioural model.

Shared representation is problematic when it causes unrelated boundaries to evolve together, exposes invalid states, leaks tags or storage details, or makes policy depend on external schemas.

Translation is useful at a real semantic boundary. Translation is waste when two types have identical meaning, invariants, lifecycle, and evolution pressure.

Prefer types that make invalid states difficult to represent when doing so simplifies the owning package. Do not create elaborate value-object hierarchies without demonstrated benefit.

Check ownership of slices, maps, byte buffers, pointers, and channels passed across boundaries. Aliasing can create hidden mutation coupling even when imports look clean.

## 6. Runtime lifecycle and concurrency

The package that starts asynchronous work should make its lifetime and completion observable.

Inspect:

- who starts each goroutine or worker;
- what causes it to stop;
- who cancels it;
- who waits for completion;
- who closes channels and resources;
- how startup failure is returned;
- how partial startup is rolled back;
- whether shutdown ordering is explicit;
- whether callbacks or channels obscure control ownership;
- whether background work outlives the component that owns its inputs;
- whether contexts are passed through operations rather than stored as generic component state.

A lifecycle API should make valid use obvious. Be suspicious of components that require a specific undocumented sequence of `New`, `Configure`, `Register`, `Start`, `Run`, `Stop`, and `Close` calls spread across packages.

Do not recommend asynchronous execution merely to decouple packages. It can replace compile-time coupling with temporal, operational, and consistency coupling.

## 7. Errors, failure, and consistency boundaries

Trace failures across each important operation.

Check:

- whether callers receive stable semantic errors or implementation-specific errors;
- who decides whether an operation is retryable;
- where deadlines and timeouts are selected;
- who owns transaction scope;
- who owns message acknowledgement and redelivery policy;
- whether state changes and emitted events have a defined consistency contract;
- whether partial success is observable and recoverable;
- whether idempotency is enforced at the correct boundary;
- whether infrastructure failures leak into business decisions;
- whether errors are logged and returned repeatedly by several layers.

Do not demand generic error taxonomies. Introduce cross-boundary error semantics only where callers need to make a decision.

## 8. Change locality

For every selected change scenario, measure more than files changed.

Evaluate:

- **Structural coupling** — direct package and API dependencies.
- **Semantic coupling** — several packages must understand one policy or concept.
- **Data coupling** — shared representations force coordinated evolution.
- **Control coupling** — flags, callbacks, or modes alter another package's behaviour.
- **Temporal coupling** — operations must occur in a particular sequence.
- **Lifecycle coupling** — startup, shutdown, and resource ownership span packages.
- **Operational coupling** — retries, transactions, acknowledgements, and failures cross boundaries.
- **Deployment coupling** — components cannot change or deploy independently where independence is required.
- **Change coupling** — one conceptual change requires parallel edits or duplicated decisions.

A good boundary makes an important change local in knowledge, not necessarily in line count.

A useful question is: “Which packages must understand this change?” If the answer includes packages that should merely transport, store, or wire the concept, the boundary may be misplaced.

## 9. Testability and verification

Architecture should be testable through meaningful package APIs.

Check:

- whether tests exercise public behaviour or depend on internal implementation choreography;
- whether test setup requires constructing most of the application;
- whether extensive mocks mirror implementation details;
- whether a small consumer-owned interface could isolate a true external boundary;
- whether package examples demonstrate intended client use;
- whether important lifecycle and failure semantics have executable evidence;
- whether dependency rules can be checked by the compiler, import analysis, or focused tests.

Do not treat “easy to mock” as an architectural objective by itself. Prefer designs that are easy to exercise through real behaviour.

## 10. Warning signs that require evidence

Investigate, but do not automatically report:

- generic packages or directories;
- package-per-type organization;
- provider-owned interfaces;
- interfaces with one implementation;
- interfaces created for tests;
- constructors with many dependencies;
- shared application-wide configuration structs;
- large `main` packages or invisible composition roots;
- global registries and `init` wiring;
- exported mutable fields, maps, slices, or channels;
- storage records crossing into business or protocol packages;
- transport DTOs used throughout the application;
- “manager”, “service”, “processor”, “handler”, or “repository” types whose authority is unclear;
- callbacks used where a direct return value or explicit object would clarify ownership;
- channels used as a generic decoupling mechanism;
- factories, plugins, or dependency-injection frameworks without demonstrated variation;
- duplicated validation or error translation;
- broad cross-package context values or untyped maps;
- a package that is difficult to name from the client's point of view;
- an acyclic import graph that still requires broad coordinated changes.

## 11. Finding acceptance

Accept a finding only when all are present:

- a violated architectural property or requirement;
- exact repository evidence;
- a reachable change or failure scenario;
- an observable coordination, ownership, leakage, or lifecycle cost;
- a root cause rather than only a symptom;
- a target responsibility boundary;
- a proportionate repair;
- trade-offs and migration cost;
- a verification criterion.

Reject or downgrade:

- preferences without a concrete consequence;
- speculative future extensibility;
- alternate designs with no measurable improvement;
- recommendations that only add interfaces or layers;
- local naming and style concerns;
- size-based arguments without cohesion evidence;
- problems already represented by a broader root cause;
- claims contradicted by tests, documentation, or call-site evidence.

## 12. Classification

Use these impact classes:

- **Structural** — ownership or dependency placement causes system-wide coordination, obscures critical lifecycle or consistency semantics, or materially blocks expected evolution.
- **Significant** — a boundary problem spans several packages or repeatedly leaks one concern, but can be repaired without changing the whole system shape.
- **Local architectural** — a package-level boundary problem with concrete impact. Include only when high leverage and when fewer than five stronger findings exist.

Use confidence levels:

- **High** — directly demonstrated by code paths, tests, tooling, or multiple consistent sources.
- **Medium** — strong static evidence with a material external assumption.
- **Low** — plausible but insufficiently supported; normally report as uncertainty, not a primary finding.

## 13. Overall decision

Choose:

- **Retain** when important changes are reasonably local, ownership is clear, and additional abstraction would cost more than it saves.
- **Repair** when the system shape is sound but specific responsibilities, representations, interfaces, or lifecycle authority are misplaced.
- **Restructure** when the current package and dependency design systematically prevents local change or creates distributed ownership of central concepts.

The goal is not theoretical purity. Choose the least complex design that gives the codebase clear authority, understandable runtime behaviour, and appropriate change locality.
