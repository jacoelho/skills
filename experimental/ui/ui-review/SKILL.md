---
name: ui-review
description: Review an application for first-principles UI/UX quality using connected screens, shared patterns, overlays and transition evidence. Use for visual coherence, hierarchy, alignment, layout resilience and task continuity. Read-only on product code and baselines; framework-agnostic.
---

# Review the application as a system

## Scope and evidence
Read the task, authoritative design contract and available application. Define required checks from the requested scope, applicable standards and project commitments. Omit out-of-scope facets or mark them not_applicable. Record known revision/content hash and relevant capture conditions; mark unknown metadata explicitly. Review-only requests leave product code and baselines unchanged; reports and evidence may be written. When the user also requests repairs, use [ui-build](../ui-build/SKILL.md) for implementation and return here to verify the result. Update screenshot baselines only when the user has authorised that action.

Map the affected surfaces AND transitions. Include relevant modals, alerts, sheets, panels, menus and feedback states, not just routes. Identify the shared roles and their consumers. For a broad review, use multiple screen families and the same overlay from distinct parent contexts where available. For a narrow fix, use the relevant impact sample. Name unexamined surfaces and edges.

Read [coherence review](references/coherence-review.md) when comparing related surfaces. Read [evaluation protocol](references/evaluation-protocol.md) for before/after or baseline comparisons, or when evaluating the skill itself. Adapt the relevant sections of [the report template](assets/report.template.md) to the task; a narrow review may be a concise response.

## Four passes

### 1. Task and local composition
Establish the intended task, information priority and available actions. Inspect hierarchy, grouping, reading/alignment relationships, perceptibility, content density, action clarity and meaningful feedback. Check whether the surface supports the goal, not whether it resembles a fashionable template.

#### Alignment and spacing
Evaluate intended edges, baselines, centres and comparable gaps, distinguishing geometric inconsistency from justified optical adjustment. Use [reference-line overlays](references/reference-line-overlays.md) when annotated evidence is requested or guides would resolve a material alignment or spacing uncertainty. Select representative relationships within the declared scope.

Keep this evidence in the main review report. If available evidence cannot establish a required check, including missing images or required annotations, mark that check not_exercised and continue the supported review. Optional annotation does not determine the verdict; report the evidence actually inspected.

### 2. Application coherence
Compare equivalent semantic roles across surfaces: headings, action emphasis, terminology, status meaning, navigation, grouping, spacing relationships, fields, feedback and layer treatment. Use a labelled atlas or same-scale crops when they help compare multiple captures. Keep each original capture accessible.

Distinguish stable grammar from justified variation. Different tasks, density needs, locales, platform conventions and available space may require different compositions. Do not demand identical pixels across screen families or flag a destructive-action treatment merely because it differs from a normal action. Document the reason for accepted differences.

A polished page is not enough: check sibling pages and overlay contexts. Treat an unexplained pattern fork as a system-level issue and route it to the shared owner. Do not average a task-blocking defect away with good typography elsewhere.

### 3. Overlay and transition continuity
Inspect parent -> open -> operate/error -> cancel/success -> return. Verify task/object identity, modality, initial focus/attention, background behaviour, action meanings, safe dismissal, draft handling, feedback and restored context using actual interactions.

Open shared overlays from their distinct entry contexts. Test narrow/short space, long content, enlargement and relevant input modes. Check state propagation into another view after a successful edit. Check that cancelling does not unexpectedly clear filters, selection or position. Screenshots cannot establish those behaviours by themselves.

### 4. Stress and regressions
Apply the relevant content/space/state variations, not an arbitrary full Cartesian product. Inspect viewport captures and the complete reachable content. Distinguish intentional scrolling from inaccessible overflow. Repeat the impacted shared-pattern sample after repairs. Do not reuse evidence from a changed revision or fixture without declaring the mismatch.

## Evidence classification
Keep severity (blocking / major / minor / suggestion) separate from evidence basis (verified / needs_confirmation / human_required). Report the observed fact, expected relationship, context, reproduction and evidence path. A measurement may be verified while the interpretation remains uncertain. Do not invent source locations or independent reviewers.

Separate standards obligations, approved project commitments and heuristics. A preference is not a standards failure. Accessibility-tree facts are not actual screen-reader output. Do not claim accessibility conformance or real-user success from an image or a short sample.

## Verdict and handoff
Each required check is pass, fail, not_applicable or not_exercised. Any verified required failure produces FAIL for that scope. Otherwise missing required evidence produces UNVERIFIED. PASS is limited to the declared checks/surfaces/configurations; it is not whole-application certification.

Prioritise root causes by task impact and reach. Return the repair requirement, shared owner, affected consumers and retest scope, plus accepted differences and uncovered work. For review-only requests, hand off these repair requirements; otherwise complete the authorised repairs through ui-build. Never replace inspection with an unsupported beauty score or pixel-similarity percentage.
