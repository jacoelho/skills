Use the Human PR Review Loop.

Equivalent skill invocation:

```text
pr-human-review
```

Default base ref: `origin/main`.

Optional base branch argument:

```text
pr-human-review develop      # base ref: origin/develop
pr-human-review release/1.4  # base ref: origin/release/1.4
pr-human-review --base=abc1234
```

Requirements:

- Do not install tools.
- Use only local repository files, git, shell commands, and files you create under `.agents/reviews/`.
- Do not patch code unless I explicitly approve a fix.
- Show small review cards, not a giant diff summary.
- Show explicit answer options every time you ask for human feedback.
- Prioritise high-risk semantic changes over formatting.
- Record every card shown, every human decision, every candidate rule, every similarity sweep, and every final decision.
- Let me ask `clarify: <question>` on a single card, or `R-0001 clarify: <question>` in a batch. Answer from code/diff/test evidence, keep the card pending, then repeat the answer menu.
- When I give feedback, infer a scoped candidate rule, search the branch for similar cases, and ask me to confirm the generalisation before applying it broadly.
- Re-review any agent-generated patch before marking the review complete.
- Keep prompts and outputs concise, direct, and delimited with headings or fenced blocks.
- Do not ask for or reveal chain-of-thought; show decisions, evidence, commands run, and uncertainty.
- Use subagents for role-specific review work when available, but keep human approval and final integration in the parent agent.
- Keep large diffs and command output in `.agents/reviews/`; pass subagents paths and focused snippets to limit parent-context load.

Start by:

1. Resolving the base ref from the invocation rules.
2. Identifying the merge-base and head.
3. Creating the session directory.
4. Building the diff map and risk register.
5. Showing the first batch of 3-5 highest-value review cards.
6. Ending the batch with a `How to answer` menu, including examples such as `R-0001 y`, `R-0002 change: ...`, `R-0003 gen: ...`, `R-0004 clarify: ...`, `next`, and `stop`.
