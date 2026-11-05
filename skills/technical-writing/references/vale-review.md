# Vale review

Vale checks mechanics after substantive repairs. It cannot judge organisation, parallelism, fidelity or indirect leakage, so clean lint proves nothing about them. The writer adjudicates every finding. Keep reports out of the document.

## Select configuration

Use an existing project configuration when there is one, and pass it explicitly. Do not change its files or replace it with the bundled profile. Run `vale sync` only if its declared packages need it.

Otherwise use the bundled profile: British spelling, repetition, plain-language phrases, long sentences and paragraphs, unsupported quality words, vague requirements and production residue, and phrasing typical of generated text (`Register`, suggestions only). If the user or project uses another English variant, pass `--config` with a suitable profile, or disregard `Technical.Spelling` findings for that document.

## Run

Tested with Vale 3.24.0. `SKILL_DIR` is the directory that contains this skill's `SKILL.md`, the parent of this file's `references/` directory.

```sh
python3 "$SKILL_DIR/assets/vale/scripts/lint.py" document.md
python3 "$SKILL_DIR/assets/vale/scripts/lint.py" --config=/path/to/project/.vale.ini document.md
```

The helper reads one existing file, ignores global configuration, stops after 60 seconds and writes Vale JSON to stdout.

| Exit | Meaning |
| --- | --- |
| 0 | No lint errors. Warnings and suggestions may be present, so read the JSON. |
| 1 | Lint errors. In the bundled profile, this is only a leftover `[[TODO]]`-style marker. |
| 2 | The check did not run reliably. Read stderr. This is never a clean result. |

The bundled profile needs a lowercase Markdown extension. Lint a PR description or other unsaved text by writing it to a temporary `.md` file. With a project configuration, confirm that rules apply to the file, because exit 0 alone doesn't show that they do.

The British dictionary ships with the bundle. `python3 "$SKILL_DIR/assets/vale/scripts/setup-dictionary.py" --check` verifies it. Do not suppress failures with `--no-exit` or `|| true`.

If Vale is missing, or exit 2 persists, carry on with manual checks and report that Vale did not run. Never claim that it ran. Install Vale only when the task authorises setup.

## Adjudicate

Accept a finding only when it identifies a defect in this text.

- Treat a long-sentence alert as a cue to inspect structure. It doesn't require a split.
- Treat a long-paragraph alert as a cue to look for a turn in the argument. Break there; if there is none, leave the paragraph whole.
- Keep deliberate repetition, precise terms and useful qualifications.
- Never change meaning, certainty, normative words such as `must` or `should`, quotations or exact identifiers to clear an alert.
- Never invent a target or mechanism to clear `Requirements.VagueRequirement` or `Clarity.UnsupportedQuality`. Report the gap or cut the adjective.
- Treat a `Register` finding as a cue, not proof. Rewrite only when a plainer statement of the same fact exists; never swap in a synonym to clear the alert. Several in one paragraph point to a section that needs redrafting from the facts.
- Use code spans for real identifiers, never to hide findings.
- Add a term to a project vocabulary only when it is correct and the project owns that vocabulary.

After accepted edits, recheck the affected claims and neighbouring sentences, then run Vale once more within the repair budget. Unchanged preferences need no further lint loop.
