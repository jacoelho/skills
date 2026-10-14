# Vale surface review

Use Vale after reader and fidelity review have repaired substantive defects.
The prose owner adjudicates findings and edits; lint is neither an independent
reviewer nor evidence of explanatory completeness. Keep reports outside the
article and out of an isolated reader review's first packet.

## Select configuration

Inspect an existing project's Vale configuration and effective rules first.
Pass that configuration explicitly; preserve its files and requested language.
Do not replace it with this skill's presets or run `vale sync` unless its
declared packages require it.

Without a project configuration, use the bundled article profile. It checks
repetition, a few plain-language phrases, long sentences and narrow production
residue patterns. It selects no spelling variant, terminology policy,
requirement-wording rules or readability score. Use the British article profile
only when British English is selected. Preserve official names and exact
quoted wording; do not infer a global language default from the bundle's name.
The supplied technical-document and metrics profiles are alternatives for an
explicitly requested check, not new ghostwriting routes.

## Run the current document

The bundled profiles are tested with Vale 3.24.0. The helper requires an
existing document and configuration, excludes user-global configuration and
limits each run to 60 seconds. It emits raw Vale JSON and preserves diagnostics:

The bundled fallback applies to lowercase Markdown extensions. For a plain-text deliverable, check
a working Markdown copy containing the same prose, or supply a project
configuration that covers its actual format. An explicit project profile must
have rules enabled for the selected file; status 0 alone cannot establish that.

```sh
python3 /path/to/ghostwriter-orchestrator/assets/vale/scripts/lint.py \
  /path/to/current-article.md > /path/to/working-lint.json

# Existing project configuration takes precedence when supplied.
python3 /path/to/ghostwriter-orchestrator/assets/vale/scripts/lint.py \
  --config=/path/to/project/.vale.ini /path/to/current-article.md

# British fallback, when requested and no project profile applies.
python3 /path/to/ghostwriter-orchestrator/assets/vale/scripts/lint.py \
  --british /path/to/current-article.md
```

Resolve `/path/to/ghostwriter-orchestrator` from this skill's installed location.
Inspect the effective rules with `vale --no-global --config=... ls-config` when
adopting or changing a profile. The British profile needs its pinned dictionary;
verify it with `assets/vale/scripts/setup-dictionary.py --check`, or install it
with the same script without `--check`. The dictionary and its licence stay
beside the styles. Install Vale through the host's supported tooling when the
task authorizes setup; never claim a missing tool ran.

Exit 0 permits warnings and suggestions; exit 1 means lint errors were found;
exit 2 means the check did not run reliably. Read diagnostics and the JSON,
rather than treating an empty report file or status 0 as proof of clean prose.
Do not suppress failures with `--no-exit` or `|| true`. If Vale cannot run,
continue the semantic and manual surface checks; report the limitation
separately when the requested deliverable requires tool verification.

## Adjudicate, then recheck meaning

Accept only findings that identify a defect in this text. A long-sentence
threshold is an inspection cue; it does not require splitting a useful
sentence. A numerical readability estimate does not set an audience or a
quality target. Retain deliberate repetition, precise terms and useful
qualifications. Never invent an acceptance target, replace normative words,
strengthen certainty or alter a quotation to clear an alert.

Use code spans for actual identifiers, not ordinary prose to hide findings.
If a protected quotation triggers irrelevant alerts, retain its exact wording
and reject the finding. A narrow local suppression may be used in a project's
working source when needed; keep suppression annotations out of a deliverable
that does not request them. Prefer a small, justified project vocabulary to
blanket whitelists. The bundled patterns miss indirect conversation leakage;
the fidelity review still owns that check.

After accepted edits, recheck the affected claims, qualifications, quotations
and neighboring connections. Run Vale once more on changed text within the
existing repair budget. Unchanged preferences need no repeated lint loop.
Return the article alone unless a requested audit or material limitation needs
a separate report.
