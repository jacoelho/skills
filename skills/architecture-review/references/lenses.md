# Review lenses

Each lens has **Rules** and **Look for**. A rule states the target design and,
where the line is not obvious, what counts as a breach; cite it by its bold name.
**Look for** lists signals where breaches tend to hide; it focuses attention and
is not a checklist to answer. A rule applies only where its subject exists: a
system with no network boundary has no distribution semantics to judge. A lens
yields a finding when its candidate passes the skill's **Confirm each candidate**
step, as confirmed or conditional, or is a breach the reviewed change introduces.

Terms used throughout:

- *Domain logic* is code that decides business rules, invariants and state
  transitions; *edges* are code that performs I/O or talks to frameworks,
  transports, storage and vendors.
- A *hot path* is code the stated workload, a measurement or clear algorithmic
  evidence places on the per-item or per-request path.

## 1. Change at a distance and change amplification

*Change at a distance*: editing one module changes the behaviour of, or forces
edits in, a module that does not visibly depend on it. *Change amplification*: a
conceptually small requirement touches disproportionately many places. Both
typically compile and pass local tests while breaking a distant assumption.

Rules:

- **Localise change.** A conceptual change is an edit to its owner, and editing
  one module changes behaviour elsewhere only through dependencies declared in a
  contract or type. Coordinated change is *necessary* when one requirement spans
  the modules and that dependency is declared; all other coordinated change is
  *avoidable*.
- **Single owner.** Every fact, invariant, state transition, capability and
  execution path has one authoritative owner across the system, and one
  canonical representation within a module. Each additional representation or
  path names the concrete constraint that requires it.
- **Centralised policy.** Each decision is encoded in one place. Two places are
  one decision when they must change identically for every requirement; they
  breach this rule unless they derive from one definition. Where a process or
  language boundary prevents one definition, they are coordination, and lens 7
  expects a test spanning both sides. Places that change together but encode
  different decisions (a producer and its consumer, a schema and its migration)
  are coordination, judged by **Localise change**. Places that merely look alike
  are similar code; leave them separate, since small duplication costs less than
  false coupling.
- **Explicit dependencies.** A module receives its dependencies as parameters or
  constructor arguments, and the module graph is acyclic. Breaches: globals,
  service locators, hidden registries, initialisation by import or load order,
  and reach-through: using a module's dependency by navigating through the
  module.
- **Local decisions.** Mutable state is partitioned so each partition has one
  owner that decides locally. Breach: shared mutable state, a central lock or a
  singleton coordinator where partitioning by key, request or owner would serve.

Look for:

- one rule, constant or assumption encoded in several places;
- coupling through strings, identifiers, naming conventions or file layout;
- implicit ordering between operations or lifecycle stages;
- configuration read far from the code it affects;
- an invariant enforced at several boundaries instead of owned at one;
- callers depending on a module's implementation details;
- implementation inheritance across modules, where a subtype depends on the
  supertype's internal call sequence, so a base-type edit changes subtype
  behaviour.

**Change-impact scenarios.** For each selected changed boundary, and each module
with shared or hidden knowledge, walk each of these changes the domain makes
plausible:

1. add a behaviour, type, rule or variant;
2. change an invariant or business rule;
3. replace an implementation or external dependency;
4. change error handling, validation or retry behaviour;
5. change configuration, limits or concurrency.

State each concretely, preferring the form the project's documents, history or
provisional values point to (a limit marked provisional, a planned variant)
over a generic one. For each scenario, name
where the change belongs and what else must change. Report it only when the
coordination it requires is avoidable under **Localise change**.

## 2. Ownership and cohesion

Rules:

- **Capability modules.** Code is organised by capability: the user-visible
  behaviour it delivers, which for a tool or library is its features. Each
  capability module owns its vocabulary, state, invariants, behaviour, contracts
  and tests. Infrastructure serving several capabilities, such as a storage adapter or a
  logger, is a legitimate module. Breach: one capability's rules split across
  technical layers that must be read together to understand it.
- **Deep modules.** A module hides a decision behind a surface simpler than its
  implementation. Breach: a *shallow wrapper* that forwards, renames or
  redistributes work and hides nothing, or one module combining unrelated
  concerns so a change to one risks the other.
- **One term per concept.** Each concept has one term, each term one meaning,
  and each module is named after the capability it owns. Breaches: one term
  naming two concepts, two terms naming one concept, or a vague-role module name
  such as `manager`, `core`, `common` or `utils`. All other naming is style.

Look for:

- competing writers to one piece of state, or duplicate state machines for one
  lifecycle (**Single owner**);
- a capability whose tests live apart from its rules;
- several small modules that are always read and changed together; a larger
  cohesive module serves better.

## 3. Interfaces and information hiding

Rules:

- **Illegal states unrepresentable.** Values are valid by construction:
  invariants are enforced when values are created and when state transitions
  occur. A closed set of values, or a value with format or range rules, is a type
  rather than a bare string or number. Each meaning has a field or type of its
  own; a sentinel (nil versus empty, zero, a magic string) that carries a
  meaning is a breach, as is a surface that accepts argument combinations invalid
  together. Subject to **Where practical**.
- **Pure domain.** Domain logic is deterministic and side-effect-free; it
  receives the results of I/O, clocks, randomness, concurrency, storage,
  transport, frameworks and vendor SDKs from the edges. Subject to **Where
  practical**.
- **Validate at trust boundaries.** External data is validated and normalised
  once, where it enters. Domain logic receives only fully valid values in its own
  types, never transport-, storage- or vendor-shaped data.
- **Thin transport.** Presentation and transport code translates, renders and
  validates transport shape, then calls domain validation. Business rules, state
  transitions and validation policy live in domain modules.
- **Narrow interfaces.** An interface exists at a boundary that has two
  production implementations, or that isolates a consumer from an edge it must
  not depend on; a test that needs a fake at an edge qualifies under the
  latter. It is defined by its consumer and has only the methods that consumer
  calls. Elsewhere, use concrete types.

**Where practical.** **Illegal states unrepresentable** and **Pure domain** bind
unless the review names the
machinery enforcement would need (new types, conversions, runtime checks at
each use) and the breaches it would prevent, and the machinery clearly
outweighs them. When the comparison is close, the rule binds.

Look for:

- callers coordinating steps the module should own;
- internal representation visible through the surface, so an internal change
  reaches callers (*information leakage*);
- a surface that hides essential semantics (ownership, lifetimes, ordering,
  concurrency guarantees) to look simple;
- an exported surface larger than its consumers use.

**Surface usability**, whether the common case is direct, with predictable
names, arguments, defaults and errors, and usable without knowing the
implementation, is judged by a specialist when your instructions assign public
API shape to one; otherwise judge it here, reading the surface as its consumer.

## 4. Correctness and failure semantics

Judge the guarantees the system claims, under the conditions it faces.

Rules:

- **Visible lifecycle.** Every mutable resource, task, queue, cache and
  connection has one owner and a defined start, stop, cancellation and failure
  path. Data flow and mutation are visible at the call site, not hidden in
  aliasing or implicit state changes.
- **Explicit distribution semantics.** At each process or network boundary, the
  contract, type or document states ordering, delivery guarantees,
  acknowledgement points, retries, idempotency, deduplication, consistency,
  backpressure, timeouts, durability and behaviour under partial failure,
  partitions, crashes and dependency failure. Infrastructure redundancy does not
  satisfy this rule.
- **Reproducible derived state.** Derived state names its source and can be
  rebuilt from it; the source stays authoritative over any cache or projection.
- **Actionable errors.** Each error keeps the context needed to act on it and
  reaches a caller that can act. Breaches: swallowed errors, errors converted to
  ambiguous booleans or defaults, errors mapped to a misleading kind, and
  failures reconstructable only from logs.

Look for:

- invariants and state transitions under partial failure and recovery;
- retries without idempotency, and duplicate processing;
- ordering, concurrency, cancellation and shutdown races;
- consistency and transaction boundaries that do not match the invariant they
  protect.

## 5. Accidental complexity

Measure complexity by concepts, dependencies, states and coordination steps a
maintainer must hold; line count alone is not evidence.

Rules:

- **Smallest design.** The design satisfies the stated constraints with the
  fewest such elements. Each wrapper, adaptor, interface or helper hides a
  decision, owns a contract, or isolates a policy that changes independently;
  otherwise it is a breach. A name, a mocking seam, a single call site or
  hypothetical reuse justifies nothing either way; name the concrete burden it
  adds or removes.
- **Delete obsolete paths.** Replaced behaviour is deleted. A compatibility
  path, shim or parallel implementation stays only when a requirement, persisted
  data or an operational constraint needs it, and the code or a document names
  which.
- **Visible decisions.** Which code runs, its dependencies and its lifecycle can
  be traced by reading the code. Framework conventions at integration edges
  satisfy this rule. Breach: reflection, decorators, event buses, dependency
  containers or configuration that hide which code runs, its dependencies or its
  lifecycle.

Look for:

- generalisation or configurability beyond current callers;
- control flow for one operation fragmented across modules;
- special cases that a better model would remove.

## 6. Resources and performance

Rules:

- **Bound all work.** Concurrency, memory, queues, batches, retries and
  execution time each have a limit set by their owner, and background work has an
  owner under **Visible lifecycle**. A limit that breaks a stated operating limit
  is graded by the skill's Severity section.

Look for, owned by this review because a surface or representation fixes them:

- materialisation where stated limits require streaming;
- **buffer and allocation ownership** on a hot path: a surface that forces an
  allocation per call or per item where callers could reuse or borrow memory. A
  surface that returns owned collections cannot become zero-copy later without
  breaking its callers;
- **data layout on a hot path**: a representation that scatters data accessed
  together, such as pointer-heavy structures or maps where a dense array would
  serve, or dynamic dispatch (interfaces, trait objects) inside per-item loops.

Look for, handed to a specialist when your instructions assign performance
investigation to one, otherwise judged here:

- repeated computation or copying on a hot path;
- contention and algorithmic complexity under the stated workload.

Report every signal except materialisation only on a hot path; materialisation
matters wherever it breaks a stated limit. Keep ownership and concurrency
semantics readable rather than trading them for gains no requirement or
measurement asks for.

## 7. Verifiability

Rules:

- **Contract tests.** Tests verify observable behaviour or explicit contracts,
  with expected values taken from the requirement, and survive
  behaviour-preserving refactors. They exercise invariants, failure,
  cancellation, retries and concurrency, and are deterministic, using explicit
  fakes at edges. Breach: a change-detector test, one that mirrors production
  logic, asserts its own setup, or pins non-contractual interactions such as
  which internal functions were called.
- **No tautological tests.** Breach: a test that cannot fail while the code
  compiles, derives its expected value from the code under test, or re-checks a
  language, library or framework guarantee. Recommend only tests that pass both
  **Contract tests** and **No tautological tests**.

Look for:

- important behaviour or invariants testable only through internals;
- a cross-boundary contract, including one shared across languages, with no
  test spanning both sides;
- test setup disproportionately heavy for the behaviour tested, pointing at a
  boundary in the wrong place.

## 8. Architecture documentation

Rules:

- **Documented boundaries.** A change that alters a boundary, ownership,
  contract, data flow, invariant, state transition, failure mode or constraint
  updates the document that records it. When material decisions span more than
  one document, one entry document links them without restating their decisions.
- **Complete design.** Ownership, lifecycle, failure behaviour, resource bounds
  and every cross-boundary contract are unambiguous: one reading of the code and
  documents. A design with two plausible readings that behave differently is
  incomplete.
- **Resolved decisions.** Each design question has one current answer;
  superseded decisions are removed or marked superseded. A rejected alternative
  that a maintainer would plausibly propose again is recorded with the
  constraint that rejected it.

Look for:

- a moved boundary, owner or contract whose document still describes the old
  one;
- a material boundary, contract or decision that no document records, or several
  authority documents with no entry document linking them;
- authority documents that contradict each other or the code;
- a normative fact whose only definition lives in a non-normative document.
