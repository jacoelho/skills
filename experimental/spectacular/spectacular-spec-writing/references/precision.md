# Precision checks

Use only the checks that can distinguish acceptable from unacceptable behaviour in the assigned scope. This is a working aid, not a required section list.

## Find a behavioural fork

Take an important sentence and construct two implementations that interpret it differently. Supply the smallest input or event sequence that exposes the difference. If both outcomes are deliberately acceptable, state that discretion. Otherwise resolve the decision rather than making the prose longer.

“Keep the latest record” is unresolved until the relevant clock, comparison, tie, missing value, and scope of identity are known. It need not specify a sorting algorithm.

When the clarification skill is unavailable, record the fork in the working record:

```text
Question: <one concrete choice>
Case: <small input, state, or event that separates the choices>
Why it matters: <observable consequence or blocked work>
Options: <materially different outcomes>
```

Do not copy the unresolved question into the current contract.

## Write a decidable obligation

A useful sentence shape is:

> Under [conditions], when [event], [system boundary] must [observable outcome], with [relevant bound or prohibited effect].

Do not mechanically force unconditional invariants or declarative constraints into an event sentence. Supporting definitions can carry detail without repeating it in every rule.

Keep one independently reviewable obligation per requirement. If changing a clause should not change its neighbour, they probably deserve separate identifiers. If the guarantee is atomicity of a transition, splitting its coupled effects may obscure rather than improve the requirement.

## Conditions that change meaning

| Dimension | Clarification to seek when relevant |
| --- | --- |
| Identity | Scope of uniqueness; comparison, normalisation, collision, missing identity. |
| Time | Clock or logical event; inclusive/exclusive limits; duration versus calendar period; time zone; ties. |
| Quantifiers | Every versus some; per account versus global; each attempt versus each logical operation. |
| State | Preconditions, terminal states, simultaneous transitions, permitted observations. |
| Failure | Error exposed to the caller; committed and uncommitted effects; ambiguous completion; recovery. |
| Retry | What is repeated; identity scope; retention window; same key with different content. |
| Permissions | Relevant identity, resource, decision boundary, freshness, and policy-source failure. |
| Preservation | What must remain unchanged on success, rejection, cancellation, or a binding transition. |
| Interaction | Producer and consumer obligations; ordering; ownership handoff; version coexistence. |
| Discretion | Which alternatives are explicitly acceptable and which remain undecided. |

Do not automatically adopt an answer implied by the examples in this guide.

## Quantitative requirements

An enforceable quantitative promise normally identifies the operation, population or workload, relevant environment, units, statistic, observation interval, and measurement boundary. Some of these may be fixed by an existing reference.

“Fast under load” is not decidable. “p95 below 200 ms” is still incomplete when the workload, failures included, measurement boundary, and environment are unknown. A speculative number should become a provisional target with a measurement question, not a firm-looking requirement.

Do not ask for a statistical measure when the actual obligation is a hard per-operation bound. Do not substitute a percentile for that stronger promise without a decision.

## Requirements versus design

Use an alternative-mechanism test: would a different implementation preserve all of the caller's promises and binding constraints? If yes, the mechanism can usually be proposed separately or left open.

Do not apply this as “all technical detail is design”. Public schemas, error semantics, memory lifetimes, and numerical behaviour can be essential obligations. An authorised deployment or dependency constraint also remains binding even when not directly user-visible.

## Acceptance shape

A criterion records the situation, expected observation, prohibited observation where relevant, expectation's basis, and test boundary. For important cases, name a deliberately wrong implementation or changed input that should make the check fail. Keep unresolved questions in the working record rather than presenting them as current contract text.

A property can be useful without being an independent basis for the requirement. For example, idempotence can verify a chosen deduplication rule without establishing that the user's workflow wants that rule.
