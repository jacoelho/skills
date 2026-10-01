---
name: ui-build
description: Implement or repair a coherent application slice under an existing design contract. Use for connected screens, shared controls, dialogs, panels, adaptation, alignment, clipping or inconsistent behaviour. Framework-agnostic; not for independent review or an unrequested redesign.
---

# Build the relationships, then verify the journey

## Orient
Read requirements, the authoritative design contract, existing application, shared patterns and affected journeys. Preserve the technology, platform conventions, unaffected working behaviour and identity; intentional changes follow explicit requirements or the design contract. Only invoke planning when a material unresolved design choice blocks the work; a small fix does not require a new design programme.

Translate first-principles requirements into the project's existing implementation. This skill mandates no framework, layout API, CSS property, component library or numeric style scale. Consult official implementation documentation only as needed for the actual environment.

Read [references/layout-and-coherence.md](references/layout-and-coherence.md) for structural work and [references/overlay-contract.md](references/overlay-contract.md) for any overlay or its callers.

## Implement a connected slice
For new application-wide work, build the planned sequence of related screens and overlays before multiplying pages. Reuse canonical patterns and semantic roles; add the smallest justified shared variant rather than duplicating local styling. Equivalent operations need compatible vocabulary, state and feedback across every caller.

Keep composition appropriate to the task: a dense list, reading view and confirmation can differ. Document only meaningful deviations. Avoid a speculative universal component framework and avoid arbitrary flags that create contradictory modes.

During parallel work, give shared grammar/pattern changes one owner. Other workers consume the contract and request missing variants. Independent reviewers must not write product code or accept visual baselines.

## Repair causes, not one image
Investigate content measurement, available space, flow, grouping, constraints, containment, layer ownership and layout participation. Work from the violated relationship to its owner, not from a guessed offset. Preserve essential information, action reachability and text enlargement. Truncation requires a justified context and an accessible way to obtain the complete value.

Do not conceal failures by clipping important content, disabling enlargement, reducing legibility, forcing everything into fixed geometry or arbitrarily raising layers. Overlapping rectangles are not automatically errors; intentional overlays and containment exist. A failure is an unintended obstruction, ambiguity or broken constraint.

A repeated defect should be repaired in its shared owner. Inspect sibling consumers and distinct entry contexts after changing it. Prefer a small impact table over a full application crawl when the change is narrow.

## Implement overlay lifecycle, not just its rectangle
Match the contract for task/object identity, modality, initial focus/attention, background interaction, layer ownership and permitted dismissal. Apply the same meaning and style roles when the overlay opens from different parents.

Define dirty-state, pending-operation, validation, retry and success behaviour. Closing must not silently discard work contrary to the contract or reset the background task. Saving must update relevant sibling views. Restore the promised focus, selection, filters and position, or use a logical fallback if the source no longer exists. Distinguish cancel from close-after-success.

Accommodate long content, constrained height, enlarged text and input occlusion. A different responsive presentation is valid when it preserves the task and interaction promises. Avoid nested blocking tasks unless explicitly justified and verified.

## Verify using actual evidence
Use authorised rendering/input tools for the actual platform. Pin the current revision or content hash, fixture, surface/state, entry path, available space, scale, theme, locale, renderer and fonts. Establish meaningful readiness. Capture images and actually inspect them; a saved screenshot is not inspection.

Use the comparison scopes that cover the affected change and consumers: local surface; related surfaces/shared roles; transition before/during/after. Include the overlay in its parent context and compare the same overlay across distinct callers when those contexts are affected. Use same-scale crops for shared roles and a labelled atlas for overview; scaled thumbnails cannot prove target size or text readability.

For alignment/spacing changes, use [reference-line overlays](../ui-review/references/reference-line-overlays.md) when annotated evidence is requested or guides would resolve a material uncertainty. The reference owns annotation, measurement and optical-inspection details. Keep verification within the affected relationship and consumer sample; report any required evidence that remains unavailable.

Combine task execution, semantic checks, targeted constraint measurements and visual judgement. A static image cannot prove modality, focus restoration, input preservation, save propagation or screen-reader output. Trace those with actual interactions. Mark unavailable checks unverified; do not fabricate measurements, screenshots or reviewers.

Fix a prioritised root-cause batch, recapture changed evidence, then rerun affected journeys and representative sibling surfaces. Respect the task budget; report residual issues. Never accept a changed baseline merely to suppress a failure. A baseline requires deliberate approval, not just a matching image.

## Handoff
Report shared/local changes, actual commands and results, inspected image paths, covered surfaces and transition edges, remaining defects and unverified scope. Provide updated dependency/variation records when needed. Hand off to ui-review and relevant accessibility review; do not equate successful compilation with a coherent or accessible application.
