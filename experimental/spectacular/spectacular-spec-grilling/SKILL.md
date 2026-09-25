---
name: spectacular-spec-grilling
description: Clarify consequential software requirements with concrete, dependency-aware questions and a decision record. Use when a bounded commitment still has unresolved behavioural choices; skip when the contract settles the work or the change is mechanical.
metadata:
  version: "1.3.0"
---

# Spectacular spec grilling

Settle the next consequential decision needed for a bounded commitment. Keep clarification evidence-led and proportionate: a settled contract or a mechanical correction can proceed without an interview.

The user's explicit task and decisions take precedence over this workflow. Surface binding constraints when they conflict with a proposed choice.

## Choose the work

Identify the next commitment before asking a question. The next action may be:

- discovery, when the need or expected outcome is still unclear;
- a bounded investigation, when value is clear but feasibility or current behaviour needs evidence;
- implementation under an existing contract, when the behaviour is settled;
- a focused correction and check, when the change is mechanical and local.

Use grilling for unresolved product decisions that affect the next commitment. A user who explicitly authorises an investigation or prototype has authorised that bounded work; preserve its question, limit, observation, and decision impact. Do not turn silence or a temporary experiment into a product commitment.

## Outcome

Return the current scope, settled decisions and their basis, unresolved questions with a disposition, affected requirements or examples, and the next action. Keep unresolved decisions in the existing task or decision record until their basis is settled. The specification writer or maintainer owns normative edits; this skill owns clarification and its record.

## Start from available evidence

Read only evidence tied to the next decision: the request, relevant current contract and history, shared constraints or consumers, affected code or tests, and accessible governing sources. Inspect retrievable facts directly rather than asking the user to supply them. Classify uncertainty as a missing fact, product choice, or empirical question.

Separate observed behaviour, required behaviour, inference, and proposed change. When an existing contract or authoritative source already answers a question, verify its authority before asking the user. If sources disagree, present the concrete conflict as the question instead of asking the user to rediscover it.

## Record only consequential dependencies

For each consequential question, record:

- decision needed and current state;
- prerequisites and known evidence;
- affected requirements or work;
- authority able to decide it;
- evidence that would resolve an empirical question.

Use states open, resolved, needs-evidence, deferred, delegated, and excluded. Map dependencies when one answer gates another; keep independent questions separate. When evidence is missing, state the smallest investigation that could resolve it and the observation that would change the decision.

## Ask the next useful question

Prioritise decisions by consequence of a wrong answer, dependent work, reversibility, and available evidence. Ask one question when answers are sequential; batch only genuinely independent questions when doing so helps the user.

Use a distinguishing case:

```text
Decision Q-…: <one concrete question>

Case: <small input, timeline, or failure separating plausible answers>
Why it matters: <observable consequence or blocked work>
Options: <materially different outcomes, without a false forced choice>
Recommendation: <only when evidence supports one; state the trade-off>
```

Prefer observable questions such as “What should the caller receive after a retry?” over quality adjectives such as “Should retries be robust?”.

After the answer, record its exact conditions, link affected requirements and examples, and recompute the eligible questions. A changed premise reopens only the decisions that depend on it.

## Run a bounded investigation

When a missing fact or empirical question could change the next commitment, define the smallest authorised investigation with:

- the question it must answer;
- scope, time or resource limit, and accessible boundary;
- the observation that would change the decision;
- the deliverable and the next decision it informs.

Use the actual boundary and an independently agreed expected result where practical. Report the named question or claim, observed result, input and environment state, and limits. Identify whether each item is a supplied report, an inspected artifact, or a check executed here; include a check or command reference only when it was actually executed. Keep observations separate from recommendations. Temporary fixtures, formats, or implementation scaffolding create no external contract by themselves.

## Reconcile answers with current sources

When an answer changes existing behaviour, compare it with active specifications, shared contracts, relevant code paths, and tests. Present the concrete conflicting case and classify the change as a proposed deliberate change, a likely defect in an existing source, or unresolved authority. Hand full reconciliation to `spectacular-spec-review` when available. If it is unavailable, perform that comparison directly and record the conflict, authorities, affected requirements or examples, proposed disposition, and unresolved owner in the existing task or decision record.

## Stopping condition

Stop when the next bounded commitment has no unresolved consequential product decision, or every remaining uncertainty has an explicit disposition: investigate it with an owner and observation, exclude dependent scope, defer independent work, or proceed within explicitly delegated discretion.

Treat silence as an open question until a disposition is recorded. If the user asks to draft or proceed earlier, return the best available decision record and identify the unresolved consequences rather than filling them implicitly.

## Supporting material

- Read [question patterns](references/questions.md) when selecting the question type or shaping a distinguishing case.
- Use the existing task or decision record when one exists. Use [session.md](assets/session.md) only as an optional starting shape when no suitable record exists or its handoff fields are missing; update one record instead of creating a second ledger.
- Background: [without waterfall](https://www.jacoelho.com/blog/2026/09/spec-driven-development-without-waterfall/), [writing specifications](https://www.jacoelho.com/blog/2026/09/writing-specifications-for-coding-agents/), and [the invoice walkthrough](https://www.jacoelho.com/blog/2026/09/spec-driven-development-an-invoice-export-walkthrough/).
