# Architecture Checks

Read only the sections relevant to the current decision. These are falsification prompts, not mandatory report headings.

## Semantic owner versus primitive

Trace both the closest semantic helper and the lowest-level primitive.

Prefer the semantic owner when it already owns the invariant and caller migration is bounded and mechanical. Prefer the primitive when a helper would only rename a call or create pass-through structure. Compare a dedicated operation owner when encoding, routing, lookup, retry, or similar behavior forms one cohesive capability that belongs to neither the data owner nor the caller.

## Capability completeness

Before extending an existing object or module, inventory what it already owns:

- canonical and derived state;
- dependencies and policies;
- construction, reload, and teardown lifecycle;
- validation and serialization responsibilities;
- callers and direct low-level users.

Proximity is not ownership. Do not enlarge a decoder, registry, mapper, or configuration object merely because it already sees adjacent data.

## Existing semantic interfaces

Before exporting a new internal API or duplicating conversion or validation, look for established semantic bridges such as SQL, IPC, plugin, protocol, or configuration interfaces. Compare validation ownership, versioning, atomicity, failure semantics, and coupling. Crossing a layer through a stable semantic interface can be cleaner than adding a tighter internal dependency.

## Lifecycle locality

Separate the source of configuration from the runtime owner of an invariant. Materializing stable policy into an object at construction is not necessarily duplicate ownership.

Trace object birth, reload or reconstruction, and at least one direct caller or test. Store policy on the object when it is stable for the object's lifetime and reload rebuilds the object. Pass policy per operation only when it genuinely varies per call, cannot be snapshotted safely, or is part of the operation's public semantics.

## State and result semantics

Use repository-native semantic states when consumers distinguish concepts such as retired, hidden, disabled, reserved, absent, defaulted, or explicitly overridden. A boolean or generic visibility flag is equivalent only when it drives the same downstream behavior.

Trace result codes and errors through every consumer. When a new condition would reuse an old code with broader meaning, split the internal representation and migrate consumers while preserving existing observable behavior.

## Independent policies

List the policies the change actually affects, such as value construction, reference movement, descendant rewriting, precedence, persistence, retry, and presentation. Confirm that the proposed mechanism can express each required outcome independently. Do not collapse distinct policies into one convenient API, and do not make unrelated policies configurable without a present requirement.

## Shared paths

Before unifying similar flows, prove that the same invariant applies to each path and that each path is reachable for the affected state. Shared-looking tails are not proof of a shared owner. Centralize only the smallest genuinely shared policy; leave unrelated polling, accounting, cleanup, or recovery lifecycles separate.

## Waits, retries, and asynchronous phases

For a new wait, retry loop, or asynchronous phase, define how tests can:

- observe entry into the phase;
- release or advance it deterministically;
- bypass it in pre-existing scenarios whose purpose is elsewhere;
- verify the consumer boundary when the invariant crosses subsystems.

## Module depth and locality

Suspect shallow structure when understanding one domain concept requires bouncing through many small modules, an interface exposes nearly the implementation's full complexity, or extraction improved unit-test access while hiding integration behavior.

Use the deletion test as evidence: if deleting a module only moves its complexity into callers, it is probably shallow; if deletion forces callers to absorb meaningful policy or invariants, the module carries leverage. Treat this as a heuristic, not mandatory vocabulary.

## Change-surface prediction

Before implementation, predict the files and symbols likely to change and why. Low confidence is acceptable; silent surprise is not. A materially larger or differently directed change surface is evidence that an ownership assumption may be wrong and should trigger design revision.
