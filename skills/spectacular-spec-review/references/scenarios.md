# Reviewing acceptance scenarios

Read this when the review covers Gherkin scenarios or other acceptance examples. Apply only the lenses relevant to the rule. Authoring guidance lives in [gherkin.md](../../spectacular-spec-writing/references/gherkin.md); classify a scenario that conflicts with its contract with [the mismatch classes](../../spectacular-spec-writing/references/mismatch.md), usually a stale secondary source.

- **Oracle:** Is every expected result grounded outside the implementation under test? A production output, shared helper, copied fixture logic, or second-agent agreement is not an oracle.
- **Example map:** Are rules, examples, unresolved questions, and deferred behaviour visibly distinct? Does any question hide as an accidental `Then`?
- **Observability:** Could the boundary distinguish pass from fail? For a rejection, can the check observe the intended error, the absence of protected data, and the absence of forbidden partial state?
- **Requirement form:** Do the `Rule:` heading and setup reference a governing requirement ID rather than define behaviour of their own?
- **Decision leakage:** Does the scenario invent ordering, retries, identity, timing, errors, or another choice the contract does not make?
- **Mechanism leakage:** Would the scenario survive a valid implementation change?
- **Boundary sensitivity:** Are just-below, at, and just-above limits, invalid input, failure, permission, or lifecycle cases missing where the contract distinguishes them? Are required and permitted outcomes kept apart?
- **Testability:** Can setup reach the relevant state and the assertion observe the effect without bypassing the real boundary?

Report syntax defects in the governing requirement separately from scenario defects.
