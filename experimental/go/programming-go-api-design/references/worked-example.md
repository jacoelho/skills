# Worked design example: finite documents versus streams

This is a hypothetical API, not a reviewed repository or an implemented library.
The declarations below are a sketch. No behaviour is claimed to have been tested.

## Requirements

An application receives a finite document from a reader. The whole input must be
valid, exactly one document is allowed, and the returned document must remain usable
after the read completes. The library does not own the reader. There is currently
no requirement for reading multiple records from a long-lived stream.

A proposed starting point is:

```go
func Decode(r io.Reader) (*Document, error)
```

The name and signature leave several decisions unresolved. Does it read one value
or consume the full input? Can it retain the reader? Is the result owned? Does it
close the reader? Can a failure return a partial document? Is memory bounded?

The design agent should settle those questions rather than begin by requesting an
interface, a builder, or a configurable decoder object.

## Candidates

**Candidate A: one whole-document operation.** The operation consumes through EOF,
rejects trailing content, and returns owned data. This directly expresses the one
caller task. It can block until EOF; it is unsuitable for an unframed open stream.

**Candidate B: a stateful stream decoder.** The caller repeatedly asks for the next
document, retains the decoder to preserve buffered input, and separately checks
completion. This serves a different task. It imposes unnecessary state and a
completion obligation on the currently required whole-document caller.

**Decision:** choose A. Keep B deferred until a real stream use exists. This is not
a rule against decoder objects; it follows from these requirements.

## Proposed signature and documentation

```go
// ParseReader parses exactly one document from r.
// It consumes input through EOF and rejects non-whitespace trailing content.
// The returned Document owns its data and does not retain r.
// ParseReader does not close r.
// On failure, it returns a nil document and an error.
// Errors caused by r remain inspectable through errors.Is and errors.As.
// The implementation may buffer the entire input; memory use is not bounded
// independently of input size.
func ParseReader(r io.Reader) (*Document, error)
```

This is a deliberately explicit contract, not a claim that every parser should
buffer its input or return a pointer. Real domain requirements may favour a value
result, incremental construction, or a compile/use separation instead.

### Caller sketch

```go
package example

import (
    "fmt"
    "io"

    "example.com/project/document"
)

// ReadDocument leaves ownership and closure of r with its caller.
func ReadDocument(r io.Reader) (*document.Document, error) {
    doc, err := document.ParseReader(r)
    if err != nil {
        return nil, fmt.Errorf("read document: %w", err)
    }
    return doc, nil
}
```

The imports and function are illustrative: `example.com/project/document` is not
included. Before implementing, compile this kind of example against an authorised
prototype. That establishes API shape, not the promised consumption or ownership.

## Acceptance obligations

Test valid input, empty input, valid input plus whitespace, a second document,
invalid trailing bytes, and truncation. Include a reader that returns data and an
error together. Verify the intended error identity without pinning incidental prose.
Verify that parsing does not close the reader and returned data remains independent
of reusable input storage. Check failure returns no usable document as promised.

There is no concurrency or reset promise because this function exposes neither a
shared stateful instance nor a reset operation. Do not add those concepts to make
the design look more complete.

## Counterexample: input from an untrusted peer

The original requirements did not bound document size. Whole-input parsing that
may buffer input is not sufficient evidence of resource safety. When an untrusted-
input use appears, establish an explicit size/admission policy and ensure oversized
input is rejected rather than accidentally accepted as a truncated valid prefix.
Decide where the real input boundary and limit belong. Do not advertise a resource
bound simply because a caller can put a limiting reader in front of the function.

This is a design risk to settle with the caller requirements, not an excuse to add
all possible budget options up front. It may be a release blocker in the untrusted
use case and irrelevant in a bounded in-memory test fixture.

## Later stream requirement

If a framed or multi-document stream is later required, a separate stateful decoder
may become justified. Specify its next-item semantics, buffered read-ahead, EOF,
error recovery, and result lifetime. Keep whole-document parsing distinct. Reuse
internal mechanisms where possible without claiming the public operations are
identical. An owned-result default and an explicitly borrowed advanced path are
alternatives to compare, not features to implement automatically.

## What the agent produced

A concrete recommended boundary, one complete caller sketch, explicit contracts,
a rejected alternative, acceptance obligations, and an unresolved resource question.
It did not merely rename `Decode`, score the design, or invent a framework.
