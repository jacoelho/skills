---
name: ui-a11y-review
description: Review perceptibility, semantics and operation across connected screens and overlays using applicable accessibility requirements and real input evidence. Framework-agnostic and read-only; not a visual-style selector, automatic fixer or complete compliance certification.
---

# Accessibility across the journey

## Establish applicability
Read the product task, affected surface/transition map, supported platforms and relevant accessibility requirements. Identify the actual standard and its scope. Framework-agnostic does not mean platform-blind: web measurements and semantic APIs must not be imposed mechanically on native interfaces.

Read [references/evidence-and-operation.md](references/evidence-and-operation.md). For web-specific references only, read [references/web-standards.md](references/web-standards.md). Use approved project tooling; this skill does not require a particular scanner, browser, UI framework or device.

Do not modify product code or accept baselines. Reports/evidence may be written. Reuse existing findings only when revision, fixture, configuration and scope match.

## Inspect the connected task
Check perceptible content, labels and instruction relationships, control meaning and state, logical reading/navigation order, focus/attention visibility, feedback and recovery. Equivalent actions across screens and overlays must keep meaningful identification. Repeated navigation must meet the applicable consistency requirement, not an invented rule that every screen be identical.

For overlays, test entry, meaningful title/object identity, initial focus/attention, appropriate modality, active-layer operation, permitted dismissal, error recovery and return/fallback. Verify the applicable platform or project contract for background unavailability, focus containment, return and dismissal. If the web APG dialog pattern or a project contract is adopted, inspect its visual-obscuration condition separately; visual obscuration alone does not establish modality. Include multiple callers, long content, scarce width/height and enlargement. Cancellation and success may have different legitimate return destinations; verify their contracts.

Use actual input events for operation and trap claims for each in-scope modality. Programmatic focus and element-tree inspection are useful observations, not replacements for key/gesture operation. Semantic exposure does not prove what a screen reader announces. Use actual assistive-technology tests when available; otherwise hand them off explicitly.

## Separate evidence activities
Automated: record tool/version/configuration and exact bounded result.
Interactive: record real steps and observed outcomes in the current environment.
Human/assistive technology: name the remaining judgement, AT/user agent/OS/device and versions when available, input method and task.

No single activity proves full accessibility. Do not report a runtime check after performing only source inspection. Record narrower viewport, simulated scale, text enlargement and actual page zoom as separate conditions, even when page zoom is the supported resize-text mechanism or produces the Reflow viewport.

## Report
Separate severity from evidence basis: verified, needs_confirmation or human_required. Include criterion where applicable, observation, reproduction and evidence. A verified attribute does not automatically verify an interpretive claim.

Each required check is pass, fail, not_applicable or not_exercised. A verified required failure yields FAIL for the scope; absent required evidence otherwise yields UNVERIFIED. PASS is bounded by declared coverage. Provide focused repair requirements and actual human/AT handoffs. Do not simulate a user or invent a certification.
