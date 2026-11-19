# Comments

- Write no comment by default. Make the code explain itself through names, types and structure first.
- Comment only what the code cannot say: non-obvious intent, a constraint, an invariant, a consequence, or why an obvious alternative is wrong. Never restate what the code does.
- Doc comments on public API are expected and follow the language's convention. In Go (go.dev/doc/comment): each package and exported identifier gets one; full sentences starting with the name ("Package x ...", "Parse returns ..."); say what it does or returns, not how. Mention errors, concurrency or ownership only when callers would otherwise guess wrong; a type is assumed unsafe for concurrent use unless its doc says otherwise.
- Describe the code as it is, never its history: no "changed", "previously", "now uses", "new", or task and ticket references. History belongs in commit messages.
- No commented-out code; version control keeps it.
- No TODO without a tracking reference.
- A workaround or deviation from a standard cites its source (issue, RFC, upstream bug).
- Linter suppressions and directives (`//nolint`, `// eslint-disable`) state the reason.
- Where a spec owns a rule, reference the spec rather than restating the rule.
- Update or delete comments a change makes stale. Do not add or rewrite comments in code the task does not touch.
- Tests: the test name states the behaviour; no comments narrating setup or assertions.
