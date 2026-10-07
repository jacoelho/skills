# API design record: <capability>

Use only the sections justified by the task. Replace placeholders; do not leave
an empty template as the deliverable.

## Decision

Recommended API, the caller task it serves, and why this boundary is appropriate.
Mode: design / review / evolve.
Scope and compatibility baseline:
Hard constraints:
Material assumptions:

## Caller examples

Show complete imports and relevant setup, error handling, cleanup, and ownership.
Identify the common task, important composition, and relevant failure/lifecycle use.
For each example, record whether it is a sketch, stub-compiled, or behaviour-tested.

## API and contracts

Signatures and draft doc comments. Include only applicable contracts:

| Concern | Promise or deliberate non-promise | Acceptance probe |
|---|---|---|
| Inputs and completion | | |
| Defaults and configuration | | |
| Ownership, mutation, lifetime | | |
| Error inspection and partial state | | |
| Extension and nested operations | | |
| Lifecycle and concurrency | | |
| Resource budgets | | |

## Alternatives that mattered

Compare the same use cases and guarantees. Include keeping the existing API for an
evolution task. Explain why the selected alternative wins and what it gives up.
Do not invent alternatives merely to fill this section.

## Counterexample and simplification

Strongest objection:
Counterexample attempted:
Simplification attempted:
Resulting revision or reason to keep the design:

## Verification

Toolchain and relevant build configuration:
Commands actually executed and outcomes:
Source locations inspected:
Behaviour not yet established:
No benchmark or agent evaluation should be implied by a structural file check.

## Delivery obligations

Implementation and regression-test obligations:
Compatibility and migration effects:
Decisions required now:
Additions safely deferred:
