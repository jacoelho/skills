# Technical-writing document profiles

This reference is owned by `technical-writing-orchestrate`. Select one profile and pass its requirements to discovery, writing, review, and editing calls.

## Contents

- [Decision profile](#decision-profile)
- [Product profile](#product-profile)
- [Incident profile](#incident-profile)
- [Comment profile](#comment-profile)
- [Profile-specific editor cautions](#profile-specific-editor-cautions)

## Decision profile

Use for CDRs, RFDs, RFCs, ADRs, architecture proposals, and technical strategy.

### Questions the document must answer

- What problem is being scoped, and what is outside scope?
- What determination or discussion is requested?
- What constraints shape the solution space?
- Which materially different options, including doing nothing, were considered?
- What evidence or prototypes distinguish the options?
- What is selected, preserved for further testing, or rejected?
- What consequences, failure modes, migration work, and rollback limits follow?
- What would cause the determination to be revisited?

### Recommended structure

1. Status and determination requested.
2. Context and present behaviour.
3. Scope, non-goals, and constraints.
4. Evaluation criteria.
5. Options and evidence.
6. Determination and rationale.
7. Consequences and trade-offs.
8. Failure, operations, migration, and rollback.
9. Open questions, dissent, and revisit triggers.

### Oxide-derived principles

- Write down nascent ideas early; maturity should be explicit rather than simulated through polished prose.
- Treat scoping, exploration, prototyping, determination, development, validation, stress, and production as useful phases, not a rigid linear process.
- A determination selects a viable direction; it need not prove that every other direction is universally wrong.
- Preserve optionality deliberately when current evidence cannot distinguish viable options, but state how further work will distinguish them.
- Record determinations even when tentative so future teams retain the original trade-offs and evidence.
- Balance rigour with urgency. More analysis is not automatically more rigorous when it is unlikely to change the direction.

## Product profile

Use for PRDs, requirements, acceptance criteria, and product specifications.

### Questions the document must answer

- Who experiences the problem, in what context, and with what evidence?
- What outcome should change?
- What observable behaviour is required?
- What is explicitly out of scope?
- Which edge cases, permissions, failure paths, and operational needs matter?
- How will acceptance and success be measured?
- Which implementation choices are decisions rather than user needs?

### Recommended structure

1. Problem and evidence.
2. Actors and affected workflows.
3. Goals, non-goals, and scope.
4. Required behaviour.
5. Acceptance criteria and success measures.
6. Edge cases and failure behaviour.
7. Operational, security, privacy, and migration constraints.
8. Open decisions and dependencies.

### Profile traps

- Do not write an implementation component as a user need.
- Do not use “easy”, “fast”, “intuitive”, or “seamless” without an evaluation method.
- Do not confuse output metrics with user outcomes.
- Do not hide operational work outside the product scope when it is necessary for the behaviour to succeed.

## Incident profile

Use for RCAs, postmortems, incident reviews, and corrective-action plans.

### Questions the document must answer

- What was the impact and exact time boundary?
- What was observed, by whom, and from which evidence?
- Which technical and organisational conditions combined to produce the incident?
- Which controls failed, were missing, or detected the issue late?
- Why did each action appear reasonable with the information available then?
- How was service recovered and data reconciled?
- Which corrective actions interrupt specific causal mechanisms?

### Recommended structure

1. Impact and status.
2. Evidence and chronology.
3. Detection and response.
4. Contributing mechanisms and failed controls.
5. Recovery and reconciliation.
6. Corrective actions, owners, and completion tests.
7. Residual risks and validation plan.

### Profile traps

- Chronology is not causality.
- “Human error” is not a stopping point.
- Do not invent minute-level precision unsupported by evidence.
- Do not create actions that merely tell people to be more careful.
- Tie every major action to a contributing mechanism or detection/recovery gap.

## Comment profile

Use for code-review, design-review, and short technical comments.

### Required form

```text
Severity or intent: concrete observation. Trigger and mechanism. Consequence. Requested change or genuine question.
```

Example:

> **Blocking:** `Publish` returns `nil` after the final retry. When every SNS attempt fails, the caller acknowledges the SQS message even though no downstream copy exists. Return the final error and add a test for the exhausted-retry path.

### Profile traps

- Do not disguise a required correction as a vague question.
- Do not present preference as correctness.
- Do not use `blocking` without a concrete harmful execution path.
- Keep one coherent issue per comment.

## Profile-specific editor cautions

### Decision documents

- Keep the determination discoverable, but do not repeat it as introduction, recommendation, key takeaway, and conclusion.
- Preserve the strongest version of each serious alternative and the conditions under which it would be preferable.
- Do not merge tentative options with the selected direction.
- Keep trade-offs, dissent, and revisit conditions visible after compression.

### Product documents

- Organise behaviour around actors, triggers, outcomes, and failure paths rather than implementation components or feature slogans.
- Keep requirements, defaults, permissions, forecasts, and implementation notes visually distinct.
- Do not edit measurable acceptance criteria into vague outcome language.

### Incident documents

- Preserve chronology, evidence confidence, and the distinction between trigger, contributing condition, failed control, amplifier, detection gap, and recovery action.
- Consolidate repeated timestamps only when no causal or evidential distinction is lost.
- Do not make the narrative smoother by implying knowledge responders did not have at the time.

### Technical comments

- Prefer one coherent issue per comment.
- Remove context already visible adjacent to the comment.
- Preserve severity and the concrete harmful path.
- Do not turn a required change into a vague question for politeness.
