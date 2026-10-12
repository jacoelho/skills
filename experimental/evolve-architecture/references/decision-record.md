# Architecture Decision Record

Use this compact structure. Omit sections that do not apply.

## Decision

One sentence naming the selected design and its owner.

## Scope and behavior

- **Required:** Explicit requested outcomes and definition of done.
- **Preserved:** Observable behavior not authorized to change.
- **Non-goals:** Adjacent work intentionally excluded.
- **Assumptions:** Unverified facts that affect the decision.

## Current architecture

Describe the relevant runtime path, semantic owner, source of truth, lifecycle, contracts, consumers, and tests. Cite repository evidence by file and symbol.

## Refactor-necessity finding

State whether the current boundary can express the change coherently. Name the concrete duplication, split ownership, dependency problem, parallel path, or change amplification that justifies structural change. State why no refactor is needed when the current boundary remains coherent.

## Alternatives

For each materially distinct option, record:

- owner and mechanism;
- behavior and contract effects;
- migration and deletion requirements;
- concepts or dependencies added and removed;
- principal risk or falsifying evidence;
- rejection reason, when rejected.

## Selected design

Explain why the selected option best satisfies required behavior with clear ownership, local invariants, a bounded change surface, and the fewest lasting concepts or parallel paths. Include the strongest objection and the response to it.

## Change surface and plan

List expected files or symbols with role and confidence, then order the work:

1. preparatory refactor;
2. verification checkpoint;
3. behavior change;
4. caller or consumer migration;
5. deletion of superseded paths;
6. final verification.

## Verification

Name the focused tests, integration or consumer-boundary checks, static checks, migration checks, and structural review that will prove the result.

## Remaining risks

List unresolved assumptions, compatibility constraints, temporary mechanisms, or follow-up work. Do not turn optional future improvements into current requirements.
