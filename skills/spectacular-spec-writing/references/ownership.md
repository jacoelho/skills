# Ownership and decomposition

## Distinct ownership, not disjoint applicability

The objective is one editable authoritative home for each obligation. It is not to prevent multiple obligations from governing the same operation.

For example, cancellation behaviour and a shared stock invariant both apply when cancelling a booking. Removing the invariant from cancellation because it “overlaps” would be a mistake. Refer to the invariant's canonical definition and specify cancellation's additional transition.

## Choose document boundaries by decisions

Keep one capability in one document when its rules have the same purpose, owner, revision lifecycle, and retrieval needs. Split when a boundary earns its cost:

- A genuinely shared invariant or interface has several consumers.
- A capability can change independently without rewriting another capability's contract.
- An external contract has its own authority or version lifecycle.
- A document has become too broad to retrieve and review reliably as one change.

Do not create a shared abstraction for a single speculative use. Do not organise behavioural specifications solely by source-code class, service, or private module. One user-visible capability may cross several components.

## Store information once

| Information | Authoritative home | Elsewhere |
| --- | --- | --- |
| Capability obligation | Capability contract | Requirement-ID reference. |
| Cross-capability invariant | Existing shared contract, or justified shared section/file | Applicability reference and any extra local obligation. |
| Agreed acceptance case | The AC nested under the rule it checks | Link to that case. |
| Domain term | Smallest genuinely shared glossary scope | Reference; define a qualified local term only when its meaning differs. |
| Rejected option | The decision-record entry that rejected it | A brief reference from current text where necessary. |
| Implementation setup | Test or design code | Location reference, not copied selectors or private helper inventories. |
| Feature-contract obligation | The feature contract, until its discard gate ([lifecycle](lifecycle.md)) | Nowhere lasting: anchored contracts and other lasting artefacts never reference a feature-contract ID. |

A navigational index owns no additional behaviour. An illustrative summary is explicitly non-normative and must not carry a unique exception. If a scenario or test owns a canonical executable example, the [evidence map](declarations.md#evidence-map) lists it for the AC, and the contract keeps no second editable expected value.

## Reconcile near-duplicates carefully

Compare system boundary, actor, precondition, trigger, resource identity, result, forbidden effects, time, version, and authority.

- Same obligation and same applicability: select the maintained home; replace other definitions with references.
- Same condition and incompatible effects: preserve the conflict and obtain an authorised decision.
- Shared clause plus distinct local clauses: extract only the shared clause if it has real shared ownership.
- A narrower domain or stronger local guarantee: retain as an explicit refinement when authorised.
- Different lifecycle states or versions: retain the distinction; investigate transition behaviour.

Do not merge by concatenating sentences or taking the numerically stricter value. Either can introduce a new guarantee. Do not delete a requirement solely because an automated similarity check ranked it highly.

## Preserve traceability through a move or split

Keep an identifier when the same obligation moves. A changed meaning needs an identified revision. For a split or merge, retain an explicit mapping from retired IDs to their replacements and update live references. Mark history so that it cannot masquerade as another current authority.

A local contract may reference a versioned external requirement. Preserve the external identifier and source; do not mint a second local definition unless the local text deliberately adds or translates an obligation and records that relationship.

Use [EARS](ears.md) for the normative statement in every local requirement or invariant. A glossary owns term meanings; a reference table or diagram illustrates requirements by ID. Neither adds behavioural rules outside the EARS statements, except a [rule table](declarations.md#rule-tables), which is part of the one REQ that owns it, and a TERM with a Basis, whose list of forms a statement uses.
