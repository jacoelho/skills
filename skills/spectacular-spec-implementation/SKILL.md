---
name: spectacular-spec-implementation
description: Turn one or more spectacular EARS contracts into working, tested code - reconcile them with the existing code, design module boundaries, stack the changes, design the tests, split the work into units, and track progress in a Markdown record that any session can resume. Use when asked to implement a spec or contract, plan its implementation, break a spec into changes or tasks, run that plan with parallel agents, or resume an implementation. Not for writing or reviewing contracts (use jacoelho:spectacular-spec-writing or jacoelho:spectacular-spec-review).
argument-hint: "[contract paths | implementation record]"
---

# Spectacular spec implementation

Build what the contracts require, as a sequence of small changes inside a design chosen with the whole picture in view. Units of work that each pass their tests without a shared design produce a ball of mud; the design step exists to prevent that.

Scale the work to the contracts. One requirement in one module is one change: write a short record, show the plan, and carry it out. Apply the full method below only when the contracts span modules; for a one-module change, the gap map, a one-line design, and one change with its units are enough.

Given an existing record, resume it (see Resume) instead of planning again.

## Plan

1. **Gap map.** For each requirement in the contracts, check the code and tests: satisfied with a passing test (link it), satisfied without a test (test-only work), partial, missing, or conflicting. Classify a conflict with [the mismatch classes](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/mismatch.md). When the contract is the wrong side, stop that requirement and send it to `jacoelho:spectacular-spec-writing`; continue with the rest. Only gaps become work. Note any implicit state machine in the code the gaps touch ([state machines](references/design.md#state-machines)).
2. **Design.** Look at all the gaps together and decide, following [the design rules](references/design.md), which module owns each requirement, piece of state, and invariant; the seams between modules and the files that consume them; the dependency direction; and the prefactors needed first. A one-module change records one line.
3. **Change stack.** Order the work as changes that each leave the tree green and build on the one before: prefactors, then a walking skeleton (the thinnest end-to-end path for one requirement), then the remaining requirements in dependency order. Do a wide mechanical change as expand, migrate, contract.
4. **Seams as code.** The change that introduces a seam shared by several units declares it as compiling code first, with dependency rules where the language has them. A seam that bears on acceptance is a structural commitment: after the user approves the design, the planner writes its declarations and adds them to the contract's Structural commitments section, the one contract edit this skill makes ([structure](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/structure.md#who-makes-one)). A seam that only coordinates the work stays in the record.
5. **Test design.** Cite each change's AC and INV IDs and test them as [the acceptance shape](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/precision.md#acceptance-shape) describes. Record only what the contract does not hold: edge cases chosen from [the precision dimensions](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/precision.md#conditions-that-change-meaning), properties with their input domains, and open questions. An edge case no contract settles goes to `jacoelho:spectacular-spec-grilling`; never invent its answer, because a test then enforces a decision nobody made.
6. **Units.** Split each change into units sized for one fresh agent context. Each unit names its change, the IDs it serves, the units it follows, its owner module, and the paths it may edit. Units of one change that share an owner module run in sequence. For a change that serves requirement IDs, the first unit writes the tests and only the declarations they need to compile.

Write the plan into [the record](assets/implementation.md), next to the first contract and named `<capability>.implementation.md` as [the layout](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/lifecycle.md#layout) defines. Stop for the user's approval when the design adds a seam, a module, or a dependency between modules; otherwise show the plan and continue.

## Execute

For each change in order, following [execution](references/execution.md):

1. Run the test unit, then confirm the tests fail on the tree as it stands (red): on an assertion or a not-implemented error, never a build error. Record each failure.
2. Run the remaining units in waves: units whose predecessors are done, in different owner modules with disjoint edit paths, run in parallel.
3. Run the repository's checks until they pass.
4. Accept: a change serving requirement IDs has its tests recorded red after the test unit and green now; a prefactor or expand/contract step keeps every existing check green with behaviour unchanged.
5. Check conformance on the working tree's changes against HEAD, with the change's edit paths as its planned scope: the contract with `jacoelho:spectacular-spec-review` (its Reconcile step) and the design with [the design check](references/design.md#design-check). Each material finding becomes a new unit.

After the last change, run conformance once over the whole stack. Then close by the contract's lifecycle ([lifecycle](${CLAUDE_SKILL_DIR}/../spectacular-spec-writing/references/lifecycle.md)): for an anchored contract, mark each AC's Verification as executed, naming the test; for a feature contract, check its discard gate. Carry the record's open questions into the capability's decision record (`jacoelho:spectacular-spec-grilling` says where), then delete the record unless the user keeps it.

## Decision rights

Open every executing agent's brief with:

> This codebase is yours to keep building on. The contracts decide what it must do; how it is built inside the recorded design is your call. Leave each module in a state you would want to extend next. Within your decision rights, decide and move on; outside them, return the decision instead of working around it.

| Decision | Who decides | Recorded |
| --- | --- | --- |
| Internals of the owned module, and refactoring them with behaviour preserved | Unit agent | No |
| Choosing among outcomes a contract explicitly permits; a type or function exposed only inside the owned module | Unit agent | Unit note |
| Editing a file outside the owned module | Unit agent, only in files the design lists as a seam's consumers; otherwise return it | Unit note |
| A new or changed seam, a dependency between modules, a new module, moved ownership, replacing or deleting an existing code path, changing a test after it went red | Planner | Design section |
| Behaviour no contract settles, a contract that looks wrong, a new external library the repository does not already allow | User; the unit is blocked meanwhile | [Decision record](${CLAUDE_SKILL_DIR}/../spectacular-spec-grilling/assets/session.md) |

A blocked unit stops only the units that follow it.

## Resume

1. Read the record.
2. Compare each contract's content hash with the recorded one. On a mismatch, redo the gap map, re-plan only the changes whose requirements changed, and set their units to pending.
3. Set units left in progress back to pending. Set a blocked unit to pending when the record's Design, its notes, or the decision record now settle the reason it was blocked; keep it blocked otherwise.
4. In the current change, re-run green for implementation units marked done; a done test unit keeps its recorded red. Reopen any unit whose evidence no longer holds.
5. Continue with the ready units.

## Executors

Run the roles (planner, test writer, implementer, runner, reviewer) in the main session for one change of up to three units; launch one agent per ready unit, up to a concurrency limit, for up to three changes; use `workflows/spec-implement.js` for long or unattended runs. Each agent starts from a fresh context, so the workflow costs roughly six to eight agents per change before its units, and that overhead scales with the number of changes, not the size of the diff. [Execution](references/execution.md) gives the briefs and the single-writer rule for the record.

Role models come from the plugin settings: planner `${user_config.implement_model_planner}`, test writer `${user_config.implement_model_test_writer}`, implementer `${user_config.implement_model_implementer}`, runner `${user_config.implement_model_runner}`, reviewer `${user_config.implement_model_reviewer}`, recorder `${user_config.implement_model_recorder}`. They apply to each role the user did not name a model for in this run. When you launch the workflow, pass `skillPath` as `${CLAUDE_SKILL_DIR}/SKILL.md`, so its agents read this method even when the session's skill list predates it, and pass the role models as `models` with keys `planner`, `testWriter`, `implementer`, `runner`, `reviewer` and `recorder`. When you launch agents yourself, use the first five and omit the model for `inherit`; the recorder applies only to the workflow, because outside it you are the record's single writer. A value still in `${...}` form is a setting the user has not set: leave that role out, so the workflow's default for it applies.
