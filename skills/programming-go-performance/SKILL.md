---
name: programming-go-performance
description: Owns the method for Go performance work - investigating regressions, reviewing hot paths, designing benchmarks, and accepting or rejecting optimisations on measured evidence. Use for explicit Go performance concerns, including unmeasured optimisation proposals to evaluate. Covers pprof profile capture and interpretation. For long benchmark or profiling runs, consider delegating to the jacoelho:programming-go-performance subagent.
---

# Programming Go Performance

Run small reviews and single experiments in the main session. Delegate to the
`jacoelho:programming-go-performance` subagent, briefed with the
[task brief](assets/task-brief.md), when repeated benchmark runs or profile output
would flood the main context. The subagent preloads this skill.

This skill owns the investigation method, benchmark design, optimisation
decisions, and profile capture and interpretation. For investigations, reviews, and
improvement decisions, read the [investigation method](references/investigation-method.md)
once, then load only the references the current decision needs.

| Need | Authoritative reference |
| --- | --- |
| Scope, hypotheses, acceptance, stopping, and reporting | [Investigation method](references/investigation-method.md) |
| Benchmark validity, lifecycle, matched measurements, and uncertainty | [Benchmarking](references/benchmarking.md) |
| Algorithms, layout, reuse, pooling, compiler behaviour, concurrency, GC, and PGO decisions | [Optimisation decisions](references/optimisation-decisions.md) |
| Capture endpoints, sampling setup, labels, flight recorder, and capture provenance | [Diagnostic capture](references/capture-and-experiments.md) |
| Interpret CPU, allocation, retention, contention, labels, and runtime metrics | [Runtime semantics](references/runtime-semantics.md) |
| pprof CLI pitfalls: regexp filters, pruning, `-mean`, trace-derived profiles | [pprof CLI pitfalls](references/insight-commands.md) |
| Profile differences, denominators, filters, source attribution, merges, or PGO input | [Profile comparisons](references/comparisons-and-views.md) |
| Release-dependent profiler features or missing stacks | [Profiler version notes](references/version-notes.md) |
| Primary sources for cited claims | [Sources](references/sources.md) |

For substantial handoffs, adapt the [report schema](assets/report.md).
