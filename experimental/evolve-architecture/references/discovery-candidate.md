# Continue from a discovery candidate

Use this only when the request selects a candidate from `$find-architecture-opportunities` or delegates selection from an existing opportunity report.

## Resolve and select

- Resolve a named candidate by its report-local ID from the current conversation or supplied report. Do not ask the user to repeat available context.
- When the user delegates selection, choose the highest-ranked viable candidate and record why it survives its strongest counterargument.
- If a selected candidate is falsified, move to another candidate only when the user also delegated fallback selection. Otherwise report the falsification and stop.

## Treat the handoff as evidence, not design

The selected candidate identifies the problem worth pursuing. Its proposed direction remains a hypothesis; it is not an accepted architecture or implementation strategy.

- Reuse claims with precise file, symbol, test, history, or ADR provenance.
- Recheck only claims that are stale, ambiguous, or could change behavior, ownership, dependency direction, migration, or the strongest objection.
- Lock required and preserved behavior independently. A maintenance opportunity does not authorize a product-behavior change.
- Stay within the selected problem. Do not repeat the broad hotspot scan, regenerate the candidate list, or reopen unrelated opportunities.

Continue with the main workflow. The first new artifact is the refactor-necessity finding, followed by bounded solution alternatives.

## Report the transition

Name the candidate ID and state whether its evidence was reused, revalidated, falsified, or replaced. Do not reproduce the full opportunity report.
