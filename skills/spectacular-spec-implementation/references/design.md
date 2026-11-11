# Design rules

The planner applies these rules once, with every gap in view, before any unit runs. The design is a table in the record, not a separate document. Keep it to what units need in order to stay inside their module. Name each module by its root path, so the design check can map a diff to owners.

## Rules

- **Modules follow capabilities.** Group code by the business capability it serves, not by technical layer. A requirement, a piece of state, and an invariant each have exactly one owner module.
- **Extend before you create.** Put new behaviour in the module that already owns its state. Create a module only for a capability no module owns, and name it after that capability, not a role such as `utils`, `common`, or `manager`.
- **Seams only at real boundaries.** A seam is the interface or type another module calls. Add one when a second module needs the capability, not in anticipation. Keep it narrow and owned by the consumer's needs.
- **Dependencies point one way.** Record which modules each module may depend on. No cycles.
- **One home per rule.** A rule, validation, or calculation lives in its owner module. A second module calls it rather than copying it.
- **Prefactor first.** When the current structure would force a unit across a boundary, plan a behaviour-preserving prefactor as the first change.
- **Replace, don't fork.** When new behaviour supersedes an existing code path, plan its removal in the same stack; do not leave two paths for the same behaviour.
- **Make state machines explicit.** An entity whose lifecycle is spread over boolean flags, nullable timestamps, status strings, or transition checks scattered across callers has an implicit state machine. Give it one owner module, an enumerated state type that cannot represent an illegal combination, and one place where transitions happen and are refused. See [state machines](#state-machines).

## Record it

```markdown
## Design
| Owner (path) | Owns | Seams it exposes | Consumers | May depend on |
| booking/ | REQ-BOOK-001..003, booking state | CancelBooking | api/cancel_handler.go | stock/ |
| stock/ | INV-STOCK-001, stock counts | StockReserver.Release | booking/service.go | - |
Decisions: extract StockReserver from booking/service.go before C-1, because booking writes stock counts directly today.
```

For one module with no new seam, one line is enough: `Design: extends booking; no new seams.`

## State machines

In the gap map, look for implicit state machines in the code the gaps touch, not the whole application:

- flags that are only valid in some combinations (`is_paid` with `is_cancelled`);
- nullable timestamps standing for states (`shipped_at` set means shipped);
- free-form status strings compared in several places;
- the same "can this happen now?" check repeated in several callers;
- order-dependent calls whose wrong order corrupts data.

For each, record its states, the allowed transitions, and who triggers each, taken from the code and the contract. Then classify it:

- **Same behaviour, explicit model:** the states and transitions users can observe stay exactly the same. Make it explicit in a prefactor change, accepted on green checks. This is within the planner's rights.
- **The code allows a transition the contract forbids, or forbids one it requires:** a mismatch; classify it with the mismatch classes before changing anything.
- **A better model would change what users observe:** for example, a new state, a merged state, or a transition that is now refused. That is a product decision. Record it as an open decision for grilling, with the user-facing effect; do not make it.

Judge an explicit model by all three of its readers:

- **Users:** every state they can observe has a name in the contract, and every refused transition gives them a defined response.
- **Developers:** one type and one transition function, so an illegal state does not compile or is refused in one place.
- **Agents:** the machine is easy to find under its owner module, with a name an agent searching the code would try, so a later unit extends it instead of adding another flag.

Prefer the model that serves all three. When they conflict, users win, and the conflict is recorded as a design decision with its reason.

## Design check

Run after each change and once over the whole stack, on the whole working tree's changes against HEAD, untracked files included, with the edit paths of that change (or of every change for the whole stack) as the planned scope. Edits you had before the run are reviewed too. Report a finding, with file and line, for each:

1. Code that implements a requirement, state, or invariant outside its owner module.
2. A call into another module other than through a recorded seam.
3. An import or dependency the design does not allow, or a new cycle.
4. A file outside the owner module edited without being a recorded consumer of a seam.
5. A rule, validation, or calculation duplicated instead of called from its owner.
6. A superseded code path left in place.
7. A new module or seam not in the design.
8. A new flag, nullable field, or status value that adds a state outside a recorded state machine, or a transition made outside its transition function.

A finding becomes a unit, or a design change by the planner when the design itself was wrong. Never resolve a finding by editing the design to match the code without recording why.
