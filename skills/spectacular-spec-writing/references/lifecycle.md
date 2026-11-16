# Contract lifecycle

A contract is either **anchored** or a **feature** contract. The user decides; this file owns what each choice means and where the files go.

| | Anchored | Feature |
| --- | --- | --- |
| Purpose | The maintained contract for a capability, kept in sync with the code | Guides one increment, then is discarded after it ships |
| Home | The capability's contract, one authoritative home per rule ([ownership](ownership.md)) | A feature folder: the repository's convention, otherwise `specs/<feature>/` |
| Lasting record | The contract itself | Executable checks for behaviour; the vertical's or root decision record for decisions |
| Header | `Lifecycle: anchored` | `Lifecycle: feature` |

## Choose

Settle the lifecycle in this order:

1. The flag: `--anchored` or `--feature` in the skill arguments, or an equivalent phrase in the request, such as "throwaway spec" or "feature spec".
2. When revising an existing contract, its `Lifecycle:` header. A new feature contract may still refine an anchored contract when the flag asks for one.
3. Repository convention: a `Spec lifecycle:` line in `CLAUDE.md` or `AGENTS.md`, or an existing folder of feature contracts.
4. Otherwise ask the user once, with the structured question tool when available, and record the answer in the contract header.

## Layout

The repository's convention wins. Otherwise a contract is a file `<capability>.md`, or `contract.md` inside a folder named for the capability; a feature contract uses the folder form. Its sibling files sit beside it and take the capability's name, which is the contract's file name or, for `contract.md`, its folder's name:

| File | Name |
| --- | --- |
| Decision record | `<capability>.decisions.md` |
| Implementation record | `<capability>.implementation.md` |
| Evidence map | `<capability>.evidence.md` |

For example `specs/booking/contract.md` has `specs/booking/booking.decisions.md`, `specs/booking/booking.evidence.md`, and `specs/booking/booking.implementation.md`. Only the contract carries the spec-lint marker.

A decision that spans capabilities goes in a wider record instead: `<vertical>/<vertical>.decisions.md` for one vertical, such as `specs/reading/reading.decisions.md`, or `specs/specs.decisions.md` for the whole repository. An entry is placed by its question's scope when it is created and is not moved when later rules cite it. A source several contracts rely on, such as an architecture document at a commit, is declared as a SRC in each contract that cites it, so editing one contract never touches another's file.

## References flow one way

A feature contract may reference anchored IDs. An anchored contract never references a feature-contract ID, and neither does any other lasting artefact. Discarding a feature contract then breaks nothing; if a reference was missed, the linter reports it as `dangling-reference` once the feature folder leaves the lint roots.

## Feature contracts while the increment is in flight

- Lint the feature folder together with the anchored contracts it references.
- Reconcile against code, tests, binding external contracts, anchored contracts, and other active feature contracts. Two active feature contracts that disagree about the same behaviour are a `contradiction` or `unresolved conflict` ([mismatch classes](mismatch.md)). A discarded feature contract is a `stale secondary source`, never an authority.
- Skip relocation, history, and transition work that exists only to keep a contract maintained ([changes](changes.md)), unless a binding constraint requires it.

## Discard gate

Before a feature contract is discarded:

1. Every REQ and INV with a Basis has an executable check that passes. The check, not the contract, now records the behaviour; name it after the behaviour, not the feature-contract ID.
2. Each decision with lasting consequence is moved, with its rejected options and their reasons, to the vertical's or root decision record. The feature's own decision record is discarded with the contract.
3. Nothing lasting references a feature-contract ID: search code comments for the contract's ID stem, such as `AC-CHK-`, and remove each one. The evidence map goes with the folder.

Discard by deleting the folder. When the user wants it kept as read-only history, remove its spec-lint marker, delete its evidence map, and add a first line saying it is superseded history, so it is no longer linted or treated as a source.
