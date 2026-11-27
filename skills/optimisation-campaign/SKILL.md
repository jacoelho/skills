---
name: optimisation-campaign
description: Runs a bounded campaign of many sequential optimisation experiments on one code base against a fixed benchmark and correctness oracle - charter, noise calibration, hypothesis loop with keep or discard, ledger, convergence stop and held-out confirmation. Use when asked to make a program faster, cheaper or better over many experiments, to tune it autonomously, or to run an optimisation loop. Not for a single optimisation decision or a review of one change.
argument-hint: "[target and objectives, or charter path]"
---

# Optimisation campaign

A campaign is a sequence of experiments, each a falsifiable hypothesis tested
against one fixed benchmark and a correctness oracle whose grade is fixed and whose
checks are only ever added, ending in a set of
kept changes whose combined effect is confirmed on inputs the campaign never tuned
on. This skill owns what only a sequence has: the charter, the noise floor, the
keep rule across many candidates, passengers, drift control, the ledger, the stop
rule and the final confirmation.

How one measurement is taken is outside this skill: benchmark validity, profiling,
sample counts and statistics follow whatever performance method the session already
uses for the language. Without one, the deciding run is the benchmark's full input
set with the repetitions fixed during calibration, candidate and best alternated.

## 1. Charter

Fill the [charter](assets/charter.md) from the request, the repository and its
benchmark before asking anything; ask only for fields that remain open, in one
message. The user confirms the charter once; it is the campaign's whole authority.
Do not start without an experiment or time budget, a per-run timeout, at least one
objective with direction and aggregate, the oracle grade, and the edit scope.

An **objective** is a metric the campaign tries to improve, such as ns/op or
allocs/op; there may be several, each with its own floor. A **guard** is a metric
that must stay within a bound and earns nothing by improving. Two objectives, not
an objective and a guard, are how a campaign asks for both less time and fewer
allocations.

The benchmark harness, its inputs, the metric definitions and the build flags are
fixed for the campaign. A change to any of them is a new campaign with a new
baseline, not an experiment.

## 2. Workspace

Everything lives under the charter's campaign root, outside the user's checkout
(default `../<repo>-campaign-<tag>/`):

- `candidate/`: a worktree on branch `campaign/<tag>` from the base revision. Every
  experiment commits here; nothing is pushed. Discarding is `git reset --hard` to
  the recorded reset target inside this worktree only, never in the user's tree.
- `best/`: a second worktree, detached at the current best, so every comparison
  builds both sides in the same batch. Advance it with
  `git -C best checkout --detach <commit>` on each keep, and only then.
- `artefacts/`: the [ledger](assets/ledger.md), patches and run logs. It is outside
  both worktrees, so no reset touches it. The branch and the two worktree
  registrations are the only campaign state in the repository's git directory. Save each candidate's patch here before its run: a
  discarded commit disappears with the reset. Scripts the campaign writes around the
  fixed harness, such as an alternating driver or an end-to-end oracle, live here
  too.

## 3. Calibrate

The **original** is the charter's base revision. The **baseline** is the tip after
the calibration commits below. Those commits add tests and switched-off timers
only, so the baseline's output is the original's; reference outputs are generated
from the original. Every ratio is against the baseline or the current best, and the
final report compares the best with the original.

Before the first candidate, in order:

1. **Held-out.** Set aside the held-out inputs and seeds the charter names, by name
   only. Nothing before [Confirm](#6-confirm) reads them, charter filling included.
   Fix the confirmation protocol now and record it in the ledger.
2. **Profile.** Profile the original on the tuning inputs with the session's
   method for the language, and record the hot functions in the ledger's Model.
   Measure each input's fixed cost (process start, I/O) against a near-empty run;
   record inputs where fixed cost dominates as unable to move.
3. **Oracle commit.** Build the [oracle](references/oracles.md): tests in
   `candidate/`, plus an end-to-end comparison script in `artefacts/` when the
   grade is defined on program output. Run each differential property with the
   original on both sides first (two separate builds for a program-level
   comparison); a failure there is nondeterminism to resolve or exclude, not a
   defect. Commit the tests.
4. **Oracle strength.** Run bounded mutation testing on the hot functions and
   strengthen the oracle under
   [oracle strength](references/oracles.md#oracle-strength). Amend the oracle commit
   with any strengthening.
5. **Timers commit**, only if the component rule will be used: component timers
   behind a compile-time switch that is off by default (see
   [measurement](references/measurement.md#component-rule)).
6. **Noise.** Advance `best/` to the baseline. Measure A/A noise at the deciding
   tier, at the screening tier if the screen is used, per component with the
   timers switched on, and the timers' overhead.
7. **Floor.** Fix each objective's keep floor, and the screen cutoff if the screen
   is used, from those measurements and record them in the ledger.
   [Measurement](references/measurement.md) owns how.

A floor chosen after seeing a candidate's result is not a floor. Recalibration
under [measurement](references/measurement.md#noise-floor) re-fixes it between
experiments, never for the candidate it is about to judge.

## 4. Loop

Each experiment, in order:

1. **Model.** Read the ledger: current best, recent verdicts, the failed-idea
   list, and where the time goes now. Re-profile after a keep that changed which
   functions dominate.
2. **Hypothesise.** State the change, the mechanism, the predicted effect with
   magnitude for each objective, and the workload that should lose. If no benchmark input has that
   workload, record it in the ledger as an unmeasured risk. A change that sizes
   work or memory from a value the input declares names the adversarial input
   (a declared size larger than the data, at the largest permitted limits) and
   adds it to the oracle before the run. Check the failed-idea list; repeat a failed idea only
   with a mechanism or evidence it lacked. Choosing what to try is covered in
   [next hypothesis](references/next-hypothesis.md).
3. **Implement and commit** the smallest change the hypothesis needs, inside the
   edit scope. The commit message states the hypothesis. Save the patch and write
   the prediction to the ledger before running.
4. **Check the oracle.** A failure is verdict `incorrect`: reset without timing it.
   If the change rewrites a function the oracle does not yet cover, run oracle
   strength on that function first. A change that adds a code path or replaces a
   function body is a rewrite; one that changes constants or call order within the
   existing paths is tuning.
5. **Screen**, then **decide**, under the rules in
   [measurement](references/measurement.md). Send run output to log files and read
   only the metric lines; on a crash read the log tail.
6. **Record** the measured effect next to the prediction, the verdict and one line
   on what the result says about the model. Update the ledger before the next
   hypothesis, whatever the verdict.

When the oracle gains a check (a property, or a generator failure added to the
corpus), add it only while no passengers are carried; otherwise wait until they are
kept or expire. Commit it on `candidate/` as its own commit, run the full oracle
there, and advance `best/` to it; the ledger records it as an oracle row, not an
experiment. If it fails, bisect the kept changes, revert the culprit with
`git revert` in `candidate/`, and rerun the oracle on the result. Correctness
decides: advance `best/` to the revert whatever it costs, and record that cost from
a deciding run against the old best. The revert uses no budget and does not reset
the convergence window, and the recalibration trigger applies to it as to a keep.

When the oracle finds a defect the original already has, report it to the owner as
a separate change. The oracle proves "same as the baseline", not "correct".

### Verdicts

- **keep**: all of the keep conditions below hold. Advance `best/` to the candidate
  tip, carried passengers included.
- **carry**: the change qualifies as a passenger under
  [measurement](references/measurement.md#passengers). It stays committed.
- **discard**: anything else that ran. Reset to the reset target: the best plus any
  carried passengers. Record why, as one of:
  - `trade-off`: one objective improves beyond its floor while another worsens
    beyond its floor, both supported by evidence;
  - `guard`: the objectives pass but a guard fails;
  - `inconclusive`: an objective moves past its floor but the evidence does not
    support it;
  - `no gain`: nothing improves beyond its floor.

  Trade-offs and guard failures go to the owner in the report; the owner may
  accept one by amending the charter.
- **incorrect**: the oracle failed. Reset as for discard.
- **crash**: the build or run failed, or a run exceeded the timeout. Fix a trivial
  cause once by amending the experiment commit, re-save its patch, and rerun;
  otherwise reset as for discard.

Keep conditions:

- the oracle passes at the charter's grade;
- against `best/` in the deciding run, at least one objective improves beyond its
  floor and no objective worsens beyond its floor, or the component rule in
  [measurement](references/measurement.md#component-rule) applies. The one
  exception: a change that removes code and worsens no objective beyond its floor
  is a keep without an improvement;
- no single input worsens on any objective beyond that input's own A/A band,
  unless the charter waives it for that input;
- every guard stays within its charter bound;
- the complexity added is proportionate to the gain.

An objective counts as improved or worsened only where the evidence supports it.
When the session's performance method gives per-input significance or intervals,
a move past the floor that none of them supports is inconclusive. Without such a
method, the floor alone decides.

Only a keep resets the convergence window, including the keep of a passenger
stack.

## 5. Stop

Stop at the first of: the budget is spent; the convergence window in the charter
passes with no kept change; the oracle or benchmark becomes unreliable; the next
idea needs authority the charter does not grant. Do not stop to ask whether to
continue while budget remains. Ask only when a stop condition other than budget or
convergence fires.

Relaxing the oracle grade, such as from bit-identical output to a quality budget, is
the owner's decision. Propose it with the measured noise of the relaxed oracle and
the cost of resolving the budget; on approval, tag the best change set at the old
grade first so it survives as its own deliverable.

## 6. Confirm

On the final best: run the original and the best back to back in one batch on the
full benchmark, both built without component timers; run the held-out inputs and
seeds once, as one deciding-tier batch of original against best under the protocol
fixed at calibration; and run the full oracle audit. Carried passengers not yet kept are not
part of the best. Report the held-out result even when it is worse than the tuning
result; when the charter has no held-out set, report that and its stated reason.

## 7. Report

Lead with the confirmed effect on each objective, original against best, measured
back to back, and the held-out result. Then the kept changes in order, each with its patch, measured
effect and oracle grade; the oracle's mutation score and the functions it leaves
uncovered; the discarded ideas worth not repeating; what limited the measurement;
the recorded trade-offs and guard failures; and the next hypotheses the ledger holds. Give the branch, both worktrees and the
`artefacts/` path, with the commands that remove the worktrees
(`git worktree remove <path>`). Do not remove them, merge or push.

[Sources](references/sources.md) lists where these rules come from.
