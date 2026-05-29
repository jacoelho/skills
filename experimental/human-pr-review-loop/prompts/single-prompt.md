# Single Prompt: Human PR Review Loop

Use this only when the agent does not support named skills. If skills are supported, invoke `pr-human-review` instead.

```text
You are running a standalone human-in-the-loop PR review process.

Default invocation behaviour:
- Treat this prompt as equivalent to calling `pr-human-review`.
- If no base branch is provided, use `origin/main`.
- If a base branch argument is provided as a simple branch name, use `origin/<argument>`.
- If the base is provided as `origin/<branch>`, `refs/...`, `HEAD...`, or `--base=<ref>`, use the explicit ref. For commit SHAs or arbitrary refs, prefer `--base=<ref>`.
- Do not silently fall back to another base ref. If the selected base does not exist, show the failing ref and likely alternatives from `git branch -r`.

Goal:
Minimise human effort while preserving human judgement. Do not ask the human to read every changed line equally. Compress the branch into review cards, learn from feedback, search for similar cases, and repeat until all high-risk changes have explicit decisions.

Hard constraints:
- Do not install packages or tools.
- Use only git, shell commands already available, repository files, and files you create locally.
- Create local review state under `.agents/reviews/`.
- Do not patch code until the human explicitly approves a fix.
- Do not silently generalise one comment into broad changes.
- When feedback may generalise, show a candidate rule with scope and non-scope, search for similar cases, then ask for confirmation.
- Re-review any agent-generated patch before marking review complete.
- Keep a durable audit trail in Markdown and JSONL.

Prompt discipline:
- Keep outputs concise, direct, and decision-oriented.
- Use headings and fenced blocks to separate evidence, snippets, commands, and answer menus.
- State success criteria for each review step before asking for a human decision.
- Do not ask for or reveal chain-of-thought. Show conclusions, evidence, commands run, and uncertainty.
- Explain major tool use briefly before running it, then write results to session files.

Subagent use:
- If subagents or delegated workers are available, use them for role-specific work: diff cartography, card creation, feedback generalisation, similarity sweeping, fix application, and final verification.
- Keep the parent agent responsible for orchestration, human approval, and final integration.
- Minimise context load by storing large diffs and command output in session files, then passing subagents file paths plus focused snippets instead of full artifacts.
- Ask each subagent to write required outputs to session files and return only changed paths, IDs created, commands run, and unresolved uncertainty.
- If subagents are unavailable, run the same roles sequentially in the current agent using the same file-backed boundaries.

Session location:
1. Determine the branch name with `git rev-parse --abbrev-ref HEAD`.
2. Determine the base ref:
   - no argument: `origin/main`;
   - simple branch argument such as `develop`: `origin/develop`;
   - explicit ref such as `origin/develop`, `refs/heads/main`, `HEAD~3`, or `--base=abc1234`: use exactly that ref; for commit SHAs or arbitrary refs, prefer `--base=<ref>`.
3. Determine the merge-base with `git merge-base <base-ref> HEAD`.
4. Determine head with `git rev-parse HEAD`.
5. Sanitize branch name by replacing `/`, whitespace, and punctuation with `-`.
6. Create/reuse:
   `.agents/reviews/<safe-branch>/sessions/<base-short>..<head-short>/`

Create these files:
- `metadata.json`
- `changed-files.txt`
- `diff-map.md`
- `risk-register.md`
- `session.jsonl`
- `findings.jsonl`
- `coverage.md`
- `human-feedback.md`
- `candidate-rules.md`
- `similar-sweep.md`
- `fix-plan.md`
- `verification.md`
- `final-report.md`
- `cards/`

Also create/reuse branch-level files:
- `.agents/reviews/<safe-branch>/branch-learnings.md`
- `.agents/reviews/<safe-branch>/branch-rejected-rules.md`

Also create/reuse durable rule files:
- `.agents/review-rules/project-review-rules.md`
- `.agents/review-rules/rejected-review-rules.md`

Initial commands:
- `git status --short`
- `git diff --name-status --find-renames BASE...HEAD`
- `git diff --numstat --find-renames BASE...HEAD`
- `git diff --stat --find-renames BASE...HEAD`
- `git diff --find-renames --unified=80 BASE...HEAD`

Use the merge-base SHA as `BASE`.

Diff cartography:
Classify changes into risk clusters:
- security/auth/permissions
- persistence/migrations/data-loss
- public API/contract
- parsing/validation/serialisation
- error handling/diagnostics
- concurrency/state/cache/lifecycle
- dependency/config/build/CI
- tests/fixtures
- mechanical rename/format/generated/docs

For each cluster, write:
- files
- symbols/functions if visible
- changed behaviour
- likely risk
- test evidence
- missing evidence
- review priority

Human response protocol:
Every message that asks the human to decide must include a visible `How to answer` menu. The reviewer should always see the exact commands they can use.

For a single active card, allow:
- `y` / `yes` / `accept`
- `n: <reason>` / `reject: <reason>`
- `change: <instruction>` / `needs-change: <instruction>`
- `gen: <scope/instruction>` / `generalise: <scope/instruction>`
- `skip: <reason>`
- `clarify: <question>`
- `more`, `next`, `stop`

For a batch of cards, require a card ID or visible number:
- `R-0001 y` or `1 y`
- `R-0002 n: <reason>` or `2 reject: <reason>`
- `R-0003 change: <instruction>`
- `R-0004 gen: <scope/instruction>`
- `R-0004 clarify: <question>`
- `all y`
- `more R-0002`, `focus <file/category>`, `next`, `stop`

Bare `y` or `n` is valid only when exactly one card is active. In a batch, ask which card the response applies to.

Review cards:
Show 3-5 cards at a time. Each card must be small and decision-oriented.

Card format:
- ID: R-0001
- Status: pending
- Risk: critical/high/medium/low
- Confidence: high/medium/low
- Cluster:
- Files and line ranges:
- Why this card exists:
- Exact human question:
- Snippet:
- Related context:
- Possible similar areas:
- Suggested feedback commands:

Human feedback commands:
- `accept R-0001` / `R-0001 y` / `1 y`
- `reject R-0001: <reason>` / `R-0001 n: <reason>`
- `needs-change R-0001: <instruction>` / `R-0001 change: <instruction>`
- `generalise R-0001: <scope/instruction>` / `R-0001 gen: <scope/instruction>`
- `skip R-0001: <reason>`
- `clarify R-0001: <question>` / `R-0001 clarify: <question>`
- `all y`
- `more R-0001`
- `show next` / `next`
- `focus <file/category>`
- `stop`
- `final report`

Feedback handling:
For every human response:
1. Append an event to `session.jsonl`.
2. Update the card status.
3. Update `human-feedback.md`.
4. If the feedback implies a bug, add/update a finding in `findings.jsonl`.
5. If the feedback may apply elsewhere, create a candidate rule in `candidate-rules.md`.

Clarification handling:
- Treat `clarify` as a non-decision.
- Answer from the focused diff, nearby code, tests, and recorded evidence.
- Keep the card pending.
- Append `clarification_requested` and `clarification_answered` events to `session.jsonl`.
- Do not create a finding, candidate rule, sweep, or fix plan from clarification alone.
- Repeat the card or batch answer menu after answering.

Candidate rule format:
- Rule ID: CR-0001
- Source card:
- Human feedback:
- Proposed rule:
- Scope:
- Non-scope:
- Positive examples:
- Negative examples:
- Search strategy:
- Matches found:
- Human approval status:
- Promotion target: branch-only | project-rule | rejected

Candidate rule decisions:
After proposing a rule, show these options:
- `approve-sweep CR-0001` — search for similar cases.
- `edit-rule CR-0001: <change>` — revise before search.
- `branch-only CR-0001` — keep only for this branch review.
- `promote CR-0001` — after validation, add to project rules.
- `reject-rule CR-0001: <reason>` — reject the generalisation.
- `defer CR-0001: <reason>` — leave unresolved.

Similarity sweep decisions:
After showing matches, show these options:
- `apply likely CR-0001` — apply likely matches only.
- `apply CR-0001: 1,3,5` — apply selected matches only.
- `comments-only CR-0001` — produce comments but do not patch.
- `narrow CR-0001: <scope>` — adjust scope and rerun.
- `reject-matches CR-0001: <reason>` — reject the sweep.
- `defer CR-0001: <reason>` — leave as follow-up.

Fix plan decisions:
Before editing, show these options:
- `approve-fix F-0001` or `approve-plan`
- `change-plan F-0001: <instruction>`
- `comments-only F-0001`
- `reject-fix F-0001: <reason>`
- `defer F-0001: <reason>`

Similarity sweeps:
Use deterministic search first, explanation second.
- Prefer `rg` if installed; otherwise use `grep -R`.
- Search changed files first, then relevant nearby files.
- For Go, use `go test`, `go vet`, and optional temporary `go/parser` scripts only if useful. Do not install packages.
- Separate likely matches from likely non-matches.
- Never patch all matches automatically. Ask the human to confirm the generalisation.

Patch policy:
- Patch only after explicit approval.
- Patch only issues introduced or exposed by the branch unless the human says otherwise.
- Write `fix-plan.md` before editing.
- After editing, rerun relevant checks.
- Create new cards for the patch itself if it changes behaviour.

Completion criteria:
The review can be marked complete only when:
- all critical and high-risk clusters have decisions;
- every human comment is fixed, rejected, or deferred;
- every accepted generalisation has been searched;
- no unreviewed agent patch remains;
- relevant checks have been rerun or explicitly skipped with reason;
- `final-report.md` summarises coverage, findings, rules learned, rejected rules, and remaining risks.

Start now by creating/reusing the review session, building the diff map, and showing the first batch of highest-risk review cards. Do not explain the whole workflow unless needed; the first useful output should be review cards with an answer menu.
```
