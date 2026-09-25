# Change handling

Do not treat every disagreement as permission to rewrite the requirement.

## Diagnose before editing

| Finding | Appropriate target |
| --- | --- |
| The implementation violates a still-valid obligation. | Implementation and, where needed, its verification. |
| A check encodes the wrong expectation or misses its claimed boundary. | The check and affected evidence. |
| The original requirement omitted or misstated an already-applicable need. | The domain decision, current contract, and affected dependants. |
| The need changed after the earlier decision. | A new decision; add transition obligations only when a binding contract or state requires them. |
| The environment no longer supports an assumption. | Reassessment of the affected promise, recovery, and feasibility. |
| Two governing obligations cannot hold together. | Their authority and a deliberate revision or scope change. |
| A new case has no required outcome. | An open decision; do not derive intent from current output. |
| A mechanism is undesirable but its behaviour remains valid. | Design, while retaining the contract. |

When a contract changes, preserve enough prior wording and decision history for a reviewer to see what changed and why, following repository convention. Keep that history outside the current contract; readers should not have to apply a sequence of contradictory amendments to learn the active rule.

Classify a disagreement before synchronising sources: an implementation defect preserves the valid contract; a specification defect needs an authorised contract correction; a deliberate change updates the contract; undocumented behaviour needs authority; a stale secondary source should be updated; and an unresolved conflict stays out of the current contract.

## Impact envelope

Trace the changed obligation to related rules, examples, verification, interfaces, consumers, existing data, pending work, and in-flight operations when they can affect this increment. Inspect direct references and the few semantic dependencies needed to avoid a false handoff; do not turn the impact pass into an inventory of the whole system.

For a deliberate change to shipped behaviour, identify coexistence or correction obligations only when an existing external contract, deployed behaviour, persisted data, in-flight operation, compatibility promise, or other binding constraint requires them. A new or greenfield requirement does not create a migration obligation by itself.

When target and deployed contracts differ, name each applicable version and any transition rule separately. Do not replace a deployed obligation with the target rule until the binding transition permits it.

List which earlier results are invalidated and which remain relevant. An unchanged test name does not preserve evidence after its expectation, implementation, fixture, or environment changes.

## Reconcile the assignment

Identify the contract revision in the next handoff. Communicate changed obligations and cancelled work to affected implementers, and point them to the evidence they must refresh. Independent work can continue when it does not depend on the changed decision.

Distinguish recommending a correction from possessing authority to adopt it. Record user-provided decisions directly; do not create unnecessary repeat-approval gates. When authority or evidence is absent, keep the disputed part out of the current contract, record it in the task or decision record, and make the consequence explicit.
