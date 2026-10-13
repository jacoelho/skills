# Access correction task

Scope: implement DOWNLOAD-2 at the modelled callable boundary.
Source identities: contract DOWNLOAD-2; access policy ACCESS-1.
Workspace: this example directory; use evidence.json for exact checked file hashes.

Settled: both routes use current access; the contract owns response semantics.
Editorial change: DOWNLOAD-2's former combined REQ-DOWNLOAD-001 is expressed as
EARS requirements REQ-DOWNLOAD-001 (granted), REQ-DOWNLOAD-002 (denied), and
REQ-DOWNLOAD-003 (unavailable). INV-ACCESS-001 is also expressed in EARS. The
status/data outcomes, DOWNLOAD-2 scope, and authorised policy are unchanged.
Discretion: implementation shape is open while observable results are preserved.
Open Q-FORMAT: invoice formatting is undecided, owned by the example product
owner, excluded from this correction. No formatting promise is inferred from
the probe's arbitrary string body.

Completed: good.py contains the access correction; bad.py is a retained wrong
control for development evaluation, not another production path.
Checks: consult evidence.json for commands actually executed and their limits.
Remaining: compare current source hashes with that record before relying on it.
If a governing premise or probe input changed, refresh affected evidence and
record the changed decision; preserve independent settled work.

Next action: report whether the recorded evidence applies to the current
sources. Run the two local probes only if that evidence is missing or stale.
No additional product approval is needed to perform this already assigned check.
