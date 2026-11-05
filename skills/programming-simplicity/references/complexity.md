# Cyclomatic complexity without metric-driven damage

Load for complexity warnings, nested control flow, extraction, dispatch-table
proposals, or claimed score improvements. This is a decision policy, not a new
universal scoring scheme.

## Objective and interpretation

Aim to remove unnecessary independent decisions and simplify how essential ones
are expressed. Cyclomatic complexity describes independent control-flow paths in
an analyser's model. It is neither a count of all possible execution paths nor a
sufficient number of test cases: loops, infeasible paths, data combinations,
exceptions, concurrency and environment assumptions complicate that inference.

For ordinary single-entry functions with binary decisions, the familiar count is
`CC = 1 + decision increments`. Real analysers differ: Boolean operators, switch
cases, comprehensions, optional chaining and exception constructs can be treated
differently. ESLint even exposes classic and modified variants. Record the exact
tool and variant; do not compare raw scores across languages or tools.

Cognitive complexity and nesting can complement cyclomatic complexity. They are
proxies for aspects of comprehension, not proof that a design is maintainable.
Neither captures all coupling, domain modelling or operational complexity.

Sources: [ESLint](https://eslint.org/docs/latest/rules/complexity),
[Radon](https://radon.readthedocs.io/en/master/intro.html),
[Sonar's rationale](https://www.sonarsource.com/blog/cognitive-complexity-because-testability-understandability/).

## Legitimate reductions

- Remove a duplicate decision when its value cannot change between checks.
- Centralise one shared policy rather than maintaining diverging implementations.
- Choose a representation that makes invalid combinations unrepresentable.
- Delete a proven-unreachable branch within the supported contract.
- Use an appropriate platform operation after checking semantic compatibility.

Not every improvement reduces the number. Guard clauses can reduce nesting while
retaining the same decisions. A necessary callable boundary can contain a real invariant without
eliminating branches, but a private one-caller helper must first be compared with
inlining; a descriptive name alone is insufficient. Adding a required guard can increase CC and still be correct.

## Before/after record

Capture the affected function set, not only the original entry point:

```
Tool/version/settings:
Scope and exclusions:
Functions before / after:
Maximum function CC before / after:
Each changed function and helper's CC:
Nesting or cognitive score, when available:
Decisions removed / relocated / newly required:
Coupling, ownership and operating effects:
Evidence and remaining uncertainty:
```

A useful local diagnostic is `sum(CC_i - 1)` over exactly the affected function
set, using the same counting convention. It removes the base increment added by
each new function and can expose extraction-only reductions. This sum is **not**
an interprocedural cyclomatic complexity or a whole-system path count. Include
callbacks and generated dispatch when the analyser models them; explain omissions.
A lower sum can still reflect decisions hidden in data or an external primitive.

## Threshold policy

Use existing repository thresholds. Where none exists, do not invent a universal
hard limit: prioritise difficult changed functions, recurrent defects, known change
hotspots and poorly tested decisions. Historical signals are evidence only if the
history was actually inspected.

A repository may adopt a baseline and require explanation for increases on changed
code. Treat the policy as a review trigger, not permission to delete guards. A
necessary complex parser or state machine may warrant an explicit, scoped
exception. Do not silently change lint configuration; record reason, owner and
review trigger if the project permits an exception.

## Reject score laundering

Reject an exclusively numerical rationale for:

- Helpers named by sequence rather than a meaningful responsibility.
- Replacing a readable switch with obscure lookup machinery or a large regex.
- Moving state into flags or configuration without reducing possible states.
- Removing validation, error recovery, cancellation or cleanup.
- Reducing a repository average by adding trivial functions.
- Counting only the original function after moving its branches elsewhere.

A table or helper can still be the right design. Demand the semantic reason and
inspect the resulting interface; do not ban a technique merely because it can be
used to game a metric.

## Inlining can raise a local score and still simplify

When removing a single-use helper, decisions return to the caller. A higher caller
score can accompany fewer functions, fewer navigation hops and unchanged overall
decisions. Report that relocation honestly. Do not keep a helper just to avoid a
warning, and do not change thresholds or suppressions without authorisation. A
mandatory repository gate is a constraint to report and resolve, not to evade.
