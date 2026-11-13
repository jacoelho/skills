---
name: spectacular-spec-grilling
description: Interview the user about unresolved behavioural choices in software requirements, one concrete distinguishing case at a time, and keep a dependency-aware decision record that feeds an EARS contract. Use when a spec, requirement, or acceptance outcome is ambiguous, when asked to clarify, grill, or pin down requirements, or before writing a contract with open product decisions. Also use when the user asks what should happen in a specific case, debates two behaviours, or asks you to decide a product rule, even without naming a spec. Not for general plan or design critique, settled contracts, or mechanical changes.
argument-hint: "[spec | requirement]"
---

# Spectacular spec grilling

Settle the open product decisions that block the next increment, one question at a time, and keep the answers in a decision record. `jacoelho:spectacular-spec-writing` turns that record into the contract; this skill never edits contract text.

Scale the interview to the work. A settled contract or a mechanical, local fix needs no interview: say so and stop. For a small change, one or two questions are normal.

Read the Keywords and Patterns sections of [EARS](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/ears.md) first, and [terms](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/terms.md) when a word such as consequential or increment needs its exact meaning. EARS clauses (configuration, state, event, system, response) show which part of a requirement is missing.

## Steps

1. **Find the open decisions.** Read only what bears on the next increment: the request, the current contract, affected code and tests, and governing sources. Look facts up instead of asking for them. Classify each uncertainty as a missing fact (look it up), an empirical question (investigate, step 4), or a product choice (ask). Keep only consequential ones, as [terms](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/terms.md#work-and-authority) defines the word; every other question costs the user attention without changing the increment.
2. **Pick the next question.** Choose by cost of a wrong answer, then by how much other work waits on it. Ask a question only after the decisions it depends on are settled. Batch questions only when they are independent.
3. **Ask with a distinguishing case.** Give a small input, timeline, or failure that separates the plausible answers, say why it matters, and offer materially different observable outcomes. Recommend one only when evidence supports it. Use the structured question tool (AskUserQuestion in Claude Code) when available: decision ID, case, and why it matters in the question; one observable outcome per option; a supported recommendation first. It allows four options, so ask in text when there are more.
4. **Investigate instead of asking** when the answer is a fact or a measurement nobody has. Define the smallest check: the question, its limit, the observation that would change the decision, and what it delivers. Report what was observed and whether you executed it, inspected an artefact, or were told about it.
5. **Record and recompute.** Write the answer, its conditions, who decided it, and each option offered and rejected with the decider's stated reason (never an invented one) into the decision record, with the requirements it affects. Then repeat from step 2. A changed answer reopens only the decisions that depend on it. When an answer changes existing behaviour, classify the conflict with [the mismatch classes](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/mismatch.md) and leave full reconciliation to `jacoelho:spectacular-spec-review`.

Prefer observable questions:

```text
Decision Q-EXPORT-002: Two requests carry the same idempotency key but different content.

Case: request A creates invoice 17; request B arrives with A's key and a different amount.
Why it matters: decides whether retries can silently change an invoice.
Options: reject B with a conflict | return invoice 17 unchanged | treat B as a new request
Recommendation: reject B; the API contract already treats keys as identity.
```

Not "Should retries be robust?". This block is the one shape for an open question wherever it is recorded; the decision record's Next question section ([session.md](assets/session.md#next-question)) holds it, and `jacoelho:spectacular-spec-writing` records forks it cannot settle in the same shape. More patterns: [question patterns](references/questions.md).

## Stop

Stop when no consequential decision blocks the next increment, or each remaining one has a disposition: investigate (with an owner and the observation), exclude the dependent scope, defer independent work, or proceed within discretion the user delegated. Silence is not an answer, because a question nobody answered becomes a rule the implementer invents. If the user asks to proceed early, hand over the record and name the consequences of what is still open.

## Return

- The decision record's path, and whether it was created or updated.
- Decisions settled this session, each with its ID and authority.
- Remaining questions, each with its disposition and the work it blocks.
- The next action: write the contract with `jacoelho:spectacular-spec-writing`, investigate, or stop.

Omit any item that is empty. Point to the record's entries rather than restating them.

## Decision record

Use the existing decision record when there is one. Otherwise start one from [session.md](assets/session.md) at the place [the layout](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/lifecycle.md#layout) gives, `<capability>.decisions.md` beside the contract unless the repository has its own convention, and report its path. Keep one record per capability, without the spec-lint marker. Its Handoff section lists what a later session needs. For a feature contract, the record is discarded with the contract and lasting decisions move to an ADR or the PR description. A filled example: `spectacular-spec-writing/examples/booking-cancellation/booking-cancellation.decisions.md`.
