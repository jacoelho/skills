# Design criteria

These are questions for making a decision, not mandatory patterns or a scorecard.
The skill's workflow and project constraints take precedence. Primary background
is indexed in [sources.md](sources.md).

## 1. Caller effort and discoverability

Can a caller identify the entry point from the package documentation? Is the first
successful use also correct about errors, completion, and ownership? Which choices
are genuinely theirs, and which are details the library can choose safely?

Review package-qualified names rather than isolated identifiers. Go's package-name
guidance explicitly takes that caller perspective [S4]. Do not rename a stable API
for a marginal aesthetic improvement without accounting for migration costs.

Compare complete tasks, not expressions. A fluent expression can still require
more type knowledge, temporal rules, and debugging than several explicit calls.
A wrapper is worthwhile when it removes repeated, error-prone work without creating
a second interpretation of the operation. Do not count exported symbols as a
substitute for understanding their conceptual cost.

## 2. Cohesion and useful layers

Explain each package in one sentence about its responsibility. Identify the data
and invariants it owns. Separate policy from mechanism where that serves actual
independent consumers. Keep an internal layer internal when no caller needs it.

For every proposed public primitive, identify a use that does not merely rebuild
the high-level API. For every proposed high-level wrapper, explain what caller
obligation it removes. Avoid cycles in which low-level code depends on application
policy or concrete high-level representations.

A parser need not return a complete object graph to validate or skip input. A
query builder need not own a database connection merely to produce a query. These
are potential separations to examine, not instructions to publish extra packages.

## 3. Values, types, and invariants

What distinguishes a valid value from one that is initialised, compiled, attached,
closed, exhausted, or failed? Is the zero value useful, invalid-but-detectable, or
a dangerous trap? Does constructing a value require genuine validation or resources?

Do not contort a resource-backed type merely to make its zero value operational.
Do not require a constructor for a plain value that has no invariant to establish.
Consider whether names and types prevent real mistakes involving units, identifiers,
representation, or phase; consider the cost of conversions and type vocabulary too.

For generic APIs, demonstrate the input/output relationship the parameter preserves.
Check inference, constraints, defined types where supported, nil inputs, and foreign
types. Go's generics guidance recommends starting from functions and using type
parameters when they solve an actual repeated problem [S7]. Do not replace a useful
behavioural interface solely to advertise generics.

## 4. Configuration and defaults

Choose configuration from requirements: positional required arguments, a value
configuration, a configured receiver, options, or a builder may each be appropriate.
Specify defaults, validation timing, conflicts, and what unset means. An explicit
false or zero may need to differ from absence. Do not invent that distinction when
it has no domain meaning.

For combined settings, define precedence and scope. Are configurations snapshots or
references to mutable objects? Are callbacks captured? Are irrelevant settings
rejected, ignored, or impossible to pass? Is that behaviour discoverable?

For nested operations, show how policy remains available and how an override ends.
A recursion depth or work counter is not just another scalar option: copying its
initial value into each nested call may reset the budget. Distinguish immutable
configuration from mutable operation state.

Avoid package globals for per-call policy. Permit a simpler global facility only
when its process-wide semantics are intentional, necessary, and documented.

## 5. Ownership, aliasing, and mutation

For every slice, map, pointer, callback, iterator, and resource crossing the boundary,
identify who owns it and how long it remains usable. Is copying a struct a shallow
copy of mutable storage? Does an apparently immutable builder share backing arrays?
Can a callback retain its input? Does a reset invalidate earlier results?

Compare at least the relevant ownership alternatives: owned results, borrowed views,
caller-supplied storage, or explicit cloning. A `Clone` name must describe its scope:
what is copied, what remains shared, and whether independence includes concurrency.
Do not promise deep independence for a shallow copy.

Specify mutation on success and on failure. Atomicity may require staging memory;
incremental progress may be more appropriate. Do not make an operation appear
transactional when it can leave a writer or destination partially updated.

## 6. Errors as caller decisions

Start with what the caller needs to do, not an elaborate error taxonomy. Which
failures require branching? Which need a path, offset, field name, or operation?
Are multiple failures collected or does processing stop? What partial results exist?

The Go errors guidance distinguishes exposing an underlying error from retaining
an implementation boundary; wrapping a dependency's error can make it part of the
public contract [S5]. Define intended `errors.Is`/`errors.As` behaviour and avoid
forcing callers to parse prose. Do not manufacture a sentinel for every message.

Decide where errors surface. Deferred reporting can simplify iteration, but callers
must have a reliable completion/error check, including on early exit. Normal invalid
external input should not require recovering a panic. Document programmer-error
panics and invalid lifecycle operations when relevant.

## 7. Extension and interoperability

Try a caller-owned type, a foreign type, and a standard interface where those uses
are promised. Can callers customise behaviour without editing the type, wrapping an
entire object graph, or changing process-wide state? Does customisation preserve
nested options, location information, resource budgets, and ownership rules?

Use an interface for an actual behaviour boundary, not an implementation inventory.
Keep construction and implementation details out of consumer requirements. A sealed
interface may be intentional for controlled variants; do not insist every exported
interface is user-implementable. A callback can be simpler than a one-method wrapper
when there is no independent object lifetime or identity.

Check callback failure, reentrancy, retention, concurrency, and return obligations.
An extension that bypasses validation is a trust boundary, not just an ergonomic
escape hatch. Do not describe an available option as an enforced guarantee when
custom code can ignore it.

## 8. Streaming, lifecycle, cancellation, and resources

Distinguish full input, one framed record, next stream element, and a borrowed window.
Specify termination, read-ahead, buffer growth, short reads/writes, and partial output.
Identify who closes underlying resources and whether failure leaves the wrapper
usable. Whole-input validation requires knowing where the input ends.

A context can propagate deadlines or cancellation through an operation that
cooperates; a parameter alone does not make a blocking dependency interruptible.
Keep context out of pure transformations without a relevant cancellation or
request-scoped requirement. Do not remove request propagation from I/O workflows
because another pure library does not need it.

State which operations may run concurrently on the same value. Explain goroutine
ownership and exit conditions when the library creates them. For iteration, specify
when resources are acquired, how early exit releases them, whether iteration can be
repeated, and how errors are observed.

## 9. Performance feasibility at the boundary

Ask whether the API forces materialisation, repeated parsing, copying, allocation,
locking, reflection, or setup per operation. Distinguish unavoidable work, a current
implementation choice, and a contract that rules out an optimisation.

For a compile-once/use-many workload, separate setup costs from operation costs in
examples and measurements. Do not expose sessions, pooling, unsafe buffers, or an
append API without a workload that justifies the lifetime complexity. A simple
owned-value API may be the right trade-off even when it allocates.

Respect explicit no-reflection or resource constraints. Never turn a potential
allocation reduction into a claimed zero-allocation result without measurement of
the actual path, toolchain, and data distribution.

## 10. Compatibility and time

Check source uses beyond ordinary function calls: function values, method values,
interface satisfaction, type comparability, embedding, literals, and named types.
The Go compatibility article demonstrates that adding a variadic argument can
preserve call syntax while breaking assignment to an existing function type [S6].

Also inspect semantic compatibility: changed defaults, nil/empty distinctions,
ordering, errors, mutation, custom-method dispatch, and timing of failure. An API
comparison tool is useful evidence but not proof of behavioural compatibility.

Decide whether a change is required for this release, can be built externally, or
can be added later without breaking the chosen contracts. Explain the migration
cost of a new version. Do not use speculative extensibility as an excuse to expose
unfinished abstractions today.
