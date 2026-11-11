# Source mismatches

Use these names when a specification, decision, code path, test, example, or external contract disagree. Classify the mismatch with a concrete input, state, or event before editing any source; the class decides which source changes.

| Class | Recognise it when | Repair |
| --- | --- | --- |
| implementation defect | The current contract is authoritative and code violates it. | The implementation and, where needed, its verification. Preserve the contract. |
| specification defect | Stronger evidence shows the contract omitted or misstated an already-applicable need or binding behaviour. | An authorised correction of the decision and contract, then affected dependants. |
| deliberate change | The need changed after the earlier decision, and the proposal intentionally changes an existing promise. | A new decision and contract revision. Add transition or migration obligations only when the changed promise, persisted data, a consumer contract, a binding constraint, or version coexistence requires them. |
| undocumented existing behaviour | Code behaves consistently in a way the contract does not settle. | Obtain authority before promoting the behaviour to a requirement. |
| unspecified case | A new case has no required outcome in any governing source. | An open decision; do not derive intent from current output. |
| stale secondary source | A test, example, scenario, design note, or duplicate specification conflicts with the maintained contract, or a check encodes the wrong expectation or misses its claimed boundary. | The secondary source and the evidence that depended on it. |
| contradiction | Two governing obligations cannot both hold for a shared applicable case. | Their authority, then a deliberate revision or scope change. |
| environment changed | The environment no longer supports an assumption the promise relied on. | Reassessment of the affected promise, recovery, and feasibility. |
| undesirable mechanism | A mechanism is undesirable but its behaviour satisfies the contract. | The design, while retaining the contract. |
| unresolved conflict | Authority or evidence is insufficient to choose which source should change. | Preserve the existing contract, record the question and affected work with its owner in the decision record, and isolate dependent work. |

Code describes actual behaviour, not automatically intended behaviour. A test demonstrates an encoded expectation, not automatically the governing requirement. Preserve the evidence needed to decide which source is wrong, and correct that source rather than synchronising every source to the same mistake.
