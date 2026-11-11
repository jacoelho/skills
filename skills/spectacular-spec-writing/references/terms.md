# Terms

Exact meanings for the words the Spectacular skills use as tests. Look a term up when a step, check, or finding turns on it; the skills do not expect this file to be read end to end.

## Work and authority

| Term | Meaning |
| --- | --- |
| Increment | The next unit of authorised work that can be accepted on its own: one capability change, investigation, or correction with stated inclusions and exclusions. |
| Contract | The maintained requirements for a bounded capability, with their governing definitions, sources, and acceptance basis. Its lifecycle is anchored or feature ([lifecycle](lifecycle.md)). |
| Decision record | The working record of open and settled product decisions for a capability, kept by `jacoelho:spectacular-spec-grilling`. It feeds the contract and is never a second authority. |
| Consequential | Describes a question, gap, or obligation whose plausible answers would change a promised observable outcome, violate a shared invariant, break a consumer, or invalidate dependent work in the current increment. Anything else is recorded as a limit or a deferred or excluded question, not a finding or blocker for that increment. |
| Authority | The person, decision, or binding external contract entitled to establish or change an obligation. |
| Basis | The authorised decision or binding source that justifies a requirement. Rationale stays out of the statement. [Declarations](declarations.md#acceptance) lists the forms a basis may take. |
| Normative | Governing what must hold; descriptive observations and illustrative examples are not normative. |
| Permission | An outcome or implementation choice that is allowed, without requiring it to occur. |
| Implementation discretion | Authorised freedom over mechanisms or choices; it does not settle an unanswered product decision. |
| Structural commitment | A recorded design decision that binds boundary-crossing types, module boundaries, signatures, or permitted dependencies, held as source-language declarations ([structure](structure.md)). It refines requirements by identifier and is not a second authority for behaviour. |

## Obligation shape

| Term | Meaning |
| --- | --- |
| Requirement | An authoritative obligation that distinguishes acceptable from unacceptable behaviour within its scope. |
| Invariant | An obligation that remains true throughout its applicable scope; it may have configuration or state clauses, but no event or unwanted-condition activation clause. |
| System | The named component, service, or capability responsible for satisfying the requirement. |
| Boundary | Where inputs enter, effects occur, or results can be observed; it may be a public API or a justified technical interface. |
| Actor | The person or external system interacting with that boundary. The actor may supply the trigger but does not replace the responsible system. |
| Response | The required behaviour, result, property, or prohibition, including coupled effects and relevant limits. It need not be a returned message. |
| Bound | A measurable limit with units and the conditions needed to assess it, such as a deadline, retry count, or memory limit. |
| Quantifier | Which and how many entities or executions are covered: every request, each account, or a stated workload population. |
| Vague term | A word or phrase in a requirement that lets two competent implementations both claim conformance while producing different observable outcomes, because no bound, definition, or governing source in scope settles it. "Fast" is vague until a bound or a referenced target fixes it; a term defined in the contract's glossary is not. Test it with a behavioural fork. |

## Applicability

| Term | Meaning |
| --- | --- |
| Applicability | The configuration, state, event, identity, time, version, or workload under which an obligation governs. |
| Configuration | A defined product variant or included feature, distinct from a temporary operating state. |
| State | A condition that holds over an interval, such as an account remaining suspended. |
| Precondition | A condition that must hold for a requirement to apply; define when it is evaluated if that affects acceptance. |
| Trigger / event | An occurrence at a named boundary that activates an event response, such as receipt of a cancellation request. |
| Unwanted condition | A specified fault, invalid input, failure, or other undesired situation requiring a defined response. It is not permission to invent failure policy. |

## Evidence

| Term | Meaning |
| --- | --- |
| Acceptance criterion | A case or property with an expected observation, governing requirement, oracle, and verification boundary. |
| Oracle | An independently justified basis for an expected result, rather than a value derived from the implementation being assessed. |
| Example / scenario | A concrete illustration of a requirement; it is neither an exhaustive definition nor a second authority. |
| Evidence | An observation or inspected artifact supporting a claim within identified source, environment, and execution limits. Planned checks are not executed evidence. |
| Counterexample | A concrete input, outcome, or execution trace that exposes a violation or distinguishes competing interpretations. |
