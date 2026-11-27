# Correctness oracles

The oracle decides whether a change is correct before its speed matters. The
charter fixes its grade; only the owner relaxes it.

## Grades

From strictest:

1. **Identical output.** Every output byte, hash-compared against the reference
   generated from the original, for every benchmark input and seed. Return codes and printed metrics
   too, where callers read them.
2. **Equivalent output.** Output equal under an equivalence the contract defines,
   such as the same set in any order or values within a stated tolerance.
3. **Quality budget.** Output may change if an aggregate quality measure stays
   within a bound of the baseline, plus fixed constraints such as validity and
   balance checked input by input.

Record each kept change's grade in the ledger. A change at a weaker grade than the
current best's lowers the whole set's grade.

## Building the oracle

Generate a golden corpus from the original before the first candidate. Include the
benchmark's inputs and targeted ones: boundary values, escapes, empty and maximal
cases, inputs that must be rejected, and inputs that declare sizes larger than the
data they carry, run at the largest limits the configuration permits. Identical
output does not catch work or memory sized from untrusted input; only such inputs
do. Add published test vectors and negative
checks where they exist (a tampered signature must fail).

A fixed corpus checks only the inputs someone thought of. Add generated inputs
in two ways:

- **Differential properties.** Compare candidate against the original on generated
  inputs at the charter's grade: the same output, or the same output under the
  equivalence. Use one of two references. When the edit scope has a function
  boundary, keep the original implementation as a test-only reference and compare
  there, where generated inputs reach cases the whole program rarely produces. When
  only the program's output is observable, build the original once at calibration,
  keep the build in `artefacts/`, and compare program outputs. Bias the generators towards what
  optimisations break: boundary sizes, empty and maximal inputs, duplicates and
  ties, skewed distributions, and the sizes where a fast path switches on.
- **Invariant properties.** Facts that hold for every correct output regardless
  of the implementation, such as "the output is a permutation of the input" or
  "every node is in exactly one block". These are the only automatic check left
  under a quality budget, where the output may differ from the baseline.

Fix the seed and the number of cases for each oracle run, log the failing input,
and add every failure the generator finds to the golden corpus. Generated cases
are part of the oracle's cost; keep the per-experiment set bounded, and run a
larger set at confirmation.

Bit-identical output on one machine does not prove no byte is read before it is
written. When a change leaves memory uninitialised, check with a memory checker on
the paths the benchmark exercises.

## Oracle strength

An oracle that passes everything proves nothing, and a campaign rewrites exactly
the code its oracle must guard. Before the first candidate, run mutation testing
over the edit scope against the oracle: plant small defects such as a changed
comparison, an off-by-one bound, a dropped update or a swapped tie-break, and check
that the oracle fails on each one. Limit it to the functions the calibration profile
shows hot, within the charter's mutant or time cap, which applies per function: the cost is the number of
mutants times the oracle's run time. Use the language's mutation tool where one
exists; otherwise apply hand-made mutants. Mutants are never committed; check that
the tree is clean afterwards.

For each surviving mutant, either strengthen the oracle (a property, a corpus
input) until it fails, or record in the ledger why the mutant is equivalent to the
original. When the cap runs out first, record the survivors; their functions are
closed to rewrites until the oracle covers them. Mutation testing is too costly to
run on every experiment: run it at calibration, and on a function before the first
experiment that rewrites it rather than tuning it, if it is not yet covered.

## Quality budgets

Before approving a budget, measure the relaxed oracle's own noise: the baseline
against itself on disjoint seed sets, several random splits. A budget below that
noise cannot be resolved with the seeds the campaign can afford. Report the seeds
needed per side to resolve it, and spend more seeds on the inputs whose quality
varies most relative to their cost. Validate the estimate with an A/A split of a
large reference before trusting it; heavy tails make small-sample estimates
optimistic.

When the baseline itself sometimes violates a constraint, compare against the
baseline input by input rather than against zero violations.

## Exact rewrites through what the caller observes

A change is exact when it preserves everything the caller can observe, even if
internal behaviour differs. Find the observable, then rewrite freely underneath it:

- a sort whose result depends only on comparison outcomes gives the same order over
  a different element type with the same comparisons;
- a map that is only looked up, never iterated, can change implementation; one whose
  iteration order feeds the algorithm cannot, unless the replacement reproduces that
  order;
- a computed set that every correct algorithm produces identically, such as the
  minimal source side of every maximum flow, lets the algorithm change;
- a distribution whose output has a known closed form for the library in use can be
  replaced by that form.

Name the observable and its source in the hypothesis. If the observable is wider
than assumed, the oracle catches it; the hypothesis records why.

## Adding behaviour without disturbing old paths

Put new behaviour behind a configuration field whose default reproduces the old
path, set it only where the new behaviour applies, and keep the new code in its own
files. Audit every old configuration for identity after each kept change, separately
from timing. Where configurations are built on top of each other, reset the field
explicitly in those that must not inherit it.

An audit that finds old paths already nondeterministic in the baseline records them
as such; they are excluded from identity, not counted as regressions.
