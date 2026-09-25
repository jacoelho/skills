# Review report template

## Basis

Scope: [bounded capability/increment].
Reviewed state: [document revisions or workspace state].
Sources inspected: [current contracts, shared interfaces, decisions, relevant checks].
Limits: [inaccessible sources, excluded domains, unexecuted checks, sampling].
Review execution: [self-review or actual named reviewer runs; never implied independence].
Execution evidence: [code/configuration state, commands, fixtures, boundaries, and results; distinguish runtime observations from static inference].

## Four independent assessments

Specification quality: [justified, clear, consistent, feasible, and verifiable enough for this increment / unresolved / unassessed].
Agent readiness: [current contract and history accessible, tools and checks available, scope and discretion clear, evidence boundary reachable / gap and consequence].
Implementation conformance: [supported, violated, unverified, or unassessed for each named obligation; attach the code state and executed evidence].
Faulty-specification response: [no evidence challenging the rule / counterexample and affected decisions, examples, code, tests, dependants, or released effects].

## Findings

### F-001 — [Specific defect]

Severity: [blocker / material / minor].
Certainty: [demonstrated / plausible interpretation / requires evidence].
Category: [ambiguity / duplicate authority / contradiction / missing case / unjustified constraint / weak oracle / stale contract / other specific defect].
Location: [IDs, paths, and revisions].
Applicability: [case or scope in which the issue matters].
Witness: [concrete input, timeline, incompatible outputs, or specific missing evidence].
Consequence: [what can go wrong or cannot be assessed].
Repair: [smallest edit preserving intent, or the decision needed].
Owner: [known authority, or unassigned].
Blocked work: [specific dependency, not automatically the whole project].

## Obligation assessment

[For important obligations: sufficiently specified / violated by another obligation / unresolved / unassessed. Separate contract quality from implementation evidence.]

[Where actual implementation evidence was reviewed, use supported / violated / unverified, attached to its code state and conditions. Do not manufacture an implementation assessment for a specification-only review. Static inspection is an inference; an executed check or operational observation is runtime evidence only for its recorded boundary and conditions.]

## Structural checks, when used

Command and version: [actual command and tool revision].
Documents and declarations read: [actual counts; include active, skipped, symlink, and unsupported inputs where reported].
Result and limitations: [what the structural tool did and did not establish; structural cleanliness is not semantic acceptance].

## Recommendation

[Implement the explicitly named bounded scope / investigate / revise / insufficient evidence to assess].
Blocking questions: [what remains and what settles each].
Independent work: [what can proceed without deciding them].
Acceptance authority: [who decides; no invented approval].

“No findings in the examined scope” is not proof that the requirements are correct, complete, non-overlapping, or feasible in every environment.
