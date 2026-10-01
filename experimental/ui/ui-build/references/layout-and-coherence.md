# Layout constraints and application coherence

For each visible relationship state its purpose, invariant, owner and evidence.

| Relationship | Example invariant | Appropriate evidence |
| --- | --- | --- |
| Common start edge | Heading, filtering controls and list share the family's content anchor | Same-scale render and scoped geometry |
| Grouping | A field's label, help and error remain associated as text grows | Long-content/enlarged-text captures and semantic check |
| Action priority | Equivalent save actions keep their role across form and dialog | Role-labelled cross-surface crops; operation tests |
| Navigation | Shared destinations retain stable identity and relative ordering unless variation is justified | Navigation comparison through the journey |
| Containment | Essential content remains reachable inside available space | Resized/short-space captures and actual scrolling |
| Layer ownership | Only the intended surface obscures or blocks another | Render, hit/operation checks and lifecycle trace |
| Continuity | Edits/selection/filter persist or change according to the contract | Before/during/after interaction trace |

Small optical corrections can be valid and belong to the canonical asset or shared pattern. Respect approved brand assets and preserve interactive target sizes. For requested or diagnostically useful annotations, follow [reference-line overlays](../../ui-review/references/reference-line-overlays.md). Compare corresponding relationships; screen families may intentionally use different reading widths.

## Impact-led regression
Map the changed shared role to consumers. Sample every distinct consumer class and risky state rather than only the edited call site. For a shared dialog, include different parent screens, content lengths and input configurations. For navigation, include at least two destinations and back/return. For state changes, check both the editing view and another view of that object.

No framework-specific recipe is embedded here. Flow/constraints, content measurement, intrinsic sizes, layers and state are concepts to translate into the project's tools.
