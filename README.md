# jacoelho

A Claude Code plugin with my personal skills, subagents and hooks. This repository is both the plugin and its marketplace.

Skills live in `skills/`, agents in `agents/`, hooks modules in `hooks/`, and tests in `tests/`. Everything is namespaced by the plugin name: skills run as `/jacoelho:<name>` and agents are `jacoelho:<agent>`.

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
- **How:** `ast-grep` finds the comments in Go, Rust, TypeScript, JavaScript, Python and Vue files, using the rules in `hooks/comment-policy/rules/`. In a Vue component it reads the template's HTML comments, the `<script>` blocks as JavaScript or, under `lang="ts"` or `lang="tsx"`, TypeScript, and plain CSS `<style>` blocks; a `<style>` in another language, such as SCSS, is not read. Adjacent whole-line comments are one block. Doc comments that the language's convention expects are exempt:
  - Go: the comment above the package clause, a declaration group holding an exported name, or an exported name, and a line comment after an exported name;
  - Rust: docs on `pub` items, the variants of a `pub` enum and the items of a `pub` trait;
  - JavaScript and TypeScript: a `/** */` block above an exported declaration, or above a public member of an exported class or interface, with decorators allowed between them.
  - Vue: a `/** */` block above a member of a component's props, emits or slots, whether declared with `defineProps`, `defineEmits` or `defineSlots`, a local interface or type named in one of them, or the `props` and `emits` of `defineComponent` or `export default`; and above a `defineModel` binding.

  Python, HTML and CSS comments, `export { a, b }` lists, `module.exports` and `export default` of an anonymous value have no exemption; the judge applies the policy to them. Comments a tool reads are never judged: build, lint, format, coverage, type-check and bundler directives, SPDX licence lines, and a Go example's `Output:` block. A TODO without a tracking reference and a linter suppression without a reason are reported without a model call; the finding shows the reason form the check accepts, such as `# noqa: E402  # reason`. The other comments go to Haiku with the policy and the code around each comment, in batches of 15, three at a time, up to 45 per review; the rest, and any batch the judge did not answer, wait for the next review. A waiting comment the user rewrites or deletes leaves the queue. Each finding must quote, from the source lines shown, the code the comment restates or the words that break the policy; a finding without such a quote is dropped. Spec rule ids are references the policy asks for, not tickets: the judge is told which ids in the comments name a heading under `specs/` (such as `## ORG-41`), and a finding that quotes one is dropped. An id no spec defines, such as `PROJ-42`, is judged as before. The judge's note is passed on as a quoted remark, since the judge read text that anyone with commit access could have written; this limits, but does not remove, the risk of a comment steering the agent through it.
- **Failure:** outside a git repository, without `ast-grep`, or when git or the scan fails, the review is skipped and the status line says why once; a failed or slow collection is retried by the next one, and the turns it covered stay open until then, so their changes are still credited to them and a new prompt does not discard them. A file that cannot be compared is skipped and counted. Generated Go files and turn ends with more than 200 changed files are not reviewed, and when 200 comments already wait, further ones are dropped with a notice. A pull, rebase or checkout during a turn counts the comments it brings in as the turn's.

Run `ast-grep test --skip-snapshot-tests` in `hooks/comment-policy/` after changing a rule; the rule tests state which code matches, so no output snapshots are kept. After changing the judge's instructions or the policy, run `bun hooks/comment-policy/eval/run.mjs 3`: it sends the labelled comments in `hooks/comment-policy/eval/cases.ts` to Haiku three times through `claude -p` and reports each verdict that differs from its label. It spends tokens, so the test suite does not run it.

## Spectacular

`/jacoelho:spectacular` finds the behavioural decisions a brief, ticket or change request leaves open, asks you about the ones that need you, builds the rest on recorded assumptions, and gives you one list of those assumptions to review when the work is done. Every decision is kept under `specs/`. A decision nobody recorded becomes a rule the implementer invents, and it surfaces after the code exists.

1. **Sweep:** it checks every operation in scope against nine classes of gap, such as what counts as a duplicate, what an omitted input defaults to, and what happens to things that refer to a deleted item.
2. **Sort:** each gap becomes a question, when a wrong guess would be costly to undo or the options are real preferences, or an assumption, which it decides and builds. A whole product comes to about 20 questions.
3. **Ask:** a question carries a concrete case, the options, and the default it will build if you do not answer. You get the questions as one numbered list, or one at a time in the session. Reply in your own words, with an option letter, or with "your call".
4. **Build:** it has no implementation method. It asks only that a change to a recorded behaviour rewrites that entry in the same change.
5. **Review:** `spec.py review` prints everything decided on your behalf, one line each. Reply to the lines you want changed; the rest stand.

Each file under `specs/` holds one capability. The first label of a `## <ID> <title>` entry is its state: `Open` is a question waiting for you, `Assumed` was decided on your behalf and not yet reviewed, and `Rule` is settled by your answer or your review.

```markdown
## REC-4 Duplicate names

Assumed: The second recipe named "Pancakes" in a group is refused with 409.
Case: create "Pancakes" twice.
```

`python3 skills/spectacular/scripts/spec.py status` counts rules, assumptions and open questions and reports malformed entries; `questions` and `review` print the two lists, `answer` applies your answers, and `reviewed` settles the assumptions on a review list you were sent. Deleting `specs/` removes the method: nothing in the code or tests refers to an entry.

## Architecture

`/jacoelho:architecture` reviews a diff, branch or module for ownership, coupling and boundaries, and edits nothing. Name facets or rules to focus it, in the skill's terms or your own ("single source of truth", "hidden state machines", "enforcement"): it searches for their signals first and opens findings only under them. Ask it to fix the findings, or pass `fix`, and it works through them in the same session, most severe first, inside a worktree on its own branch. Each fix starts with an acceptance check that must fail on the last commit and pass after the fix, and is committed alone; a type change that leaves no failing command is held to contract tests passing before and after. The budget is the ten most severe Critical and High findings, or with a focus the ten most severe it opens. Defects the fixes introduce are fixed or reverted whatever the budget. Findings that need an owner's decision are recorded with the question and skipped, and a finding whose second fix attempt fails is reverted and marked blocked. The run state lives in a ledger beside the worktree, so an interrupted run resumes from it. Before stopping it runs the repository's checks and reviews the boundaries its commits changed once, with every facet. It calls `jacoelho:critic` only when the diff touches an exported API, a persisted format, concurrency or security.

```text
/jacoelho:architecture internal/billing
/jacoelho:architecture internal/billing fix
/jacoelho:architecture internal/billing hidden state machines fix
```

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

To try uncommitted edits, start a session with `claude --plugin-dir /path/to/skills`. It loads the checkout in place, and `/reload-plugins` picks up further edits. Run `claude plugin validate .`, `claude plugin test .`, `node --test tests/change-overview/*.check.mjs`, `PW_DIR=<dir with playwright> node --test tests/app-screen-design/*.check.mjs` and `ast-grep test --skip-snapshot-tests` in `hooks/comment-policy/` before pushing. The geometry tests need a browser to lay pages out.

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
