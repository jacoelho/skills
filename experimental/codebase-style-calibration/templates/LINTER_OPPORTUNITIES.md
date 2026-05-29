# Linter and Static-Analysis Opportunities

This file records which style rules could be automated.

## Candidate checks

| Rule | Check type | Confidence | Notes |
|---|---|---:|---|
| R___ | linter / static analysis / tests / review only | Low / Medium / High | ... |

## Examples

### Trivial wrapper detection

Detect functions that:

- call exactly one other function
- pass through the same arguments unchanged
- return the result unchanged
- add no validation, conversion, error context, metric, tracing, or domain name

### Single-use helper detection

Detect helper functions used once and flag them for review unless they:

- name a domain concept
- isolate a meaningful invariant
- clarify complex local logic
- are intentionally extracted for tests or benchmarks

### Defensive nil check detection

Detect methods on types whose constructors guarantee non-nil fields but whose methods still contain repeated nil checks.

The review question is whether the invariant should be enforced at construction instead.
