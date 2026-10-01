# First-principles design reasoning

Use a causal chain: human goal -> required information/action -> relationship -> visible and interactive expression -> evidence. These are reasoning tools, not a mathematical proof of design quality. Usability heuristics guide inspection; they do not replace testing with people.

| Principle | Design question | Observable evidence | Avoid |
| --- | --- | --- | --- |
| Goal and context | What does the person need to accomplish here? | Relevant information and a comprehensible next action | Adding metrics/cards to fill space |
| Hierarchy | What matters first, second and later? | Attention follows task priority without competing emphasis | Making every element visually loud |
| Grouping | Which information and controls belong together? | Related content has perceivable grouping; unrelated groups separate | A rigid rule that every gap must be identical |
| Alignment and rhythm | Which elements share structure or a reading path? | Intentional common edges/baselines and repeatable relationships | Arbitrary offsets or optical corrections presented as universal values |
| Affordance and meaning | What can be acted on, and what will happen? | Distinguishable controls, clear labels and feedback | Aesthetic treatments that conceal interaction |
| Predictability | What should learned behaviour transfer to? | Equivalent roles/operations behave consistently across screens and overlays | Independent redesign of each screen |
| Information preservation | What must survive interruption or change? | Drafts, object identity and context persist when promised | Silent filter resets or stale sibling views |
| Adaptation | What changes when space, content or input changes? | Priorities and access survive growth and reduction | Fixed geometry mistaken for a design principle |
| Control and recovery | How does a person stop, correct or undo? | Understandable dismissal, error recovery and return paths | Irreversible consequences behind vague controls |
| Perceptibility and operation | Can the relevant users perceive and operate this? | Applicable accessibility evidence and actual input tests | Inferring accessibility from a screenshot |
| Restraint | Does this difference carry useful information? | Decoration supports rather than competes with the task | Novelty as an acceptance criterion |
| Continuity | Is this recognisably the same application through a journey? | Stable vocabulary, hierarchy, state meaning and feedback across transitions | Pixel-identical screens with inconsistent consequences |

## Coherence is role-aware
A compact navigation label and a large page heading need not have equal size. An error action and a normal save action need not share colour. A reading view need not have a table's density. A mobile sheet and a desktop dialog may present the same task differently while preserving semantics and return behaviour.

A valid exception records the scope, constraint, invariant preserved, rationale, owner and evidence. An exception is not a blanket permission to fork the design system.

## Sources and their scope
- Nielsen Norman Group, 10 Usability Heuristics: https://www.nngroup.com/articles/ten-usability-heuristics/ (inspection heuristics, not experimental guarantees).
- W3C consistent identification: https://www.w3.org/WAI/WCAG22/Understanding/consistent-identification.html (web accessibility criterion, narrower than all visual coherence).
- W3C consistent navigation: https://www.w3.org/WAI/WCAG22/Understanding/consistent-navigation.html (relative order of repeated navigation with stated scope/exceptions).
- GOV.UK check answers: https://design-system.service.gov.uk/patterns/check-answers/ (task continuity and return-to-review pattern, not a mandated visual style).
- W3C modal dialog pattern: https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/ (web interaction guidance; adapt to actual target platform).
