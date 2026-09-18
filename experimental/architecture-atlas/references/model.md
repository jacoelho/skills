# Atlas model v1

The model is the single JSON intermediate representation. **schemas/atlas.schema.json** is the authoritative Draft 2020-12 shape contract: supported properties, types, required fields and enums. `scripts/atlas.py` adds cross-reference, containment, source-safety and replay checks. The renderer consumes that same model; there is no second authored layout IR.

Fixed-shape objects reject unknown fields, including misspellings. State objects intentionally allow domain-defined keys and JSON values. Schema validation neither parses arbitrary application code nor proves that a diagram matches it. Optional `$schema` is an editor hint; the CLI always uses the bundled schema and never fetches the hint URL.

## Root

| Field | Meaning |
|---|---|
| `version` | Exactly `1`. |
| `title`, `summary` | Reader-facing overview, not generated marketing text. |
| `root_view` | ID of the top navigation view. |
| `source` | `repository`: GitHub-style repository web URL; `commit`: full 40-character Git SHA; `scope` and `excluded`: non-empty text. |
| `evidence` | Source registry. |
| `entities`, `relations` | Shared semantic graph. |
| `views` | Named projections with navigation links. |
| `scenarios` | Optional finite state walkthroughs; default empty array. |

IDs use lower-case ASCII letters, digits, hyphens and underscores; begin with a letter; maximum 80 characters. IDs are unique within each collection. They are durable identities, not diagram coordinates.

## Evidence

An entry has `id`, `label`, `kind` (`code`, `documentation`, `test`, `experiment`) and a repository-relative `path`, or an explicit HTTP(S) `url` for a non-repository source. Repository paths cannot escape the source root. Optional `start` and `end` must appear together with a repository path and are inclusive one-based source lines. A path and an external URL are mutually exclusive. Optional `sha256` checks the entire pinned file blob. Source links use the pinned commit, not the current default branch.

`--repo-root` first verifies that the revision names a commit object, then reads file blobs with `git cat-file`. It checks ranges and optional hashes and never fetches or executes target code. Directory tree objects are not accepted as file evidence. This is an existence/integrity check, not an automated review of meaning. Uncommitted files and multi-repository snapshots are not supported by this CLI. Analyse an agreed immutable commit and disclose exclusions, or return labelled notes for the unsupported snapshot; do not create commits or modify the worktree just to meet the schema. The implementation is intended for GitHub-style `/blob/<commit>/<path>` URLs; use explicit evidence URLs for other sources.

## Entities

Required: `id`, `label`, `kind`, `summary`, `status`, `certainty`, `coverage`, `evidence`.

`kind`: `actor`, `component`, `function`, `document`, `artifact`, `store`, `type`, `stage`, `boundary`.

`status`: `current`, `in-progress`, `planned`. This means implementation or document status, not how convincing the evidence is. Documented instructions should be labelled as documents/stages; do not render them as executed functions.

`certainty`: `verified`, `inferred`, `unknown`, `illustrative`. `verified` needs at least one evidence reference. It means that the author checked the claim against the recorded evidence, not that the script proved it. Use illustrative for a conceptual example not claimed as observed code.

`coverage`: `inspected`, `partial`, `unexplored`. This is investigation coverage, not implementation status.

Optional:

- `parent`: structural owner entity; parent chains must be acyclic.
- `facts`, `invariants`: arrays of text supported by this entity's evidence. Split entities or claims when uncertainty differs materially.
- `fields`: array of `{ "name": "...", "type": "...", "meaning": "..." }`. Field names must be unique within an entity.

This v1 attaches evidence at entity/relation/step granularity, not to every field. Split a questionable field claim into a separately evidenced item or label the containing explanation inferred. Do not mislabel a mixed set of assertions as wholly verified.

## Relations

Required: `id`, `from`, `to`, `kind`, `label`, `summary`, `status`, `certainty`, `evidence`.

`kind` is a meaningful relationship name, e.g. `calls`, `publishes`, `consumes`, `reads`, `writes`, `transforms`, `contains`. The renderer displays a directed labelled edge. It does not infer the type of relation from code or invent a guarantee from that type.

Put payload, ownership transfer, transformation rules and relevant failure semantics in `summary` and inspectable entities. A transformation can itself be an entity when its internal mapping deserves drill-down. Full field-to-field lineage, rich cardinality notation and protocol-specific schemas are not native v1 features.

## Views

Required: `id`, `title`, `question`, `summary`, `level` (0–4), `lens`, `entities`, `relations`.

`lens`: `structure`, `flow`, `data`, `state`, `failure`, `code`. The present renderer draws labelled graph projections for each lens; it does not supply distinct UML, sequence or entity-relationship layout engines.

`level` is an author-assigned depth cue, not a mandatory C4 sequence. A library can have an overview of parsing/compilation/validation without inventing containers. All displayed relation endpoints must exist in the view. Views must contain at least one entity, and entity/relation membership lists cannot contain duplicate references.

Optional: `focus` entity, `links` to related views, `takeaways` text array, `direction` (`TB`, default; or `LR`). A focus entity may be contextual rather than drawn: a component can anchor a diagram showing its internals. It must exist in the shared model. This is deliberately different from the visible-endpoint rule. Every non-root view needs a `parent` view as its navigation anchor. Parents need not be structural containment or exactly one depth above. The viewer also links all views containing the same entity.

The builder warns above 9 entities in an overview or 12 in detail. These are adjustable design heuristics, not cognitive laws. Sometimes a larger diagram is justified; a dedicated question and readable labels matter more.

## Scenarios

Required: `id`, `label`, `description`, `basis`, `view`, `status`, `initial`, `steps`.

`basis` explicitly identifies a documented walkthrough, synthetic fixture, measured run or illustrative hypothesis. A scenario is associated with one view in v1. Shared entity navigation works across views, but the replay cursor is not projected into another view's independent timeline.

`initial` declares all state keys and JSON values. Each step requires `title`, `description`, `certainty`, `evidence`; optional `entities` and `relations` identify visible elements to highlight. `set` maps declared state keys to complete replacement JSON values. `expect` asserts post-step values. No executable expressions or nested patch language are accepted.

Assertion equality follows JSON values, not Python's coercions: booleans differ from numbers; object key order is irrelevant; array order matters; `1` and `1.0` compare equal. JSON numbers must be finite. Integers and whole-number floats outside ±(2^53−1) are rejected to avoid browser precision loss; represent exact larger identifiers, money or quantities as strings. Inputs also reject duplicate keys, lone Unicode surrogates and nesting beyond 64 levels. These are interchange limits, not domain facts.

```json
{
  "title": "Commit the accepted request",
  "description": "The transaction commits before acknowledgement.",
  "certainty": "verified",
  "evidence": ["ev-commit"],
  "entities": ["request-record"],
  "relations": [],
  "set": {"committed": true, "acknowledged": false},
  "expect": {"committed": true}
}
```

The example syntax is not evidence that any target application commits before acknowledging. Source that relationship in the target repository.

Initial state is index `-1`. A snapshot is recomputed from initial through the selected step, so Previous and direct links do not attempt to invert mutations. The model validator checks assertions, including after repeated replay. Current scenarios cannot highlight in-progress/planned elements or relations, including non-current endpoints of a highlighted relation.

## Output and trust boundaries

`build` writes `index.html`, a copy of `model.json`, and per-view DOT/SVG files. Browser data is safely JSON-embedded and prose is rendered as text. DOT is generated with quoted plain labels; model-supplied SVG/HTML/code is not used. A restrictive content security policy blocks runtime dependencies. Source links are explicit user-initiated HTTP(S) navigation.

The builder invokes the locally installed Graphviz program. It is not a sandbox for malicious native programs. Treat the source repository as untrusted; do not execute its installer, scripts or dependencies just to draw diagrams.

Build output is reproducible with the same renderer, Graphviz version and fonts. Every view is rendered before publication; each output file is atomically replaced and `index.html` is published last. This is not a multi-file transaction. A sidecar I/O failure can leave mixed export versions while the previous HTML remains intact. Existing output directories may retain obsolete diagrams after views are removed; use a clean build directory for publication. No automatic cleanup or semantic source-drift detection is performed.


## Validation and delivery

See [validation](validation.md) when running checks, repairing diagnostics or inspecting the generated artifact.
