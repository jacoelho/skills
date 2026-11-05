---
name: programming-simplicity
description: Decides whether code structure earns its keep and removes what does not without changing behaviour. Use when judging whether an abstraction, wrapper, adaptor, helper, duplicate model or defensive branch should exist; when removing indirection or dead code; when a complexity metric or lint warning motivates a refactor or extraction; or when reviewing a simplification proposal. Unlike the `simplify` skill and the code-simplifier agent, which polish recently changed code for clarity, this skill applies to any code or design, rejects metric-only or cosmetic changes, checks semantic preconditions for each removal, and verifies preserved behaviour proportionately to risk.
argument-hint: "[code path | simplification proposal]"
---

# Programming Simplicity

Reduce the knowledge, state and coordination needed to change behaviour correctly.
Correctness and required operating limits constrain simplification; fewer lines or
a lower complexity score alone do not establish improvement.

Modes: **review** is read-only; **refactor** preserves required behaviour;
**design** proposes contracts.

## Decision rules

**R1: Define the contract.** Establish observable outputs, errors, effects,
ordering, resource ownership, state transitions and operating limits. Distinguish
verified requirements from assumptions and separately authorised bug fixes.

**R2: Name the burden.** Identify a concrete maintenance task made difficult by
branching, duplicate policy, redundant state, conversions, coupling or coordination.
Support maintainability findings with evidence of that burden.

**R3: Question necessity, then reuse.** Compare existing code, standard facilities
and installed dependencies for semantic fit and runtime support. Account for
inherited consumers and domain lifecycles before replacing an operation or state.

**R4: Remove indirection by default.** Treat private single-use functions,
pass-through wrappers and redundant adaptors as removal candidates. One call site
identifies a candidate, not an improvement: demonstrate the burden removed.
Inline required work and migrate callers to the canonical operation or representation.
Retain a boundary for a concrete contract, language requirement, independently owned
policy or evidenced cost of inlining, including caller comprehension and resource
lifetime. Compare the actual alternatives; a name, mocking seam or hypothetical
reuse alone is insufficient. Consolidate shared rules, not merely similar text.

**R5: Choose the smallest complete improvement.** Include necessary callers,
fixtures, registrations and obsolete-path removal within scope. Explain what
disappears, where complexity moves and what new obligations appear.

**R6: Use metrics as evidence.** Read [complexity guidance](references/complexity.md)
when metrics, nesting or extraction motivate a change. Compare affected functions
and introduced helpers with the same analyser, version and settings. Flatter control
flow can help with unchanged cyclomatic complexity; account for relocated decisions.

**R7: Preserve semantics while removing structure.** Read the relevant sections of
[transformation checks](references/transformations.md) before changing wrappers,
representations, iteration, state or cleanup. Preserve evaluation count and order,
error delivery, ownership and release timing. A failed naive deletion rejects that
candidate, not every inline alternative. Prove a guard unreachable before removing it.

**R8: Verify the refactor.** Before changing structure, confirm existing tests pin
the affected behaviour; where none do and the change is not trivially safe, add a
characterisation test that passes before and after. For a bug fix, reproduce the
failure first, with expectations from the contract rather than the current code,
because a before/after diff alone can preserve a shared bug. Exercise changed boundaries and
failure paths, then run required repository checks. Use
[verification guidance](references/verification.md) for sensitive changes.
Production side effects require authorisation.

**R9: Inspect the result.** Check migrated callers, state ownership, remaining
duplication and operational consequences. Do not change test expectations or
analyser settings to make the result look successful.

**R10: Stop when justified.** Finish when the evidenced burden is resolved and
applicable checks pass, or report why retaining the boundary is preferable.
Record unavailable checks and uncertainty; finite tests do not prove equivalence.

## Report

For each material finding, give evidence, the maintenance burden, the decision,
trade-offs and verification. Distinguish defects from maintainability improvements.
Report measured metrics with their method, including unchanged scores and relocated
decisions.
