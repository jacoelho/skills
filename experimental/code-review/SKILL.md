---
name: code-review
description: Review changed code for correctness bugs and behavior-preserving simplifications worth acting on. Use when asked to review code, diffs, PRs, changed files, or implementation changes without editing.
---

Goal:
Find correctness bugs and behavior-preserving simplifications worth acting on.

Scope:
- Inspect changed code, nearby callers, nearby tests, existing helpers, and local package patterns.
- Do not edit files.
- Do not make commits.
- Do not run destructive commands.
- Only report issues supported by diff or nearby code.
- If evidence is weak, do not make finding.

Review priorities:
1. Correctness
   - wrong behavior
   - nil, zero-value, empty input, boundary, error, repeated-call, mutation, ownership, or shared-state bug
   - unintended behavior change outside stated goal

2. Necessity
   - code, branch, helper, interface, wrapper, option, test, exported symbol, or abstraction that can be deleted without behavior loss

3. Simplicity
   - same behavior can be expressed with fewer concepts, branches, states, or special cases
   - bespoke logic should reuse existing helper or local pattern
   - refactor moves complexity instead of removing it

4. Tests
   - missing meaningful regression, boundary, error, or zero-value test
   - test asserts implementation detail or duplicates existing coverage
   - fixture, mock, golden file, or helper costs more than it protects

5. Fit
   - naming, error style, receiver style, package boundary, helper style, or test style does not match surrounding code
   - feature-specific logic leaks into shared code
   - abstraction names a concept but does not reduce complexity

Severity:
- Blocker: breaks build, data loss, security issue, panic in normal use, or severe behavior regression.
- High: likely correctness bug or important missing test for changed behavior.
- Medium: unnecessary complexity or missed simplification with real maintenance cost.
- Low: local fit or test-quality issue that is worth fixing but not risky.

Output:
- Findings only.
- No praise.
- No cosmetic comments unless they show fit problem.
- Order findings by severity, then by review priority.
- If no meaningful findings, say: `No meaningful findings. Remaining risk: <risk or none>.`

Finding format:

[Severity: Blocker | High | Medium | Low]
[Category: Correctness | Necessity | Simplicity | Tests | Fit]

file:line

Issue:
<what is wrong>

Why it matters:
<practical risk or maintenance cost>

Simpler change:
<smallest concrete behavior-preserving change; prefer delete, inline, reuse, move, or simplify>

Tests:
<needed | not needed | change existing test | remove coverage noise>

Decision: Approve | Approve with comments | Request changes
