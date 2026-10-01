# Evaluate the skill, not just the screenshot

## Four different comparisons
- Reference analysis: inspect published examples to extract relationships. A reference is not automatically correct and its style is not a mandate.
- Within-application comparison: compare matching roles and their operation across related screens/overlays.
- Before/after repair: hold task, fixture and renderer constant; inspect the actual changed result and rerun relevant operations.
- Regression: compare to a deliberately approved baseline for the same state/configuration/revision lineage.

Do not call these interchangeable. Pixel similarity to an attractive reference is not a usability measure. A before/after repair by the skill author is not evidence that the skill independently improves another agent.

## Capture controls
Record source/revision or content hash, fixture, surface/state, caller, viewport/available space, scale, locale, theme, renderer, font environment and motion/readiness settings. For external pages record URL, access time, whether live or publisher-provided, and any unavailable conditions. Never present a reconstruction or generated mockup as a screenshot of a real site.

Capture parent/overlay/return and multiple screen families. Use short height as well as narrow width. Do not crop out failures, resize separate states into misleading equality, or mask the region under evaluation. Keep originals. Diff images locate changes; severity and correctness need interpretation and task evidence. Same-size pixel metrics cannot compare different viewport sizes meaningfully.

## Evaluation ladder
1. Packaging/helper tests: files, links, deterministic calculation and scripts.
2. Author-run diagnostic fixture: known defects, legal variations and reproducible before/after evidence. Useful for checking the procedure and harness, not model performance.
3. Held-out skill comparison: fixed model/version/configuration, task, time/token/tool budget and available context; baseline without the skill versus candidate; multiple independent runs; include multi-screen/modal tasks.
4. Blinded review: randomise outputs, hide the generating condition, use independent evaluators; adjudicate disagreements and false positives. Labelled known issues need provenance and should be withheld from the reviewer where possible.
5. User evaluation: real task completion, errors/recovery and qualitative feedback with representative participants. Never substitute simulated personas for observed users.

## Useful measures and their denominators
- Required invariants satisfied / applicable invariants actually exercised.
- Known actionable defects recovered, with separate missed defects and false positives; report dataset size and matching rules.
- Observed new regressions, supported tasks completed and unverified transitions.
- Time/tokens/tool calls and repair rounds at a fixed budget when genuinely measured.

Do not report detection accuracy without labels and a held-out process. Do not turn coverage counts into a conformance score. Report critical failures individually; averages hide them. Use varied valid visual languages so the evaluator is not rewarded for enforcing one aesthetic.

## External access
Use authorised public pages or authorised test accounts. Do not submit real forms, make purchases, change live records or bypass access controls merely to capture a state. If live browsing is unavailable, use clearly identified published images and local fixtures; preserve the live benchmark as not run.

Reference on rendering variability and baselines: https://playwright.dev/docs/test-snapshots
The browser adapter is optional. The reasoning and evidence contract apply equally to other rendering systems.
