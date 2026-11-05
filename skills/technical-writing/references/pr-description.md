# PR description profile

A PR description tells a reviewer what changed, why, and what to trust. A repository's PR template and contribution guide take precedence over this structure.

## Sources

Read the actual diff, not just the commit messages or the author's summary. Use the linked issue, commits and author notes for the reasoning the diff can't show. When a stated claim and the diff disagree, report it.

## Questions it must answer

1. What changed, in terms of behaviour? Lead with this.
2. Why was the change needed? The diff can't say.
3. How was it verified? List only what was actually run or observed.
4. What are the risks, limitations and follow-ups the reviewer should know about?
5. Where should the reviewer look hardest, when that isn't obvious?

Keep it proportionate. A one-line fix can take two sentences. Omit sections with nothing to say. Don't write "N/A" unless the template requires it.

The title is a scan surface: lead with the specific change, in the repository's convention when it has one.

## Traps

- **Narrating the diff.** "Changed `foo` to `bar` in three files" repeats what the reviewer can already see. State the effect.
- **Claiming verification that didn't happen.** "Tests pass" requires evidence that they ran. Tests added to the diff are not tests that passed. When verification is unknown, say what is unknown; never infer it from the code. A CI-config change is not proof of a CI result.
- **Omitting known limitations.** A TODO in the diff, a skipped case or a limit stated in the notes belongs in the description, stated plainly.
- **Invented motivation.** If the reason for the change isn't in the sources, report it as missing rather than deducing a plausible one.
- **Upgraded impact.** "Fixes the timeouts" needs evidence the timeouts stopped. If the change is expected to help, say "expected to reduce".
- **Unstated breaking changes.** Changed defaults, removed options and migrations go near the top.
- **Sales language.** "Comprehensive refactor" and "significantly improves" tell the reviewer nothing. Give the observed result or cut it.

Mentions and issue-closing keywords have side effects. Use them only when the source supports them: writing `Fixes #123` closes the issue on merge.
