---
name: programming-go-api-design
description: Design and review Go APIs from the caller's perspective. Use before or during implementation when choosing package boundaries, exported or cross-package types, function signatures, constructors, configuration, extension points, errors, ownership, streaming, reuse, or compatibility. Produce realistic caller examples and explicit contracts; use review mode to assess existing APIs. Not a formatting or micro-optimisation skill.
---

# Go API Design

Design APIs that make ordinary tasks straightforward, important guarantees explicit,
and composed uses as predictable as isolated uses. Minimise the concepts and
obligations callers must learn, without concealing necessary semantics.

This is a **design skill first**, with the same criteria available for review.
It applies to reusable libraries, internal package APIs, and component contracts.
Do not impose a public-library process on every local helper.

## Modes and authority

- **Design:** create or change an API before or during implementation. This is the
  default for a proposed capability or an unfinished design.
- **Review:** assess an existing API against actual caller tasks and contracts.
- **Evolve:** design a change with explicit compatibility and migration obligations.

Follow the user's authorised scope. Designing does not authorise an unrelated
repository rewrite. An existing implementation request already authorises the
necessary design work: do not add a mandatory approval stage. Make reversible
assumptions when details are missing; ask only when the answer materially changes
correctness or an irreversible decision and cannot be found in the project.

Treat correctness, safety, required compatibility, and explicit resource budgets as
constraints. Among feasible designs, prefer the least total complexity across the
library, caller code, documentation, and future maintenance. Consider API-imposed
performance costs now; do not claim measured speed or allocations without evidence.

## Read selectively

Start with this file. Load only what the task needs:

- [Design criteria](references/design-criteria.md): detailed questions and trade-offs.
- [Contract probes](references/contract-probes.md): ways to challenge a proposed API.
- [JSON design lessons](references/json-design-lessons.md): evidence and limits of the analogy.
- [Sources](references/sources.md): primary references and provenance.
- [Design record](assets/design-record.md): output template, not mandatory paperwork.
- [Worked example](references/worked-example.md): design reasoning with explicit contracts.
- [Agent prompt](agents/designer.md): delegation instructions sharing this skill.
- [Evaluation guide](evals/README.md): scenarios for evaluating agent behaviour.

For a small helper, one caller example, a short contract, and a focused check may be
enough. For a public or widely reused boundary, use the workflow below. Do not
create documents, diagrams, or alternative APIs merely to fill a template.

## Workflow

### 1. Establish the task and constraints

Read the relevant package, callers, tests, examples, `go.mod`, workspace and build
configuration, and repository guidance before proposing changes. Distinguish the
module's required Go version, the installed toolchain, and any experiments.
Do not assume a proposal is an available or stable API.

Identify the caller, their data, the operation, failure policy, expected scale,
resource ownership, and what they should not need to know. Record hard project
constraints such as no reflection, allocation targets, supported platforms, or
preserved names. Do not silently universalise those constraints to other projects.

In an existing repository, identify the compatibility baseline and whether current
behaviour is promised, accidental, or unknown. Use compiler or semantic-tool facts
for language questions; distinguish them from design judgement.

### 2. Write callers before internals

Write realistic usage from an importing package, without access to unexported
helpers. Cover the ordinary task, one important composition or extension, and one
failure or lifecycle path. Add reuse, streaming, cancellation, or foreign-type
examples only when relevant. Use actual domain data rather than empty toy calls.

Include imports, error handling, cleanup, and any required conversions. Do not hide
the proposed API's cost inside an unexplained helper or discard errors to make the
example look attractive. Include setup amortisation for repeated-use workloads.

For each call, ask: what must the caller know, choose, convert, retain, or remember?
Identify which obligations are necessary and which are imposed by the design.

### 3. Choose the smallest coherent boundary

Start with concrete operations and concepts, not a framework, interface hierarchy,
configuration system, or generic constraint vocabulary.

Keep a lower layer public only when independent callers have a real use for it.
Separate mechanism from policy when that permits useful independent operation,
not just to increase the number of packages. A convenient entry point may delegate
to a reusable primitive; callers should not have to reconstruct that primitive.

Where there is a genuine trade-off, compare two or three plausible designs using
the **same caller scenarios and guarantees**. In an evolution task include keeping
the current API. Compare conceptual burden, misuse risks, composition, implementation
costs, and compatibility. Select one and explain the decisive reason. Do not require
multiple candidates for an obvious small change.

### 4. Write contracts before polishing names

For relevant operations, settle:

- Inputs, output meaning, units, valid states, zero/nil/empty behaviour, and defaults.
- Ownership, aliasing, mutation, result lifetime, copying, and reuse/reset rules.
- Failure detection, partial output or mutation, machine-readable error properties,
  and whether another call is valid after failure.
- Configuration scope and precedence; callback obligations; resource closure,
  cancellation, concurrency, and completion behaviour when applicable.

State what is unspecified deliberately. Do not invent guarantees for convenience.
Write the intended doc comments now: long explanations of arbitrary exceptions are
a signal to reconsider the design, not a reason to omit the explanation.

### 5. Test composition and ordinary mistakes

Apply the relevant probes in [contract-probes.md](references/contract-probes.md).
Prioritise semantic continuity across adapters, nested calls, custom handlers, and
reuse. Configuration availability is not the same as enforced policy: a callback
can bypass a facility unless the contract or mechanism prevents that bypass.

Examine natural caller mistakes: a retained borrowed buffer, a copied mutable value,
an omitted final error check, a reused builder, a forgotten close, or a false/zero
option that cannot override a default. Identify whether prevention belongs in the
type/signature, runtime validation, or documentation. Prefer prevention when the
extra design cost is justified; not every invalid state needs its own type.

Test whole-input operations separately from operations that consume one item in a
stream. Do not infer bounded memory, cancellation, or atomic output from an
`io.Reader`/`io.Writer` parameter.

### 6. Inspect the API as a caller will see it

Read package-qualified names, signatures, doc comments, and examples together.
Keep vocabulary, parameter roles, defaults, and failure handling consistent across
related operations. Explain intentional asymmetry. Do not generate every possible
operation/representation combination just to complete a matrix.

Prefer familiar standard interfaces where their contracts really fit. Keep new
interfaces tied to actual substitution or extension needs. Use type parameters
when they preserve a useful type relationship or remove genuinely repeated work;
do not introduce them solely for hypothetical speed. Demonstrate inference and
foreign-type usage when generics are part of the public API.

A zero value, options struct, functional options, builder, iterator, callback,
concrete return type, or interface is a choice to justify, not a scoring category.
Do not add `context.Context` to a pure operation as decoration, or remove it from
an operation that must propagate request cancellation or deadlines.

### 7. Verify what can be verified now

Compile external-package caller examples against the candidate API, using a small
isolated prototype when necessary and authorised. A stub can establish shape and
type compatibility, not behaviour. Label these results separately.

After implementation, run focused contract tests and existing regressions. Where
relevant, exercise aliases, nested options, error identity, early termination,
cleanup, compatibility uses, and concurrency. An executable example validates only
its assertions. A compile-only check does not establish semantics; a race-detector
pass does not prove every concurrent execution safe.

Use the actual available Go version and record commands and results. Do not claim
`gopls`, tests, benchmarks, source inspection, or separate agents were used unless
they were. Never install a toolchain, update dependencies, or change build policy
silently just to make the design compile.

Separate structural cost claims from measurements. If optimisation decides between
otherwise suitable APIs, specify a representative benchmark and delegate to
`programming-go-performance` when available. If unavailable, report the hypothesis
and required experiment rather than pretending a handoff occurred.

### 8. Challenge and deliver the design

Ask what the strongest objection is to the chosen API. Attempt one realistic
counterexample and one simplification. Revise when the evidence warrants it; stop
when further changes are merely preference or speculative extension.

Return the recommended API and caller examples first, then the important contracts,
trade-offs, verification, and deferred additions. Mark what must be settled now
versus what can be added compatibly later. Keep implementation notes subordinate to
the caller contract. When implementation is authorised, carry these contracts into
tests and check for design drift during implementation.

## Review findings

For an existing API, every substantive finding needs:

1. The affected symbol and source location, or a clearly labelled proposed signature.
2. A concrete caller scenario and observed behaviour or a demonstrated ambiguity.
3. The violated requirement/contract or unnecessary caller burden.
4. The smallest plausible correction, with trade-offs and compatibility impact.
5. A verification method and an evidence label.

Use **observed**, **compiler-verified**, **test-verified**, **documented**,
**inferred**, or **unverified** accurately. Missing documentation establishes a
contract gap, not an invented runtime defect. A taste preference is not a bug.
Prioritise by caller impact rather than the number of checklist deviations.

An outcome of **no API change justified** is valid. Do not manufacture findings.

## Avoid

Do not equate good design with a short exported-symbol count, few lines at the call
site, elaborate types, many options, or resemblance to a favourite package.
Do not copy the JSON proposal's API shape into unrelated domains.
Do not redesign correct APIs solely to conform to this skill.
Do not hide required complexity in callers, callbacks, undocumented conventions,
global registries, or helpers that exist only to make examples look simple.
