# jacoelho

A Claude Code plugin with my personal skills, subagents, workflows and hooks. This repository is both the plugin and its marketplace.

Skills live in `skills/`, agents in `agents/`, workflows in `workflows/`, hooks modules in `hooks/`, and tests in `tests/`. Everything is namespaced by the plugin name: skills and workflows run as `/jacoelho:<name>` and agents are `jacoelho:<agent>`.

## Prompt intake

The plugin's `prompt.submit` hook (`hooks/prompt-intake/`) intercepts every message over 150 words that you type at the terminal. It runs in every session where the plugin is enabled.

1. It holds the message and makes a model call to sort it into Goal, Facts and Asks and list every ambiguity.
2. It asks about the ambiguities in the question dialog, up to 3 per round and 5 rounds. Questions still open after that are kept under Facts, marked `[unresolved]`; content that fits no section is marked `[unsorted]`. A question the model could not offer options for is kept as `[unresolved]` too.
3. It drops the original and puts the clean version in the prompt box, keeping anything you typed meanwhile. Your next message is sent as typed, so edit the clean version and press Enter.

Start a message with `raw:` to send the rest as typed (not `!raw`: a leading `!` opens bash mode). Slash commands, messages with attachments, Remote Control and other sessions' messages, and `-p` runs pass through, as does a long message sent while another is in intake. If you dismiss a question, press Esc, or the model call or its reply fails, the original goes back in the prompt box and nothing is sent.

## Architecture remediation workflow

`/jacoelho:architecture-remediate` fixes architecture findings end to end. Each round reviews with `/jacoelho:architecture-review`, plans the fixes, has `jacoelho:consultant` agents challenge the plan, implements it in batches, verifies, and runs `jacoelho:critic` on the diff. Later rounds review only the diff; the run stops once a review finds nothing above Low.

Pass a scope, and optionally `instructions`, free text every stage that judges or edits must follow:

```text
/jacoelho:architecture-remediate internal/billing
/jacoelho:architecture-remediate {"scope": "internal/billing", "instructions": "keep the v1 wire format"}
/jacoelho:architecture-remediate help
```

The scope is required, because a run edits the working tree: a bare call, `help` or an unknown option starts no agents and returns the option list instead. The run never commits. It returns `tree` (`untouched`, `verified`, `failing`, or `unverified` when it stopped mid-round) and `next`, which says what to do about that state, plus any critic findings it could not resolve. Asking in plain language works too; Claude builds the arguments. The defaults assume a Go repository.

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
