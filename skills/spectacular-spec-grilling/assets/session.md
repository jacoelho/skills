# Requirements clarification: [capability]

Use this shape only when no existing decision record already captures the scope, evidence, answers, and handoff. Update that record instead of starting a second one.

Session status: [active / handed off / stopped / awaiting evidence]
Scope: [the increment]
Source state: [current contract/history, supplied decisions, accessible evidence; label each origin]
Workspace state: [repository/workspace and relevant code or document revisions; note local changes when they affect the increment]

## Established context

[Only facts, decisions, and constraints that affect the interview. Label their origins.]

## Policies

### Q-CAP-001 - [Short title]

[A standing rule about who or what decides, such as a delegation to an agent or which source wins when two disagree.]

## Open

### Q-CAP-002 - [Short title]

[The question in one sentence. Who or what settles it, and what it blocks. A recommendation, if there is one.]

## Decided

### Q-CAP-003 - [Short title]

[The question and its answer, with the reason. Who decided, naming the policy when it was decided under one, and the entries it builds on.]

[Rejected options, each with its reason, when any were offered.]

[Evidence the answer rests on, each item pinned to the commit or source it was taken from.]

The section is the state. An entry under Decided can be a rule's Basis; an entry under Open or Policies cannot, so an open question or a policy alone never accepts a rule. Resolving a question moves its entry from Open to Decided and writes the answer. A decision taken under a policy is its own entry under Decided that names the policy. A choice left to the implementer is decided, and the answer says so. Scope deliberately left out is an open entry the contract's `Excluded:` line cites.

Entries are prose: a reader needs no field list. Write every ID in full, never as a list or range such as `REQ-CAP-001 to 004`, so a search finds every mention. An entry holds no dates, implementation notes, or review history; git has them. A changed answer edits the entry; an entry replaced by another is deleted and every Basis that cited it is repointed, so there is never more than one current answer.

Place an entry by its question's scope when it is created, and keep it in that file: the capability's record (`<capability>.decisions.md`), the vertical's record (`<vertical>/<vertical>.decisions.md`), or the repository's root record (`specs/specs.decisions.md`).

## Next question

Decision Q-CAP-001: [One distinguishing question.]

Case: [Concrete example.]
Why it matters: [Affected outcome.]
Options: [Different outcomes, without a false forced choice.]
Recommendation: [Conditional and justified, or no recommendation pending evidence.]

## Bounded investigation (when needed)

Question or claim: [What must the investigation establish?]
Scope and limit: [boundary, timebox, fixtures, or resources]
Input and environment state: [relevant data, configuration, and setup]
Decision-changing observation: [what result changes the next action]
Observed result: [what happened]
Evidence basis: [supplied report / inspected artifact / check executed here; include a check or command reference only when executed]
Limits: [cases or conditions not established]
Deliverable: [findings and recommendation, kept separate]

## Handoff

Only what no entry holds: the next action, unblocked scope, remaining work with its owner, executed checks with their commands and results, and how to restart. Do not list settled or open decisions here; their sections say it.

This record is an input to the maintained specification, not a second normative specification or evidence that implementation passed.

If a settled answer needs a proposed requirement statement for handoff, write it in EARS using `spectacular-spec-writing/references/ears.md`, identify its basis, and label it non-governing until adopted in the maintained contract. Open questions remain questions rather than incomplete requirement templates.
