# EARS requirements

EARS, the Easy Approach to Requirements Syntax, is Spectacular's only syntax for locally authored requirements and invariants. Use the patterns below in each `Statement` field. Document layout may follow repository conventions; the statement syntax stays EARS. Workflow instructions, questions, rationale, definitions, and acceptance examples are other kinds of material and need not use it. Exact meanings of words such as system, applicability, bound, and vague term are in [terms](terms.md).

## Keywords

Use the sentence casing shown in the patterns: `Where`, `While`, `When`, `If`, `then`, `the`, and `shall`. Embedded clauses use lowercase keywords.

- **the** names the responsible system explicitly.
- **shall** makes the response obligatory wherever the requirement applies.
- **shall not** prohibits the stated effect wherever the requirement applies.
- **When** introduces an event; it does not mean a condition holds continuously.
- **While** introduces a state; the obligation holds throughout that state.
- **If … then** introduces an unwanted condition and its required response.
- **Where** restricts applicability to a configuration that includes the named feature. Within that configuration the response is obligatory, not optional.

`must`, `should`, `may`, and free-form behavioural prose are not alternative requirement syntax. Preserve the exact wording and modality of external sources when quoting them as evidence; reference them from an EARS requirement when their obligations govern the local contract.

## Patterns

Use the simplest applicable pattern. Omit absent clauses rather than inventing an event or configuration to fill a template.

| Pattern | Meaning | Statement shape |
| --- | --- | --- |
| Ubiquitous | Applies throughout the contract's effective scope. | The <system> shall <response>. |
| Event-driven | Applies when the stated event occurs. | When <event>, the <system> shall <response>. |
| State-driven | Applies for as long as the stated state holds. | While <state>, the <system> shall <response>. |
| Unwanted behaviour | Defines the response to an unwanted condition. | If <unwanted condition>, then the <system> shall <response>. |
| Optional feature | Applies to configurations containing the feature. | Where <feature is included>, the <system> shall <response>. |
| Complex | Combines two or more ordered applicability clauses; an activating event or unwanted condition is optional. | Where <configuration>, while <state>, when <event>, the <system> shall <response>. |

For a complex unwanted-behaviour statement, replace `when <event>` with `if <unwanted condition>, then`. Keep the clause order **configuration → state → event or unwanted condition → system → response**. Configuration and state clauses and the activation clause are optional; a configuration-plus-state requirement needs no invented event. Combine several preconditions in one state clause and use at most one activating clause. Every pattern permits `shall not <prohibited effect>` as its response. An invariant uses the ubiquitous pattern, optionally scoped by `Where` or `While`, and never `When` or `If`.

Examples, illustrative rather than governing product rules:

```text
The booking service shall keep available stock non-negative.
When a pending booking is cancelled, the booking service shall atomically mark the booking cancelled and release its reserved unit.
While an account is suspended, the download service shall not disclose its invoice data.
If current invoice access cannot be established, then the download service shall return status 503 without invoice data.
Where audit export is included, the export service shall include the defined audit fields in every exported record.
While a booking is pending, when its cancellation request is accepted, the booking service shall release its reserved unit exactly once.
```

The linter enforces a lexical form of these patterns: one line, one `shall`, comma-separated clauses in order, quoted literals, and a closing full stop. [The linter guide](../../spectacular-spec-review/references/lint-format.md#ears-lexical-grammar) states that grammar exactly; read it when a statement fails to lint.

## One requirement, one obligation

Write one complete EARS sentence per requirement or invariant. Split obligations that can change independently and retain coupled effects when the promise is an indivisible transition. EARS allows multiple responses; sentence count does not justify losing atomicity or preservation guarantees.

Define domain terms, units, identity, clocks, quantifiers, and verification boundaries where needed. A referenced definition gives a term its meaning; it does not independently prescribe behaviour. Outcome mappings, transition rules, exceptions, and limits belong in EARS requirements. Tables and diagrams may illustrate those requirements by ID, but do not supply additional obligations.

## Preserve permission without adding a guarantee

Express a restriction on permitted behaviour as an EARS prohibition or a constraint on the authorised set of outcomes. Preserve every authorised outcome and any existing completion obligation. A set constraint alone does not promise that an operation executes, completes, or demonstrates every alternative.

For example, if the source permits either a current cached value or a recomputed value whenever a response is returned:

```text
When a lookup response is returned, the lookup service shall return either a current cached value or a recomputed value.
```

This constrains a returned response without requiring a cache hit or promising that every lookup completes. The freshness definition and any completion guarantee require their own authorised basis. Include an unchanged state or no action only if the source permits it. A bare permission is not evidence of a closed outcome set; unresolved bounds stay in the decision record. Record purely internal mechanism choices under implementation discretion, with any restrictions expressed as EARS requirements.

## Check meaning as well as syntax

For each statement, identify the system, applicability, response, and relevant bound or prohibition. Construct a distinguishing case when two plausible interpretations produce different results. Check combined applicability, failure effects, ordering, concurrency, and acceptance evidence within scope.

When translating an existing rule, preserve its meaning and authority. A syntax defect does not retire a binding obligation or authorise a changed outcome. Keep unresolved proposed requirements explicitly non-governing; use EARS for their proposed statements without labelling them accepted.

The [EARS creator's guide](https://alistairmavin.com/ears/) defines the original patterns. The one-sentence convention, keyword casing, and permission treatment above are Spectacular's authoring rules. Syntax conformance establishes neither correctness nor implementation conformance.
