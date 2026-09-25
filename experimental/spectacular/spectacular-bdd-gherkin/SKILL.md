---
name: spectacular-bdd-gherkin
description: Create or review optional Gherkin acceptance examples for a bounded behavioural rule, preserving an independent oracle and an observable boundary.
metadata:
  version: "1.2.0"
---

# Spectacular BDD with Gherkin

Use concrete examples to sharpen or verify a bounded behavioural rule. Keep the
normative rule in its specification. A scenario illustrates an acceptance
expectation; it does not become a second authority merely because it is written
in Gherkin.

The user's explicit task and decisions take precedence over this workflow.
This skill is standalone: it does not require an installed sibling skill,
Gherkin runner, or particular repository layout.

## Choose the smallest mode

- **Scenario mode:** For a settled rule, write the smallest useful set of
  examples and trace each expected result to its rule, oracle, and boundary.
- **Discovery mode:** When an example exposes an unresolved outcome, use an
  example map to preserve the question and its competing outcomes without
  turning it into a scenario.
- **Review mode:** When reviewing existing scenarios, read [the review
  lenses](references/review.md) and classify material findings.

Gherkin is optional. Use it when shared Given/When/Then language improves the
decision or acceptance discussion; use a table or plain examples when that is
clearer. For a simple settled request, stop after the smallest output that
names the rule, expected result, oracle, boundary, and evidence status. Do not
force a full discovery or review process.

## Work the example

1. **Name the rule and boundary.** Identify the governing contract version or
   source, rule ID when one exists, applicable actor/state/event, and the
   boundary at which a caller can observe the result. Do not infer a required
   outcome from code behaviour alone.
2. **Map distinguishing cases.** Prefer a case that separates plausible
   interpretations or exercises a consequential boundary. Label each item:

   - **Rule:** the settled behavioural statement and its source.
   - **Example:** a concrete state and event with an expected result supported
     by the rule and its oracle.
   - **Question:** a concrete case whose expected result is unresolved. Record
     the competing outcomes, deciding authority, and dependent work; do not
     write a `Then` that silently chooses one.
   - **Deferred:** independent behaviour outside this increment. It is neither
     an acceptance case nor evidence of coverage.

3. **Establish the oracle.** For every expected result, record an independent
   basis: a domain-reviewed decision or example, a binding external contract,
   or a separately justified property. Name its source, version, or owner when
   available. An implementation result, the same production query/helper used
   by the system, a fixture that repeats that logic, or agreement from another
   agent is not an independent oracle. A property derived only from a disputed
   rule can assess conformance to it, not justify the rule.
4. **Choose the representation.** If Gherkin helps, express relevant state in
   `Given`, one material event in `When`, and externally meaningful outcomes in
   `Then`. Include success and rejection cases when the contract requires
   those outcomes for the chosen conditions. Preserve modality: an allowed
   (`MAY`) outcome is not a required (`MUST`) result. Assert required outcomes
   or the allowed set; label examples of optional behaviour as illustrative.
   A negative case should observe
   the intended rejection or failure effect, such as no protected data or no
   partial state, rather than merely an internal exception. Add limit,
   permission, retry, ordering, concurrency, or time cases only when the
   contract gives them distinct meaning.
5. **State evidence status.** Mark each item as a proposed acceptance example
   or link an existing executed-evidence record. Do not create a separate
   evidence ledger just to draft scenarios. Gherkin text by itself is not
   executed evidence. When an existing record is available, it should identify
   the command or check, code/configuration state, input state, observed
   result, and limits, with setup reaching the relevant boundary and assertions
   against independently established expected values. Keep fixtures and
   environment needs separate from the scenario text.
6. **Handle open decisions.** Preserve unresolved cases and route them to
   `spectacular-spec-grilling` only when that skill is available and an
   interactive handoff is useful or requested. Otherwise return the decision
   record directly; standalone use must remain complete.

When generating a `.feature` file, start from the [feature template](assets/feature.template)
and adapt it to the contract. Prefer:

```gherkin
Feature: <capability>
  # Contract: <version or reference; existing rule ID when one exists>

  Rule: <existing rule ID or short behavioural rule>

    Scenario: <distinguishing outcome>
      Given <relevant domain state>
      When <one material event occurs>
      Then <observable outcome>
      And <observable invariant when relevant>
```

Use domain language. `Scenario Outline` suits cases where only data varies
under the same rule. `Background` suits genuinely shared domain state that
remains clear when hidden from individual scenarios. Do not use either to hide
the oracle, the boundary, or a material state transition.

## Review mode

For existing scenarios, read the detailed [review lenses](references/review.md)
and apply only those relevant to the rule. The main workflow still requires an
independent oracle, an observable boundary, explicit unresolved cases, and a
clear proposed-versus-executed evidence status. A broader contract review is
optional and does not make this skill depend on `spectacular-spec-review`.

When reviewing existing scenarios, classify mismatches with the governing contract before changing either side. A stale scenario, implementation defect, changed requirement, and specification defect require different repairs.
