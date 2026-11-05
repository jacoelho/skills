# Removing structure without changing required behaviour

Apply R4 in SKILL.md to decide whether removal improves the affected capability.
Use only the relevant checks below to preserve semantics while completing it.

## Wrappers, single-use functions and adaptors

**Removal candidates:**

- Pass-through wrappers that only rename or forward a call.
- Private implementation functions with one actual call site, when the body can
  live directly at that site without violating an evidenced boundary.
- One-to-one adaptor classes or functions between compatible internal interfaces.
- Round-trip conversions and duplicate internal models that all controlled callers
  can replace with one canonical representation.
- Layers added only for hypothetical reuse, mocking, style or a complexity score.

A function name is not itself an abstraction benefit. Prefer an informative local
variable or a short explanation of intent when that removes a navigation hop.
Tests calling a helper do not establish production reuse. Inspect registration,
callbacks, exports, generated and indirect calls before claiming it is single-use.

**Complete the removal:** inspect the implementation and callers; inline or migrate
its real work; update callers and test wiring; delete the old symbol, unused types,
registrations and conversions; then verify the behaviour. Do not leave an alias,
forwarder or replacement helper unless an actual compatibility contract requires
it. Removing three layers and creating a new one with the same job is not removal.

Inlining is not textual substitution. Preserve argument evaluation count and order,
short-circuiting, errors, asynchronous delivery, cleanup scope and release timing.
Named temporaries and native scope constructs are preferable to repeating effects.
Move validation or cleanup into the owning caller before removing the old shell.

**Retention needs concrete evidence.** Valid reasons include an externally supported
API, a required callback/interface or recursive boundary, an independently owned
policy, a necessary translation at an external boundary, or a demonstrated increase
in caller complexity, duplicated rules or resource lifetime after inlining. For the
last category, compare the actual inline alternative and name the added burden;
"readability", "separation of concerns" and "testability" alone are insufficient.
A new requirement or hypothetical future caller is not evidence of present need.

Distinguish retaining a necessary conversion from retaining an adaptor layer around
it. Do not force separate external formats into one representation merely to delete
a type. Likewise, one production caller does not authorise removing a public API.
A language-mandated callback may remain while its extra forwarding wrapper is removed.

When inlining resource ownership, verify release at the original lifetime boundary.
Function-scoped cleanup moved into a larger caller can release too late even when
it still runs exactly once.

## Transformation checks

| Candidate | Establish while simplifying | Failure to avoid |
|---|---|---|
| Remove pass-through wrapper | Complete caller migration; same argument/result/error contract; no unaccounted external references | Leaving an alias or silently breaking a supported entry point. |
| Inline private single-use function | Evaluate arguments once in the original order; preserve local control flow, errors, recursion and scope | Duplicated side effects, caller returns substituted for helper returns, changed cleanup timing. |
| Remove adaptor or duplicate model | Interfaces are actually compatible, or migrate every controlled consumer to a canonical representation | Deleting necessary external translation; missing a conversion on an untouched caller. |
| Flatten nesting into guards | Same condition order, short-circuiting, errors and cleanup scope | Early return can bypass release or a transaction boundary. |
| Remove repeated predicate | Predicate is pure and its inputs cannot change between evaluations | Getters, custom truth conversion, concurrent state or I/O can invalidate the argument. |
| Replace collection representation | Required type, key coercion, ordering, equality, identity, prototype, serialisation, absent values | Object-to-Map changes access and JSON; nil and empty may be observably different. |
| Replace loop with iterator primitive | Same iteration domain, eagerness, mutation behaviour, failure delivery and ownership | Sparse arrays and lazy streams can change which work happens or when it fails. |
| Remove async/exception wrapper | Preserve returned type, error delivery, finalisation, cancellation and relevant identity at the receiving caller | Turning a rejected promise into an immediate throw; bypassing retry handling. |
| Use a native primitive | Runtime support and full contract fit, not just a matching feature name | Object.groupBy has a null-prototype result; structuredClone rejects function values. |
| Inline resource-owning wrapper | Transfer acquisition/release to its real owner with the same scope and timing on success, failure and unwinding | Dropping release, or moving function-scoped cleanup later in a larger caller. |
| Combine duplicate code | Same policy owner and reasons for change | Shared mechanics must not force independent policies to change together. |
| Extract or retain helper | Concrete contractual boundary or evidenced reduction in caller obligations compared with inlining | Merely lowering one function's score or giving a few statements a name. |
| Replace conditions with data | Missing-key behaviour, default precedence, exhaustive coverage, evaluation timing and side effects | Hiding a state machine or eagerly evaluating formerly conditional work. |
| Remove derived state | Canonical source, consistency and recomputation budget | A cached snapshot may intentionally differ from current source state. |
| Reuse status/flag/entity | Enumerate every consumer and lifecycle attached to the value | Reusing trial status can grant entitlements; an auth link is not an invitation. |
| Delete unused code | Supported entry points, exports, reflection, registration, generated uses and external consumers | A local text search alone does not establish that a public API is dead. |
| Remove defensive branch | Reachability excluded by a checked invariant covering all entry points | Historic persisted data and foreign code may bypass local assumptions. |
| Compress expressions | Evaluation count/order, overflow/rounding, null semantics and debugging clarity | A shorter expression can change coercion, repeated access or error timing. |

These are conditional hazards, not blanket prohibitions. A verified input contract
may exclude a counterexample. Record that fact rather than inventing requirements.
Changing a supported contract requires authority; changing its private implementation
does not require keeping the old shell.

## Runtime discovery

Read manifests, lockfiles/toolchains, CI and relevant tests. Check actual error,
resource, concurrency, numeric and collection semantics where the change depends
on them. Use the installed dependency's source or matching primary documentation
when uncertain. Missing tools limit verification; they do not validate equivalence.

## Follow-up change probe

For a contested boundary, compare the actual inline alternative under a concrete
change already implied by the domain. A hypothetical follow-up is an evaluation
probe, not authority to build speculative features or preserve speculative layers.
