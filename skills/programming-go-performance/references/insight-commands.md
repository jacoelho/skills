# pprof CLI pitfalls

Function arguments to `-focus`, `-ignore`, `-peek`, `-list`, `-disasm` and `-weblist` are **unanchored regexps**. `-focus` and `-ignore` also match source file names and mapping (binary) paths, so `-focus=parser` catches any matching file path. These references write the package dot as `[.]`, e.g. `'internal/parser[.]Decode'`. Match names already seen in `-top`. Check `go tool pprof -help` on the analysis machine before using an unfamiliar flag.

## Metadata

- Inspect axes, units, labels and mappings with `go tool pprof -raw` and `-tags`. Select the axis by name with `-sample_index`.
- Do not scrape exact numbers from `-raw`. Its `Duration:` can print without a unit, and label values are unescaped. For exact fields, parse the protobuf with `github.com/google/pprof/profile`.
- Merged and diff profiles sum `DurationNanos` ([comparisons](comparisons-and-views.md)).

## Pruning

- A raised `-nodecount` alone does not disable every pruning threshold. Use `-trim=false` when an omitted node matters.
- Dashed graph edges cross removed frames, and a missing node does not mean zero work. Confirm call-path claims with `-peek` and `-traces -focus=...`.

## `-mean`

`-mean` divides the selected axis by **sample axis 0**, whatever `-sample_index` is.

- On a mutex profile, axis 0 is `contentions`, so `-mean -sample_index=delay` gives mean delay per contention, not a percentile. Confirm axis 0 with `-raw` first.
- On a Go heap profile, axis 0 is `alloc_objects`. `-mean -sample_index=inuse_space` is therefore **not** average live object size.

## Per-operation cost

`-divide_by=N` scales the displayed values but keeps the unit label. With per-request CPU usually in µs, use `-unit=us`:

```bash
# Capture window contained exactly 10,000 completed requests.
go tool pprof -top -sample_index=cpu -unit=us -divide_by=10000 cpu.pb.gz
```

The result is amortised CPU per request and includes background CPU.

## Tag filters

See [comparisons](comparisons-and-views.md#tag-filters) for the regexp and comma semantics.

## Trace-derived profiles

```bash
go tool trace -pprof=net trace.out > net.pb.gz        # network blocking
go tool trace -pprof=sync trace.out > sync.pb.gz      # sync blocking
go tool trace -pprof=syscall trace.out > syscall.pb.gz
go tool trace -pprof=sched trace.out > sched.pb.gz    # runnable-to-running delay
```

These profiles aggregate away chronology. Return to `go tool trace` for event order and overlap. Flame-graph width is resource weight, not elapsed time.
