# Profile comparisons and views

Checked against the pprof vendored in Go 1.27.3 (a May 2026 revision); upstream `main` can differ.

## Axis selection

pprof honours a profile's `DefaultSampleType` and otherwise uses the **last** sample type. Pass `-sample_index` by name, and distinguish `alloc_space` from `inuse_space` and `contentions` from `delay`.

## `-base` vs `-diff_base`

| Question | Operation | Percentage denominator |
| --- | --- | --- |
| What accumulated between two captures of one process? | `-base=earlier later` (cumulative counters) | Sum of **absolute** per-sample differences; equals the net change only when no entry decreased |
| What changed between independent runs? | `-diff_base=baseline candidate` | Baseline total |
| Did the distribution change once totals are equalised? | `-normalize -diff_base=baseline candidate` | Baseline total, after the candidate is scaled |

- `flat%` and `cum%` print absolute magnitudes, even on negative rows. Read the direction from the signed `flat` and `cum` values.
- Keep the negative rows: they are improvements. Avoid `-drop_negative`.
- `-normalize` scales each candidate sample-type total to the baseline total. It does not normalise for time or request count, so compute CPU/request and bytes/request separately.
- Normalisation runs at fetch time, before `-focus` and `-tagfocus`. `-normalize -tagfocus=...` therefore does not normalise the cohort independently, and a changed workload mix can move the result.
- Merges and diffs sum `DurationNanos`: two 10 s captures show `Duration: 20s`. A diff header pairs that summed duration with the baseline total, so its CPU/time ratio is meaningless. Take rates from each original capture.

## Filters and denominators

| Option | Effect |
| --- | --- |
| `focus` / `ignore` | Keep or drop **whole samples** whose stacks match. `ignore` wins over `focus` |
| `show` / `hide` | Keep or remove displayed frames only |
| `tagfocus` / `tagignore` | Keep or drop samples by label value |
| `tagshow` / `taghide` | Keep or remove labels by label name |

- `-ignore=runtime` discards application samples that pass through runtime frames. Use `hide` to tidy a view instead.
- Focused views keep the original profile's denominator. Add `-relative_percentages` to express shares of the focused subset, and say which denominator a figure uses.

### Tag filters

Values are **unanchored regexps**, and commas change meaning depending on the form:

- **Keyed**, `operation=^decode$` or `operation=^(decode|encode)$`: each comma-separated part is matched against the label's value, and the parts are **OR**ed. Unanchored `operation=as` also matches `hash`.
- **Unkeyed**, `-tagfocus='^operation:decode$'`: each comma-separated part is matched against the `key:value` string, and **all** parts must match some label (AND).
- Numeric labels take ranges instead (`32kb`, `:64kb`, `1ms:5ms`).

```bash
go tool pprof -tags cpu.pb.gz   # inspect existing labels first
go tool pprof -top -sample_index=cpu -tagfocus='operation=^decode$' -relative_percentages cpu.pb.gz
```

`-tagroot` and `-tagleaf` add synthetic frames. With `-tagleaf`, flat attribution moves onto those frames, which are not executed functions.

## Source and disassembly

- `-list`, `-weblist` and `-disasm` need the exact profiled binary and matching source. Never substitute a rebuild with different flags or from another revision.
- Resolve source paths with `-source_path` and `-trim_path`. Use `PPROF_BINARY_PATH` for build-ID lookup.
- `-noinlines` folds inlined frames into their out-of-line callers. `-disasm` forces address granularity and no-inline aggregation to avoid double counting. `-weblist` keeps inline information.

## Merging and PGO input

- `go tool pprof -proto a b > merged` keeps only the sample types common to every input. It can reorder them and change the default type, so check `-raw` before and after.
- Merging is summation: longer captures dominate. Prefer equal-duration windows.
- PGO input must have CPU-sample semantics, symbols, inline frames, and function start lines. Without start lines, line offsets cannot be matched.
- PGO matching ignores file names, so moving a function within its package is cheap. Renames and package moves need a refreshed profile.
