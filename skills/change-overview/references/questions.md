# Questions

Each section is a question the approver should be able to answer about the change. Keep a question only when the change has its subject: a change with no process boundary has no delivery question. Each kept question goes on the page with the code that answers it or the statement that the code does not.

Questions direct attention. They are not rules and do not produce verdicts.

## Ownership

**Applies when** the change adds, moves or duplicates a fact, an invariant, a state machine or a decision.

- Which component owns each such fact after the change? Is there more than one writer?
- Where a value is copied, cached or derived, what is it derived from, and what keeps it in step?

**Show:** a table of fact or rule → owning component → other writers and readers, each with `path:line`.

## Contracts

**Applies when** the change alters an exported type, signature, schema, wire or storage format, configuration key, endpoint or event.

- Which consumers exist, inside and outside the diff, and which of them change with it?
- Does already stored or already sent data still read correctly? Is the change breaking, and is that stated?
- Does the change keep an old path or a shim next to the new one, and what removes it later?

**Show:** both ends of each contract, and every consumer the references search found.

## Boundaries and input

**Applies when** data enters from outside the component: a user, a file, the network, another process or another team's code.

- Where is the input checked and normalised? Can partially valid data reach the logic behind it?
- Does vendor- or transport-shaped data travel past the boundary?

**Show:** the entry point and the first place the input is checked.

## State and lifecycle

**Applies when** the change adds or alters a goroutine, thread, task, queue, cache, connection, subscription or file handle.

- Who starts it, who stops it, and what happens on cancellation and on failure?
- What happens to work in flight at shutdown?

**Show:** the start, the stop and the failure path for each.

## Bounds

**Applies when** the change adds concurrency, a loop over external input, a buffer, a batch, a retry or a wait.

- What limits it: count, size, time, rate? What happens when the limit is reached?

**Show:** the limit and where it is enforced, or that none exists.

## Failure

**Applies when** the change adds, removes or alters error handling, a fallback, a default, a retry or a guard.

- Which errors reach the caller, which are logged, which disappear?
- When the change tolerates a state (a default, a clamp, a skipped item), what input or contract permits that state?
- What does a partial failure leave behind?

**Show:** each changed error path, and any removed safety net on the old side.

## Distribution

**Applies when** the change crosses a process or service boundary, or reads or writes a queue or shared store.

- What ordering and delivery does each message rely on? Where is it acknowledged?
- Is a retry safe: is the operation idempotent or deduplicated?
- What happens on timeout, and on a partial write?

**Show:** the changed exchange as a component graph with numbered arrow labels, with the acknowledgement point marked.

## Concurrency

**Applies when** the change shares mutable state between threads, goroutines, requests or processes.

- What protects each shared value? Can two writers interleave?

**Show:** the shared state and its protection.

## Cost

**Applies when** the change touches a path that runs per request, per item or per message.

- What work does the change add or remove there: allocations, queries, round trips, locks?

**Show:** a small before and after table derived from the code. Measurements reported in the PR are author claims: label them as such.

## Deletion

**Applies when** the change replaces behaviour.

- Is the old path deleted, or does it remain beside the new one? What still reaches it?

**Show:** the removed code, or the remaining callers of the old path.

## Verification

**Applies always.**

- Which behaviours from the groups do the tests pin down, by their assertions?
- Which removed tests stop checking something that still matters?
- Which implications or failure paths have no test?

**Show:** the tests by group, and the uncovered behaviours.
