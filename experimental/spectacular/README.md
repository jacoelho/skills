# Spectacular skills

Four standalone skills for clarifying, writing, reviewing, and illustrating the
EARS contract for the next bounded change. Choose the skill that answers the
current question; the suite does not prescribe a sequence of approvals.

| Skill | Use for | Result |
| --- | --- | --- |
| [spectacular-spec-grilling](spectacular-spec-grilling/SKILL.md) | Consequential requirements questions | Decisions and unresolved questions in the working record |
| [spectacular-spec-writing](spectacular-spec-writing/SKILL.md) | Creating or changing a capability contract | Settled obligations and their acceptance basis |
| [spectacular-spec-review](spectacular-spec-review/SKILL.md) | Auditing a contract or reconciling it with evidence | Findings, concrete counterexamples, and the next decision or repair |
| [spectacular-bdd-gherkin](spectacular-bdd-gherkin/SKILL.md) | Discovering or expressing behavioural examples | Scenarios linked to rules, with unanswered cases kept explicit |

## Install

From this repository's root, copy the desired skill directories into the target
project's `.agents/skills/`. Copying all four keeps the related workflows available:

```sh
mkdir -p /path/to/project/.agents/skills
cp -R experimental/spectacular/spectacular-* /path/to/project/.agents/skills/
```

Each directory includes its own references, templates, and any scripts it needs.
Keep that directory intact when installing an individual skill. The bundle README
is for people maintaining or choosing the skills; it is not a runtime dependency.

## One requirement syntax

[EARS requirements and terms](spectacular-spec-writing/references/ears.md) is the
authoritative grammar and glossary. Every locally authored requirement and
invariant uses one complete EARS sentence. Its patterns distinguish ubiquitous
obligations, events, ongoing states, unwanted conditions, configured features,
and combinations. Repository conventions may change document layout, not the
requirement syntax.

Grilling identifies unresolved EARS clauses and meanings. Writing records settled
EARS obligations. Review assesses syntax and meaning separately. Gherkin,
acceptance tables, and diagrams illustrate requirements by reference; they do not
define another contract. External governing sources retain their original wording
and authority. Permissions retain their bounds when translated to EARS.

The writing skill owns `references/ears.md`. The other three skills contain
generated, byte-identical local copies so each installed directory remains
self-contained. Edit the writing copy, then synchronise and check from this
repository's root:

```sh
python3 experimental/spectacular/scripts/sync_ears.py
python3 experimental/spectacular/scripts/sync_ears.py --check
```

Generated copies are distribution artifacts, not independent definitions. A
required shared sibling would break individual installation and the evaluation
runner's isolated skill payloads; generated copies preserve those boundaries.

## Choose the next action

An ordinary defect under a justified, settled contract needs investigation,
repair, and relevant checks. Use clarification when the expected result is
undecided. Use a bounded experiment when evidence is needed before making that
decision. Write or revise a contract when the intended obligation changes.

For example:

```text
Use $spectacular-spec-grilling to resolve when access revocation should affect
invoice downloads. Read the current access contract and decision notes first.

Use $spectacular-spec-writing to record the settled download rule in the
existing capability spec. Keep unresolved export-format questions in the task.

Use $spectacular-spec-review to compare the download contract with the API,
direct-link path, and available checks. Return findings without editing files.

Use $spectacular-bdd-gherkin to write examples for the settled download rule.
Identify the boundary each example must exercise and what remains unverified.
```

## Keep authority and evidence connected

Each active obligation has one maintained home. Link scenarios, tasks, and checks
to that home. Keep open questions and superseded decisions in the existing task,
pull request, or history. Identify whether a rule governs the target release, a
deployed version, or a transition when those differ.

Examples describe expected behaviour. Executed checks establish observations
about a particular contract, code state, and environment. Neither agreement among
reviewers nor a structurally valid document establishes that a requirement meets
the underlying need.

The [specification linter](spectacular-spec-review/references/lint-format.md)
enforces EARS lexical syntax, declaration layout, and local references in active
documents. Syntax violations fail for both proposed and accepted requirements.
Semantic correctness, implementation conformance, and acceptance remain separate
assessments. For the worked example, run from this repository's root:

```sh
python3 experimental/spectacular/spectacular-spec-review/scripts/spec_lint.py experimental/spectacular/examples/invoice-download --strict
```

## Development and evaluation

The [invoice download example](examples/invoice-download/README.md) connects a
distinguishing question, an authorised decision, the maintained contract, an
independent acceptance oracle, executed callable checks, and a fresh-context
handoff. Its deliberately wrong control demonstrates what the checks reject.
It is invented development data, not a production policy or an unseen benchmark.

Behavioural evaluation separates actor inputs from assessment criteria, compares
skill application with a fixed-host baseline, and records failures and unavailable
evidence. Routing judgments are distinct from native host discovery. Installation
checks and behavioural results establish different claims; neither a clean
linter nor reviewer agreement proves the skills effective.

Local evaluation artifacts under `evals/`, when available, record the earlier
iteration's results, source hashes, and limits. They are excluded from this
distribution. Those behavioural results precede the EARS rewrite and do not
validate the revised payloads.

The examples and any local evaluation tools stay outside installed skill payloads.
The four runtime skills retain their own resources and optional sibling
fallbacks. Additional runtime delegation needs a concrete review question and
evidence that its benefit justifies its cost; the development review panel is
not a required workflow for ordinary invocations.

## Design sources

These sources informed the skills. Consult them when revising the workflow;
ordinary use follows each skill's local instructions and relevant references.

- OpenAI: [Skill and prompt guidance](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra), [Build skills](https://learn.chatgpt.com/docs/build-skills), [Prompting](https://learn.chatgpt.com/docs/prompting).
- [Spec-driven development without waterfall](https://www.jacoelho.com/blog/2026/09/spec-driven-development-without-waterfall/).
- [Writing specifications for coding agents](https://www.jacoelho.com/blog/2026/09/writing-specifications-for-coding-agents/).
- [BDD and acceptance evidence for coding agents](https://www.jacoelho.com/blog/2026/09/bdd-and-acceptance-evidence-for-coding-agents/).
- [Reviewing agent work and correcting specifications](https://www.jacoelho.com/blog/2026/09/reviewing-agent-work-and-correcting-specifications/).
- [An invoice export walkthrough](https://www.jacoelho.com/blog/2026/09/spec-driven-development-an-invoice-export-walkthrough/).
- [Keeping specifications in the change review](https://www.jacoelho.com/blog/2026/09/keeping-specifications-in-the-change-review/).
- [Spec tools and hooks](https://www.jacoelho.com/blog/2026/09/spec-tools-and-hooks-what-they-automate/).
