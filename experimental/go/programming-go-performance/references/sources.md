# Primary sources and version notes

The Go links below were supplied with the source archive. Consult installed command
help and documentation for the project's supported toolchain; this index is not a
claim that every linked page or command has been revalidated. Unversioned package
documentation can advance.

Prompt structure was checked against official OpenAI guidance on 3 October 2026:

- [Build skills](https://developers.openai.com/codex/skills): focused triggers,
  progressive disclosure, optional UI metadata, and symlinked skill folders.
- [Rethinking skills and prompts](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra):
  concise descriptions, conditional references, and proportionate procedures.

| Key | Primary source | Relevant material |
|---|---|---|
| S1 | Go diagnostics — `https://go.dev/doc/diagnostics` | Selecting profiles/traces, interference, CPU versus waiting. |
| S2 | benchstat — `https://pkg.go.dev/golang.org/x/perf/cmd/benchstat` | Repeated samples, medians, confidence intervals, A/B comparisons. |
| S3 | testing — `https://pkg.go.dev/testing` | B.Loop, RunParallel, allocation accounting and AllocsPerRun. |
| S4 | Go blog, testing.B.Loop — `https://go.dev/blog/testing-b-loop` | Introduction in Go 1.24 and benchmark pitfalls; implementation details may evolve. |
| S5 | go command testing flags — `https://pkg.go.dev/cmd/go#hdr-Testing_flags` | Profile flags, test binaries and working directories. |
| S6 | runtime/pprof — `https://pkg.go.dev/runtime/pprof` | Sample types, GC boundaries, block and mutex attribution. |
| S7 | runtime/trace — `https://pkg.go.dev/runtime/trace` | Runtime event tracing and user annotations. |
| S8 | go tool trace — `https://pkg.go.dev/cmd/trace` | Trace-derived net, sync, syscall and scheduler profiles. |
| S9 | runtime — `https://pkg.go.dev/runtime` | Sampling rates, GC and GOMAXPROCS behaviour. |
| S10 | pprof documentation — `https://github.com/google/pprof/blob/main/doc/README.md` | Flat/cumulative values, annotated source, comparison and normalisation. |
| S11 | runtime/metrics — `https://pkg.go.dev/runtime/metrics` | Runtime metric units, kinds, scan/live heap and scheduling data. |
| S12 | net/http/pprof — `https://pkg.go.dev/net/http/pprof` | Handler registration, endpoint data, durations, delta captures and forced GC. |
| S13 | strings.Clone — `https://pkg.go.dev/strings#Clone` | Copying substrings to avoid retaining large source strings. |
| S14 | Go GC guide — `https://go.dev/doc/gc-guide` | Allocation/live-memory costs, scan-sensitive layouts and memory/CPU trade-offs. |
| S15 | Go PGO guide — `https://go.dev/doc/pgo` | Representative profiles, default.pgo, explicit build inputs and profile drift. |
| S16 | sync.Pool — `https://pkg.go.dev/sync#Pool` | Optional cache semantics and automatic removal. |
| S17 | Go compiler optimisations wiki — `https://go.dev/wiki/CompilerOptimizations` | Examples of eliminated conversions; historical details require local verification. |
| S18 | Go compiler command — `https://pkg.go.dev/cmd/compile` | Compiler diagnostic flags. |
| S19 | bytes.Clone — `https://pkg.go.dev/bytes#Clone` | Safe copying of byte slices. |
| S20 | Go race detector — `https://go.dev/doc/articles/race_detector` | Correctness instrumentation and coverage limits. |
| S21 | Container-aware GOMAXPROCS — `https://go.dev/blog/container-aware-gomaxprocs` | Runtime parallelism versus affinity and quota. |
| S22 | Agent Skills specification — `https://agentskills.io/specification` | Skill metadata and progressive disclosure into references/assets. |

## Evidence boundaries

Diagnostic docs establish what a tool measures, not that a specific application has
that bottleneck. A documented compiler optimisation does not establish that the
current call site receives it. A published performance technique is not an acceptance
benchmark. Runtime-specific optimisations require verification on the target build.

The skill name and front matter follow the portable Agent Skills form. Host-specific
subagent registration and permissions remain the responsibility of the agent runner;
there is no universal subagent configuration claimed by this bundle.
