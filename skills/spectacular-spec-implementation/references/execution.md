# Execution

## Roles

| Role | Does | Sees |
| --- | --- | --- |
| Planner | Plan steps 1 to 6; design changes; decisions returned by units | Contracts, code, record |
| Test writer | A change's tests, from its AC IDs, edge cases, and properties | Contracts, record, existing tests; never implementation diffs (inline, the test unit simply runs before any implementation) |
| Implementer | One unit, until its tests pass | Contracts, record, its unit and design rows; may not edit tests |
| Runner | Red and green checks, repository checks | Commands only; edits nothing |
| Reviewer | Contract conformance (spec-review) and the design check | Contracts, record, the working tree's changes against HEAD and the change's planned edit paths |

Each brief opens with the decision-rights text from SKILL.md, then gives the unit, the IDs it serves, its design rows (owner, seams, consumers, allowed dependencies), the paths it may edit, the record path, and the repository's check command. Ask for a structured result: what changed, decisions taken, decisions returned, and commands run with exit codes.

## The record has one writer

The coordinating session writes the record; in the workflow, one record step between waves does. Unit agents read it and return results to the writer. Parallel writers lose updates.

## Waves

A unit is ready when every unit it follows is done. A wave is the ready units, up to the concurrency limit, with disjoint edit paths and different owner modules (units of one module run in sequence); run them in parallel in the shared working tree. Overlapping paths are a planning defect: serialise those units before the wave starts. Skip any unit that follows a blocked or unfinished one.

Units in a wave share one working tree, so each sees the others' unfinished edits. A unit runs only the tests and packages it touches, never the repository-wide checks, and never a tool that rewrites files outside its edit paths, such as a repository-wide formatter or generator. The repository's checks run once after the change's last wave.

A unit that fails its checks gets one more attempt with the failure output, then one attempt with the planner's model, then is marked blocked with the output in the record.

## Evidence

Never commit, move HEAD, or touch the user's index. Run every command from the repository root.

**Test unit:** it edits the change's test files and, where the language needs them to compile, the declarations its tests call, in the owner module. A stub returns a not-implemented error, or its zero value when it returns nothing; it never panics or exits, because that aborts the test run and hides the other tests. A test that then passes is `already-satisfied` or `weak-test`, like any other. No later unit edits those test files.

**Red:** right after the test unit, run the tests it added or changed on the working tree; tests that already existed at HEAD are not part of the change's evidence. Each must fail on an assertion or on the not-implemented error, not on a build error. A test that passes is recorded as `already-satisfied` (the gap map was wrong) or `weak-test` (the test cannot fail); the planner decides which. When every test passes, stop the change there: implementing it would prove nothing. Record each test's name and failure in the record's notes.

**Green:** the change's tests and the repository's checks pass on the working tree.

A test command that selects no test, or a failure from missing dependencies or setup, proves nothing; treat it as a failure to run.

## Contract hashes

Record `sha256` of each contract file's content (`shasum -a 256 <file>`), not a git revision: contracts may be uncommitted. Compare at every resume and before each change.
