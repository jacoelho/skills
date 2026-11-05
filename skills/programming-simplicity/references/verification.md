# Verification for simplification

## Preserve the right contract

Record what supported callers can observe: output representation, order, errors
and their delivery (synchronous versus asynchronous), effect count and order,
resource lifetime, state transitions and required operating limits. Do not silently
treat current bugs as requirements; separate an authorised correction from the
structural refactor.

Before/after differential checks are useful but can preserve a shared bug; add
independent expectations for specified behaviour. Finite tests establish the
observed cases, not equivalence. Use property-based tests, fuzzing or mutation
tests only when the changed contract justifies them.

## Refactor versus bug fix

For existing behaviour that is not trivially safe, write or locate a characterisation check and confirm it
passes **before** the change, then again after. For a bug fix, reproduce the failing
condition before applying the fix, with expectations from the contract rather than the
current code. Test scaffolding may need updating when internals
change, but never weaken an assertion to accept a regression. Report pre-existing
unrelated failures rather than fixing or hiding them.

## Simplification-specific risks

- Integration outside the diff: exports, registration, reflection, generated code,
  configs and fixtures that reference the removed symbol.
- State: inherited consumers of a reused status, flag or entity; independent
  expiry or revocation.
- Performance: do not delete a demonstrated optimisation for stylistic simplicity.
  Preserve the stated budget and benchmark before claiming improvement; accept a
  regression only when the agreed operating envelope allows it.

## Verify safe removal, not only unsafe deletion

Evaluate the complete inline candidate as well as counterexamples to dropping its
body. For sensitive edits, exercise required results, error identity, argument
effects, and resource release count and timing. In read-only reviews, report
proposed checks separately from executed checks. When implementing removal, delete
the old production symbol and update test wiring while preserving behavioural
expectations; do not keep the old implementation alongside the new one.
