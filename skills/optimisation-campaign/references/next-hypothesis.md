# Choosing the next hypothesis

What to look for across a campaign, and when a profile misleads. How to run a
profiler for the language is outside this skill.

## Where to look

- **Redundant work over constant factors.** Ask, per component, which work is
  recomputed, rebuilt or thrown away. Instrument how often a result is discarded:
  a solve whose answer the caller undoes in nearly every call is a larger lever
  than any tuning of the solve.
- **Work per call that is proportional to the whole input.** A setup that allocates
  or clears an input-sized array per call, or an object holding input-sized state
  created per local search, turns into quadratic cost.
- **Count where the algorithm's work goes**, not only which lines are hot: how many
  steps of each kind, and how many change nothing. A line profile can show a
  function as hot without showing that most of its calls are wasted.
- **Repeated sweeps over the same data.** Deterministic per-input work inside a
  repetition loop moves out of it; data visited in the same order many times can be
  laid out in that order once.
- **Algorithmic replacement in place**, on the real problem instances, when the
  analysis says the current algorithm fits the instance shape poorly.

After several neutral micro-changes in a row, stop tuning the hot loop and return to
redundant work and algorithmic replacement.

## When the profile misleads

- **Instruction share is not time.** Small structures that stay in L1 can show a
  large share of instructions and give no wall-time gain when removed.
- **In a loop bound by a random load, samples land on the instruction that consumes
  the load**, not on the load. Test an attributed share with a cheap change of the
  presumed cause before building on it.
- **Truncated stacks distort inclusive shares.** Check the sampler's stack depth
  against component timers: when they disagree, leaf shares may be right and outer
  shares wrong.
- **A profiling build that differs from the measured build reports false costs**,
  such as an allocator that falls back under a memory checker.
- **A fix for one input class inside the hottest function** can cost every other
  class through code size and layout. Stop after two screening rounds that show it.

## The failed-idea list

Every discarded or crashed experiment adds one line to the ledger's failed-idea
list: the idea, the measured effect, and why it failed when known. Read it before
each hypothesis. Repeat an idea only when the system around it changed enough to
alter its mechanism, and say so in the hypothesis: an idea neutral early can pay
once its surroundings are faster.

## Calibration

The ledger keeps each prediction next to its result. When predictions are
consistently too large or in the wrong direction for one kind of change, the model
of the system is wrong for that kind; revise it before predicting again.
