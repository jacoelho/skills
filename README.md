# jacoelho

A Claude Code plugin with my personal skills, subagents, workflows and hooks. This repository is both the plugin and its marketplace.

Skills live in `skills/`, agents in `agents/`, workflows in `workflows/`, hooks modules in `hooks/`, and tests in `tests/`. Everything is namespaced by the plugin name: skills and workflows run as `/jacoelho:<name>` and agents are `jacoelho:<agent>`.

## Prompt intake

The plugin's `prompt.submit` hook (`hooks/prompt-intake/`) sorts a message before it is sent, when you ask for it: start a message typed at the terminal with `intake:`. Every other message is sent as typed.

1. It holds the message and makes one call to the session's current model to sort it into Goal, Facts and Asks and list every ambiguity.
2. It asks about up to 4 ambiguities in the question dialog, the option the rest of your message best supports first and marked (Recommended), then makes one more call to work your answers in. Questions still open are kept under Facts, marked `[unresolved]`; content that fits no section is marked `[unsorted]`. A question the model could not offer options for is kept as `[unresolved]` too.
3. It drops the original and puts the clean version in the prompt box, keeping anything you typed meanwhile. Edit it and press Enter to send.

Fenced blocks (```` ``` ```` or `~~~`) are pasted content: the model sees a `[[paste-N]]` placeholder instead, and the clean version gets each block back unchanged where the model placed it, or under a closing Pasted section if it placed none. A long log in a fence costs intake nothing. When the text outside fences is over 8,000 characters, intake sends the message as typed, without the marker, and says so; so it does for a message with attachments. Slash commands, Remote Control and other sessions' messages, and `-p` runs pass through. Set `intake_effort` in `/config` (`low` by default; `medium`, `high`, `xhigh` or `max`) for how hard the model thinks while sorting. Thinking counts toward the reply cap, so the cap grows with effort: 4,096 tokens at `low`, 8,192 at `medium`, 16,384 above. The API reserves the cap against your output-token rate limit when the request starts, so higher levels are slower and more likely to hit a 429. If you dismiss a question, press Esc, or the model call fails (a rate limit included), the message goes back in the prompt box without the marker, so Enter sends it as typed.

## Context handoff

`hooks/handoff/` writes a handoff of a long chat so the work can continue in a fresh context instead of a compacted one. The model that writes it is a fork of the main thread: it sees the whole conversation and reads it from the prompt cache. It re-sends the last request, so it does not see the final assistant reply.

- **Offer:** after each turn, once the context reaches a percentage of the session's auto-compact threshold (the model's window when auto-compact is off), a row above the prompt box offers Write handoff or Not now. Not now keeps it away until the context drops below that point again.
- **Write:** the Write handoff button or `/handoff` saves the handoff to `<save folder>/<date>-<title>.md`, with common token formats (API keys, JWTs, private keys, bearer tokens) removed; a free-form password is not caught. That row then offers Continue fresh (runs `/clear` and sends the handoff as the first prompt; shown only while no turn runs), Copy and Close.
- **On compaction**, in `handoff` mode, manual and auto compaction write a handoff and the transcript becomes that message, followed by the newest assistant message and anything after it, which the fork did not see. Subagent compactions and idle precomputes always use Claude Code's own compaction, as does any compaction whose handoff fails; `handoff.log` in the save folder records why.

Set these in `/config` (stored under `pluginConfigs` in `settings.json`):

| Option | Default | Meaning |
|---|---|---|
| `handoff_offer_at` | `70` | Percent of the auto-compact threshold at which the row above the prompt box offers a handoff; `0` turns the offer off |
| `handoff_on_compact` | `core` | `core`: Claude Code compacts as usual. `handoff`: compaction becomes a handoff |
| `handoff_prompt_file` | bundled | The prompt, a plain text file; `{{cwd}}` is its one placeholder, and an unknown one fails with the file and placeholder named |
| `handoff_dir` | `~/.claude/handoffs` | Where handoffs and `handoff.log` are saved |

The bundled prompt is `hooks/handoff/prompts/handoff.md`; edit it in place or point `handoff_prompt_file` at your own copy.

## Architecture remediation workflow

`/jacoelho:architecture-remediate` fixes architecture findings end to end. Each round reviews with `/jacoelho:architecture-review`, plans the fixes, has `jacoelho:consultant` agents challenge the plan, implements it in batches, verifies, runs `jacoelho:critic` on the diff, and checks each fix. Each later review covers only the previous round's changes and the code that uses them, because earlier rounds' fixes are already proven or still open in the ledger. When such a review is clean, one review of the whole diff against `baseRef` must also be clean before the run stops; it catches defects that only appear where rounds interact. The run stops once no Critical, High or Medium finding is open. A `followUpScope` you pass replaces both kinds of follow-up review. Each review's `history` entry records its scope: `initial`, `round`, `full` or `caller` (your `followUpScope`).

A finding counts as fixed only when its acceptance check proves it. The plan gives each finding a command, usually a test the fix adds, that must exit 0 once the defect is gone. After the round, the command must fail on the tree as it was before the round, with the round's tests copied in, and pass on the tree now. A test command that selects no test proves nothing. The workflow takes that before-tree as a snapshot at the start of each round, an unreferenced commit made through a temporary index, so your index and working tree are untouched. A planned finding that is not proven fixed stays open into the next round even if the next review does not raise it again. A later review can reopen a proven finding only by naming what its check misses.

The run stops after the round-1 plan by default and returns it as `checkpoint`, because that plan holds the run's costliest decisions. Review it, edit it if you want, and continue with the same arguments plus `"approvedPlan": <checkpoint>`; round 1 then implements that plan without reviewing or planning again. Pass `"autoApprove": true` to run unattended.

`consultantModel` (default `opus`) sets the model of the `jacoelho:consultant` plan reviewers; `""` uses the agent definition's model. Consultants receive each finding's id, severity, title, location and impact, not its evidence: they read the cited code themselves. The planner checks its own draft against the testing criteria and the consultants' questions before they see it.

Pass a scope, and optionally `instructions`, free text every stage that judges or edits must follow:

```text
/jacoelho:architecture-remediate internal/billing
/jacoelho:architecture-remediate {"scope": "internal/billing", "instructions": "keep the v1 wire format"}
/jacoelho:architecture-remediate help
/jacoelho:architecture-remediate {"scope": "internal/billing", "reviewOnly": true}
```

`reviewOnly` runs one review split across agents and edits nothing: the way to review a scope too large for a single `/jacoelho:architecture-review`. The skill owns the review method and the roles each agent takes (Scope, Group review, Merge); the workflow decides how many agents run and which boundaries each gets.

The scope is required, because a run edits the working tree: a bare call, `help` or an unknown option starts no agents and returns the option list instead. The run never commits. It returns `tree` (`untouched`, `verified`, `failing`, or `unverified` when it stopped mid-round) and `next`, which says what to do about that state, plus planned findings not proven fixed (`unresolvedFindings`), critic findings it could not resolve, and any round whose hot-path changes have no benchmark comparison (`unmeasured`). Each round's `history` entry keeps the perf result, every verify-fix and critic-fix outcome, and each acceptance check with its verdict; the critic gets at most two fixes, and the last one is always reviewed again; while it runs, `/workflows` shows one line per agent outcome. Benchmarks run once per round, in the perf step: verification judges exit codes only, and fix agents are told not to rerun the suite. Asking in plain language works too; Claude builds the arguments. The defaults assume a Go repository.

A run is costly, and the cost follows the number of rounds, not the size of the scope: each round is a review, a plan, consultants, implementers, a verification, a critic and an acceptance run. Two runs on a 20,000-line repository used 76 agents, 7.4 million tokens and 6.2 hours for four rounds, and 61 agents, 5.9 million tokens and 4.4 hours for three. To spend less, pass `maxRounds` 1 or 2 and `reviewers` 1, set a token target, and point `baseRef` at a commit that already holds earlier remediation, because the review before a clean stop covers the whole diff against `baseRef`. With a token target, the run stops before a round it cannot finish, counting the two reviews that follow it, and before any review it cannot afford; `next` then says what was left unreviewed. The result's `next` asks the calling session to report agents, tokens and running time with the result; `cost` holds the reviews and rounds the script counted.

## Spec implementation workflow

`/jacoelho:spec-implement` turns one or more spectacular contracts into working, tested code, and edits the working tree without committing. `/jacoelho:spectacular-spec-implementation` owns the method; the workflow runs it for long or unattended work, and a normal session can follow the skill directly for small changes. It depends only on the spectacular skills.

1. **Plan**: map each requirement against the code and tests, design which module owns what and the seams between them, stack the changes so each builds on the last, design the edge cases, and split each change into units sized for one agent. The plan is written to `<capability>.implementation.md` next to the contract.
2. **Tests**: per change, write the failing tests and confirm they fail for the right reason.
3. **Implement**: run units in waves, in parallel when they are in different modules and edit different paths. A failing unit gets more attempts, then one on the planner's model, then is blocked; a unit needing a decision outside its rights is blocked at once. Blocked units stop only their dependants.
4. **Verify**: run the repository's checks; a change is accepted when its tests, red after they were written, now pass.
5. **Conform**: check the contract with spec-review and the code against the recorded design; one round of fix units, then the user decides what remains. The review reads every uncommitted change against HEAD, so edits you had before the run are reviewed with it.
6. **Close**: an anchored contract's ACs name their tests; a feature spec goes through its discard gate.

### Before you start

- The contract lints clean with `jacoelho:spectacular-spec-review` and has no open product decisions. Settle those first with `jacoelho:spectacular-spec-grilling`; a requirement the planner finds ambiguous is left out of the plan as spec-blocked.
- Commit or stash your own edits. The workflow never commits, and its review reads every uncommitted change against HEAD, so edits you leave in the tree are reviewed as part of the run.
- After installing or updating the plugin, start a new session. A session whose skill list predates the skill cannot load the method, and the run stops at once with an error.
- Expect roughly 6 to 8 agents per change before its units. For one small change, asking a normal session to follow `/jacoelho:spectacular-spec-implementation` costs less.

### Start a run

Pass one contract path, or an object for several contracts and options:

```text
/jacoelho:spec-implement specs/booking/contract.md
/jacoelho:spec-implement {"contracts": ["specs/booking/contract.md", "specs/stock/contract.md"], "concurrency": 4, "gates": []}
/jacoelho:spec-implement help
```

The planner writes the record to `<capability>.implementation.md` next to the first contract: `specs/booking/contract.md` gives `specs/booking/booking.implementation.md`. With the default gates, the run stops for approval after planning only when the design adds a seam, module or dependency; `"gates": []` runs unattended to the end.

### Stops and how to continue

Every stop returns a `stopKind` and a `next` line saying what to do. The record is the only state, so you can continue in any later session by rerunning with the record path, which also approves the gate the run stopped at:

```text
/jacoelho:spec-implement specs/booking/booking.implementation.md
```

| `stopKind` | What happened | What to do |
| --- | --- | --- |
| `plan-ready` | The design adds a seam, module or dependency. | Read the plan in the record, then rerun with the record path to approve it. |
| `change-ready` | A change was accepted and the `change` gate is on. | Review the diff, then rerun with the record path. |
| `blocked` | A unit needs a decision outside its rights, failed every attempt, or conformance found something for you. | Settle each reason in `next`: a product decision in the decision record, a design change in the record's Design, or a note in the record. Rerun with the record path; the planner reopens the units whose reason is settled. |
| `verify-failing` | The repository's checks still fail after fixes. | Fix the cause or record a decision, then rerun with the record path. |
| `contract-changed` | A contract changed during the run. | Rerun with the record path; the planner re-plans only the affected changes. |
| `spec-blocked` | Every requirement is blocked by a defect in the contract. | Fix the contract with `jacoelho:spectacular-spec-writing`, then start again with the contract path. |
| `budget` | The turn's token target cannot cover the next change. | Rerun with the record path and a larger target. |
| `discard-ready` | A feature spec is fully implemented. | Rerun with the record path to approve discarding it. |
| `error` | A step could not run, for example no check command or a planner that could not load the method. | Do what `next` says, usually pass `verify` or start a new session, then rerun. |
| `done` | Every change is accepted and closed. | Review and commit the tree. Open questions were carried into the capability's decision record. |

A unit interrupted mid-run starts again on resume. Other options set `instructions` for every agent, `concurrency` (units per wave, default 3), `models` per role (planner, testWriter, implementer, runner, reviewer, recorder; a model name, or `inherit` for the session model), `maxAttempts`, the `verify` command and `keepRecord` (keep the record after close instead of deleting it). The result reports the turn's token spend, which includes anything else spent in the same turn.

To set role models once instead of per run, set the `implement_model_*` options in `/config`; they start at the workflow's defaults (planner and reviewer `opus`, runner `haiku`, the rest `sonnet`), and `inherit` uses the session's model. Plugin settings do not reach workflow scripts, so the skill passes the ones you have set as `models` when it launches the workflow; `models` given for a run takes precedence, and invoking `/jacoelho:spec-implement` directly uses only the `models` you pass.

## Install

```bash
claude plugin marketplace add jacoelho/skills
claude plugin install jacoelho@jacoelho --scope user
```

Or declare it in `~/.claude/settings.json`, and Claude Code installs it at startup:

```json
{
  "extraKnownMarketplaces": {
    "jacoelho": { "source": { "source": "github", "repo": "jacoelho/skills" } }
  },
  "enabledPlugins": { "jacoelho@jacoelho": true }
}
```

Update with `claude plugin update jacoelho@jacoelho`, or turn on auto-update for the marketplace in `/plugin`. The plugin has no `version` field, so every commit is a new version.

## Develop

To try uncommitted edits, start a session with `claude --plugin-dir /path/to/skills`. It loads the checkout in place, and `/reload-plugins` picks up further edits. Run `claude plugin validate .`, `claude plugin test .` and `node --test tests/workflows/*.check.mjs` before pushing. Workflow tests run under Node because the plugin test runner imports files as modules, which a workflow script is not.

A machine can also install from the local checkout instead of GitHub:

```bash
claude plugin marketplace add /path/to/skills
claude plugin install jacoelho@jacoelho --scope user
```

That install is a copy in `~/.claude/plugins/cache`, versioned by the HEAD commit. After committing, refresh it with `claude plugin marketplace update jacoelho && claude plugin update jacoelho@jacoelho`.

## Authoring rules

- Agent `skills:` preloads must use the prefixed name (`jacoelho:testing`). A bare name loads a personal skill of the same name from `~/.claude/skills` instead.
- Refer to agents by their prefixed name (`jacoelho:critic`) in skills, agents and `CLAUDE.md`.
- In skill bodies, reference bundled files with relative links, `${CLAUDE_SKILL_DIR}` or `${CLAUDE_PLUGIN_ROOT}`. These variables are not expanded in agent descriptions.
- Keep all referenced files inside the repository. The installed copy holds nothing else.

`CLAUDE.md`, rules, the status line and `settings.json` are not plugin components and are not stored here.
