# Spec lifecycle

A spec is either **anchored** or a **feature** spec. The user decides; this file owns what each choice means.

| | Anchored | Feature |
| --- | --- | --- |
| Purpose | The maintained contract for a capability, kept in sync with the code | Guides one change, then is discarded after it ships |
| Home | The capability's contract, one authoritative home per rule ([ownership](ownership.md)) | A feature folder: the repository's convention, otherwise `specs/<feature>/` |
| Lasting record | The contract itself | Executable checks for behaviour; an ADR or the PR description for decisions |
| Header | `Lifecycle: anchored` | `Lifecycle: feature` |

## Choose

Settle the lifecycle in this order:

1. The flag: `--anchored` or `--feature` in the skill arguments, or an equivalent phrase in the request, such as "throwaway spec" or "feature spec".
2. When revising an existing contract, its `Lifecycle:` header. A new feature spec may still refine an anchored contract when the flag asks for one.
3. Repository convention: a `Spec lifecycle:` line in `CLAUDE.md` or `AGENTS.md`, or an existing folder of feature specs.
4. Otherwise ask the user once, with the structured question tool when available, and record the answer in the contract header.

## References flow one way

A feature spec may reference anchored IDs. An anchored contract never references a feature-spec ID, and neither does any other lasting artefact. Discarding a feature spec then breaks nothing; if a reference was missed, the linter reports it as `dangling-reference` once the feature folder leaves the lint roots.

## Feature specs while the change is in flight

- Lint the feature folder together with the anchored contracts it references.
- Reconcile against code, tests, binding external contracts, anchored contracts, and other active feature specs. Two active feature specs that disagree about the same behaviour are a `contradiction` or `unresolved conflict` ([mismatch classes](mismatch.md)). A discarded feature spec is a `stale secondary source`, never an authority.
- Skip relocation, history, and transition work that exists only to keep a contract maintained ([changes](changes.md)), unless a binding constraint requires it.

## Discard gate

Before a feature spec is discarded:

1. Every accepted REQ and INV has an executable check that passes. The check, not the spec, now records the behaviour; name it after the behaviour, not the feature-spec ID.
2. Each decision with lasting consequence is recorded in an ADR or the PR description. The decision record from grilling is discarded with the spec.
3. Nothing lasting references a feature-spec ID.

Discard by deleting the folder. When the user wants it kept as read-only history, remove its spec-lint marker and add a first line saying it is superseded history, so it is no longer linted or treated as a source.
