# Measurement across a campaign

Owns the keep floors, the screening and deciding tiers, passengers, drift, held-out
data and the component rule. Figures quoted below are examples from one machine and benchmark
in [sources](sources.md); measure your own.

## Noise floor

Measure A/A noise before the first candidate, for every objective. A pair is the
unchanged baseline built twice and measured in two separate runs at the tier's
repetitions. Run at least three pairs at each tier the campaign uses. Record the
largest deviation from 1 of each objective's aggregate and of each input; the
per-input bands bound the per-input regression check in the keep conditions. Fix the estimator (for example the minimum or the median over
rounds) here and keep it for the campaign.

Set each objective's keep floor at 1.5 times its widest A/A deviation at the
deciding tier, and the screen cutoff the same way from the screening tier. A count
such as allocs/op gets a zero floor only when every A/A sample gives identical
values: then any strict improvement clears it and any increase worsens beyond it.
When the harness varies the iteration count, judge counts on the per-input median,
or measure them in a separate run at a fixed count. A count that still moves
between pairs, through pooling or GC, gets a floor like any other objective.

Guards whose bound is stated against noise get floors measured the same way. A
per-operation byte count amortises one-time allocations over a varying number of
iterations, so a zero floor for it rejects harmless changes; state its bound in
absolute bytes instead. A geometric mean
over counts that can be zero is taken over count + 1.

If a floor is larger than the gains the campaign expects to find, double the
repetitions and measure again. A targeted subset is noisier than the full set: in
one session the quick set's bands were two to four times wider.

After a keep that moves any objective's aggregate, or any single input's median, by
more than 25%, rerun the A/A pairs before the next hypothesis and re-fix the floors and repetitions from them;
record the old and new values in the ledger. Warmup and iteration counts chosen for
the baseline can under-warm a workload that became much faster.

## Two tiers

**Screen** with a cheap targeted comparison: a few inputs, candidate and current
best alternated in one run. The screen only rejects. A candidate beyond the screen
cutoff in the wrong direction on any objective is discarded; anything else goes to the deciding run.
Skip the screen when the deciding run costs little more than a screen.

**Decide** with the full benchmark, candidate against current best alternated in
the same batch, with the repetitions fixed during calibration. When the harness has
no repetitions option, drive it from a script in `artefacts/`. Only the
deciding run keeps a change.

Choose screen inputs in proportion to the benchmark's input classes and to their
weight in the aggregate. A screen dominated by one class predicts that class.

Under a geometric mean the small inputs carry as much weight as the large ones;
screen and profile on the inputs with the worst ratio, not the largest.

## Same batch, and drift

Compare every candidate with the current best measured in the same batch, never
with a number from an earlier batch. Machine noise between batches can be as large
as the effects being judged.

After every fifth kept change, and at the end, run the original and the current
best back to back. The product of per-step ratios is not the cumulative effect.
This check is a gate: each keep may cost an objective up to its floor, and such
costs compound. If an objective is worse than at the previous check (at the first
check, the original) by more than its floor, bisect the keeps since that check and revert the ones that cost it,
before the next hypothesis.

On a loaded or shared host, measure CPU time when the charter's metric allows it.
When the metric is fixed as wall time, raise the repetitions and take the minimum
over rounds as the estimator for additive noise. Alternate candidate and
predecessor when the effect is near the band. Serialise runs; separate worktrees on
one host are not isolation.

## Passengers

A passenger is a change whose hypothesis predicted an improvement, and whose
deciding run against `best/` moved no objective beyond its floor in either
direction. A sub-floor move is noise, so its sign does not decide. It may ride with later changes instead of being discarded,
only if it passes the oracle at the strictest grade and adds no meaningful
complexity. The rule:

- **Where it lives.** The passenger stays committed in `candidate/`; `best/` does not
  move. The next candidate is committed on top of the passengers.
- **What is judged.** With passengers aboard, the deciding run alternates three
  builds: `best/`, the passengers' tip, and the stack with the new candidate. The
  candidate is judged against the passengers' tip by the keep rule; a candidate
  that worsens an objective must not ride on the passengers' gain. If the candidate
  passes against the passengers' tip and the stack passes against `best/`, keep the
  stack, every member included.
- **Below the floor.** If the candidate would be a passenger against the
  passengers' tip and fewer than three are carried, it joins them. Otherwise discard the
  candidate and reset to the passengers' tip. Build the passengers' tip from a
  third worktree, `passengers/` under the campaign root, detached at that tip.
- **Expiry.** When the cap of three is reached and the next deciding run still does
  not pass the keep rule, discard the passengers too: reset to `best/` and add them to
  the failed-idea list.
- **Bookkeeping.** A carry does not reset the convergence window. The ledger names
  every carried commit and every member of a kept stack.

Never add up separate sub-floor screen results. In one session three changes each
screened as a small gain and their combined full run was slower.

## Component rule

When the binary prints exclusive per-component timers, one deciding run may test
several changes that touch different components, each in its own commit. Keep a
component commit when its component improves beyond that component's A/A band, no
objective's aggregate is worse beyond its floor, the oracle passes, and the complexity is
proportionate. This keeps a large gain in a small component that the aggregate floor
would miss.

The timers are diagnostic instrumentation. Add them as one calibration commit,
behind a compile-time switch that is off by default, so `best/` and `candidate/`
both carry them and an uninstrumented build of any revision needs no revert.
Measure their overhead as an A/A of the baseline built with and without the switch.
Component decisions compare builds with the switch on, on both sides; the aggregate
floor and the final confirmation use builds with it off.

Each component commit is one experiment: one ledger row and one unit of budget.
To drop a rejected commit from a batch, `git revert` it in `candidate/`, or rebuild
the batch without it from the patches in `artefacts/`. Run the oracle and a deciding
run on the retained combination before advancing `best/`.

Measure each component's band the same way as the aggregate's. When two commits in
one run can affect the same component, measure control, first commit and both in
one alternating run.

A component whose code did not change and that moves beyond its band is a signal,
not a result. Suspect code layout: compare hot function addresses modulo the cache
line between the two binaries, and run a padding sweep before attributing the
movement to the change.

Composition confounds attribution: when one operation calls another, a speedup of
the callee shows up in the caller. Measure the commit before in the same batch.

## Held-out data

Before the first candidate, set aside inputs from each class and seeds that no
experiment reads. Run them once, on the final best, as one deciding-tier batch. Choosing changes by their gate
results biases the gate; the held-out run measures that bias.

When the oracle is a quality budget, use fresh seeds for any decision made by
selecting among gate results, such as keeping some parameter buckets and not others.
