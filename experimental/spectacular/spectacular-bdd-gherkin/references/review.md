# Gherkin review lenses

Read this reference when reviewing existing scenarios or doing a material
completeness pass. A short request to write one settled example can use the
main skill without loading this file.

Use only lenses relevant to the rule under review.

- **Oracle:** Is every expected result grounded outside the implementation
  being tested? Check the source, version, and owner where available. Reject a
  production output, shared helper, copied fixture logic, or second-agent
  agreement as the sole basis for correctness.
- **Example map:** Are settled rules, concrete examples, unresolved questions,
  and deferred behaviour visibly distinct? Does every question leave its
  expected result open instead of becoming an accidental `Then`?
- **Observability:** Could a caller or relevant boundary distinguish pass from
  fail? For a rejection or failure, can the check observe the intended error,
  absence of protected data, and absence of forbidden partial state at that
  boundary?
- **Applicability:** Are actor, state, timing, version, and preconditions clear enough to know when the rule applies?
- **Mechanism leakage:** Would the scenario survive a valid implementation change?
- **Decision leakage:** Did the scenario invent ordering, retries, identity, timing, errors, or another product choice absent from the contract?
- **Boundary sensitivity:** Are important just-below/at/above, invalid,
  failure, permission, or lifecycle cases missing? Include success and rejection
  cases when the contract requires those outcomes for their conditions. Preserve
  required versus permitted outcomes; leave unresolved cases as questions.
- **Duplication:** Is the scenario illustrating the canonical rule rather than becoming a second normative definition?
- **Evidence status:** Is each scenario clearly marked as a proposed
  acceptance example or linked to an executed check with a code/configuration
  state? Gherkin text alone does not establish execution.
- **Testability:** Can setup establish the relevant state and can assertions
  observe the claimed effect without bypassing the real boundary? Does the
  expected value come from an independent basis rather than recalculating it
  through the implementation?
