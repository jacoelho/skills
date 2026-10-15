# Validation, repair and delivery

Use this reference when validating, building or handing off an atlas. The bundled schema owns JSON shape; the Python script checks cross-references, sources and finite replay. Neither proves that a cited source supports its explanation.

## Prerequisites and paths

Resolve the installed skill directory from `SKILL.md`; do not rely on the current working directory or a fixed home path. Set `ATLAS_SKILL`, `MODEL`, `REPO` and `OUTPUT` to concrete paths. The examples quote each argument so spaces in paths work.

`atlas.py` declares Python 3.10+ and `jsonschema==4.26.0` in inline script metadata. uv may download Python or dependencies on first use; follow the environment's permission policy. Validation does not execute the target repository or fetch remote schemas. Build additionally requires the native Graphviz `dot` program. The resulting HTML has no runtime dependency on uv, Graphviz, a server or an external asset.

Use the existing dependency environment when authorised and available, recording that choice. If installation or native tools are unavailable, preserve the model and completed checks. Do not label the dependency setup verified or provide a fabricated render.

## Ordinary authoring

```sh
uv run "$ATLAS_SKILL/scripts/atlas.py" validate "$MODEL" --repo-root "$REPO" --json
uv run "$ATLAS_SKILL/scripts/atlas.py" build "$MODEL" --repo-root "$REPO" --output "$OUTPUT" --json
```

Validation checks schema, relationships and scenarios. With `--repo-root`, it checks local pinned Git file objects, line ranges and optional hashes. It neither checks the working tree nor downloads the repository. External evidence URLs are not fetched by this command. Without a local repository, omit `--repo-root` and keep that check's `not_run` status.

For a request limited to JSON shape:

```sh
uv run "$ATLAS_SKILL/scripts/atlas.py" validate "$MODEL" --schema-only --json
```

Do not combine `--schema-only` with `--repo-root` or describe its success as graph/source validation. Normal `validate` already includes schema validation; a separate `schema-check` is unnecessary for each candidate.

## Local repairs

Read `ok`, the exit status and each diagnostic's `code`, `path`, `subject`, `message` and `fix`. The path is a JSON pointer, not a filesystem path.

For example, `model.endpoint` at `/relations/0/to` means an endpoint ID cannot be resolved. Inspect the intended target and repair that reference. Adding a fabricated component or deleting a meaningful edge merely to get a pass is not a repair.

An unsupported property should be expressed using an existing supported field when possible. Change the schema or renderer only for an actual missing capability the task requires. Re-run validation after changing the model. Repeated identical diagnostics call for investigating the cause, not a fixed number of blind retries or adding tools.

Keep the schema and model unchanged while fixing an environment failure. A non-zero build followed by inspecting the old output proves nothing about the failed candidate.

## Publication

`build` renders every view before publishing, atomically replaces individual files, and publishes `index.html` last. An export directory is not a multi-file transaction. Sidecar failures can leave mixed export versions; obsolete sidecars are not deleted automatically. Use a fresh output directory for a publishable bundle.

Retain `model.json` and `diagrams/*.dot` / `diagrams/*.svg`. Edit the authored model, not the embedded generated payload. Exact output depends on the renderer, Graphviz and fonts; identical builds under the same toolchain can be compared byte-for-byte.

## Browser and visual checks

Open the exact latest successful HTML, preferably via `file://`. Verify the connected reading path, selection, return navigation, search and any scenario controls. Test relevant desktop/intermediate/mobile sizes (1440, 1024 and 390 pixels are useful starting widths), keyboard operation and reduced motion. Keep page overflow separate from deliberate scrolling inside a large diagram.

Inspect screenshots for clipped or unreadable labels and ambiguous relationships. Automated browser checks and perceptual review are different evidence. A fallback such as in-memory loading must be reported as that fallback, not as a successful file-delivery test.

The supplied command is a regression test of **the bundled reference example**:

```sh
uv run "$ATLAS_SKILL/scripts/atlas.py" build "$ATLAS_SKILL/examples/reference-skill.model.json" --output example-output --json
uv run "$ATLAS_SKILL/tests/browser_smoke.py" example-output/index.html --output browser-report
```

It declares `playwright==1.57.0` and needs an existing Chromium installation. It does not install a browser. Use `--browser /absolute/path/to/chromium` where needed. `--mode memory` is an explicit restricted-environment fallback. For an arbitrary atlas, use the task-specific browser checks above or adapt the fixture's assertions; do not claim the example-specific script validates it generically.

## Coverage summary

Report schema, model, source integrity, build, browser and visual review separately. Describe semantic source review in prose, since the CLI does not implement it. `not_run` is not a pass. Test results or screenshots from an earlier revision do not establish coverage of changed files.

A suitable handoff states: artifact paths; pinned source and scope; a reading route; validation outcome; material unknowns; browser/visual coverage and limitations. Match the user's requested scope: a validation-only request needs a report, not a new HTML artifact.

## Maintenance only

After editing the schema, script or skill, run:

```sh
uv run "$ATLAS_SKILL/scripts/atlas.py" schema-check --json
uv run "$ATLAS_SKILL/scripts/atlas.py" test
```

Use [the evaluation guide](../evals/README.md) for prompt-level changes. Passing Python tests proves deterministic checks, not model activation or agent performance.

A network-enabled maintainer can create and commit script lockfiles:

```sh
uv lock --script "$ATLAS_SKILL/scripts/atlas.py"
uv run --locked "$ATLAS_SKILL/scripts/atlas.py" test
```

The package pins direct dependencies but ships no transitive lockfile. Do not treat that as a fully locked environment.
