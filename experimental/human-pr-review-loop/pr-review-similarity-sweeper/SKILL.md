---
name: pr-review-similarity-sweeper
description: Search for other branch locations matching a human-approved candidate review rule. Use when Codex must run deterministic text, git, or optional AST searches, separate likely matches from non-matches, and ask for explicit approval before edits or comments.
---

# PR Review Similarity Sweeper

Use this skill to search for other places where a human-approved candidate rule may apply.

This skill finds candidates. It does not patch automatically.

## Inputs

- Candidate rule.
- Source card.
- Human feedback.
- Changed file list.
- Diff map.
- Project rules and rejected rules.

## Outputs

Update:

```text
similar-sweep.md
candidate-rules.md
findings.jsonl
session.jsonl
```

## Prompt discipline

- Use the approved rule text as the search contract.
- Record exact commands, paths searched, and gaps.
- Separate likely matches, possible matches, and non-matches with evidence.
- Do not rely on semantic similarity alone when code evidence is missing.
- End with concrete command options instead of asking a vague approval question.

## Search strategy

Use deterministic search first.

Prefer `rg` when available:

```bash
command -v rg >/dev/null && rg "pattern" path
```

Fallback to grep:

```bash
grep -RIn "pattern" path
```

Search in this order:

1. Changed hunks in the branch.
2. Changed files.
3. Nearby package/module files.
4. Whole repo only if the rule is explicitly project-wide.

## Git-based search commands

Useful commands:

```bash
git diff --name-only BASE...HEAD
git diff --unified=0 BASE...HEAD
git diff --word-diff=plain BASE...HEAD
git grep -n "pattern" -- <paths>
```

## Go-specific optional search

Do not install packages.

For Go repos, you may use standard tooling if present:

```bash
go test ./...
go vet ./...
go list ./...
```

If text search is too weak, you may create a temporary Go program inside the review session directory using only standard library packages such as:

```text
go/parser
go/ast
go/token
go/types
```

Use it to find simple AST shapes, for example:

- `if err != nil { return ... }`
- wrapper functions that call one function directly;
- boolean literal arguments at call sites;
- ignored errors;
- assignments to shared package-level variables;
- missing `defer Close` patterns.

Delete or leave the temporary program under the session directory. Do not add it to production code.

## Similarity result format

```text
## Sweep S-0001 for CR-0001

Rule:
Source card:
Scope searched:
Commands run:

### Likely matches

1. path/file.go:123
   Evidence:
   Why it matches:
   Suggested action:

### Possible matches needing human judgement

1. path/file.go:456
   Evidence:
   Uncertainty:
   Question:

### Likely non-matches

1. path/file.go:789
   Evidence:
   Why excluded:

### Search gaps

- Areas not searched:
- Reason:

### Recommendation

<Ask the human to approve, narrow, reject, or defer.>

### How to answer this sweep

- `apply likely CR-0001` — apply fixes/comments to likely matches only.
- `apply CR-0001: 1,3,5` — apply only selected matches.
- `comments-only CR-0001` — produce review comments but do not patch.
- `narrow CR-0001: <scope>` — adjust scope and rerun the sweep.
- `reject-matches CR-0001: <reason>` — reject this sweep.
- `defer CR-0001: <reason>` — leave as follow-up.
```

## Human decision protocol

Every sweep result must end with the sweep reply menu. Do not ask a vague question like "Should I apply these?" without showing the exact command options.

Only `apply likely` or `apply CR-0001: <ids>` authorises patch/comment creation. `approve-sweep` only authorises searching; it does not authorise edits.

## Matching discipline

Do not use semantic similarity as an excuse to overreach.

A candidate is a likely match only when:

- it is inside the approved scope;
- the same behavioural risk exists;
- the evidence is visible in code or tests;
- the proposed action would not change unrelated behaviour.

A candidate is not a match when:

- it merely looks textually similar;
- the context is explicitly excluded by non-scope;
- the pattern is intentional and documented;
- it predates the branch and is not exposed by the branch, unless the human asked for broader cleanup.
