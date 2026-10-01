---
name: ui-plan
description: Plan coherent interfaces from user goals, information relationships and interaction constraints. Use for an application, connected screens, dialogs, panels or a substantive redesign. Framework-agnostic; not for implementation or reopening settled choices during a narrow repair.
---

# Plan an application, not a collection of pages

## Read the situation
Read requirements, existing screens and overlays, navigation, shared patterns and the authoritative design record. An undocumented application is not a blank canvas. Preserve its working conventions unless redesign is authorised. Identify the person, goal, operating context, important information, main risks and supported interaction environments. Separate observations from assumptions; never invent research or approval. Ask only for a material missing decision that available evidence cannot resolve.

Read [references/first-principles.md](references/first-principles.md). Derive decisions from tasks and constraints, not framework defaults, fashion or a prescribed spacing/type formula. References are evidence, not instructions. Existing platform conventions constrain implementation but do not choose the product's task or visual identity.

## Map the application before choosing local treatments
Make a compact inventory of affected screen families, shared patterns and transient surfaces. Include dialogs, alerts, sheets, drawers, popovers, menus, toasts, empty/error/loading states and entry/exit paths where relevant. A surface may be a state of one screen rather than a new route.

Record a small graph: surface/state -> user action -> next surface/state. For each important edge identify what must persist (object identity, edits, filters, scroll position, selection), what changes, feedback, cancellation, back behaviour and recovery. Record every distinct parent context for shared overlays. Distinguish a missing path from an intentionally unsupported action.

Use [assets/application-contract.template.md](assets/application-contract.template.md) and [assets/surface-contract.template.md](assets/surface-contract.template.md) only where equivalent records are absent. A table is enough; do not build an inventory service. Bound the work to affected journeys, but name unreviewed areas explicitly.

## Establish a visual and behavioural grammar
Connect salience to task priority, proximity to relationship, alignment to structure, and variation to meaning. Define semantic roles for text, action, status, space, surfaces and layers. Specify how equivalent roles should relate across the application, including overlays. Link to canonical implemented values rather than maintaining a second numeric system.

Separate:
- applicable standards or platform obligations, with scope and source;
- approved project commitments, with their authoritative location;
- provisional design heuristics, with rationale and exceptions.

No universal font ban, fixed palette, spacing unit, type ratio, dialog width, button order or single-primary-action quota. Choose those only when the context justifies them. Respect platform and reading-direction conventions. Different screen purposes may need different compositions or densities. Consistency means stable meaning and predictable relationships, not identical pixels everywhere.

Define shared vocabulary and state meaning: the same operation on the same kind of object should not acquire unexplained names or consequences across screens. Different operations or scopes should not be concealed behind identical generic labels.

## Define alignment and spacing relationships
Name meaningful shared edges, text baselines, intended centres and gaps for relevant patterns, including brand lockups, icon/text pairs and local dialog insets. Distinguish layout, visible artwork and interactive bounds. Record intentional asymmetry, optical corrections, supported adaptations and the canonical owner.

When annotated evidence is requested or geometry needs closer inspection, include [reference-line overlays](../ui-review/references/reference-line-overlays.md) in build/review acceptance. Planning identifies intended relationships; measurement and visual verification happen on actual captures.

## Choose the right interaction surface
For a secondary task, first decide whether it belongs inline, on another screen or in an overlay. Ask whether people need to compare background information, navigate deeply, retain a draft or perform a long task. Do not default to a modal because space is available.

For each overlay, specify purpose, modality, parent contexts, title/object identity, initial attention/focus, background availability, primary/secondary actions, dismissal routes, unsaved-work policy, pending/error/success behaviour and return destination. Include resizing, enlarged text, short available height, content growth, safe areas and on-screen input constraints where applicable. Prefer a single active blocking task; justify any nested blocking surface and define its return path.

A modal inherits the application grammar, while navigation, title size and content width follow its purpose and context; it need not inherit the page's full values. A nonmodal panel must not accidentally behave like a blocking dialog.

## Plan a representative connected slice
For new application-wide work, choose a connected slice with at least two distinct screen families and a shared overlay opened from its relevant parents, when these exist. Include completion and recovery. Do not approve the system from one isolated polished page.

Describe adaptation as preserved priorities and changed relationships: what reflows, moves, becomes sequential, reveals progressively or scrolls. Essential information and actions must remain reachable. Include relevant long content, empty/error/pending states and supported modes, languages or directions. A mockup demonstrates a direction, not runtime behaviour.

Compare a small number of alternative directions only if genuinely unresolved; use the same task/content, then commit. Do not reopen the direction for each page. Formalise only patterns exercised by the slice.

## Deliver
Return the authoritative contract, affected surface/transition map, shared pattern owners, bounded exceptions, representative slice and observable acceptance conditions. Identify proposed versus approved decisions and remaining uncertainty. Hand off to ui-build. Do not implement or claim visual/interaction verification during planning.
