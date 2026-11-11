# Commit message profile

A commit message tells someone reading the history what changed and why. A repository's commit convention, lint configuration and existing history take precedence over this structure, and so do the author's stated preferences for format and length.

## Sources

Read the diff being committed, not a summary of it. Use the linked issue, review discussion and author notes for the reasoning the diff can't show. When a stated claim and the diff disagree, report it.

## Questions it must answer

1. What changed, in terms of behaviour? The title answers this; the body adds what the title can't hold.
2. Why was the change needed? The diff can't say.
3. What breaks for a caller or operator: removed options, changed defaults, changed output, migrations?

Keep it proportionate. A change the title describes completely needs no body. Say what happened before when the difference is not obvious.

## Title

The title is a scan surface: lead with the specific change, in the repository's convention when it has one, such as Conventional Commits. Name the behaviour that changed, not the files. Mark a breaking change the way the convention does.

## Body

Separate the body from the title with a blank line. Give each paragraph one area of the change. Follow the repository's history for line wrapping, trailers and whether lists are used.

A measured effect of the change is a claim about the change and keeps its conditions: "allocations per element start fall from 5 to 1".

## Traps

- **Narrating the diff.** "Changed `foo` to `bar` in three files" repeats what the reader can already see. State the effect.
- **Narrating the work.** How the change was developed, reviewed or revised is not part of the change.
- **Invented motivation.** If the reason for the change isn't in the sources, report it as missing rather than deducing a plausible one.
- **Upgraded impact.** "Fixes the timeouts" needs evidence the timeouts stopped. If the change is expected to help, say "expected to reduce".
- **Unstated breaking changes.** A removed option or a changed default mentioned only at the end will be missed. State it near the top.
- **Claiming verification that didn't happen.** If the message reports a test or benchmark result, it needs evidence that the run happened.

Issue-closing keywords have side effects. Use them only when the source supports them: `Fixes #123` closes the issue on merge.
