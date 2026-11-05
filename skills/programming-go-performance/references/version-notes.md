# Version notes

Checked 2026-10-21 against official Go 1.27.3 source and release notes. The Go version embedded in the profiled binary is what matters, and it can differ from the local `go tool pprof`. Behaviour comes from that release's source and notes. Available flags come from the installed tool's `-help`.

| Version | Change | Consequence |
| --- | --- | --- |
| Go 1.22 | Mutex delay now accounts for the number of blocked goroutines, and runtime-internal contention is included. | A cross-version jump in mutex totals is not, by itself, a regression. |
| Go 1.23 | Non-CPU profile stack depth went from 32 to 128. `GODEBUG=profstackdepth` allows up to 1024, but not for CPU. | Missing ancestors may be truncation. CPU stacks remain capped at 64. |
| Go 1.25 | Runtime-lock mutex stacks now point at critical-section completion. `runtimecontentionstacks` was removed. | Do not recommend the removed flag. |
| Go 1.25 | `runtime/trace.FlightRecorder` was added. | Use it for rare latency incidents ([capture](capture-and-experiments.md#intermittent-latency)). |
| Go 1.25 | Default `GOMAXPROCS` respects container CPU limits and updates dynamically. | Record effective `GOMAXPROCS` and quota when comparing captures. |
| Go 1.26 | The pprof web UI opens on the flame graph. | The graph view is under the menu or at `/ui/graph`. |
| Go 1.26 | Green Tea became the default GC. | Changed GC stacks across an upgrade are not, by themselves, evidence of an application regression. |
| Go 1.26 | `goroutineleak` required `GOEXPERIMENT=goroutineleakprofile` at build time. | Only on 1.26. |
| Go 1.27 | `goroutineleak` became generally available and the experiment flag was deleted. | In code that spans versions, handle a nil `pprof.Lookup("goroutineleak")`. |
| Go 1.27 | Traceback headers include pprof labels by default when the module's `go` directive is 1.27 or later. | Keep label values non-sensitive, or set `GODEBUG=tracebacklabels=0`. |

## goroutineleak

- The profile reports goroutines blocked on channels, `select`, or `sync` primitives that live execution can no longer reach. If a primitive is still reachable through a global or a runnable goroutine, a logical leak stays hidden. An empty result therefore does not prove there is no leak.
- Goroutines blocked on file or network I/O, syscalls, or custom spinning are not classified.
- Capture runs a special GC. Detection can be expensive, quadratic in pathological dependency chains, so do not poll the profile like a cheap counter.
- `goroutineleak?debug=2` runs leak detection and then dumps **all** goroutine stacks, leaked or not. To count leaks, use binary output or `debug=1`.
