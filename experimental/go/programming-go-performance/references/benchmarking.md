# Benchmark design and comparison

Read this when designing, reviewing, or comparing benchmarks. Source keys refer to
`sources.md`. Adapt the experiment design to the task's budget and evidence requirements.

## Define what one operation means

Specify the useful unit: a document, message, lookup, compiled schema, complete
request, or byte stream. Keep that definition unchanged across revisions. Report
bytes processed with `SetBytes` where meaningful; do not count skipped work as output.

A benchmark must validate its fixture and expected outcome. Check errors from the
operation; an unexpectedly fast error path is not a speedup. For intentionally
invalid input, establish the expected rejection independently. Reset readers,
buffers, sessions, counters, and mutation-prone input according to actual use.
Do not sort an already sorted slice when the intended workload is unsorted data.

Separate preparation, first use, steady-state execution, reset, and teardown.
A warm-session benchmark should exclude one-time construction but include resets
required for every operation. A one-shot benchmark must pay for construction.
Measure session creation and retained capacity separately rather than hiding them.
For caches, include misses, hits, churn, saturation, and the actual key distribution.

Use a small workload matrix: the target, a representative caller, and an opposing
case. Choose dimensions that can change the conclusion: small/typical/large, valid/
invalid, shallow/deep, repeated/unique, serial/concurrent, and large-then-small reuse.
Preserve fixture provenance and identity. Synthetic distributions are assumptions,
not production measurements.

## Serial and parallel loops

For supported Go versions starting with 1.24, prefer the documented exact
`for b.Loop() { ... }` form for new serial benchmarks. It handles setup/cleanup
boundaries and protects benchmark work from inappropriate elimination. It does not
make an unrealistic workload realistic. Do not mix `B.Loop` and a `b.N` loop in one
measurement or use `b.N` as an iteration count inside a running `B.Loop`. [S3, S4]

For older supported versions, use `b.N`, explicit timer boundaries, and an appropriate
result sink or observable use. Do not add a global sink that changes ownership or
forces an escape absent from the real caller. Keep the harness equivalent in A/B
comparisons; benchmark-framework migration is a separate change.

Use `RunParallel` and `pb.Next()` for parallel benchmarks. Create goroutine-local
scratch inside the callback when that matches production. Do not share an unsafe
sink or change the global benchmark timer from a worker. Exercise relevant
GOMAXPROCS values; `-cpu` changes this setting, not CPU affinity. [S3, S5]

Do not infer individual request latency or tail percentiles from parallel `ns/op`.
For latency objectives, measure a latency distribution under a stated arrival/load
model and include queueing, failures, and timeouts. If a workload stalls, a closed-loop
client may send less work; a lower measured rate is not evidence of improvement.

## Baseline metadata and isolation

Record the exact revision, dirty patch, untracked fixture identity, toolchain and
benchmark-tool versions, CPU, OS/architecture, effective GOMAXPROCS, container quota,
memory limit, and relevant build/runtime settings. Capture a settings allowlist,
not a full environment dump containing credentials.

Pin fixture and harness content between revisions. When adding a benchmark, apply
an identical test-only harness to both worktrees. Capture production PGO settings:
an automatically discovered `default.pgo` must not silently differ between sides.
Use `-pgo=off` for a declared code-only experiment, or the same intended PGO input for
both sides. Neither should be silently substituted for deployment conditions. [S15]

Compile both test binaries before timing. Run from each package's own directory so
relative `testdata` paths retain their meaning. Keep binaries tied to their source
checkout. Build cache and benchmark state are different: a cached build does not
mean the operation is warm. `-run='^$'` skips ordinary selected test bodies, not
package initialisation or an existing `TestMain`; inspect their workload and side effects.

Reserve a quiet measurement host. No concurrent benchmarks, profilers, race tests,
compilations, or unrelated load generation. Multiple worktrees on one host are not
isolation. Record thermal/power state and noisy neighbours when relevant; do not
change CPU affinity or machine-wide settings without authority.

## A/B command template

The following Bash template measures one package in two existing worktrees. Set
all required paths and selectors explicitly. It does not create branches, switch
revisions, edit source, or install tools. `OUT` must be a new absolute directory.
Choose sample count and duration before running; the template requires an explicit budget.

```bash
set -euo pipefail
: "${OLD_DIR:?absolute baseline checkout required}"
: "${NEW_DIR:?absolute candidate checkout required}"
: "${OUT:?new absolute artefact directory required}"
: "${PKG:?one package selector required}"
: "${BENCH:?focused benchmark regular expression required}"
: "${PGO:?set auto, off, or the intended absolute profile path explicitly}"
: "${CPU:?explicit GOMAXPROCS benchmark setting required}"
: "${SAMPLES:?predeclared sample count per revision required}"
BENCHTIME="${BENCHTIME:-1s}"
[[ "$OUT" = /* && "$OLD_DIR" = /* && "$NEW_DIR" = /* ]]
[[ "$SAMPLES" =~ ^[1-9][0-9]*$ ]]
[[ "$CPU" =~ ^[1-9][0-9]*$ ]]
mkdir "$OUT"

OLD_PKGDIR="$(cd "$OLD_DIR" && go list -f '{{.Dir}}' "$PKG")"
NEW_PKGDIR="$(cd "$NEW_DIR" && go list -f '{{.Dir}}' "$PKG")"
[[ -d "$OLD_PKGDIR" && -d "$NEW_PKGDIR" ]]
(cd "$OLD_DIR" && go test -c -pgo="$PGO" -o "$OUT/baseline.test" "$PKG")
(cd "$NEW_DIR" && go test -c -pgo="$PGO" -o "$OUT/candidate.test" "$PKG")

# Supplement this with the task's revision, fixture and machine metadata.
{
  go version
  go env GOOS GOARCH GOAMD64 GOARM64 CGO_ENABLED GOFLAGS GOTOOLCHAIN
  printf 'PGO=%s CPU=%s SAMPLES=%s BENCHTIME=%s\n' "$PGO" "$CPU" "$SAMPLES" "$BENCHTIME"
  printf 'GOGC=%s GOMEMLIMIT=%s GODEBUG=%s\n' \
    "${GOGC-<unset>}" "${GOMEMLIMIT-<unset>}" "${GODEBUG-<unset>}"
  go version -m "$OUT/baseline.test"
  go version -m "$OUT/candidate.test"
} > "$OUT/environment.txt"

run_one() {
  local side="$1" pkgdir="$2" sample="$3"
  printf '%s %s\n' "$sample" "$side" >> "$OUT/order.txt"
  (cd "$pkgdir" && "$OUT/$side.test" \
    -test.run='^$' -test.bench="$BENCH" -test.benchmem \
    -test.benchtime="$BENCHTIME" -test.count=1 -test.cpu="$CPU") \
    >> "$OUT/$side.txt" 2>> "$OUT/$side.stderr.txt"
}

for ((i=1; i<=SAMPLES; i++)); do
  if ((i % 2)); then
    run_one baseline "$OLD_PKGDIR" "$i"
    run_one candidate "$NEW_PKGDIR" "$i"
  else
    run_one candidate "$NEW_PKGDIR" "$i"
    run_one baseline "$OLD_PKGDIR" "$i"
  fi
done

# Confirm the selectors actually ran the intended benchmarks.
grep -q '^Benchmark' "$OUT/baseline.txt"
grep -q '^Benchmark' "$OUT/candidate.txt"
if command -v benchstat >/dev/null 2>&1; then
  benchstat "$OUT/baseline.txt" "$OUT/candidate.txt" > "$OUT/benchstat.txt"
else
  printf 'benchstat is unavailable; preserve raw files and mark statistical analysis not run.\n' >&2
fi
```

This is not a universal benchmark runner: add a per-process timeout through the
approved execution environment, check that benchmark names and expected sample
counts match, and record external machine conditions. Its alternating order reduces
one source of drift; it does not prove sample independence or remove host noise.
Do not compare different architectures or compiler versions as though only source
code changed. Toolchain upgrades need their own experiment dimension.

## Interpret the results

Benchstat provides repeated-run summaries and A/B comparisons; its documentation
recommends at least ten runs. Choose and record the count before confirmation; short screening runs are not
confirmatory evidence.
Report per-workload effect sizes and the tool's uncertainty/significance output. [S2]

Choose a minimum useful improvement and regression budgets before the confirmatory
run. A statistically detectable change may be too small to justify complexity.
Conversely, a wide interval or a non-significant result is not proof of equivalence.
Insufficient power should produce “inconclusive”, not “no regression”.

Do not select the best run, delete only inconvenient outliers, change the alpha
threshold after seeing the result, or keep sampling until significance appears.
Document contaminated runs and repeat a complete declared comparison when needed.
Exploratory searches across many candidates need fresh confirmation of the winner.

Use `B/op` and `allocs/op` for allocation traffic, not retention. Stable, narrowly
scoped allocation contracts can use `testing.AllocsPerRun`; it is warmed and forces
GOMAXPROCS to one, so it does not certify concurrent behaviour. [S3]
A displayed zero is scoped to the measured workload; it is not a universal API proof.

Keep timing gates on controlled runners. Use functional, race and bounded-allocation
regression tests where deterministic; avoid absolute nanosecond assertions in generic
shared CI. Recheck representative integration performance after accepting a local win.
