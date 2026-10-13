# Primary sources and provenance

Research date: **6 October 2026**. This bundle is design guidance, not a release-
status report. Check the current source and target toolchain before adopting a
specific API. No third-party commentary is used as the authority for Go behaviour.

## S1 — JSON API proposal

https://github.com/golang/go/issues/71497

Read through the GitHub connector. Useful sections: overview, encoder/decoder
contracts, options, high-level operations, and customisation. Treat the proposal as
a changing design document, not proof that every listed operation is stable or
available in the user's build.

## S2 — Changes and deferred alternatives

https://github.com/golang/go/issues/71497#issuecomment-2626483666

Read through the GitHub connector. The change rationale is particularly useful for
understanding why options, naming, defaults, and scope choices were made. Some
historical explanations can lag later edits to the main proposal.

## S3 — Go team's JSON retrospective

https://go.dev/blog/jsonv2-exp

“A new experimental Go API for JSON”, 9 September 2025. This describes the Go 1.25
experiment and its motivations; its release-status statements are historical.

## S4 — Names from the caller's perspective

https://go.dev/blog/package-names

“Package names”, 4 February 2015. Use the naming/design guidance, not the article's
historical build-environment examples.

## S5 — Error inspection and abstraction boundaries

https://go.dev/blog/go1.13-errors

“Working with Errors in Go 1.13”, 17 October 2019. Relevant sections: Whether to Wrap;
Errors and package APIs.

## S6 — Source compatibility

https://go.dev/blog/module-compatibility

“Keeping Your Modules Compatible”, 7 July 2020. Relevant sections: Adding to a
function; Evolving APIs; Maintaining struct compatibility.

## S7 — Appropriate generics

https://go.dev/blog/when-generics

“When To Use Generics”, 12 April 2022. Use the reasoning about type relationships,
functions, and interfaces; do not treat its toolchain performance observations or
predictions about future releases as current measurements.

## S8 — Practical Go review conventions

https://go.dev/wiki/CodeReviewComments

Useful topics: interfaces, contexts, examples, receiver types, and goroutine
lifetimes. These conventions are background guidance, not a complete ergonomics
method or an excuse to override a documented project constraint.

## S9 — Core Go conventions

https://go.dev/doc/effective_go

The document itself warns that it is not actively updated and omits major later
changes. Use stable core conventions alongside current language/package references.

## Coverage limitations

The historical draft and meeting notes linked by S3 were located, but their Google
Docs bodies were not accessible through the browsing tool. They were not used as
evidence. This bundle does not claim to exhaustively review the issue's discussion,
meeting history, implementation, or current proposal sub-issues.

The workflow, decision criteria, worked example, evaluation scenarios, and probe
code are original material. External sources motivate specific lessons; they do
not endorse this skill or establish that its agent prompts have been evaluated.
