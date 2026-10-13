# EARS requirements

This reference defines Spectacular's only syntax for locally authored normative
requirements, including invariants. EARS means **Easy Approach to Requirements
Syntax**. Use the patterns below in each requirement's `Statement` field.
Document layout may follow repository conventions; the requirement syntax stays
EARS. Workflow instructions, questions, rationale, definitions, and acceptance
examples are different kinds of material and need not use EARS.

## Terms

| Term | Meaning |
| --- | --- |
| Requirement | An authoritative obligation that distinguishes acceptable from unacceptable behaviour within its scope. |
| Contract | The maintained requirements for a bounded capability, with their governing definitions, sources, and acceptance basis. |
| Normative | Governing what must hold; descriptive observations and illustrative examples are not normative. |
| System | The named component, service, or capability responsible for satisfying the requirement. |
| Boundary | Where inputs enter, effects occur, or results can be observed; it may be a public API or a justified technical interface. |
| Actor | The person or external system interacting with that boundary. The actor may supply the trigger but does not replace the responsible system. |
| Applicability | The configuration, state, event, identity, time, version, or workload under which an obligation governs. |
| Configuration | A defined product variant or included feature, distinct from a temporary operating state. |
| State | A condition that holds over an interval, such as an account remaining suspended. |
| Precondition | A condition that must hold for a requirement to apply; define when it is evaluated if that affects acceptance. |
| Trigger / event | An occurrence at a named boundary that activates an event response, such as receipt of a cancellation request. |
| Unwanted condition | A specified fault, invalid input, failure, or other undesired situation requiring a defined response. It is not permission to invent failure policy. |
| Response | The required behaviour, result, property, or prohibition, including coupled effects and relevant limits. It need not be a returned message. |
| Bound | A measurable limit with units and the conditions needed to assess it, such as a deadline, retry count, or memory limit. |
| Quantifier | Which and how many entities or executions are covered: every request, each account, or a stated workload population. |
| Invariant | An obligation that remains true throughout its applicable scope; it may have configuration or state clauses, but no event or unwanted-condition activation clause. |
| Permission | An outcome or implementation choice that is allowed, without requiring it to occur. |
| Implementation discretion | Authorised freedom over mechanisms or choices; it does not settle an unanswered product decision. |
| Basis | The authorised decision or binding source that justifies a requirement, with rationale kept separate from its statement. |
| Authority | The person, decision, or binding external contract entitled to establish or change the obligation. |
| Oracle | An independently justified basis for an expected result, rather than a value derived from the implementation being assessed. |
| Acceptance criterion | A case or property with an expected observation, governing requirement, oracle, and verification boundary. |
| Example / scenario | A concrete illustration of a requirement; it is neither an exhaustive definition nor a second authority. |
| Evidence | An observation or inspected artifact supporting a claim within identified source, environment, and execution limits. Planned checks are not executed evidence. |
| Counterexample | A concrete input, outcome, or execution trace that exposes a violation or distinguishes competing interpretations. |

## Keywords

Use the sentence casing shown in the patterns: `Where`, `While`, `When`, `If`,
`then`, `the`, and `shall`. Embedded clauses use lowercase keywords.

- **the** names the responsible system explicitly.
- **shall** makes the response obligatory wherever the requirement applies.
- **shall not** prohibits the stated effect wherever the requirement applies.
- **When** introduces an event; it does not mean a condition holds continuously.
- **While** introduces a state; the obligation holds throughout that state.
- **If … then** introduces an unwanted condition and its required response.
- **Where** restricts applicability to a configuration that includes the named
  feature. Within that configuration the response is obligatory, not optional.

`must`, `should`, `may`, and free-form behavioural prose are not alternative
requirement syntax. Preserve the exact wording and modality of external sources
when quoting them as evidence; reference them from an EARS requirement when
their obligations govern the local contract.

## Patterns

Use the simplest applicable pattern. Omit absent clauses rather than inventing
an event or configuration to fill a template.

| Pattern | Meaning | Statement shape |
| --- | --- | --- |
| Ubiquitous | Applies throughout the contract's effective scope. | The <system> shall <response>. |
| Event-driven | Applies when the stated event occurs. | When <event>, the <system> shall <response>. |
| State-driven | Applies for as long as the stated state holds. | While <state>, the <system> shall <response>. |
| Unwanted behaviour | Defines the response to an unwanted condition. | If <unwanted condition>, then the <system> shall <response>. |
| Optional feature | Applies to configurations containing the feature. | Where <feature is included>, the <system> shall <response>. |
| Complex | Combines two or more ordered applicability clauses; an activating event or unwanted condition is optional. | Where <configuration>, while <state>, when <event>, the <system> shall <response>. |

For a complex unwanted-behaviour statement, replace `when <event>` with
`if <unwanted condition>, then`. Retain the clause order **configuration → state
→ event or unwanted condition → system → response**. Configuration and state
clauses and the activation clause are optional. A configuration-plus-state
requirement needs no invented event. Combine multiple preconditions explicitly in one state
clause; use at most one activating event or unwanted-condition clause.
Each pattern also permits `shall not <prohibited effect>` in its response.

## Enforced lexical grammar

The bundled linter checks this deterministic syntax for every `REQ` and `INV`
statement in an active document, whether proposed or accepted:

- Put the complete statement on one line and end it with an unquoted full stop.
- Use exactly one unquoted, lowercase, whole-word `shall`, separated from the
  named system and non-empty response by whitespace. A prohibition needs an
  effect after `shall not`. Coupled effects share the same `shall`.
- Separate leading applicability clauses and the system with a comma followed
  by spaces or tabs. A comma followed by `where`, `while`, `when`, `if`, `then`, or
  `the` is a reserved delimiter in the text before `shall`. Keyword casing follows
  the patterns: title case first, lowercase thereafter. Use `then the` only after
  an `if` clause; otherwise use `the`, or `The` for a ubiquitous statement.
- Supply a non-empty value for every included clause, system, and response.
  Each applicability clause occurs at most once, in the stated order. An
  invariant permits `Where`, `While`, or both, with no `When` or `If` activation.
- Quote literal data containing reserved delimiters or sentence punctuation
  with balanced double quotes or single backticks. A backslash escapes the next
  character inside a literal. Apostrophes in possessives are ordinary text.
- Outside literals, a dot is internal token punctuation only when both adjacent
  characters are ASCII letters or digits. This permits `1.5`, `v1.2.3`, and
  `https://example.test/v1`. Other internal full stops, question marks, and
  exclamation marks require quoting; for example use `"e.g."` for an ambiguous
  abbreviation and backticks for a URL containing query punctuation.

The parser checks leading clauses and the obligation boundary; response prose
remains opaque. Words such as `if` or `may` inside a response do not themselves
create another clause or obligation. These lexical rules make enforcement
predictable, not a proof that a noun phrase, outcome, or interpretation is valid.

Examples, illustrative rather than governing product rules:

```text
The booking service shall keep available stock non-negative.
When a pending booking is cancelled, the booking service shall atomically mark the booking cancelled and release its reserved unit.
While an account is suspended, the download service shall not disclose its invoice data.
If current invoice access cannot be established, then the download service shall return status 503 without invoice data.
Where audit export is included, the export service shall include the defined audit fields in every exported record.
While a booking is pending, when its cancellation request is accepted, the booking service shall release its reserved unit exactly once.
```

## One requirement, one obligation

Write one complete EARS sentence per requirement or invariant. Split obligations
that can change independently and retain coupled effects when the promise is an
indivisible transition. EARS allows multiple responses; sentence count does not
justify losing atomicity or preservation guarantees.

Define domain terms, units, identity, clocks, quantifiers, and verification
boundaries where needed. A referenced definition gives a term its meaning; it
does not independently prescribe behaviour. Outcome mappings, transition rules,
exceptions, and limits belong in EARS requirements. Tables and diagrams may
illustrate those requirements by ID, but do not supply additional obligations.

## Preserve permission without adding a guarantee

Express a restriction on permitted behaviour as an EARS prohibition or a
constraint on the authorised set of outcomes. Preserve every authorised outcome
and any existing completion obligation. A set constraint alone does not promise
that an operation executes, completes, or demonstrates every alternative.

For example, if the source permits either a current cached value or a recomputed
value whenever a response is returned:

```text
When a lookup response is returned, the lookup service shall return either a current cached value or a recomputed value.
```

This constrains a returned response without requiring a cache hit or promising
that every lookup completes. The freshness definition and any completion
guarantee require their own authorised basis. Include an unchanged state or no
action only if the source permits it. A bare permission is not evidence of a
closed outcome set; unresolved bounds stay in the working decision record.
Record purely internal mechanism choices under implementation discretion, with
any restrictions expressed as EARS requirements.

## Check meaning as well as syntax

For each statement, identify the system, applicability, response, and relevant
bound or prohibition. Construct a distinguishing case when two plausible
interpretations produce different results. Check combined applicability,
failure effects, ordering, concurrency, and acceptance evidence within scope.

When translating an existing rule, preserve its meaning and authority. A syntax
defect does not retire a binding obligation or authorise a changed outcome.
Keep unresolved proposed requirements explicitly non-governing; use EARS for
their proposed statements without labelling them accepted.

The [EARS creator's guide](https://alistairmavin.com/ears/) defines the original
patterns. The one-sentence convention, keyword casing, and permission treatment
above are Spectacular's authoring rules. Syntax conformance establishes neither
correctness nor implementation conformance.
