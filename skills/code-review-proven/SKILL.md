---
name: code-review-proven
description: Run /code-review with the same arguments, then prove or refute each finding with a throwaway test against the real code, keeping only findings a test reproduces through a path callers can reach. Use when asked for a code review whose findings are proven, reproduced or verified by tests.
argument-hint: "[low|medium|high|xhigh|max] [PR number | branch | path] [--max-findings <n>|all|default] [--fix] [--comment]"
---

# Code review, proven

A finding claims: through this entry point, with this input, the code does B where the contract says A. Each claim gets a test that runs the real code. Reading the code again is not proof in either direction.

This skill writes and runs new tests during review, which `jacoelho:testing` reserves for implementation. The exception covers only the throwaway proof files below; tracked files stay unchanged.

## Review

Invoke the `code-review` skill with the arguments unchanged, except `--fix` and `--comment`: hold those back. A proof needs the unfixed code, and only proven findings should be posted or fixed. Level, target and `--max-findings` pass through, including code-review's reuse of the last level when none is given.

When the review returns no findings, report that and stop.

## Proof tree

Proofs run against the code that was reviewed. A proof on different code proves nothing about the finding.

- Current diff or a path: the working tree.
- A PR or branch: resolve the reviewed commit, `gh pr view <n> --json headRefOid` for a PR or `git rev-parse <branch>` for a branch (fetch `refs/pull/<n>/head` first if it is missing locally). Use the working tree only if `HEAD` is that commit and `git status --porcelain` lists no tracked changes. Otherwise `git worktree add --detach` that commit at a path under `${TMPDIR:-/tmp}` and write proofs there. Never switch branches or stash in the working tree. Remove the worktree after cleanup.

State in the report which tree and commit the proofs ran on.

Record `git status --porcelain` of the proof tree before writing anything.

## Per finding

Work through findings one at a time in this session: proofs share packages, and one proof that fails to build breaks every other proof run in its package.

1. **Claim.** State entry point, input, expected result with its source (contract, docs, types, callers, or an invariant every reasonable contract keeps, such as no data loss or no duplicated side effect), and the predicted wrong result. No independent source for the expected result: verdict CONTRACT-OPEN, no test.
2. **Reachability.** Trace from a production entry point, or an exported API for a library, to the defect. Test inputs must be ones a caller can produce. Do not bypass validation, build values the constructor rejects, or call an unexported helper with inputs its callers never pass. A guard on every path makes the verdict UNREACHABLE: cite the guard as `file:line`. A failing helper-level test may still be shown as evidence of a latent defect, labelled as such.
3. **Test.** Write the smallest test at the highest boundary that reaches the defect. Assert the correct behaviour, so the test fails exactly when the defect is real. Apply the Oracle, Boundary and Isolation criteria from `jacoelho:testing`. Put it in a new file named with a `zz_proof_<n>` prefix where the project's runner discovers it, for example `zz_proof_3_test.go` in the package directory for Go. Prefix test and helper names with `Proof<n>` so proofs in one package do not collide. Do not edit existing files; step 6's temporary fix, restored afterwards, is the only exception.
   - Races: run with the race detector and a bounded repeat count, or force the interleaving with a controlled schedule.
   - Resource or efficiency claims: assert a measurable bound (allocations, call counts, query counts). Timing alone is UNPROVEN.
4. **Run** only that test, with a timeout of 2 minutes, for example `go test -run '^TestProof3' -count=1 ./pkg/x`. No network, shared environments, real services, golden-file updates or full-suite runs.
5. **Classify.**
   - Fails with the predicted wrong result: CONFIRMED.
   - Fails another way (build error, setup panic, a different value): the test is wrong. Fix it, at most two attempts, then UNPROVEN.
   - Passes: first show the test reached the defect site, for example by flipping the expected value and seeing it fail. Then REFUTED. A run that selected no test proves nothing.
   - Needs what step 4 forbids, or more than the timeout: UNPROVEN, with the reason.
6. **Counterfactual** for CONFIRMED, only when the fix is a few local lines: copy the file outside the repository, apply the fix, rerun and expect a pass, restore the copy and check with `cmp`. Skip otherwise and say so.

## Cleanup

Move every proof file to `${TMPDIR:-/tmp}/code-review-proven/<repo>-<timestamp>/`, keeping relative paths. Check that `git status --porcelain` matches the snapshot; report any difference. Then remove any worktree this run added.

## Report

One row per finding, in review order:

| # | Finding | Verdict | Evidence |
|---|---|---|---|

Evidence is the command and the observed failure line (CONFIRMED), the passing run and how the path was shown to be reached (REFUTED), the guard `file:line` (UNREACHABLE), the missing decision (CONTRACT-OPEN), or the blocker (UNPROVEN).

If the review reported through `ReportFindings`, call it again with CONFIRMED findings as `CONFIRMED` and UNPROVEN as `PLAUSIBLE`, each with its evidence in `failure_scenario`. That tool forbids also printing reported findings as text, so the table then lists only the findings it drops.

End with the folder of saved proofs. A CONFIRMED proof is a ready regression test for the fix.

## Held-back flags

- `--comment`: post CONFIRMED and UNPROVEN findings as inline PR comments, the way `code-review --comment` does, each with its verdict and evidence. Post nothing else.
- `--fix`: only when the proofs ran in the working tree; fixes made in a temporary worktree would be deleted with it. Otherwise apply nothing, say why, and name the command to check out the reviewed commit and rerun. When allowed, apply fixes to the working tree for CONFIRMED findings only, then copy each fixed finding's proof back, run it, report whether it now passes, and move it out again unless asked to keep it.
