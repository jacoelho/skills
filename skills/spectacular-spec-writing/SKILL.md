---
name: spectacular-spec-writing
description: Write or revise a bounded capability contract of EARS requirements, invariants, and acceptance criteria, either maintained with the code or as a feature spec discarded after the change ships. Use when asked to write, draft, or update a spec, requirements, or acceptance criteria, to turn settled decisions into a contract, to consolidate duplicate or overlapping rules, or to hand settled requirements to an implementer. Also use to write Gherkin acceptance examples, Given/When/Then scenarios, .feature files, or an example map for a settled rule. Not for open product questions (use jacoelho:spectacular-spec-grilling) or status-only handoffs.
argument-hint: "[--anchored | --feature] [capability | decision record]"
---

# Spectacular spec writing

Write the smallest contract that makes the next piece of work deliberate and reviewable: settled obligations in EARS, each with acceptance evidence. Open questions stay in the decision record, never in the contract.

Scale output to the request. A one-requirement change returns the patch and any open questions, nothing else. Omit every section and return item that has nothing in it. A request for acceptance examples only goes straight to step 6.

Read [EARS](references/ears.md) from Keywords onward before writing a statement; it is the only requirement syntax, including for invariants. Its Terms table gives exact meanings, such as consequential and bounded commitment. Repository conventions decide layout, not sentence form.

## Steps

1. **Establish the assignment.** Read the request, the existing or nearest contract, the decision record, binding constraints, and the code and tests when behaviour or a defect is in scope. Name the capability, its boundary, and the next piece of work. When target and deployed versions differ, name each and any transition rule separately. Settle the lifecycle with [the lifecycle rules](references/lifecycle.md): the `--anchored` or `--feature` flag, then the existing contract or repository convention, then ask.
2. **Separate intent from evidence.** Code and tests show current behaviour; an authorised decision or contract sets intended behaviour. Keep an existing obligation until an authorised decision replaces it. When sources disagree, classify the mismatch with [the mismatch classes](references/mismatch.md) before editing either. For a defect, follow the Defects section of [change handling](references/changes.md).
3. **Find the forks.** Look for wording two competent implementations could both satisfy with different observable results. [The precision checks](references/precision.md) list where forks hide. Send an open product decision to `jacoelho:spectacular-spec-grilling`, or record it in the decision record, and keep dependent behaviour out of the ready-to-implement scope.
4. **Write the obligations.** Start from [the contract template](assets/capability.md). Write each obligation as one EARS sentence in its `Statement` field, with its applicability, observable outcome, prohibited effects, the definitions it needs, and its basis kept apart from the statement. Give it a stable ID when anything will reference it. Split obligations that can change independently; keep an indivisible transition in one. Leave code structure to the implementer unless [the verifiability test](references/precision.md#structure-and-verifiability) fails.
5. **Give each rule one home.** Search existing contracts before adding a rule. When a rule overlaps or needs a new home, follow [ownership](references/ownership.md); reference the owner instead of restating it.
6. **Attach acceptance evidence.** For each consequential obligation, state the expected outcome, its independent basis (oracle), and the boundary to exercise, and mark it planned or executed. Write scenarios with [the Gherkin guide](references/gherkin.md) when Given/When/Then helps; otherwise use the smallest plain examples.
7. **Reconcile what changed.** For a new contract or a changed promise, compare against the contracts, code paths, and tests that could conflict, using [change handling](references/changes.md) for impact and transitions. A local edit under an unchanged contract needs no wider review. Use `jacoelho:spectacular-spec-review` for a full reconciliation.
8. **Lint until clean.** Put `<!-- spec-lint: active -->` on the contract's first line and run the linter on it and every contract it references:

   ```sh
   python3 "${CLAUDE_SKILL_DIR}/../spectacular-spec-review/scripts/spec_lint.py" <spec roots>
   ```

   Fix each error and rerun until it exits 0. Resolve each `vague-term` warning with the fork test: add a bound, backtick a defined term, or quote literal data. If the linter cannot run, or the repository uses another layout, say so; reading the file yourself is not an executed check.

## Return

- The contract or patch, and its scope.
- Open decisions and blocked work, in the decision record.
- When present: structural commitments the implementer must keep, reconciliation findings, and the open discard-gate items of a feature spec.
- The next action: implement, investigate, revise, or no change. Recommend implementing only when no consequential decision is open, constraints are retrievable, outcomes have a basis, and a verification path exists; implementation follows `jacoelho:spectacular-spec-implementation`.

For a handoff to another session, update the decision record's Handoff section ([its shape](${CLAUDE_SKILL_DIR}/../spectacular-spec-grilling/assets/session.md)); point to obligations rather than restating them.

[The worked examples](examples/) show a filled contract, the decision record behind it, pointer ACs to Gherkin scenarios, and a shared invariant owned by another contract; lint `examples/` as one root.
