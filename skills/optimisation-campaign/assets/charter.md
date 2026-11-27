# Campaign charter

Copy into `artefacts/` under the campaign root as `charter.md`. Fill every field
from the request and the repository first; ask the user only for the fields left
open, then get one confirmation of the whole charter.

## Target

Repository and base revision:
Campaign tag (branch `campaign/<tag>`):
Edit scope (files or packages the campaign may change):
Out of scope (harness, inputs, build flags, dependencies, public contracts):
Campaign root, outside the user's checkout (default `../<repo>-campaign-<tag>/`; holds `candidate/`, `best/`, `artefacts/`):
Component timers: no | yes

## Objective

Objectives, each with unit and direction (for example ns/op lower, allocs/op lower):
Aggregate over inputs, per objective (default geometric mean; over the same inputs, the ratio of two geometric means equals the geometric mean of per-input ratios; over count + 1 for counts that can be zero):
Benchmark command (read-only), and the lines each metric is read from:
Guards and their bounds (for example peak memory, B/op in absolute bytes, time while optimising quality):
Inputs waived from the per-input regression check, with the reason:

## Oracle

Grade: identical | equivalent (state the equivalence) | quality budget (state measure and bound)
Oracle command, and the reference it compares against:
Audit beyond the benchmark inputs (other configurations, CLI paths):
Properties: differential (against the baseline build or a test-only reference) and invariants; generator seed and cases per run, and per confirmation:
Mutation testing: tool or hand-made mutants, the hot functions it covers, and its mutant or time cap:
Who may relax the grade: the owner only.

## Data

Tuning inputs and seeds:
Held-out inputs (at least one per class) and seeds, by name only and never read before confirmation, or "none" with the reason:
Screen inputs, in proportion to the classes, if the screen is used:

## Bounds

Experiment budget, time budget, or both:
Per-run timeout (default twice the baseline's deciding-run time):
Convergence window (default 8 consecutive experiments with no kept change):
Measurement host and how exclusive it is:

## Authority

Commits on `campaign/<tag>` in the `candidate/` worktree, and a detached `best/` worktree: yes
Oracle test code and component timers committed on the campaign branch: yes | no
Push, merge, open pull requests: no, unless stated here
Installation of tools: no, unless listed here
Delegation: only of runs whose output would flood the context; never parallel timing on one host
