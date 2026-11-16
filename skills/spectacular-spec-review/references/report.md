# Review report template

A layout for larger reviews. Include only the sections the review scope covers, and omit the rest. The verdict comes first, because it is what the reader acts on.

## Verdict

Recommendation: [implement the named scope / investigate a named uncertainty / revise the contract / reconcile drift / insufficient evidence].
Blockers: [finding IDs that block, or none].
Independent work: [what can proceed without settling them].
Readiness: [each of the four criteria in the Readiness step: holds / fails as product decision, evidence gap, environment limit, or missing authority].
Conformance: [supported, violated, or unverified for each named obligation, with the code state and executed evidence; omit for a specification-only review].

## Findings

Ordered by severity, then consequence.

### F-001 - [blocker | material | minor] [Specific defect]

Location: [IDs, paths, and revisions].
Witness: [concrete input, timeline, incompatible outputs, or the specific missing evidence. A finding from the paraphrase reader starts with "Paraphrase:" and quotes the sentence that diverged.]
Consequence: [what can go wrong or cannot be assessed, and the dependants affected when the rule changes].
Repair: [the smallest edit preserving intent; or "decision needed, by <whom>" when settling it is not an edit].

Severity: blocker means the scope cannot be implemented or accepted until it is settled; material means an obligation or its evidence is wrong or missing; minor is any other defect. Classify a source mismatch with [the mismatch classes](../../spectacular-spec-writing/references/mismatch.md) in the Witness.

## Basis

Scope: [bounded capability or change].
Reviewed state: [document revisions or workspace state].
Sources inspected: [contracts, decision records, code, tests, external contracts].
Not inspected or not run: [inaccessible sources, excluded domains, unexecuted checks, sampling].
Review execution: [self-review, or named independent reviewer runs; never implied independence].
Paraphrase reader: [who paraphrased and the inputs given, or skipped and why].
Execution evidence: [commands, code state, fixtures, and results; distinguish runtime observations from static inference].

## Linter run

Command and version: [actual command and tool revision].
Documents and declarations read: [actual counts; include active, skipped, symlink, and unsupported inputs where reported].
Limits: [a clean run covers syntax and traceability only, not meaning].

“No findings in the examined scope” is not proof that the requirements are correct, complete, non-overlapping, or feasible in every environment.
