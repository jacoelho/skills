# Precision checks

Use only the checks that can distinguish acceptable from unacceptable behaviour in the assigned scope. This is a working aid, not a required section list.

## Find a behavioural fork

Take an important sentence and construct two implementations that interpret it differently. Supply the smallest input or event sequence that exposes the difference. If both outcomes are deliberately acceptable, state that discretion. Otherwise resolve the decision rather than making the prose longer.

“Keep the latest record” is unresolved until the relevant clock, comparison, tie, missing value, and scope of identity are known. It need not specify a sorting algorithm.

When the decision is not settled interactively, record the fork in the decision record:

```text
Question: <one concrete choice>
Case: <small input, state, or event that separates the choices>
Why it matters: <observable consequence or blocked work>
Options: <materially different outcomes>
```

## Write a decidable obligation

Use the applicable pattern from [EARS requirements](ears.md), the sole requirement syntax. Use the ubiquitous pattern for an unconditional invariant or declarative constraint; configuration and state clauses may scope an invariant, without an activating event or unwanted-condition clause. Supporting definitions give terms precise meanings; behavioural obligations remain in EARS statements.

Keep one independently reviewable obligation per requirement. If changing a clause should not change its neighbour, they probably deserve separate identifiers. If the guarantee is atomicity of a transition, splitting its coupled effects may obscure rather than improve the requirement.

## Conditions that change meaning

| Dimension | Clarification to seek when relevant |
| --- | --- |
| Identity | Scope of uniqueness; comparison, normalisation, collision, missing identity. |
| Time | Clock or logical event; inclusive/exclusive limits; duration versus calendar period; time zone; ties. |
| Quantifiers | Every versus some; per account versus global; each attempt versus each logical operation. |
| State | Preconditions, terminal states, simultaneous transitions, permitted observations. For an entity with a lifecycle, the full set of states users can observe, each allowed transition with its trigger, and the response to a refused transition; a transition table may illustrate these requirements by ID. |
| Failure | Error exposed to the caller; committed and uncommitted effects; ambiguous completion; recovery. |
| Retry | What is repeated; identity scope; retention window; same key with different content. |
| Permissions | Relevant identity, resource, decision boundary, freshness, and policy-source failure. |
| Preservation | What must remain unchanged on success, rejection, cancellation, or a binding transition. |
| Interaction | Producer and consumer obligations; ordering; ownership handoff; version coexistence. |
| Discretion | Which alternatives are explicitly acceptable and which remain undecided. |
| Quality attributes | Security and privacy, accessibility, observability, and operability, when the change touches them: who may see what, which users and assistive technologies, what an operator must be able to detect, and how it is deployed, configured, and recovered. |

Do not automatically adopt an answer implied by the examples in this guide.

## Quantitative requirements

An enforceable quantitative promise normally identifies the operation, population or workload, relevant environment, units, statistic, observation interval, and measurement boundary. Some of these may be fixed by an existing reference.

“Fast under load” is not decidable. “p95 below 200 ms” is still incomplete when the workload, failures included, measurement boundary, and environment are unknown. A speculative number should become a provisional target with a measurement question, not a firm-looking requirement.

Do not ask for a statistical measure when the actual obligation is a hard per-operation bound. Do not substitute a percentile for that stronger promise without a decision.

## Requirements versus design

Use an alternative-mechanism test: would a different implementation preserve all of the caller's promises and binding constraints? If yes, the mechanism can usually be proposed separately or left open.

Do not apply this as “all technical detail is design”. Public schemas, error semantics, memory lifetimes, and numerical behaviour can be essential obligations. An authorised deployment or dependency constraint also remains binding even when not directly user-visible.

## Structure and verifiability

Before leaving structure open, apply a verifiability test: could affordable evidence at the contract's boundary distinguish a correct implementation from a plausible wrong one? Evidence gathered only end to end can leave wrong compositions undetected when the implementer chooses the decomposition. Adding behavioural text does not close that gap; a structural commitment can.

Make one when the test fails and the work spans several components or implementers. Bind only what the evidence needs: boundary-crossing types, module boundaries, signatures, or permitted dependencies. Leave private helpers open. A bounded change to existing code starts from a structure the code already fixes; refer to the boundary it changes instead.

Hold the commitment as declarations in the source language, such as stubs with types, signatures, and documented contracts, committed and reviewed with the code. Prose architecture descriptions are a weaker form. Keep stub contracts short; correct but over-detailed ones can reduce an implementer's accuracy.

The capability contract stays organised by outcome and records only the commitment's location and reason. A stub contract refines a requirement and cites its identifier; it states no caller-visible behaviour that a requirement does not settle. A cross-component invariant remains an `INV` declaration in its owning contract. Check each component's obligations at that component's boundary, and keep capability-boundary evidence for how the components compose.

A poor decomposition becomes a commitment that takes a decision to undo. Treat a structural commitment as a design decision with a recorded basis, not as a default.

## Acceptance shape

A criterion records the situation, expected observation, prohibited observation where relevant, expectation's basis, and test boundary. For important cases, name a deliberately wrong implementation or changed input that should make the check fail.

An invariant or a rule over every member of a domain defaults to a property check with a named input domain; a list of examples is enough only when the domain can be enumerated. A property can be useful without being an independent basis for the requirement. For example, idempotence can verify a chosen deduplication rule without establishing that the user's workflow wants that rule.
