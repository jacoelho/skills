---
name: spectacular-spec-writing
description: Write or revise bounded software capability contracts using EARS requirements. Use for new or changed requirements, duplicate-rule cleanup, or handing settled requirements to an implementer; ordinary implementation status handoffs need no contract rewrite.
metadata:
  version: "2.0.0"
---

# Spectacular spec writing

Write the smallest current contract that makes the next consequential commitment deliberate and reviewable. Keep unresolved questions in the working record, not in the maintained contract.

The user's explicit task and decisions take precedence over this workflow. Preserve binding constraints and surface conflicts that need an authorised decision.

Read [EARS requirements and terms](references/ears.md) before drafting or revising normative statements. EARS is the only requirement syntax, including for invariants and proposed requirements. Repository conventions govern layout, not an alternative sentence form.

## Outcome

Produce a bounded contract or patch plus a short handoff. Keep normative intent separate from evidence, assumptions, delegated implementation freedom, and unresolved working questions. Reuse repository conventions before introducing new structure.

## 1. Establish the assignment

Start with the sources that can affect the next commitment: the request, the active or nearest contract, relevant decisions or binding constraints, and code or tests when behaviour, a defect, or reconciliation is in scope. Use repository guidance when it governs format or ownership. Identify the capability, intended outcome, boundary, affected revision or workspace state, and next commitment: discovery, investigation, implementation, or mechanical correction.

When target and deployed versions differ, name the target contract, deployed contract, and any transition rule separately. Do not use “current” for all three. Add transition scope only when an external contract, persisted data, in-flight work, compatibility promise, or deployed obligation actually binds it.

Narrow uncertain work rather than freezing unrelated scope. An investigation states the question, bounded experiment, observable result, and decision the result will inform.

## 2. Classify source material

Label important inputs as an authorised decision, binding external contract, executed observation, user-reported observation, code-reading inference, hypothesis, or proposed design. Preserve source and version where they matter.

Use implementation and tests as evidence of current behaviour. Use an authorised contract or decision to establish intended behaviour. An explicitly labelled, non-governing draft may contain proposed obligations; the maintained contract contains settled obligations. Preserve an existing obligation while a replacement remains unresolved. When sources disagree, classify the mismatch before editing either one.

## 3. Resolve consequential ambiguity

Find cases where two competent implementations could satisfy the wording yet produce different results a user or dependent component would notice. Use [the precision checks](references/precision.md) to expose each fork. For an interactive product decision, use `spectacular-spec-grilling` when available; otherwise use that reference's working-question form.

Keep the question in the working record and exclude dependent behaviour from the ready-to-implement slice until it is resolved or explicitly delegated.

## 4. Write obligations

Use [the contract template](assets/capability.md), adapting its layout to repository conventions. Write each obligation as one complete EARS sentence in its `Statement` field or equivalent requirement entry, following the reference's enforced lexical grammar. Tables, diagrams, and Gherkin illustrate requirements by reference; they do not define additional behaviour.

For each consequential requirement state:

1. applicability: actor/input/state/trigger/time or version;
2. observable required outcome and relevant prohibited effects;
3. definitions, units, identity, cardinality, or boundaries needed to interpret it;
4. rationale and source separately from the normative statement;
5. a stable identifier when it will be referenced or maintained across files.

Select the EARS pattern by applicability: ubiquitous, event-driven, state-driven, unwanted behaviour, optional feature, or complex. Preserve permissions as constraints on authorised behaviour, following the reference's permission rules. Separate obligations that can change independently and keep an indivisible state transition together. Express binding wire formats, error semantics, ownership rules, numerical algorithms, mandated dependencies, and deployment boundaries as EARS obligations referring to their definitions or governing sources.

## 5. Maintain one authoritative home

Inspect active specifications before adding a rule. Use [ownership and decomposition](references/ownership.md) when a rule overlaps or needs a new home. A capability owns its distinct behaviour; a shared contract owns a genuine cross-capability invariant or interface. Other documents reference that owner and add only their local refinement.

Compare applicability before merging similar statements. Differences in actor, state, version, quantifier, boundary, or permitted outcomes can make similar text distinct. Record relocations separately from semantic changes.

## 6. Attach acceptance evidence

For each consequential obligation, choose evidence appropriate to the claim: example, property, contract check, integration test, fault injection, model, benchmark, inspection, or user/operational validation. State the expected outcome, its independent basis, and the boundary to exercise. Mark planned evidence separately from evidence already executed against a named revision and environment.

Use `spectacular-bdd-gherkin` when it is available and Gherkin improves shared understanding; otherwise write the smallest equivalent examples directly. Scenarios illustrate rules; they are not a second authority for the rule.

## 7. Reconcile only affected behaviour

When writing a new contract or changing an existing promise, perform a focused comparison against sources that could conflict: active contracts, binding constraints, affected code paths, and relevant tests. Use [change handling](references/changes.md) for mismatch classifications and version transitions. An ordinary local writing change or repair under an unchanged valid contract does not require a full repository review or migration analysis. Use `spectacular-spec-review` when available; otherwise follow that reference and record only affected sources. Preserve a valid contract when code is wrong, and add migration or compatibility work only where a binding constraint requires it.

For the bundled declaration layout, mark maintained specification documents active with `<!-- spec-lint: active -->` and run the review skill's linter when available, including the referenced canonical roots. Resolve syntax errors before claiming automated compliance. If the executable is unavailable or the repository uses another declaration layout, report that enforcement limit; manual review does not count as an executed check.

## 8. Return the bounded result

Return:

- contract or patch and exact scope;
- changed obligations and their authoritative homes;
- focused reconciliation findings against affected sources, when applicable;
- remaining decisions and blocked work in the task or decision record, outside the current contract;
- acceptance basis and verification boundary;
- recommended next action: implement, investigate, revise, or no specification change.

For a handoff to another context, update the existing task record with retrievable contract and workspace identities, completed and remaining work, and references to checks actually executed with their results and limits. The recipient verifies relevant current sources before reusing an observation; refresh only evidence or decisions affected by a changed premise. A handoff points to governing obligations rather than redefining them.

Recommend implementation when the bounded scope has no unresolved consequential decision, applicable constraints are retrievable, required outcomes have a credible basis, and a feasible verification path exists.

For rationale on bounded commitments and keeping a change record tied to its contract, see [Spec-driven development without waterfall](https://www.jacoelho.com/blog/2026/09/spec-driven-development-without-waterfall/), [Writing specifications for coding agents](https://www.jacoelho.com/blog/2026/09/writing-specifications-for-coding-agents/), and [Keeping specifications in the change review](https://www.jacoelho.com/blog/2026/09/keeping-specifications-in-the-change-review/). These references inform the workflow; repository authority and user decisions govern the result.
