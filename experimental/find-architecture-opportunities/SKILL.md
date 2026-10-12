---
name: find-architecture-opportunities
description: Inspect an existing codebase and return a small, evidence-backed set of architecture refactoring opportunities, with a selectable handoff to evolve-architecture. Use when the user explicitly asks for a broad architecture scan, cleanup candidates, shallow-module or deep-module analysis, or where to improve maintainability and testability. Do not use for implementing a concrete change, routine code review, or auditing an accepted architecture plan.
---

# Find Architecture Opportunities

Identify high-leverage structural changes, not a generic cleanup list.

## Workflow

1. **Choose a bounded scope**
   - Use the module, subsystem, pain point, or direction named by the user.
   - Otherwise infer one to three likely hotspots from recent change history, recurring fixes, ownership spread, or repository structure. Do not scan the entire repository when a narrower sample can reveal the pattern.
   - Read applicable repository instructions, ADRs, design docs, and domain vocabulary when they exist. Do not require conventional filenames.

2. **Trace representative behavior**
   - Follow at least one runtime path through each hotspot.
   - Look for domain concepts scattered across modules, shallow interfaces that expose implementation complexity, duplicated policy, split sources of truth, leaky dependencies, change amplification, parallel paths, and behavior that is difficult to test through stable interfaces.
   - Note friction encountered while reading, but distinguish navigation inconvenience from an architectural defect.

3. **Falsify each suspected opportunity**
   - Apply the deletion test: would removing the module concentrate meaningful policy and invariants in callers, or merely move code?
   - Confirm the issue with repository evidence and a present maintenance, correctness, or testing cost.
   - Reject naming, formatting, file-size, or test-coverage observations unless they reveal an ownership or contract problem.
   - Reject speculative seams and generic extension points without two present uses or an explicit extensibility requirement.

4. **Keep the candidate set small**
   - Return no more than five materially distinct candidates; prefer three.
   - Assign report-local IDs in ranked order: `A1`, `A2`, and so on. Preserve them for follow-up discussion.
   - Rank candidates by expected leverage, evidence strength, change frequency, implementation risk, and blast radius.
   - Include an ADR conflict only when current friction is strong enough to justify reopening the decision.

5. **Present the findings**
   - Use concise Markdown by default. Create HTML or diagrams only when requested or when a diagram communicates the structure materially better than text.
   - For each candidate include:
     - candidate ID and title;
     - repository evidence and affected paths;
     - the architectural friction and current cost;
     - the likely semantic owner or boundary to deepen;
     - a bounded before-and-after direction, without designing detailed interfaces;
     - expected benefit for locality, leverage, change surface, and testing;
     - principal risk or counterargument;
     - confidence: `Strong`, `Worth exploring`, or `Speculative`.
   - End with the top recommendation and why it dominates the alternatives.

6. **Stop or hand off**
   - If the user asked only to find opportunities, stop after the ranked report.
   - If the user selects a candidate, delegates selection, or explicitly asks to continue with `$evolve-architecture`, read [references/evolve-handoff.md](references/evolve-handoff.md).

## Output contract

Return the inspected scope, evidence limits, ranked candidates, rejected false positives when informative, and one top recommendation. Keep claims tied to files and symbols, mark assumptions, and omit internal orchestration details.
