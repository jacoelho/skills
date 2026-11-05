# Go performance investigation method

Read once per investigation, review, or optimisation decision. Focused tool questions
and mechanical profile extraction can go directly to their diagnostic reference.

## Establish the decision and scope

Prioritise **correctness > simplicity > performance**. Reach a defensible decision;
“no change justified” is a valid result. Static review can identify a cost mechanism,
but only measurements establish a speedup.

Performance work alone does not authorise changing public contracts, dependencies,
toolchain requirements, production instrumentation, or process-wide runtime settings.
Use an isolated worktree when experiments need disposable edits.

Identify the operation, workload, objective, protected contracts, and existing evidence
before asking for missing context. Distinguish CPU cost, throughput, latency, allocation
traffic, live heap, and peak memory. Include construction, first use, reset, retained
capacity, and compile-once/run-many amortisation when they can change the conclusion.
Set a practical acceptance threshold and regression guardrails before confirmatory
measurement; use project budgets where available. Bound time, samples, and resource use.

Inspect the affected path for ownership, aliasing, errors, resource admission, and
concurrency. A faster error path or skipped validation is not an optimisation. Revisit
rejected experiments only with new evidence or a different mechanism.

## Investigate and compare

Form a falsifiable hypothesis: current cost, proposed mechanism, expected benefit, a
plausible alternative explanation, and a workload likely to lose. Choose the smallest
experiment that distinguishes the explanations. Prefer removing repeated work or
improving an algorithm before adding representations, pools, concurrency, or
compiler-specific complexity. Interfaces, maps, conversions, and allocations are
candidates to investigate, not inherent defects. A copy can improve retention or
protect ownership. Consult [optimisation decisions](optimisation-decisions.md) for
those trade-offs.

Escalate instruments only when current evidence cannot distinguish explanations; mark
unavailable evidence as unknown rather than manufacturing precision. Diagnostic
attribution explains a change; independent benchmark or load measurements establish
magnitude and variability.

When implementation is requested, make the smallest coherent change and verify affected
behaviour before timing. Include a representative caller and an opposing workload when
a local win can move cost elsewhere. Run race checks separately from timing when
ownership or sharing changes.

[Benchmarking](benchmarking.md) owns the measurement protocol: matched baseline and
candidate conditions, the exclusive measurement slot, screening versus confirmatory
runs, the A/B template, and statistical interpretation. Keep diagnostic
instrumentation out of acceptance timing.

## Accept, reject, or stop

Accept a change when correctness holds, the practical objective is met at
confirmatory grade, opposing cases stay within guardrails, and complexity is
justified. Otherwise reject it or report an inconclusive result. Missing tooling and
noisy or insufficient evidence are limitations, not proof of improvement or equivalence.

Stop when the question is answered, the objective or experiment budget is met, reliable
measurement is unavailable, or the next work is outside scope or existing authorisation.
After an accepted edit, complete the project's applicable verification.

## Report the decision

Lead with the diagnosis, decision, or remaining uncertainty. Report material findings
with location, mechanism, workload, observations, alternatives, trade-offs, and disposition.
Separate measured results from hypotheses and executed commands from suggestions.
For quantitative claims, include absolute baseline/candidate values, completed work,
sample counts, uncertainty, the screening/confirmatory grade, commands, raw artifact
paths, and applicable limits. Cite version-sensitive semantics to matching source or
official documentation.

Scale the report to the task; use the [report schema](../assets/report.md) for substantial
handoffs and omit irrelevant fields. A microbenchmark win is not a production claim.
