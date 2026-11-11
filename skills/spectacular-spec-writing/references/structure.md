# Structural commitments

A structural commitment binds part of the code's shape: boundary-crossing types, module boundaries, signatures, or permitted dependencies. It is a design decision with a recorded basis, not a default. A poor decomposition becomes a commitment that takes a decision to undo.

## When to make one

Apply the verifiability test before leaving structure open: could affordable evidence at the contract's boundary distinguish a correct implementation from a plausible wrong one? Evidence gathered only end to end can leave wrong compositions undetected when the implementer chooses the decomposition. Adding behavioural text does not close that gap; a structural commitment can.

Make one when the test fails and the work spans several components or implementers. A bounded change to existing code starts from a structure the code already fixes; refer to the boundary it changes instead of committing to it again.

## What to bind

Bind only what the evidence needs: the boundary-crossing types, module boundaries, signatures, or permitted dependencies. Leave private helpers open. Keep the declarations short; correct but over-detailed ones reduce an implementer's accuracy.

## Where it lives

Hold the commitment as declarations in the source language, such as stubs with types, signatures, and documented contracts, committed and reviewed with the code. Prose architecture descriptions are a weaker form.

Each declaration cites the requirement ID it refines and states no caller-visible behaviour that a requirement does not settle. A cross-component invariant remains an `INV` in its owning contract. The contract's Structural commitments section records only the declarations' location, revision, and the verifiability or integration reason for binding them; the contract stays organised by outcome.

## Who makes one

| When | Who | Records |
| --- | --- | --- |
| The verifiability test fails while the contract is written | The spec writer, in step 4 of `jacoelho:spectacular-spec-writing` | The declarations and the contract's Structural commitments section |
| A seam that bears on acceptance appears during implementation design | The implementation planner, after the user approves the design | The declarations, the record's Design table, and the contract's Structural commitments section. This is the only contract edit `jacoelho:spectacular-spec-implementation` makes. |
| A seam that only coordinates the work | The implementation planner | The implementation record only |

## Review

The declarations are a secondary source. Each traces to a requirement ID; one stating behaviour no requirement settles is an `unspecified case` ([mismatch classes](mismatch.md)). Check each component's obligations at that component's boundary, and keep capability-boundary evidence for how the components compose. When boundary evidence cannot tell a correct implementation from a wrong composition and no commitment exists, report an evidence gap and name the commitment or component check that would close it.
