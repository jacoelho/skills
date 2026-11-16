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

## Comment policy

`hooks/comment-policy/` holds Claude to a comment policy: no comment by default, doc comments on public API where the language expects them, and no comment that restates the code. It is off by default. Set `comment_policy` in `/config` after installing `ast-grep` (`brew install ast-grep` or `npm i -g @ast-grep/cli`):

- `on`: the policy is added to every session's and subagent's context, and each turn's comments are reviewed.
- `review`: comments are reviewed, but nothing is added to the context. Use it when the policy already loads another way, such as a rules file.

With `on`, the policy text, `hooks/comment-policy/policy.md`, is added to the context of every session and subagent. Because a rule in context can still be ignored, the end of each main-loop turn also reviews the comments Claude added and sends the turn back once with any that break the policy.

- **What is reviewed:** comments Claude's turns wrote, in the main loop and in subagents. When a turn begins and no other turn is open, the hook records the commit checked out and the content of every reviewed file that differs from it, tracked or not, unless git ignores it. At the end of every turn, whether it answered, was interrupted or failed, it records them again, compares each changed file's two versions, and keeps the comments the turn added for review. A commit, a merge conflict or a sparse checkout in between makes no difference, and edits made with Edit, Write or a shell command count alike.
- **What is not the turn's:** comments already in the working tree when the turn began, committed or not; a comment whose text was in a line the turn removed, such as a `# noqa` on an edited import or a comment moved elsewhere; and, when the turn adds a line to an older comment block, the block's older lines.
- **When:** comments are judged at the end of each main-loop turn, the Stop, with those any subagent wrote since the last one; a subagent's comments are sent back to the main loop. A turn's Stop runs before its end event, and a turn sent back continues as the same turn, which ends after its second Stop; an interrupted turn ends with no Stop. A turn this hook already sent back once ends without another review; what it wrote while fixing is judged at the next prompt's Stop, and so is what an interrupted turn wrote. Edits the user makes while no turn is open are never reviewed. While the main loop is idle and background subagents run, a subagent that changed files only through Edit, Write or NotebookEdit is credited with the files those tools named, and the user's edits elsewhere are not reviewed; once a subagent runs a shell command or another tool that can write anywhere, the user's edits during its turn are counted as its own, and so are they while any such tool is still running.
- **Once:** each comment is reviewed once; one judged by a Stop that was interrupted before its findings reached Claude is judged again. A comment kept on purpose therefore does not stop every later turn. The fingerprints of reviewed comments are kept in the plugin's store, up to the newest 5,000, so a later session in the same repository does not review them again; when the store cannot be read, nothing is written to it.
- **Cost:** each turn end runs `git status`, hashes only the files whose size or modification time changed since they were last hashed (a file modified within 2 seconds of its hashing is hashed again, as git does), compares the changed files, and scans those with added lines. A collection gives up after 4 seconds of the engine clock and the next one covers its changes. A hook waiting behind other collections may spend its 10-second budget on the wait; a turn start that runs out collects the turn's changes from the last collection instead of starting afresh, so its first writes are kept. In the plugin test harness the wait did not use up the budget while the queued git calls ran. At most one collection runs and one waits, so a burst of subagent ends costs two.
- **Your index is untouched:** the hook reads the working tree with `git status --no-optional-locks` and `git hash-object`, never through an index. `hash-object` writes the changed files' blobs to the repository, which `git gc` removes.
- **How:** `ast-grep` finds the comments in Go, Rust, TypeScript, JavaScript and Python files, using the rules in `hooks/comment-policy/rules/`. Adjacent whole-line comments are one block. Doc comments that the language's convention expects are exempt:
  - Go: the comment above the package clause, a declaration group holding an exported name, or an exported name, and a line comment after an exported name;
  - Rust: docs on `pub` items, the variants of a `pub` enum and the items of a `pub` trait;
  - JavaScript and TypeScript: a `/** */` block above an exported declaration, or above a public member of an exported class or interface, with decorators allowed between them.

  Python comments, `export { a, b }` lists, `module.exports` and `export default` of an anonymous value have no exemption; the judge applies the policy to them. Comments a tool reads are never judged: build, lint, format, coverage, type-check and bundler directives, SPDX licence lines, and a Go example's `Output:` block. A TODO without a tracking reference and a linter suppression without a reason are reported without a model call; the finding shows the reason form the check accepts, such as `# noqa: E402  # reason`. The other comments go to Haiku with the policy and the code around each comment, in batches of 15, three at a time, up to 45 per review; the rest, and any batch the judge did not answer, wait for the next review. A waiting comment the user rewrites or deletes leaves the queue. Each finding must quote, from the source lines shown, the code the comment restates or the words that break the policy; a finding without such a quote is dropped. The judge's note is passed on as a quoted remark, since the judge read text that anyone with commit access could have written; this limits, but does not remove, the risk of a comment steering the agent through it.
- **Failure:** outside a git repository, without `ast-grep`, or when git or the scan fails, the review is skipped and the status line says why once; a failed or slow collection is retried by the next one, and the turns it covered stay open until then, so their changes are still credited to them and a new prompt does not discard them. A file that cannot be compared is skipped and counted. Generated Go files and turn ends with more than 200 changed files are not reviewed, and when 200 comments already wait, further ones are dropped with a notice. A pull, rebase or checkout during a turn counts the comments it brings in as the turn's.

Run `ast-grep test --skip-snapshot-tests` in `hooks/comment-policy/` after changing a rule; the rule tests state which code matches, so no output snapshots are kept. After changing the judge's instructions or the policy, run `bun hooks/comment-policy/eval/run.mjs 3`: it sends the labelled comments in `hooks/comment-policy/eval/cases.ts` to Haiku three times through `claude -p` and reports each verdict that differs from its label. It spends tokens, so the test suite does not run it.

## Spec lint

When you send a prompt, the hook lints every spectacular contract in the repository with the bundled linter, passing the decision records too so each basis resolves. At the end of the turn it lints them again and sends back any finding the turn introduced, so a broken reference, a malformed rule table or an untraced basis is fixed in the turn that caused it. Findings that were already there are not reported, and a finding is reported once. It catches edits made through any tool, because it compares lint results rather than watching file writes. It needs git and python3; without them it shows a status line once and stays out of the way.

Set `spec_lint` to `off` in `/config` to turn it off.

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

1. **Plan**: map each requirement against the code and tests, design which module owns what and the seams between them, stack the changes so each builds on the last, send edge cases the contract misses back to it, and split each change into units sized for one agent. The plan is written to the implementation record.
2. **Tests**: per change, write the failing tests and confirm they fail for the right reason.
3. **Implement**: run units in waves, in parallel when they are in different modules and edit different paths. A failing unit gets more attempts, then one on the planner's model, then is blocked; a unit needing a decision outside its rights is blocked at once. Blocked units stop only their dependants.
4. **Verify**: run the repository's checks; a change is accepted when its tests, red after they were written, now pass.
5. **Conform**: check the contract with spec-review and the code against the recorded design; one round of fix units, then the user decides what remains.
6. **Close**: an anchored contract's ACs name their tests; a feature contract goes through its discard gate.

### Before you start

- The contract lints clean with `jacoelho:spectacular-spec-review` and has no open product decisions. Settle those first with `jacoelho:spectacular-spec-grilling`. A requirement with a defect the planner finds while mapping it against the code is left out of the plan as spec-blocked; a case the contract leaves open is recorded as an open question and carried into the decision record at close.
- Commit or stash your own edits. The workflow never commits, and its review reads every uncommitted change against HEAD, so edits you leave in the tree are reviewed as part of the run.
- When you call `/jacoelho:spec-implement` directly, use a session started after installing or updating the plugin. A session whose skill list predates the skill cannot load the method, and the run stops at once with an error; start a new session or pass `skillPath`. When the skill launches the workflow it passes `skillPath` itself.
- Expect roughly 6 to 8 agents per change before its units, each starting from a fresh context, so the cost follows the number of changes rather than the size of the diff. A normal session following `/jacoelho:spectacular-spec-implementation` runs the same method without starting agents.

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

A unit interrupted mid-run starts again on resume.

| `stopKind` | What happened | What to do |
| --- | --- | --- |
| `plan-ready` | The design adds a seam, module or dependency. | Read the plan in the record, then rerun with the record path to approve it. |
| `change-ready` | A change was accepted and the `change` gate is on. | Review the diff, then rerun with the record path. |
| `blocked` | A unit needs a decision outside its rights, failed every attempt, or conformance found something for you. | Settle each reason in `next`: a product decision in the decision record, a design change in the record's Design, or a note in the record. Rerun with the record path; the planner reopens the units whose reason is settled. |
| `verify-failing` | The repository's checks still fail after fixes. | Fix the cause or record a decision, then rerun with the record path. |
| `contract-changed` | A contract changed during the run. | Rerun with the record path; the planner re-plans only the affected changes, and may stop at `plan-ready` again when the new design adds a seam, module or dependency. |
| `spec-blocked` | Every requirement is blocked by a defect in the contract. | Fix the contract with `jacoelho:spectacular-spec-writing`, then start again with the contract path. |
| `budget` | The token budget set for the turn (such as `+500k`) cannot cover the next change. | Rerun with the record path and a larger budget. |
| `discard-ready` | A feature contract is fully implemented. | Rerun with the record path to approve discarding it. |
| `error` | A step could not run, for example no check command or a planner that could not load the method. | Do what `next` says, such as passing `verify` or starting a new session, then rerun. |
| `done` | Every change is accepted and closed. | Review and commit the tree. Open questions were carried into the capability's decision record, and requirements left out as spec-blocked are listed in the result's `specBlocked`. |

Other options set `instructions` for every agent, `concurrency` (units per wave, default 3), `models` per role (planner, testWriter, implementer, runner, reviewer, recorder; a model name, or `inherit` for the session model), `maxAttempts`, the `verify` command and `keepRecord` (keep the record after close instead of deleting it). The result reports the turn's token spend, which includes anything else spent in the same turn.

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

To try uncommitted edits, start a session with `claude --plugin-dir /path/to/skills`. It loads the checkout in place, and `/reload-plugins` picks up further edits. Run `claude plugin validate .`, `claude plugin test .`, `node --test tests/workflows/*.check.mjs` and `ast-grep test --skip-snapshot-tests` in `hooks/comment-policy/` before pushing. Workflow tests run under Node because the plugin test runner imports files as modules, which a workflow script is not.

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
