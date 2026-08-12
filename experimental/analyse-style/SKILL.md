---
name: analyse-style
description: Build and test a reusable writing-voice skill from an authorised local corpus. Use only when the user explicitly invokes $analyse-style with a target name and source directory. For exact-copy requests, refuse copying and offer an original voice-based alternative.
---

# Analyse Style

Turn an authorised document corpus into a compact `voice-<target-name>` skill for writing, rewriting, editing, and reviewing original prose.

## Invocation

```text
$analyse-style <target-name> <directory> [--author <name|auto>] [--language <language|auto>] [--output <directory>] [--scope <repo|user>] [--update] [--no-install]
```

Require a local source directory. Before reading it, require `<target-name>` to match `[a-z0-9]+(?:-[a-z0-9]+)*`, and require `voice-<target-name>` to be at most 64 characters. Defaults:

- author and language: infer, then report uncertainty;
- output: a new timestamped directory under `<workspace>/.style-analysis/<target-name>/`;
- install scope: the `.agents/skills/` directory under the current working directory from which the skill was invoked.

Treat the supplied source directory as read authorisation for that directory only. Do not fetch more writing or follow a symlink outside it without permission. Never overwrite an existing run. Exclude the output directory, prior analyses, and generated skills from the corpus.

Read [the generated-skill template](references/voice-skill-template.md) before creating the runtime skill.

## Workflow

### 1. Inventory without retaining prose

Recursively inventory candidate paths, file types, sizes, and content hashes. Record included, excluded, duplicate, unsupported, and failed files in `analysis.md`. Do not read document prose in the synthesis context yet.

When attribution, quotations, boilerplate, templates, revisions, or mixed authorship cannot be resolved from metadata, give the candidate files to a fresh curator. The curator returns only inclusion decisions, duplicate/revision groups, and short reasons—never prose excerpts or stylistic observations. If that isolated curation is unavailable, the final result is `insufficient evidence`.

Exclude material not reasonably attributable to the target. Group duplicates and revisions so they cannot count as independent evidence. Do not infer style from filenames.

### 2. Reserve a holdout before analysis

Before extracting or reading prose in the synthesis context, split whole duplicate/revision groups into development and holdout sets. Record the exact assignments in `analysis.md` and do not move documents later.

When the corpus permits, reserve at least 20 percent and at least two independent documents for holdout. If fewer than five independent documents remain, build the skill only if useful but report `insufficient evidence`; do not present it as validated.

Extract and analyse development documents only. Holdout prose is first extracted or opened for the final evaluation and is never used to revise the skill.

### 3. Analyse with three bounded passes

Use fresh subagents in parallel when available:

1. **Voice mechanics:** diction, syntax, cadence, paragraph movement, punctuation, and frequency.
2. **Discourse:** reasoning patterns, openings, transitions, conclusions, reader relationship, and mode differences.
3. **Sceptic:** contamination, counterexamples, generic advice, overfitting, forbidden tics, and traits the target avoids.

Give these agents development material only. If fresh subagents are unavailable, perform separate passes and state that they were not independent.

Every proposed rule must state its frequency, scope or mode, support across documents, and meaningful counterexamples. Retain a rule as core only when at least two independent development documents support it. Mark weaker observations tentative and keep them out of the runtime skill.

### 4. Synthesize the voice card

Write `voice-card.md` as operational guidance, not literary commentary. Include:

- core stance and relationship to the reader;
- structure and reasoning movement;
- sentence, rhythm, diction, and rhetorical tendencies;
- mode-specific differences;
- behaviours to avoid;
- a short final checklist.

Use calibrated language such as `usually`, `sometimes`, and `rarely`. Do not turn tendencies into mandatory tics. Keep all source excerpts, corpus paths, source facts, topics, anecdotes, metaphors, and outlines out of the card.

Draft the card from development evidence. Do not freeze it until the staged forward-test in the next step.

### 5. Build the runtime skill

Create `generated-skill/voice-<target-name>/` using the template and `$skill-creator`. Stage the validated result at `<output>/evaluation-workspace/.agents/skills/voice-<target-name>/` so a fresh session launched from `evaluation-workspace` can discover it. The generated skill must:

- contain only `SKILL.md`, `agents/openai.yaml`, and `references/voice-card.md` unless another file has a demonstrated need;
- require explicit `$voice-<target-name>` invocation;
- preserve user-supplied facts, claim status, ownership, uncertainty, intent, audience, and constraints ahead of voice;
- create original structure and wording;
- never claim that the target authored the output;
- never read or retrieve the source corpus at runtime.

Run the skill validator from `$skill-creator`. Fix structural failures before evaluation.

Before opening holdout material, forward-test the staged skill on three source-independent briefs. Include at least one brief that distinguishes a desired property from an underspecified mechanism and one that distinguishes a proposal from a decision. When fresh subagents are available, compare matched conditioned and baseline outputs with three blind reviewers. Revise one development-supported defect at a time, then restage and revalidate. Freeze when every conditioned output is usable and no reviewer-majority blocking defect remains; do not tune merely to win preferences or match surface counts. If the profile does not converge, report `insufficient evidence`.

### 6. Evaluate once on holdout

Use at least three cases drawn from at least two holdout documents:

1. Have a fresh neutraliser convert each authentic passage into a brief containing only the purpose, audience, constraints, speaker authority, and supplied claims. Label claims as observed, assumed, required, proposed, decided, excluded, or open when applicable, and distinguish supplied enforcement facts from desired properties. Remove source wording, order, examples, metaphors, and rhetorical packaging.
2. Give the brief to two fresh writers with the same model and constraints. Launch the conditioned writer from `evaluation-workspace` and invoke the staged skill as `$voice-<target-name>`; do not substitute pasted instructions. Run the baseline without that invocation. Writers must not receive authentic holdout prose. A discovery or loading failure fails the evaluation.
3. Randomly label the two candidates. Give a fresh judge that generated neither candidate the neutral brief, authentic passage, and labeled candidates; keep the label mapping outside its context. Judge voice preference, claim-status and authority fidelity against the brief, and any material caricature.
4. Separately check factual and epistemic-status fidelity. Treat an assumption stated as fact, requirement stated as implemented behavior, proposal stated as a decision, open question silently resolved, mechanism name stated as proof of a property, or unsupported collective authority as a material failure. Compare each conditioned candidate against every included source document for suspicious phrase, anecdote, metaphor, or structural reuse. Use local text search plus manual contextual review and record the checked scope.
5. Save briefs, candidates, label mapping, blinded judgments, originality review, supplied writer inputs, known file access, and limitations in `evaluation.md`.

Call the result `pass` only when the conditioned candidate is preferred more often than the baseline, no material factual, status, authority, copying, or caricature failure occurs, and all three cases are usable. A tie, fewer than three usable cases, writer exposure to authentic passages, a provenance-aware judge, or a missing all-corpus originality check is `insufficient evidence`.

Fresh context is only procedural isolation unless the host restricts or traces filesystem access. Record the actual control and never claim that files were inaccessible without capability evidence. If writers access authentic passages, the result is `insufficient evidence`; when access cannot be traced, report that limitation with the smoke result.

This is a corpus-specific smoke evaluation, not proof of authorship, indistinguishability, or statistical generality. Do not revise against holdout failures in the same run. Report them and leave the skill uninstalled.

### 7. Install and report

Unless `--no-install` is set, install a passing skill at:

```text
repo: <invocation-cwd>/.agents/skills/voice-<target-name>/
user: $HOME/.agents/skills/voice-<target-name>/
```

Resolve the selected install root and target parent first. Require both the lexical and resolved target to stay inside that root. Refuse an existing symlink at the target. Do not overwrite an existing skill without `--update`. With `--update`, copy the previous skill into the run directory before replacing only that target. Validate the installed copy.

Required run output:

```text
<output>/
├── analysis.md
├── voice-card.md
├── evaluation.md
├── evaluation-workspace/.agents/skills/voice-<target-name>/
├── generated-skill/voice-<target-name>/
└── previous-skill/voice-<target-name>/   # only for --update
```

Report the corpus counts and exclusions, development/holdout split, three analysis passes, generated and installed paths, validation commands, evaluation result, and material limitations. Never claim a check passed unless it ran.
