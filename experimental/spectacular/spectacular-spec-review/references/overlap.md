# Semantic overlap review

## Review the obligations, not their vocabulary

Normalise each consequential rule temporarily as:

```text
identifier and maintained home
system boundary / responsible actor
resource or operation
applicability: state, input, tenant, version, workload, time
required, permitted, and forbidden outcomes
basis and authority
references, refinements, and known dependencies
```

A document-level condition applies to its contained rules unless the contract says otherwise. Carry that context into the comparison. Do not compare isolated sentences after discarding their scope.

## Ask whether their applicability intersects

Construct an input or execution trace to which both rules apply. If none is established, do not assert a conflict merely because the same words or numbers occur. When missing conditions prevent this judgement, report the missing conditions.

For rules that apply together, ask whether an outcome exists that satisfies all of them. The question may concern a set of executions, not just one response: a percentile bound, fairness obligation, or eventual completion guarantee cannot always be evaluated per request.

These are reasoning aids, not a claim that arbitrary prose has been formally proved satisfiable.

## Classify before proposing an edit

| Relationship | Witness or reason | Action |
| --- | --- | --- |
| Duplicate authority | Two current homes independently define the same obligation under the same conditions. | Select one canonical definition; reference it elsewhere. |
| Contradiction | A shared applicable case cannot satisfy both obligations. | Expose the conflict; obtain an authorised change or narrow scope. |
| Partial overlap | Some clauses duplicate while others have distinct applicability or effects. | Factor only the genuinely shared obligation; preserve unique clauses. |
| Legitimate refinement | A local rule adds an authorised stronger or more specific promise without contradicting its parent. | Keep its own ID and explicit relationship. |
| Shared applicability | Different, jointly necessary obligations govern the same execution. | Keep both; verify the interaction. |
| Disjoint cases | Actor, state, version, or another condition separates the obligations. | Preserve the distinction; check the boundary between cases. |
| Uncertain relationship | Missing context or authority prevents classification. | Identify the exact evidence or decision needed. |

## Worked cases

### Duplicate authority

Rule A: a successful cancellation of a pending booking increases available stock by one.
Rule B in another current document: cancelling a pending booking successfully returns one unit to available stock.

With the same booking model and event boundary, these are candidate duplicate definitions. Select one maintained home after checking neither document carries an additional condition. The fact that two independent checks verify this guarantee is not itself duplication of normative authority.

### Contradiction

Rule A: cancelling an already cancelled booking returns success without a state change.
Rule B: every cancellation of a non-pending booking returns a conflict response.

An already cancelled booking is non-pending. Both rules apply and prescribe incompatible responses. The repair requires an explicit exception or changed rule; averaging the wording cannot resolve it.

### Valid refinement, not contradiction

A shared service contract bounds each operation at five seconds under workload W.
A capability adds a two-second bound for operation X under that same workload.

The promises can hold together. The two-second bound is stronger, so verify its authority and feasibility rather than deleting it as contradictory. If the shared rule guarantees a deliberately exact duration instead of an upper bound, the classification may differ.

### Shared applicability

One rule defines which cancellation transition may succeed.
A separate invariant prohibits negative available stock across all operations.

Both may apply to a cancellation. They do not define the same obligation. A shared state does not imply duplicated authority.

### Misleading similarity

“Release one unit after a pending booking is cancelled” and “do not release stock when cancelling a confirmed booking is rejected” concern different states and outcomes. Merging them into an unconditional release rule would create a defect.

## Pairwise review is insufficient

Three rules can be jointly inconsistent while every pair is satisfiable:

```text
R1: exactly one of A or B is enabled.
R2: exactly one of B or C is enabled.
R3: exactly one of A or C is enabled.
```

For Boolean A, B, and C, each pair has solutions. The three together do not. Treat a pairwise scan as one technique, not a proof of global consistency.

Also inspect lifecycle traces. A retention policy, permission rule, and retry guarantee may be individually clear but incompatible during a failure or expiry boundary.

## Required evidence in a finding

State the relevant IDs and source revisions, the common applicability, the concrete witness or missing fact, the competing outcomes, and the consequence. Propose the smallest semantics-preserving edit where possible. Otherwise name the decision owner and the unresolved choice.

Never report “no overlap exists” from keyword search, embeddings, a clean identifier scan, or a selected pairwise sample. Report the corpus and interactions examined and what remains outside the assessment.
