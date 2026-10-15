# Architecture atlas

An agent skill with a schema-checked JSON model, uv-ready validator and offline diagram explorer. Build a mental model from system overview to a feature vertical, its data ownership and implementing source.

This revision tightens task routing, uses selective reference loading, separates authoring from maintenance and adds a prompt-evaluation corpus. It retains the existing model version, schema, renderer and dependencies.

## Install and invoke

Place the complete `architecture-atlas` directory under your repository's `.agents/skills/`. Keep scripts, references, schemas and assets together. This package does not change global configuration or install itself.

```text
$architecture-atlas

Map this repository for a developer unfamiliar with it. Start with an overview,
then follow one important operation through its data transformations, ownership,
failure boundary and source. Preserve a navigable route back to the overview.
```

For an update:

```text
$architecture-atlas

Deepen the validation vertical in the existing atlas. Keep unrelated views and
stable identities. Inspect the affected source before changing claims.
```

For a bounded validation request:

```text
$architecture-atlas

Validate this model's schema and references. Report the errors; do not rebuild
or change the model.
```

The primary routing description lives in `SKILL.md`. Optional Codex appearance/default-prompt metadata is in `agents/openai.yaml`.

## Try the existing example

Build the bundled example, then open `atlas-output/index.html`:

```sh
uv run scripts/atlas.py build examples/reference-skill.model.json --output atlas-output --json
```

It explains the upstream `visualize-architecture-flow` skill, not your application. Follow Overview → HTML validator CLI → Executable validator → Diagnostic result → data structures → source.

`examples/minimal.model.json` shows the schema in two nodes. Use its shape, not its repository facts. The full example supplies six linked views and finite explanatory scenarios. Its historical upstream measurements are not new runtime observations made by this revision.

## Commands

From the installed skill directory:

```sh
uv run scripts/atlas.py validate examples/minimal.model.json --json
uv run scripts/atlas.py validate model.json --repo-root /path/to/repo --json
uv run scripts/atlas.py build model.json --output atlas-output --json
```

For maintenance:

```sh
uv run scripts/atlas.py schema-check --json
uv run scripts/atlas.py test
```

The second validation command adds local pinned-source integrity checks. Without it, source integrity remains `not_run`. Output is `index.html`, `model.json` and editable DOT/SVG diagrams. Run commands with absolute, quoted paths when outside the skill directory; see `references/validation.md`.

Python 3.10+ and `jsonschema==4.26.0` are declared inline for uv. Building also needs native Graphviz. Browser tests have a separate Playwright dependency and need an existing Chromium installation. Viewing the HTML needs none of these build tools. Direct dependencies are pinned; no transitive lockfile is included.

## Files

| Location | Responsibility |
|---|---|
| `SKILL.md` | Compact task router, evidence boundaries and completion contract. |
| `agents/openai.yaml` | Optional display name and invocation prompt. |
| `references/exploration.md` | Investigation, refresh and comprehension checks. |
| `references/model.md` | Meanings and limitations of the existing JSON IR. |
| `references/validation.md` | Commands, diagnostics, delivery and verification scope. |
| `schemas/atlas.schema.json` | Authoritative fixed-shape contract. |
| `scripts/atlas.py` | Existing schema/model/source checker and Graphviz builder. |
| `assets/explorer.html` | Existing shared-identity offline viewer. |
| `evals/` | Prompt cases, rubric and a small synthetic source fixture. |
| `tests/` | Deterministic regressions; example-specific browser acceptance. |

## What verification means

Schema validity, graph consistency, source integrity, semantic interpretation, browser behaviour and visual readability are distinct. No single green check proves all of them. The CLI does not parse arbitrary application code, prove claim meaning, detect semantic source drift or simulate concurrency.

`tests/browser_smoke.py` targets the bundled example. Use task-specific browser checks for other atlases. `evals/cases.jsonl` specifies intended agent behaviour; validating the corpus is not the same as running a model on it. Review reports, screenshots and generated output are excluded from this installable package. Run the commands above to obtain verification results for your environment.

The package intentionally retains one public skill and one authored model. No new diagram engine, dependency, service or agent orchestration framework is introduced.
