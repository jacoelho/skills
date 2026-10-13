# Evaluation guide

The [12 cases](cases.json) are authored evaluation scenarios, not a claim that an
agent has passed them. Use fresh agent contexts and the same available repository,
tools, and permissions when comparing a baseline against the skill.

For each case, supply the prompt and make the skill available. Evaluate the response
against every `must` and `must_not` condition. Record concrete response excerpts,
artifacts, commands, and tool outputs rather than an impressionistic overall score.
Do not treat matching keywords as proof of reasoning or correct code.

## Pass criteria

A case passes when it meets the material positive expectations, violates none of
the prohibitions, and its caller examples support its recommendation. Mark missing
environment evidence as unavailable rather than pretending a compilation happened.
A correctness, compatibility, permission, or fabricated-evidence failure blocks the
case even when the response is otherwise persuasive.

Also assess whether the response did unnecessary work. A 2,000-word framework for
the simple-helper case is a regression, not a bonus for detail. No-change cases are
important for detecting agents that rewrite everything into a favoured pattern.

## Recommended comparison

Run a baseline prompt and the skill-assisted prompt on the same cases. Compare
contract gaps discovered, caller-code correctness, unjustified API changes, scope
control, and evidence honesty. Re-run after material edits to the skill. Keep
observations separate from conclusions and avoid claims of statistical improvement
from a single run.

## Executable contract probes

The `probes/` directory is an independent, standard-library-only Go module. Its
three tests demonstrate specific pitfalls used in the design questions: one-value
versus whole-input JSON parsing, strictness at a custom-unmarshal boundary, and
function-type incompatibility after adding a variadic argument.

Run from this directory:

```sh
cd probes
go test ./...
```

These are **not agent evaluations**, not a replacement JSON library, and not tests
of the hypothetical document parser in the worked example. The JSON tests
intentionally demonstrate behaviours of the established `encoding/json` API.
Run on the exact project toolchain when using them as project-specific evidence.
The checked bundle's results are recorded in [validation.md](validation.md).
