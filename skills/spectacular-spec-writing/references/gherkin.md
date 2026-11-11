# Gherkin acceptance examples

Use this when a settled rule needs acceptance examples, a `.feature` file, or an example map. Gherkin is optional: use a table or plain examples when they are clearer, and no Gherkin runner or repository layout is required. A scenario illustrates the governing EARS requirement in [ears.md](ears.md); it never defines behaviour of its own.

For a simple settled request, return the smallest output that names the rule, expected result, oracle, boundary, and evidence status.

## Map the cases

Prefer cases that separate plausible interpretations or exercise a consequential boundary. Label each item:

- **Rule:** the governing requirement ID and its source. Quote external source wording unchanged.
- **Example:** a concrete state and event, with an expected result supported by the rule and its oracle.
- **Question:** a case whose expected result is unresolved. Record the competing outcomes, the deciding authority, and dependent work; never write a `Then` that silently picks one. Use `jacoelho:spectacular-spec-grilling` when the user wants to settle it interactively.
- **Deferred:** behaviour outside this change. It is neither an acceptance case nor coverage.

Add limit, permission, retry, ordering, concurrency, or time cases only when the contract gives them distinct meaning.

## Establish the oracle

Every expected result needs an oracle: a domain-reviewed decision or example, a binding external contract, or a separately justified property. Name its source, version, or owner when available.

These are not oracles: the implementation's output, the production query or helper the system itself uses, a fixture that repeats that logic, or another agent's agreement. A property derived only from a disputed rule checks conformance to that rule; it does not justify it.

## Write the scenarios

Start a `.feature` file from [the feature template](../assets/feature.template).

- `Given` holds relevant domain state, `When` one material event, `Then` outcomes a caller can observe at the named boundary.
- Include success and rejection cases when the contract requires both. A negative case observes the intended effect, such as an error, no protected data, or no partial state, not an internal exception.
- For a permission, assert the required observation or the authorised set, and label any single permitted alternative as illustrative (see the permission section of [ears.md](ears.md)).
- Use domain language. `Scenario Outline` fits cases where only data varies under one rule; `Background` fits shared state that stays clear when hidden. Neither may hide the oracle, the boundary, or a material state transition.
- Tag each scenario with the `REQ` or `INV` IDs it illustrates, such as `@REQ-BOOK-001`, so a runner can select by rule. `Rule:` needs Gherkin 6 or later; with an older runner, omit it and keep the tags.
- Mark each scenario as a proposed example, or link the record of an executed check. Gherkin text alone is not evidence. Keep fixtures and environment needs out of the scenario text, and do not create a separate evidence ledger just to draft scenarios. Take expected results from the rule and its oracle, never from current code behaviour alone.

## Link scenarios from the contract

With the bundled declaration layout, record coverage with a pointer AC: `Covers:` names the rule and `Expected:` names the scenario. The linter does not read `.feature` files, so the pointer AC is the only coverage record. [The booking example](../examples/booking-cancellation/) shows a contract, its feature file, and the pointer ACs; lint `examples/` as one root, because it references an invariant owned by the stock contract.
