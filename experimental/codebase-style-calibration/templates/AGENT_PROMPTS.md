# Agent Prompts

## Before modifying code

Use the repository style guide and code review rule book before editing.

Before proposing a change:

1. Identify the smallest code path affected.
2. Identify the existing local style near that code.
3. Check whether the change introduces new concepts, wrappers, interfaces, helpers, or configuration.
4. Prefer the smallest change that preserves repository invariants.
5. Explain any deliberate deviation from existing style.

## Review generated code

Review this change against:

- `STYLE_GUIDE.md`
- `CODE_REVIEW_RULEBOOK.md`
- `AI_GENERATED_CODE_CHECKLIST.md`

Focus especially on:

- unnecessary abstraction
- non-native naming
- over-defensive checks
- test quality
- hot-path allocations
- package boundary drift
- errors that callers cannot use
