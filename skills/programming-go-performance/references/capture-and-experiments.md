# Diagnostic capture

## Provenance

Record the target binary's build info (`go version -m`, `go tool buildid`) separately from the analyst toolchain: local `go version` says nothing about a remote process. Also record sampling rates, workload and completed work, effective `GOMAXPROCS`/CPU quota, and whether GC was forced. Keep the exact executable and source revision for `-list`/`-disasm`.

## HTTP debug endpoints (`net/http/pprof`)

- Importing the package, even under a name, registers handlers on `http.DefaultServeMux` (with `GET ` patterns unless `httpmuxgo121=1`). The public server must use its own mux.
- The `cmdline` handler exposes `os.Args`. Register only the handlers needed, bind loopback or an authorised tunnel, and keep the server off public ingress.
- Plain `allocs` is cumulative since process start. Use `allocs?seconds=N` for an interval. `seconds=N` on snapshot profiles subtracts two collections. For `inuse_*` this gives the net live change, which can be negative.
- `seconds` and non-zero `debug` are rejected together.
- The handler takes the delta branch before reading `gc`. `heap?seconds=30&gc=1` does **not** force GC at either endpoint. For post-GC retention comparisons, take separate `heap?gc=1` snapshots.
- `goroutine?debug=2` is a text dump, not a pprof protobuf.
- Give client, proxy, and tunnel timeouts room beyond `seconds`.

## Block and mutex sampling

Downloading the endpoint does not enable sampling. The application must call `runtime.SetBlockProfileRate` / `SetMutexProfileFraction` first. `SetMutexProfileFraction` returns the previous value. `SetBlockProfileRate` returns nothing, so save the existing setting yourself before changing it.

The block rate is not a cutoff. Waits of `rate` ns or longer are always recorded. Shorter waits are recorded with probability `duration/rate` and up-weighted (`runtime/mprof.go` `blocksampled`). Full-rate (`1`) sampling is a local diagnostic setting, not a production default.

## Benchmark processes

Build the test binary once with `go test -c`, keep it for symbolisation, and run it from the package directory. Anchor `-test.bench`. CPU profiles include calibration and setup outside timed regions. A `-test.memprofilerate=1` run distorts timing, so never use it as a CPU baseline. Capture block, mutex, and trace in separate runs. Benchmark design belongs to [benchmarking](benchmarking.md).

## Labels into workers

`WithLabels` only builds context. Labels are installed by `Do` or `SetGoroutineLabels` on the executing goroutine. Goroutines created inside the scope inherit labels. A pre-existing worker does not pick them up by receiving the context. `Do` restores labels from its *input* context, not from the goroutine's previous labels. A worker that runs jobs under per-job contexts must therefore reset explicitly:

```go
// workerCtx carries this worker's baseline labels.
func runJob(workerCtx, jobCtx context.Context, kind string, work func(context.Context)) {
	defer pprof.SetGoroutineLabels(workerCtx)
	pprof.Do(jobCtx, pprof.Labels("job", kind), work)
}
```

Use bounded, secret-free label values. Since Go 1.27, labels appear in traceback headers ([version notes](version-notes.md)).

## Intermittent latency

`runtime/trace.FlightRecorder` (Go 1.25+) keeps a recent execution window. Call `WriteTo` after a slow-request trigger, with a cooldown, and record the trigger time. Only one `WriteTo` runs at a time. `MaxBytes` takes precedence over `MinAge` but is a hint, not a hard bound. For trace-derived profiles, see [insight commands](insight-commands.md#trace-derived-profiles).
