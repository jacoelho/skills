# Learning from the JSON redesign without copying it

Use [S1–S3](sources.md) as a case study of design reasoning. This is not a policy to
migrate code to a particular JSON implementation. Check the target toolchain,
proposal state, and actual package documentation before using any experimental API.
Historical rationale and a later API snapshot may disagree; do not quietly combine
them into an invented specification.

## Evidence from the proposal

The proposal separates syntax processing in `jsontext` from Go-value mapping in
`json/v2`. It supplies whole-value and token operations, plus byte, I/O, and
reusable-encoder/decoder entry points. Its decoder results have documented limited
lifetimes, with cloning available for retention. Its shared options use precedence
and permit options irrelevant to an operation to be ignored [S1].

**Our design questions:** Do callers need independent access to a lower-level
operation? Can a common task stay simple without trapping advanced use? Does each
input form preserve the promised meaning? Can callers safely retain data? Which
mistakes does a permissive options channel make possible?

The answer is not always more layers or more variants. A library with one real
consumer and one input form may be better with one concrete function. A smaller
configuration surface may support stronger type checking without imposing much
extra caller work.

## Evidence from the change rationale

The change record explains removing mandatory indentation details from the common
indent operation, choosing a shared options representation across several dimensions,
and deferring ideas that could be added after the initial API. The shared option
choice explicitly accepts a type-safety trade-off [S2].

**Our design questions:** Which decisions should a caller make on every use? Which
settings are optional policy? Is a shared mechanism justified by this library's
actual dimensions? Which boundaries are difficult to repair after release, and
which attractive features can be postponed safely?

This is why the skill asks for a recommended design, alternatives only where they
matter, and a separation between decisions needed now and additive work for later.
It does not require variadic options, extensible registries, or a versioned package.

## Evidence from the Go team's retrospective

The retrospective identifies option loss through custom unmarshalling, the
whole-input trap in a single decoder call, and API-level costs involving buffering
and repeated parsing [S3].

**Our design questions:** Does customisation preserve applicable policy? Is completion
obvious? Does a signature permanently force work that the workload cannot afford?
These questions belong before implementation. Benchmarks answer how expensive a
particular implementation is; a contract review can expose constraints before that
implementation exists.

## What not to generalise

- A syntactic/semantic split does not imply every library needs two public layers.
- Shared declarative options are not a universal endorsement of mutable closures.
- A borrowed-data API is not a universal instruction to avoid copying.
- A context decision in a serialisation design does not settle cancellation for a
  database client or a request-driven service.
- A familiar standard-library shape is evidence of convention, not proof that its
  historical compromises fit a new API.

The reusable lesson is to trace a caller problem through the API, identify the
contract causing it, compare alternatives, and preserve a test that distinguishes
the selected design from the failure. The skill's workflow and probes are an
original synthesis for that purpose, not a claimed official Go design standard.
