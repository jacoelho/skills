# Primary sources

Check the target toolchain (`go doc`, `$(go env GOROOT)/src`) before adopting a
specific API.

## S1 — JSON API proposal

https://github.com/golang/go/issues/71497

Useful sections: overview, encoder/decoder contracts, options, high-level
operations, and customisation. Rationale history: the shipped API is the one in
`api/go1.27.txt` and `go doc encoding/json/v2` for the toolchain in use.

## S2 — Changes and deferred alternatives

https://github.com/golang/go/issues/71497#issuecomment-2626483666

Explains why options, naming, defaults, and scope choices were made. Some
explanations lag later edits to the main proposal.

## S3 — Go team's JSON retrospective

https://go.dev/blog/jsonv2-exp

“A new experimental Go API for JSON”, 9 September 2025. Describes the Go 1.25
experiment and its motivations. Its release status is superseded: go1.27 enables
JSON v2 by default (`internal/buildcfg/exp.go` baseline `JSONv2: true`).

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
function; Working with interfaces; Add configuration methods; Maintaining struct
compatibility.

## S7 — Appropriate generics

https://go.dev/blog/when-generics

“When To Use Generics”, 12 April 2022. Use the reasoning about type relationships,
functions, and interfaces; do not treat its toolchain performance observations or
predictions about future releases as current measurements.
