# Profiling, tracing, and interpretation

Read this when collecting or interpreting diagnostic evidence. Sources are in
`sources.md`. Check local tool help before using version-specific flags.

## Choose by question, not by habit

| Evidence | Meaning | Important limit |
|---|---|---|
| CPU profile | Sampled active CPU stacks. | Not elapsed request time or time asleep. |
| `alloc_space` | Cumulative allocated bytes. | Includes memory subsequently collected. |
| `alloc_objects` | Cumulative allocation count. | Not live-object count. |
| `inuse_space` / `inuse_objects` | Live allocation bytes / objects at the profile's GC boundary. | Not an ownership graph or RSS. |
| Block profile | Synchronisation waiting stacks. | Not a complete explanation of external I/O latency. |
| Mutex profile | Contended critical-section holder stacks. | Attribution commonly appears at unlock, not at the waiting lock call. |
| Execution trace | Runtime events over time. | Diagnose waiting/scheduling/GC, not a substitute for CPU sampling. |
| Goroutine snapshots | Stacks present at capture time. | One blocked goroutine snapshot does not establish a leak. |

Heap statistics depend on GC progress; benchmark-end snapshots may have lost the
objects whose lifetime matters. Allocation sites and retaining owners are different
questions. Block and mutex delay can aggregate across many goroutines and exceed
capture wall time. [S1, S6, S7, S8]

## Capture only the needed diagnostic

CPU, high-detail allocation, contention, and trace instrumentation can disturb each
other and the workload. Use separate captures by default; use uninstrumented runs
for before/after performance claims. A combined low-overhead capture can be valid
when deliberately justified, but it is not the default experiment. [S1]

For file-producing benchmark profiles, select one package and one relevant benchmark.
Do not send `./...` into a command writing a single CPU-profile file. Inspect fixture
setup and package initialisation: profiling covers the process, whereas benchmark
timer controls cover only benchmark accounting. [S5]

Build once, keep the source checkout unchanged, and preserve the exact binary.
The following template assumes the package and benchmark exist; set them for the
actual task. Run the selected capture, not every command indiscriminately.

```bash
set -euo pipefail
: "${PKG:?one package selector required}"
: "${BENCH:?one focused benchmark regular expression required}"
: "${OUT:?new absolute artefact directory required}"
[[ "$OUT" = /* ]]
mkdir "$OUT"
PKGDIR="$(go list -f '{{.Dir}}' "$PKG")"
[[ -d "$PKGDIR" ]]
go test -c -o "$OUT/target.test" "$PKG"

# CPU capture. Preserve the intended deployment/build settings.
(cd "$PKGDIR" && "$OUT/target.test" -test.run='^$' \
  -test.bench="$BENCH" -test.benchtime=5s -test.count=1 \
  -test.cpuprofile="$OUT/cpu.pprof") > "$OUT/cpu-run.txt"

go tool pprof -top "$OUT/target.test" "$OUT/cpu.pprof"
go tool pprof -top -cum "$OUT/target.test" "$OUT/cpu.pprof"
# Substitute a real function regexp based on the top/caller evidence.
go tool pprof -list='RelevantFunction' "$OUT/target.test" "$OUT/cpu.pprof"

# Separate allocation capture. Do not use its timings for A/B claims.
(cd "$PKGDIR" && "$OUT/target.test" -test.run='^$' \
  -test.bench="$BENCH" -test.benchtime=2s -test.count=1 \
  -test.memprofile="$OUT/allocs.pprof") > "$OUT/alloc-run.txt"

go tool pprof -top -sample_index=alloc_space "$OUT/target.test" "$OUT/allocs.pprof"
go tool pprof -top -sample_index=alloc_objects "$OUT/target.test" "$OUT/allocs.pprof"
# Useful only when this capture boundary represents the lifetime in question.
go tool pprof -top -sample_index=inuse_space "$OUT/target.test" "$OUT/allocs.pprof"
```

If sampling misses a suspected small allocation, a short, separate diagnostic run
can add `-test.memprofilerate=1`. This is expensive. Do not combine it with a CPU
comparison or change the sampling rate halfway through a process lifetime. [S9]

A representative CPU capture often needs more time than a smoke test. Select the
window according to workload coverage and event counts, not a universal duration.
Missing samples or an empty profile are not evidence of zero cost.

## Read the profile as evidence

Start with absolute totals, sample unit, flat cost, cumulative cost, and callers.
Flat attributes cost to the function itself; cumulative includes callees. Follow a
high-cumulative wrapper down the stack rather than assuming the wrapper is expensive.
Do not sum overlapping cumulative entries. Use `-list` only with matching source. [S10]

When runtime allocation, copying, scanning, or map code is prominent, find the
application call sites creating that work. A frame name alone does not prescribe
pooling, a new map representation, or a GC setting. A profile observes a distribution;
the proposed causal explanation still needs testing.

A smaller profile percentage does not prove lower absolute cost: the denominator
may have changed. Equal capture durations can process different amounts of work.
For per-operation conclusions, record completed work and compare compatible
workloads; preferably capture a sufficiently large fixed-work experiment.

For comparative views, `-diff_base` compares profiles; `-base` is useful for a later
cumulative snapshot minus an earlier one. `-normalize` rescales totals and therefore
answers a relative-composition question, not an absolute speedup question. Preserve
and locate both revisions' binaries before comparing changed code. [S10]

```bash
# With matching binaries discoverable, after inspecting each profile separately:
go tool pprof -top -diff_base=before.cpu.pprof after.cpu.pprof
# An interval from compatible cumulative allocation snapshots of one process:
go tool pprof -top -sample_index=alloc_space -base=early.heap.pprof late.heap.pprof
```

Do not subtract incompatible sample types, unrelated lifetimes, or arbitrary
same-duration allocation totals and describe the result as bytes saved per operation.

## Contention and latency

Use a representative concurrent benchmark rather than a serial loop when the
question is contention. Full-rate captures below are local diagnostic examples;
budget their overhead and never enable them universally in production.

```bash
# Variables and target.test are prepared as above; run separately.
(cd "$PKGDIR" && "$OUT/target.test" -test.run='^$' \
  -test.bench="$BENCH" -test.benchtime=2s \
  -test.blockprofile="$OUT/block.pprof" -test.blockprofilerate=1)
go tool pprof -top "$OUT/target.test" "$OUT/block.pprof"

(cd "$PKGDIR" && "$OUT/target.test" -test.run='^$' \
  -test.bench="$BENCH" -test.benchtime=2s \
  -test.mutexprofile="$OUT/mutex.pprof" -test.mutexprofilefraction=1)
go tool pprof -top "$OUT/target.test" "$OUT/mutex.pprof"

(cd "$PKGDIR" && "$OUT/target.test" -test.run='^$' \
  -test.bench="$BENCH" -test.benchtime=1s -test.trace="$OUT/trace.out")
go tool trace -pprof=sched "$OUT/trace.out" > "$OUT/sched.pprof"
go tool pprof -top "$OUT/sched.pprof"
# Interactive viewer, only when an interactive browser is available:
# go tool trace -http=127.0.0.1:0 "$OUT/trace.out"
```

Trace-derived `net`, `sync`, `syscall`, and `sched` profiles answer different waiting
questions. Follow the latency-critical path and distinguish runnable delay, blocked
time, work on CPU, external service time, and GC effects. A trace is not a distributed
trace across services. Add regions/tasks only when their diagnostic value justifies
instrumentation; do not alter a public API merely to thread profiling metadata. [S7, S8]

Use supported `runtime/metrics` measurements when GC or scheduling is suspected.
Useful categories include allocation deltas, live heap, scannable bytes, GC CPU, and
scheduler latency. Check `metrics.All()` and each metric's units/kind; cumulative
counters need interval deltas. Do not equate GC pause time with all GC overhead. [S11]

## Live services and profile safety

Use an existing authorised diagnostic route. Do not add a public listener or import
`net/http/pprof` into a library as a performance fix. Its handlers can expose stacks,
command-line data and other process information. Keep access private, authenticated
where necessary, access-controlled, and operationally bounded. Protect saved profiles
and labels; do not include secrets or unbounded tenant/request identifiers. [S12]

With an already configured local endpoint and authorised load, examples are:

```bash
curl -fsS --max-time 40 -o cpu.pprof \
  'http://127.0.0.1:6060/debug/pprof/profile?seconds=30'
curl -fsS --max-time 10 -o heap.pprof \
  'http://127.0.0.1:6060/debug/pprof/heap'
```

CPU and trace endpoints capture a duration. On supported versions, `seconds` on
several other endpoints requests a delta profile; do not confuse that with a
point-in-time live-heap snapshot. `gc=1` requests a GC and changes the process; use it only within the authorised diagnostic scope. [S12]

For retained-memory investigations, capture while the intended object/session/cache
is actually retained, then after its documented release/reset boundary. Use deliberate
liveness in a diagnostic harness where necessary. Complement with OS/container memory
measurements for RSS or peak-memory claims. If a small substring retains a large
source allocation, a copy can be the improvement rather than the regression. [S13]
