# Spectacular skills

Four standalone skills for clarifying, writing, reviewing, and illustrating the
contract for the next bounded change. Choose the skill that answers the current
question; the suite does not prescribe a sequence of approvals.

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

The optional [specification linter](spectacular-spec-review/references/lint-format.md)
checks the bundled identifier and reference notation. It does not establish
semantic correctness, implementation conformance, or acceptance.

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
