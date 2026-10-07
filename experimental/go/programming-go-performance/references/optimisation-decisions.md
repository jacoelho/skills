# Go optimisation decisions and rejection criteria

These are prompts for experiments, not a catalogue of mandatory rewrites. Source
keys refer to `sources.md`. Preserve project restrictions even when an alternative
might be faster.

## Remove work before changing representation

Inspect repeated traversal, parsing, normalisation, formatting, sorting, copying,
and allocation. Prefer a simpler algorithm or deleting duplicate work when the
contract permits it. Check whether an existing fast path or admitted/precomputed
value already solves the problem.

Static configuration can sometimes be prepared once. Per-input validity, admission,
authorisation, length limits, overflow handling, cancellation and external state
cannot be assumed static. Preserve error ordering and recovery behaviour when they
are part of the contract. “The common input is valid” does not justify skipping checks.

For compile-once/run-many work, define total cost as `construction + N * execution`.
When a change adds preparation cost `D` and saves `S` per operation, its simple CPU
break-even requires `N > D/S`, for positive `D` and `S`. Include retained memory and
expected reuse before recommending it. Measure cold creation, warm execution, reset,
and a realistic mixed lifetime separately.

Algorithmic wins require workload evidence too: a hash index may help a large set
while losing to a linear scan for tiny sets. Test size, key distribution, misses,
construction, and storage overhead. Do not guess a magic crossover size.

## Data layout, identity and pointer density

Consider flat slices or indices when traversal or GC work is material, ownership is
clear, and identity/mutation semantics permit it. Verify bounds, sentinel conventions,
index-width overflow, invalidation on rebuild, and all construction paths. Account
for additional indexed loads, copied values, and whole-buffer retention.

Hot/cold splitting is useful only when the hot path avoids enough cold data to pay
for the added representation. “Immutable engine plus goroutine-confined session” is
a useful candidate, not a mandatory redesign. Prove publication is safe and prevent
accidental concurrent session use. Do not expose mutable engine internals through
returned slices or maps.

The GC guide explicitly treats pointer reduction and field layout as targeted,
implementation-sensitive techniques. Use live/scannable memory and GC measurements
before making code less strongly typed with indices. Do not automatically reorder
structs or pack fields merely to reduce `Sizeof`. [S14]

Do not claim “fewer cache misses” from a CPU profile alone. Without appropriate
hardware-counter or equivalent evidence, say “layout hypothesis, with measured
end-to-end effect” rather than inventing a microarchitectural explanation.

## Allocation rate is not retention

For every reuse proposal, document who owns the backing memory, who may retain a
view, when mutation is allowed, and when the storage may be recycled. A slice capacity
limit can constrain append aliasing without releasing the original allocation.

Preallocate from known, validated bounds or measured distributions. Do not use an
untrusted length as an unchecked allocation hint. For scratch buffers and session
maps, run large-then-small inputs and measure what remains reachable after reset.

For exclusively owned pointer-bearing scratch, clear previously populated elements
before shrinking the visible length. `s = s[:0]` is not element clearing. Clear stale
references only within the actual ownership contract; do not mutate aliased storage.
Resetting a byte buffer's length does not mean releasing its backing capacity or
wiping sensitive contents. Follow the application's separate secret-handling policy.

Cloning a small substring or byte view may let a large backing allocation die and
may avoid unsafe aliasing. Judge the allocation against retained memory and lifetime,
not against an unconditional zero-allocation target. `strings.Clone` and `bytes.Clone`
are safe standard-library tools when a real copy is needed. [S13, S19]

Zero allocation is an explicit workload/API budget, not a synonym for efficient.
Heap allocations, allocation bytes, retained capacity, GC scanning, copying, and
peak process memory can move in different directions.

## sync.Pool gate

Start with local values or explicitly owned per-session scratch. Introduce a pool
only when an allocation/reuse bottleneck is measured and sharing is warranted.
`sync.Pool` can drop entries at any time and is not durable state, an ownership
protocol, a lifecycle callback mechanism, or a hard aggregate memory bound. [S16]

Before acceptance, establish a safe miss path; a complete reset protocol; exclusive
ownership while borrowed; no aliases surviving `Put`; no double return; safe handling
of error paths; and an explicit oversize policy. Measure reset work, cold and warm
behaviour, concurrency, GC activity, and large-then-small memory retention.

A per-object capacity cap does not impose a total pool bound. Resource admission
requiring a hard maximum needs a separate explicit mechanism. Do not put connections
or other resources requiring deterministic closure in a pool that may discard them.
Do not test correctness by assuming a specific object will survive, or be removed
by, a particular GC count.

## Compiler-sensitive hypotheses

Interfaces, type parameters, closures, and `defer` are not self-evident hot-path
problems. Identify the call site and actual allocation/dispatch/inlining behaviour.
A `string`/`[]byte` conversion is not automatically a heap allocation: optimised
contexts exist, so inspect the installed compiler's output. Treat historical wiki
implementation details as leads, not current universal guarantees. [S17]

Use narrowly scoped diagnostics, for example:

```bash
go test -run='^$' -gcflags='-m=2' ./internal/engine 2> escape.txt
# Inspect only the relevant production functions and their benchmark call sites.
```

The package is illustrative; select the actual target. Test code, sinks, changed
inlining conditions and callers can change escape decisions. Corroborate a reported
escape with measured allocation behaviour and lifetime. Do not derive an exact
allocations/op count by counting compiler messages. [S18]

Inspect generated code only when it answers a specific remaining question. Do not
add `//go:noinline`, disable bounds checks, build with `-N -l`, or introduce assembly
and then claim a normal production comparison. Diagnostic builds are not acceptance
builds. Do not infer target-architecture performance from a development laptop.

Keep hot code concrete when that both simplifies it and has a demonstrated benefit;
do not erase useful interfaces or duplicate generic implementations on principle.
Respect explicit no-reflection or dependency constraints independently of speed.

## Concurrency and external bottlenecks

Adding goroutines, sharding locks, atomics, or batching needs an explicit contention
or latency hypothesis. Preserve ordering, fairness where contractual, cancellation,
backpressure, bounded queueing and shutdown. Check the opposing workload: one worker,
low traffic, high contention, slow consumers, or a skewed key distribution.

A throughput increase can conceal worse tail latency, more in-flight work, or larger
memory peaks. Include these guardrails when relevant. Keep goroutine creation and
pooling behaviour representative; do not hide per-request startup outside timing.
The race detector exercises correctness but is not a proof that all races are absent.
Never use its timings for an optimisation claim. [S20]

When CPU is low and requests are slow, inspect scheduling, locks, queueing, syscalls,
and dependencies before rewriting the CPU hot path. Capture actual GOMAXPROCS and
container quotas: runtime defaults are toolchain/environment-sensitive. [S21]

## GC settings and PGO are separate experiments

Use allocation rate, live/scannable heap, GC CPU and latency evidence before changing
GC settings. `GOGC` and `GOMEMLIMIT` trade resources; a soft Go-runtime memory limit is
not a hard RSS or cgroup limit. Do not disguise unbounded retention by disabling GC
or increasing memory budgets. Never change library callers' global runtime settings
as an incidental optimisation. [S14]

PGO is a legitimate compiler-level candidate for CPU-bound applications. Keep its
profile representative of the deployed application, not just the edited microbenchmark.
Record the profile's provenance, revision and identity, and validate on independent
representative workloads rather than only the training workload. [S15]

Run source changes and PGO changes as separate comparisons or an explicit matrix.
Check automatic `default.pgo` discovery. Do not claim generic library-wide gains from
one application's profile or assume a stale profile is either useless or guaranteed
to remain effective. Evaluate the actual target build. [S15]

## Unsafe proposals

Respect project and task restrictions on unsafe code. Introducing it requires
exhausted safer candidates, a material measured benefit, a documented
lifetime/aliasing and concurrency argument, and supported-platform checks. No
zero-copy view may outlive its source or observe a supposedly immutable string
being mutated through recycled storage. A benchmark cannot establish memory safety.
