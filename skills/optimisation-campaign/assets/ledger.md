# Campaign ledger

Copy into `artefacts/` under the campaign root as `ledger.md`. It is the campaign's only record
and its resume point: after an interruption or a context compaction, read the
charter and this file before anything else, and check that `best/` is at the recorded
best and `candidate/` at the recorded reset target. Update it after every experiment, before the next hypothesis.

## State

Baseline commit:
Best commit, its grade, and each objective's aggregate against the original (last back-to-back run):
Tagged best at a stricter grade, if the grade was relaxed:
Oracle: corpus size, properties, mutation score and the equivalent mutants with reasons:
Keep floor per objective, screen cutoff if the screen is used, repetitions and estimator, with the A/A runs they came from and every recalibration:
Held-out confirmation protocol, fixed at calibration:
Inputs dominated by fixed cost:
Component timers commit, their measured overhead, and the component bands, if the component rule is used:
Experiments run / budget; time used / budget:
Experiments since the last keep / convergence window:
Carried passengers (at most three), and the reset target (best plus passengers):
Next hypothesis:

## Experiments

One row per experiment, numbered in run order; the baseline is 001, verdict
`baseline`. A passenger group's row names every member. An oracle addition gets its
own row with verdict `oracle` and uses no experiment number or budget.

| exp | commit | change | prediction | screen | deciding run | oracle | verdict | note |
|---|---|---|---|---|---|---|---|---|

- `prediction`: direction and magnitude per objective, written before the run.
- `screen` and `deciding run`: ratio against the current best in the same batch,
  one per objective (for example `ns 0.94, allocs 0.80`), or `-` when not reached.
- `oracle`: pass with grade, or the failing check.
- `verdict`: baseline, keep, carry, discard, incorrect, crash, oracle or revert, as
  defined in the skill. A discard names its reason: `discard (trade-off)`,
  `discard (guard)`, `discard (inconclusive)` or `discard (no gain)`.
- `note`: what the result says about the model, in one line.

Patches: `patches/NNN-<slug>.patch` for every experiment after the baseline,
written before its run.
Logs: `runs/NNN/`.

## Failed ideas

One line each: idea, measured effect, why it failed when known.

## Model

Hot functions and where the time goes now, by component, with the profile or run
it came from. Unmeasured risks: predicted losers no benchmark input covers. Rewrite it when a
result contradicts it.
