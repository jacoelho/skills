---
name: spectacular-spec-writing
description: Write or revise a bounded capability contract of EARS requirements, invariants, and acceptance criteria, either anchored to the code or a feature contract discarded after the change ships. Use when asked to write, draft, or update a spec, requirements, or acceptance criteria, to turn settled decisions into a contract, to consolidate duplicate or overlapping rules, or to hand settled requirements to an implementer. Also use to write acceptance criteria or case tables for a settled rule. Not for open product questions (use jacoelho:spectacular-spec-grilling) or status-only handoffs.
argument-hint: "[--anchored | --feature] [capability | decision record]"
---

# Spectacular spec writing

Write the smallest contract that makes the next increment deliberate and reviewable: settled obligations in EARS, each with acceptance evidence. Open questions stay in the decision record, never in the contract.

Scale output to the request. A one-requirement change returns the patch and any open questions, nothing else. Omit every section and return item that has nothing in it. A request for acceptance examples only goes straight to step 6.

## Artefacts

| Artefact | Template | Written by | Lives | Lint marker |
| --- | --- | --- | --- | --- |
| Contract | [capability.md](assets/capability.md) | This skill | Per the [layout](references/lifecycle.md#layout) | Yes |
| Decision record | [session.md](${CLAUDE_SKILL_DIR}/../spectacular-spec-grilling/assets/session.md) | `jacoelho:spectacular-spec-grilling`; this skill reads it, records open forks and decisions given in conversation as entries, and updates its Handoff | Per the [layout](references/lifecycle.md#layout) | No |
| Evidence map | [declarations](references/declarations.md#evidence-map) | The implementation's test writer | Beside the contract | No |
| Structural commitment | Source-language stubs | This skill or the implementation planner ([structure](references/structure.md)) | In the code; the contract records where | No |
| Implementation record | `jacoelho:spectacular-spec-implementation` | That skill | Beside the contract | No |

Read [EARS](references/ears.md) before writing a statement; it is the only requirement syntax, including for invariants. [Declarations](references/declarations.md) gives every field, which are required, and what makes a rule accepted. Look a word up in [terms](references/terms.md) when a step turns on it, such as consequential or increment. Repository conventions decide layout, not sentence form.

## Steps

1. **Establish the increment.** Read the request, the existing or nearest contract (its `outline`, then the rules in scope with `show`, as [the tools reference](${CLAUDE_SKILL_DIR}/../spectacular-spec-review/references/tools.md) describes), the decision record, binding constraints, and the code and tests when behaviour or a defect is in scope. Name the capability, its boundary, and the increment. When target and deployed versions differ, name each and any transition rule separately. Settle the lifecycle with [the lifecycle rules](references/lifecycle.md): the `--anchored` or `--feature` flag, then the existing contract or repository convention, then ask.
2. **Separate intent from evidence.** Code and tests show current behaviour; an authorised decision or contract sets intended behaviour. Keep an existing obligation until an authorised decision replaces it. When sources disagree, classify the mismatch with [the mismatch classes](references/mismatch.md) before editing either. For a defect, follow the Defects section of [change handling](references/changes.md).
3. **Find the forks.** Look for wording two competent implementations could both satisfy with different observable results. [The precision checks](references/precision.md) list where forks hide. Send an open product decision to `jacoelho:spectacular-spec-grilling`, or record it in the decision record, and keep dependent behaviour out of the ready-to-implement scope, because an implementer handed an open fork settles it by accident.
4. **Write the obligations.** Start from [the contract template](assets/capability.md). Write each obligation as one EARS sentence in its `Statement` field, keeping its applicability, observable outcome, prohibited effects, the definitions it needs, and its basis apart from the statement. Shape it as [short statements](references/ears.md#keep-each-statement-short) describes: an ordered choice becomes a rule table, a list of forms a TERM with a Basis, and nothing normative goes in Rationale. Give it a stable ID when anything will reference it. Split obligations that can change independently; keep an indivisible transition in one. Give it a Basis only when a citation [declarations](references/declarations.md#acceptance) allows exists; otherwise it stays proposed, with no Basis. Leave code structure to the implementer unless [the verifiability test](references/structure.md#when-to-make-one) fails.
5. **Give each rule one home.** Search existing contracts before adding a rule. When a rule overlaps or needs a new home, follow [ownership](references/ownership.md); reference the owner instead of restating it.
6. **Attach acceptance evidence.** Give every REQ and INV with a Basis at least one AC, nested under it, since a rule with no criterion can never be shown to hold or fail: the expected outcome, its oracle, and the boundary where it is observed. Tests are listed in the capability's [evidence map](references/declarations.md#evidence-map), never in the contract. For every AC that states its own cases, add a counterexample; for every rule, walk the precision dimensions as [the acceptance shape](references/precision.md#acceptance-shape) describes, and put the distinguishing cases in a [case table](references/declarations.md#case-tables).
7. **Reconcile what changed.** For a new contract or a changed promise, compare against the contracts, code paths, and tests that could conflict, using [change handling](references/changes.md) for impact and transitions. A local edit under an unchanged contract needs no wider review. Use `jacoelho:spectacular-spec-review` for a full reconciliation.
8. **Lint until clean.** Put `<!-- spec-lint: active -->` on the contract's first line and run the linter on it and every contract it references:

   ```sh
   python3 "${CLAUDE_SKILL_DIR}/../spectacular-spec-review/scripts/spec_lint.py" <spec roots>
   ```

   Fix each error and rerun until it exits 0. Resolve each `vague-term` warning with the fork test: add a bound, backtick a defined term, or quote literal data. If the linter cannot run, or the repository uses another layout, say so; reading the file yourself is not an executed check.

## Review findings

The review is read-only; you decide what happens to each finding from `jacoelho:spectacular-spec-review` or any other reviewer, and give it exactly one outcome:

- **Fix:** edit the contract with the steps above, then lint (step 8).
- **Contest:** the finding is wrong. Cite evidence the reviewer could read: a contract ID, a decision record entry, or a file and symbol. "This was intentional" is not evidence, and having written the contract, your wish to contest is not evidence either. A divergence found by the review's paraphrase reader cannot be contested: the contract failed to say what was meant.
- **Escalate:** settling it needs a product decision or knowledge no file holds. Record it as step 3 directs, or as an `unresolved conflict` ([mismatch classes](references/mismatch.md)) when authority is missing, and keep dependent behaviour out of the ready scope.
- **Decline:** only for a finding the report marks minor; record the reason.

Do not change a finding's severity; contest it with evidence instead. When a finding asks for missing context, reference that context's home ([ownership](references/ownership.md)) rather than copying it into the contract; add normative text only when an obligation changes. On the next review, pass your contests with their evidence.

## Return

- The contract or patch, and its scope.
- Open decisions and blocked work, in the decision record.
- When present: structural commitments the implementer must keep, reconciliation findings, review findings contested, escalated, or declined with their evidence or reason, and the open discard-gate items of a feature contract.
- The next action: implement, investigate, revise, or no change. Recommend implementing only when [the readiness criteria](${CLAUDE_SKILL_DIR}/../spectacular-spec-review/SKILL.md#steps) in the Readiness step of `jacoelho:spectacular-spec-review` hold; implementation follows `jacoelho:spectacular-spec-implementation`.

For a handoff to another session, update the decision record's Handoff section; point to obligations rather than restating them.

[The worked examples](examples/) show a filled contract, the decision record behind it, an evidence map listing scenario tests, case tables that meet at a boundary, and a shared invariant owned by another contract; lint `examples/` as one root.
