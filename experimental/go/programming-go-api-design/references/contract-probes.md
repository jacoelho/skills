# Contract probes

Select probes by risk. They are candidate acceptance tests, not universal laws.
Write down the preconditions, intended result, and any deliberately allowed
asymmetry before testing. Use the same requirements for every alternative design.

## Composition continuity

Choose a meaningful policy, custom handler, nested input, and failure.
Exercise the direct path and the composed path. Compare interpretation, enforcement,
error category/location, ownership, and resource accounting. A different callback
implementation may intentionally change semantics; document the boundary rather
than asserting equivalence blindly.

**Counterexample:** strict validation is enabled on the outer decoder, but a custom
handler invokes an unrelated parser using defaults. Policy is lost at that boundary.
A method receiving the original operation state might preserve it; that design
still needs a test and a clear callback contract.

## Entry-point agreement

For a library offering bytes, reader/writer, and reusable-state entry points,
compare the outcomes on the same logical input and effective configuration.
Allow documented differences such as framing, whitespace, ownership, and read-ahead.
Do not equate semantic equality with byte-for-byte equality when ordering is
unspecified. Do not add missing entry points just to make this probe applicable.

## Consumption and completion

Try empty input, valid input, valid input plus whitespace, valid input plus another
value, valid input plus invalid data, and truncated input. Distinguish an operation
that validates a finite document from one that consumes the next stream item.

Check how a caller proves completion and notices errors. With a reusable decoder,
ask whether read-ahead means the caller must continue through that decoder rather
than resume directly on its underlying reader. For a network stream, identify
framing or another real boundary; EOF may never arrive.

## Configuration precedence and isolation

Where layered options are supported, test defaults, caller overrides, explicit
false/zero, conflicting options, and nested overrides. Verify the documented winner.
Then run a sibling operation and prove temporary overrides did not leak.

If grouping options promises equivalent behaviour to passing them separately,
test that property. Do not assume it for arbitrary imperative options with side
effects. Reuse configurations concurrently only when that is a promised contract.

## Ownership and branch independence

Retain a result, advance or reset the producer, and check its promised validity.
Clone when that is the intended escape hatch, then mutate or advance either side.
Test input mutation after construction according to the documented ownership rule.

For a persistent builder, derive two children from one base and change each child.
Verify the other child and base remain unchanged. Include a case with spare slice
capacity: a shallow copy that happens to reallocate can hide aliasing mistakes.

## Failure observability

Trigger an invalid input, underlying reader/writer failure, callback failure, and
invalid configuration as relevant. Verify error inspection through wrapper layers,
location information, partial mutation/output, and subsequent-operation behaviour.
Avoid pinning exact error prose unless it is a deliberate compatibility promise.

Do not assume it is safe to retry a partially completed write. If retries matter,
show the idempotency or progress contract explicitly.

## Lifecycle and early termination

Stop iteration early, omit further calls, return an error from the callback, close
twice, use after close, and reset after success/failure where those operations exist.
Check resource release and error observation. Verify whether an operation takes
ownership of a caller-provided resource rather than assuming it closes it.

For cancellation, identify the work that can actually stop and how promptly. Do
not claim a context cancels an arbitrary blocking `Read`. For internal goroutines,
identify who stops and joins them, including when the consumer stops reading.

## Type-system and compatibility probes

Use an external test package. Compile complete caller code including function-value
assignments, method values, desired interface satisfaction, and generic inference.
Try supported defined types, non-addressable values where relevant, and nil values.

For an API change, keep the old valid caller source unchanged as a compatibility
fixture. A prototype stub verifies signatures only. Follow it with behaviour tests
once implementation exists. Compilation failures are facts; whether the extra type
complexity is worth its benefit is a design decision.

## Cost probes

Identify the smallest representative workload that distinguishes designs: one-shot
versus repeated use, small versus large input, shallow versus nested extension,
or retained versus immediately consumed output. Define budgets separately for
setup and steady state. Measure the full caller task, including adapters and copies.
Do not put pooling into the example unless the API or workload actually requires it.

## Documentation probe

Ask a reader to use only the package overview, signature, and relevant doc comment.
Can they determine completion, lifetime, failure behaviour, defaults, and ownership?
Use their wrong-but-reasonable interpretation as design evidence. An imagined
reader's confusion is a hypothesis, not a reported user study.
