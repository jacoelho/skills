---
name: programming-go-performance
description: Investigate Go performance regressions, review hot paths, and validate optimisations with benchmarks and profiles. Use for explicit Go performance concerns, including speculative proposals.
---

# Programming Go Performance

Prioritise **correctness > simplicity > performance**. Reach a defensible decision;
“no change justified” is a valid result. Static review can identify a cost mechanism,
but only measurements can establish a speedup.

Follow the user's requested scope: reviews stay read-only; optimisation requests
permit relevant implementation and verification. Use an isolated worktree when an
experiment needs disposable edits. Explicit user instructions take precedence over
this skill's recommendations. Preserve required behaviour and project restrictions;
performance work alone does not authorise changing public contracts, toolchain
requirements, dependencies, or process-wide runtime settings.

## Establish the decision

Identify the operation, objective, protected contracts, and relevant existing evidence.
Distinguish CPU time, throughput, latency, allocation traffic, live heap, and peak
memory. For reusable objects, include construction, first use, reset, and retained
capacity where they could change the conclusion; account for compile-once/run-many
amortisation. Use project budgets or state a practical acceptance threshold before
confirmatory measurement. Bound experiment duration and resource use to the task.

Inspect the complete affected path for ownership, aliasing, error handling, resource
admission, and concurrency. A faster error path or skipped validation is not an
optimisation. Resolve unclear behaviour from callers and tests before changing it.
Previous rejected experiments need new evidence or a different mechanism to revisit.

## Consult the relevant reference

Load only the material needed for the current decision:

- [Benchmarking](references/benchmarking.md): benchmark validity, lifecycle coverage,
  matched baseline/candidate runs, sample plans, and benchstat interpretation.
- [Profiling](references/pprof.md): CPU, allocation, retention, contention, latency,
  execution traces, and bounded diagnostic capture.
- [Optimisation decisions](references/optimisation-decisions.md): algorithms, layout,
  scratch ownership, pooling, compiler behaviour, concurrency, unsafe, GC, and PGO.
- [Sources](references/sources.md): primary documentation and version-sensitive facts.

For a substantial handoff, adapt [the report](assets/report.md); omit irrelevant fields.
If delegation is useful and permitted, use [the task brief](assets/task-brief.md) and
[portable investigator prompt](agents/programming-go-performance.md). The prompt is
not host registration and does not itself grant permissions.

## Investigate and compare

Form a falsifiable hypothesis: current cost, proposed mechanism, expected benefit,
and workload likely to lose. Prefer removing repeated work or improving the algorithm
before adding representations, pools, concurrency, or compiler-specific complexity.
Interfaces, maps, conversions, and allocations are candidates to investigate, not
inherent defects. A copy can improve retention or protect ownership.

Choose diagnostics by the question. CPU profiles sample active work, not request
latency; allocation profiles do not establish retained memory or RSS. Heap allocation
stacks do not identify every retaining owner. Follow contention and waiting through
appropriate profiles or traces. Preserve the matching source and binary.

For implementation, make the smallest coherent change and protect affected behaviour
with relevant tests before timing. Include a representative caller and an opposing
workload when a local win could move cost elsewhere. Reuse existing coverage; add
regression tests for meaningful gaps. Run race checks separately from timing when
shared state or ownership changes.

Compare equivalent fixtures, benchmark definitions, toolchains, build/PGO settings,
and runtime conditions. Record revision, dirty state, workload, hardware, effective
parallelism, and relevant limits. Keep measured runs free of competing builds,
benchmarks, and profilers; separate worktrees do not isolate shared hardware.

Use short screening runs to reject obvious losers. Confirm promising changes with
predeclared repeated samples and uncertainty analysis; alternate baseline/candidate
order and retain raw results. Choose sample count to fit the decision and budget.
Keep diagnostic instrumentation out of acceptance timing. Mark missing tooling,
noisy results, and insufficient evidence explicitly; do not sample until a desired
significance appears.

## Finish with evidence

Accept a change when correctness holds, the practical objective is met, opposing
cases stay within guardrails, and complexity is justified. Otherwise reject it or
report an inconclusive result. Stop when the objective or experiment budget is met,
reliable measurement is unavailable, or the next work is outside scope. After an
accepted edit, complete the project's applicable verification.

Report material findings with location, mechanism, workload, evidence, trade-offs,
and disposition. Separate measured results from hypotheses. Include commands, raw
artifact paths, sample counts and uncertainty for quantitative claims, plus changed
files, checks run, and unverified limits. Scale the report to the task; never turn a
microbenchmark win into an unsupported production claim.
