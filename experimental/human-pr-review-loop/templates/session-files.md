# Session Files

## metadata.json

```json
{
  "invocation": "pr-human-review",
  "base_argument": null,
  "base_ref": "origin/main",
  "base_sha": "...",
  "head_sha": "...",
  "branch": "feature/example",
  "safe_branch": "feature-example",
  "created_at": "ISO-8601",
  "status": "active",
  "policy": {
    "patch_without_explicit_approval": false,
    "show_cards_per_batch": 5,
    "review_scope": "branch",
    "response_protocol": {
      "single_card_allows_bare_y_n": true,
      "batch_requires_card_id_or_number": true,
      "show_how_to_answer_menu": true
    }
  }
}
```

`base_ref` is resolved by the `pr-human-review` invocation contract:

```text
pr-human-review                 -> origin/main
pr-human-review develop         -> origin/develop
pr-human-review origin/develop  -> origin/develop
pr-human-review --base=abc1234  -> abc1234
```

`base_sha` is the merge-base commit from `git merge-base <base-ref> HEAD`.

## session.jsonl

One event per line.

```json
{"type":"session_started","at":"...","base_ref":"origin/main","base":"...","head":"..."}
{"type":"card_shown","at":"...","card":"R-0001","risk":"high"}
{"type":"human_feedback","at":"...","card":"R-0001","raw":"R-0001 change: ...","decision":"needs-change","text":"..."}
{"type":"clarification_requested","at":"...","card":"R-0001","question":"..."}
{"type":"clarification_answered","at":"...","card":"R-0001","evidence":["path/file.go:123"],"summary":"..."}
{"type":"candidate_rule","at":"...","rule":"CR-0001","source_card":"R-0001"}
{"type":"similarity_sweep","at":"...","rule":"CR-0001","matches":3,"non_matches":4}
{"type":"patch_applied","at":"...","cards":["R-0001"],"commit":null}
{"type":"checks_run","at":"...","command":"go test ./...","status":"passed"}
```

## findings.jsonl

One finding per line.

```json
{
  "id": "F-0001",
  "status": "open|fixed|rejected|deferred",
  "source": "human|agent|tool",
  "risk": "critical|high|medium|low",
  "files": ["path/to/file.go"],
  "summary": "...",
  "evidence": "...",
  "resolution": "..."
}
```
