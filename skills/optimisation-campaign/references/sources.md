# Sources

The method follows the Algorithm Engineering cycle of design, analysis,
implementation and experimental evaluation driven by falsifiable hypotheses
(P. Sanders, "Algorithm Engineering - An Attempt at a Definition", 2009,
`https://doi.org/10.1007/978-3-642-03456-5_22`), as applied to agents by
Agentic Algorithm Engineering (`https://github.com/CHSZLab/AgenticAlgorithmEngineering`,
MIT licence). The campaign rules here are paraphrased from that project's
knowledge-base entries, which report the authors' own sessions; the figures are
theirs and unverified here.

| Entry | Session | Material used |
|---|---|---|
| 036 | KaHIP kaffpa speed, bit-identical then quality budget | Screen versus full run, passengers, summed sub-floor screens failing, proportional screen inputs, profiling the worst-ratio inputs, redundant and discarded work, instruction share versus time, truncated stacks, failed-idea repeats, exact rewrites through comparison outcomes and lookup-only maps |
| 038 | KaHIP cut quality at a fixed time budget | Time as a guard metric, same-batch comparison, held-out graphs and seeds, guard fields with identity audits |
| 040 | ParHIP distributed speed | Per-component keep rule and A/A bands, code-layout confound, quality-budget noise and seed allocation, uninitialised-memory checks |
| 044 | Java secp256k1 SDK | CPU time and minimum of rounds on a loaded host, warmup invalidated by a large win, composition confounds, golden corpus with vectors and tamper checks |
| 039 | Pseudoflow maximum flow | Instrumenting work before importing textbook improvements, convergence as a stop signal |

Property-based differential tests, mutation testing of the oracle, and the keep
rule over several objectives with the back-to-back gate are additions here; the sessions used golden outputs, hashes and a differential test of one
rewritten function (044).

## Not adopted

- **Running until interrupted.** Campaigns here have a budget and a convergence stop.
- **Contributing learnings to an external repository during the run.** Nothing leaves
  the machine without the user's separate approval.
- **Per-experiment PDF reports.** The ledger holds the same record.
- **Keeping a change because its metric improved.** Without a measured noise floor
  this keeps noise.
