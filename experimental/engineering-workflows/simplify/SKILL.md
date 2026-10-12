---
name: simplify
description: Simplify or clean up code by directly removing unnecessary complexity and duplication while preserving required behavior. Use for requested refactoring or post-change cleanup; a read-only code review remains a review.
---

# Simplify

Remove complexity with the smallest correct change. Fewer concepts, states, branches and duplicated policies matter more than fewer lines.

## Establish scope and preservation

Use the user's target and inspect its diff, relevant callers, contracts, tests and existing abstractions. For an unspecified target, include staged, unstaged and untracked local changes; if no changes exist, use files named or edited in the conversation. Ask when the target remains materially ambiguous rather than selecting unrelated files.

Preserve observable outputs, errors, side effects, ordering, state transitions and resource lifetime unless the user authorized a behavior correction. Identify the accepted requirement for a correction and preserve unrelated contracts. Tests are evidence about those contracts, not permission to alter them.

Pay attention to empty versus missing values, synchronous throws versus rejected promises, error identity, repeated calls, side-effect order and cleanup. A concise replacement is useful only when its semantics match the required behavior.

## Assess three lenses

Use these lenses locally or delegate bounded read-only checks when that is useful and permitted. Three lenses do not require three agents.

- **Reuse:** Locate the existing owner of a policy or invariant before extracting or reusing code. Reuse a helper when its contract matches. Similar syntax with different semantics may remain separate; extraction must remove more complexity than it introduces.
- **Quality:** Remove redundant or derived state, unnecessary wrappers, speculative parameters and branches. Keep ownership and transitions visible. Flatten control flow when clearer; preserve meaningful boundaries and comments explaining non-obvious intent or constraints.
- **Efficiency:** Identify concrete repeated work, N+1 operations, unbounded accumulation or missing cleanup. Preserve ordering and resource semantics when changing execution. Justify performance changes by the affected operation and scaling or measurements, rather than assumed speedups.

## Apply and verify

Consolidate root causes, then apply changes with a concrete maintenance or behavior benefit. Preserve unrelated edits. Accept an empty diff when no proposed change improves the design within its contracts.

Use relevant repository checks and independent expectations for the behavior at risk. Distinguish checks actually run from supplied results or unavailable verification. Passing existing tests alone does not establish preservation of an untested contract.

Test maintenance or deletion can be appropriate when remaining checks preserve meaningful defect detection and improve fidelity, diagnostics or cost. Name the guarantee being retained before removing or weakening a check; a green run is not a replacement guarantee.

Honor the requested deliverable. When returning a unified diff, generate it from the current and proposed sources with available local diff tools rather than guessing hunk positions or counts. Check that the complete artifact meets the requested format before handing it off.

Finish when justified simplifications are applied, required behavior is verified or its verification limits are disclosed, and superseded code within scope is removed. Report the concrete changes, actual checks and material remaining risks. If no change was useful, say so.
