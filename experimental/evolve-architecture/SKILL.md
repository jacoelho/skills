---
name: evolve-architecture
description: Reshape an existing codebase for a concrete architecture-changing feature or refactor while preserving required behavior and converging on the simplest coherent ownership model. Use for cross-cutting changes, contract or persistence changes, migrations, dependency-direction changes, work likely to create parallel paths or adapter layers, or a candidate selected from find-architecture-opportunities. Do not use for open-ended architecture scans, routine local edits with an obvious seam, or standalone conformance audits.
---

# Evolve Architecture

Make the final system simpler and more coherent than an additive patch would leave it.

When the request selects or delegates a candidate from `$find-architecture-opportunities`, first read [references/discovery-candidate.md](references/discovery-candidate.md). Discovery selects what problem to pursue; this workflow still selects how to solve it.

## Workflow

1. **Lock behavior and scope**
   - Record the requested behavior, definition of done, non-goals, and permitted refactoring radius.
   - Preserve unspecified observable behavior unless the user authorizes a change.
   - Read applicable repository instructions, ADRs, design docs, contracts, and tests.
   - Ask only when the answer could change public behavior, ownership, migration, or scope; otherwise state the assumption and continue.

2. **Trace the current architecture**
   - Follow the relevant runtime path end to end.
   - Identify the semantic owner, source of truth, callers and consumers, lifecycle, external or persistent contracts, and focused tests.
   - Inspect change history only when the user did not name a scope or history is evidence for where friction concentrates.
   - Tie material claims to repository evidence. Mark unresolved claims as assumptions.

3. **Decide whether structure must change**
   - State whether the current owner can express the change coherently.
   - Name the duplication, split ownership, dependency inversion, parallel path, or change amplification an additive patch would preserve.
   - Do not refactor when the existing boundary remains coherent.

4. **Compare bounded alternatives**
   - Compare two materially distinct options; use three only when ownership or migration genuinely differs.
   - Include the smallest coherent extension and the strongest bounded refactor or alternate owner.
   - Reject any option that contradicts required behavior or depends on an unresolved unknown that could change behavior, ownership, dependency direction, or migration.
   - Prefer present needs over speculative extensibility. Add a generic abstraction only for two present uses or an explicit extensibility requirement.

5. **Select and plan**
   - Prefer clear ownership, local invariants, fewer concepts and parallel paths, mechanical migration, and behavior that can be tested through stable interfaces.
   - Record the strongest objection to the selected option and why it does not win.
   - Order the work as: preparatory refactor, verification checkpoint, feature change, caller migration, deletion, final verification.

6. **Implement when requested**
   - Use one write-capable agent at a time. Use additional agents only for bounded reading or independent criticism when that is worth the coordination cost.
   - Keep preparatory refactors behavior-preserving and verify them before changing behavior.
   - When implementation disproves a material assumption, revise the design; do not hide the mismatch behind another adapter, flag, fallback, or parallel path.
   - Remove superseded paths and temporary mechanisms before finishing.

7. **Verify the result**
   - Run the smallest checks that prove the changed behavior and architecture, expanding only for failures or broad impact.
   - Check requirement -> code -> observable outcome.
   - Check code -> plan: every material change is planned or explicitly justified.
   - Report remaining assumptions, deviations, temporary mechanisms, and unverified risks.

## Load references only when relevant

- Read [references/discovery-candidate.md](references/discovery-candidate.md) only when continuing from an architecture-opportunity report.
- Read [references/architecture-checks.md](references/architecture-checks.md) for ownership, lifecycle, state semantics, result codes, retries or waits, path unification, module depth, or semantic-interface decisions.
- Read [references/critical-changes.md](references/critical-changes.md) before irreversible data or protocol changes, security-boundary changes, broad migrations, or other high-blast-radius work.
- Use [references/decision-record.md](references/decision-record.md) when the user asks for a written architecture decision, specification, or implementation plan.

## Output contract

For design-only work, return a compact decision record containing the requirements and assumptions, current ownership and path, refactor-necessity finding, alternatives and rejection reasons, selected design and strongest objection, migration and deletions, ordered plan, and verification.

For implementation work, also report the files changed, checks run and their results, architecture delta, removed paths, and any deviations or remaining risks.

Keep the response proportionate. Omit empty sections and internal orchestration details.
