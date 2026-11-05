# Benchmark and optimisation sources

Keys cited as `[Sn]` in the other references. Unversioned documentation can advance;
check installed `go help`/`go doc` output for the project's toolchain.

| Key | Primary source | Relevant material |
|---|---|---|
| S1 | benchstat — `https://pkg.go.dev/golang.org/x/perf/cmd/benchstat` | Repeated samples, medians, confidence intervals, A/B comparisons. |
| S2 | testing — `https://pkg.go.dev/testing` | B.Loop, RunParallel, allocation accounting and AllocsPerRun. |
| S3 | Go blog, testing.B.Loop — `https://go.dev/blog/testing-b-loop` | Introduction in Go 1.24 and benchmark pitfalls; implementation details may evolve. |
| S4 | go command testing flags — `https://pkg.go.dev/cmd/go#hdr-Testing_flags` | Profile flags, test binaries and working directories. |
| S5 | Go GC guide — `https://go.dev/doc/gc-guide` | Allocation/live-memory costs, scan-sensitive layouts and memory/CPU trade-offs. |
| S6 | Go PGO guide — `https://go.dev/doc/pgo` | Representative profiles, default.pgo, explicit build inputs and profile drift. |
| S7 | Go compiler optimisations wiki — `https://go.dev/wiki/CompilerOptimizations` | Examples of eliminated conversions; historical details require local verification. |
| S8 | Go compiler command — `https://pkg.go.dev/cmd/compile` | Compiler diagnostic flags. |
| S9 | Container-aware GOMAXPROCS — `https://go.dev/blog/container-aware-gomaxprocs` | Runtime parallelism versus affinity and quota. |

## Evidence boundaries

Diagnostic docs establish what a tool measures, not that a specific application has
that bottleneck. A documented compiler optimisation does not establish that the
current call site receives it. A published performance technique is not an acceptance
benchmark. Runtime-specific optimisations require verification on the target build.
