# Execution

## Roles

| Role | Does | Sees |
| --- | --- | --- |
| Planner | Plan steps 1 to 6; design changes; decisions returned by units | Contracts, code, record |
| Test writer | A change's tests, from its AC IDs and their case-table rows, and properties; a row in the evidence map for each test that checks an AC, and an Unchecked row for any part of an AC its tests leave unchecked | Its rules through `spec.py show`, record, existing tests; never implementation diffs (inline, the test unit simply runs before any implementation) |
| Implementer | One unit, until its tests pass | Its rules through `spec.py show`, record, its unit and design rows; may not edit tests |
| Runner | Red and green checks, repository checks | Commands only; edits nothing |
| Reviewer | Contract conformance (spec-review) and the design check | Contracts, record, the working tree's changes against HEAD and the change's planned edit paths |

Each brief opens with the decision-rights text from SKILL.md, then gives the unit, the IDs it serves with the `spec.py show` command that prints them ([tools](../../spectacular-spec-review/references/tools.md)), its design rows (owner, seams, consumers, allowed dependencies), the paths it may edit, the record path, and the repository's check command. Ask for a structured result: what changed, decisions taken, decisions returned, and commands run with exit codes.

## Record states

The record's `Status:` line and each unit's marker are the run's state; resume starts from them. Change them only with `record.py apply` ([below](#changing-the-record)), which refuses any move these tables do not list.

| Status | Holds while | Next |
| --- | --- | --- |
| planning | The plan's design waits for the user's approval: a fresh plan, or a re-plan after a contract changed. | approved, when the user approves. |
| approved | The plan stands and no change has started. | implementing; blocked or discard-ready, when only the whole-stack check is left; accepted, at close; planning, on a re-plan that needs approval. |
| implementing | A change's tests are recorded red and its units run. | blocked; discard-ready; accepted, at close; planning, on a re-plan that needs approval. |
| blocked | A unit is blocked, the repository's checks fail, or the whole-stack check left work for the user. | implementing, on resume once the reason is settled; discard-ready; accepted, at close; planning, on a re-plan that needs approval. |
| discard-ready | Every change of a feature contract is accepted and its discard gate waits for the user. | accepted, at close; implementing or blocked, after a re-plan added work; planning, on a re-plan that needs approval. |
| accepted | The run closed and the user kept the record. | implementing, after a re-plan added work; blocked or discard-ready, when a rerun finds only the whole-stack check left; planning, on a re-plan that needs approval. |

At close the record is deleted unless the user keeps it, which sets accepted.

| Unit | Marker | Next |
| --- | --- | --- |
| pending | `[ ]` | in-progress; done, once its tests are recorded red or its run finished; blocked. |
| in-progress | `[~]` | done; blocked; pending, when a resumed run finds it unfinished. |
| done | `[x]` | accepted, with its change; pending, when resume finds its evidence no longer holds. |
| blocked | `[!]`, reason in Notes | pending, on resume once the reason is settled. |
| accepted | `[a]` | pending, when a re-plan reopens its change. |

A wave marks its units in progress only while it runs and writes the record once it ends, so the record usually shows a unit go from pending straight to done or blocked.

## Changing the record

The planner writes the record from [the template](../assets/implementation.md), then runs `record.py show` on it, which fails on a line it cannot read: a change heading that is not `## C-<n>` or `## STACK`, or a unit line outside one. After that, status, unit markers, blocked reasons, fix units, the STACK change and notes change only through `record.py apply`, run from the repository root with one JSON object on standard input:

```sh
record="${CLAUDE_SKILL_DIR}/scripts/record.py"
python3 "$record" show specs/booking/booking.implementation.md
python3 "$record" apply specs/booking/booking.implementation.md <<'RECORD_JSON'
{"status": "implementing", "units": [{"id": "U-1.2", "state": "blocked", "reason": "needs a new seam"}], "notes": [{"change": "C-1", "text": "C-1 red after U-1.1: TestCancel (assertion)"}]}
RECORD_JSON
```

A unit the record does not hold is added to the change the payload names, with its `kind`, `title`, `after`, `owner` and `edits`; `apply` adds only the `STACK` change, after the last one, and refuses any other change the record does not hold. A blocked unit's `reason` becomes a note. `apply` checks every move before writing anything, prints the record's state afterwards as one line of JSON, and changes nothing when the same payload is applied again.

A re-plan is the planner's: it rewrites the change sections it re-plans by hand (their units, owners, edits, Seams and Tests lines, or a new change), then runs `record.py show` until it exits 0.

## The record has one writer

The coordinating session writes the record; in the workflow, one record step between waves does, by running `record.py apply`. Unit agents read it and return results to the writer. Parallel writers lose updates.

## Waves

A unit is ready when every unit it follows is done. A wave is the ready units, up to the concurrency limit, with disjoint edit paths and different owner modules (units of one module run in sequence); run them in parallel in the shared working tree. Overlapping paths are a planning defect: serialise those units before the wave starts. Skip any unit that follows a blocked or unfinished one.

Units in a wave share one working tree, so each sees the others' unfinished edits. A unit runs only the tests and packages it touches, never the repository-wide checks, and never a tool that rewrites files outside its edit paths, such as a repository-wide formatter or generator. The repository's checks run once after the change's last wave.

A unit that fails its checks gets one more attempt with the failure output, then one attempt with the planner's model, then is marked blocked with the output in the record.

## Evidence

Never commit, move HEAD, or touch the user's index. Run every command from the repository root.

**Test unit:** it edits the change's test files and, where the language needs them to compile, the declarations its tests call, in the owner module. A stub returns a not-implemented error, or its zero value when it returns nothing; it never panics or exits, because that aborts the test run and hides the other tests. A test that then passes is `already-satisfied` or `weak-test`, like any other. No later unit edits those test files.

**Scenario tests:** a Given/When/Then scenario is an ordinary test. Write it when the repository already runs scenario files; its title is the test name the evidence map lists, its values come from the AC's Situation and Expected, and, like any test, it carries no spec IDs.

**Red:** right after the test unit, run the tests it added or changed on the working tree; tests that already existed at HEAD are not part of the change's evidence. Each must fail on an assertion or on the not-implemented error, not on a build error. A test that passes is recorded as `already-satisfied` (the gap map was wrong) or `weak-test` (the test cannot fail); the planner decides which. When every test passes, stop the change there: implementing it would prove nothing. Record each test's name and failure in the record's notes.

**Green:** the change's tests and the repository's checks pass on the working tree.

A test command that selects no test, or a failure from missing dependencies or setup, proves nothing; treat it as a failure to run.

## Contract hashes

Record `sha256` of each contract file's content (`shasum -a 256 <file>`), not a git revision: contracts may be uncommitted. Compare at every resume and before each change.
