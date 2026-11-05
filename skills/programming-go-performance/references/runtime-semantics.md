# Runtime profile semantics

Commonly misread semantics, checked against official Go 1.27.3 source. Recheck if the profiled binary uses another release.

## CPU

- `pprof.StartCPUProfile` requests 100 Hz and allows one CPU profile per process. Coordinate with any continuous profiler that is already running.
- A preceding nonzero `runtime.SetCPUProfileRate(hz)` does take effect. StartCPUProfile's own 100 Hz call is then rejected with the stderr message "cannot set cpu profile rate until previous profile has finished" (`runtime/cpuprof.go`). This ordering is undocumented, so use it only for deliberate diagnostics.
- Read the actual `Period` from the profile instead of assuming 100 Hz.
- Stop the profile before closing its writer. `StopCPUProfile` waits for the writes to finish.
- CPU stacks are capped at 64 PCs. `GODEBUG=profstackdepth` (default 128, max 1024) does not apply to CPU profiles.
- The CPU sample buffer can overflow. Overflow shows up as a `runtime/pprof.lostProfileEvent` frame, which is not application work. Recollect if losses or truncation affect the claim.
- CPU samples exclude off-CPU waiting. Hot `read`/`write` syscalls show syscall execution cost, not I/O wait. Use a trace for elapsed waits.
- Inline frames are represented in the profile. Before blaming inlining for missing frames, check symbolisation and filters.

## Memory

- `heap` and `allocs` carry the same four axes and differ only in their default axis. Lower `alloc_*` (churn) does not imply lower `inuse_*` (retention).
- A large cumulative `runtime.mallocgc` subtree can include `runtime.gcAssistAlloc`, which is the allocating goroutine paying GC assist. That is not allocator bookkeeping.
- `MemProfile` data can be up to two GC cycles old, while `ReadMemStats` is current. Do not expect them to agree.
- `MemProfileRate` (default 512 KiB) samples randomly by bytes; there is no minimum object size. Set it once, early, and keep it constant.
- Exported heap values are already scaled by `1/(1-exp(-S/R))`. Do not scale them again. When only a handful of samples are involved, the issue is variance, not omission.
- Allocation stacks show where objects came from, not what retains them. Explain retention from ownership: caches, queues, goroutine lifetimes, retained backing arrays.
- RSS includes non-heap memory and freed but unreturned spans. Pair retention claims with `runtime/metrics` or OS accounting.

## Contention

- A block profile attributes completed waits on channels, `select`, `sync` and semaphores to the waiting stack. It does not cover network or file I/O; use `go tool trace -pprof=net|syscall` for those.
- A mutex profile attributes contention to the end of the critical section, commonly `Unlock`. Examine the protected work, not the release itself.
- Aggregate wait time can exceed wall time.
- Recorded block and mutex values are already up-weighted for sampling. Do not multiply them by the rate or fraction.
- Block events are recorded when the wait *completes*. An operation that is still blocked is absent; use a goroutine dump or a trace to find it.
- For the same reason, a `seconds=N` delta can include a whole wait that began before the window and omit waits unfinished at its end. An empty block profile does not prove that no blocking occurred until you have checked that sampling was enabled.
- Go 1.22 changed how mutex delay is accounted, and Go 1.25 changed runtime-lock stacks ([version notes](version-notes.md)).

## Labels

Only CPU, goroutine, and goroutineleak profiles carry pprof labels. Heap, block, and mutex profiles do not. Children spawned inside the labelled scope inherit labels, but GC and other downstream costs are not attributed to the originating label. For worker resets, see [capture](capture-and-experiments.md#labels-into-workers).

## Traces and runtime metrics

A runtime execution trace covers one process, not a distributed trace. For GC or scheduler questions, use `runtime/metrics`. Check each metric's kind (cumulative metrics need deltas) and unit. GC pause time is only part of GC cost.
