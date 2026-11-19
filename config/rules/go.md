# Go

- Find and change Go identifiers with the `gopls` CLI, not text search; use grep only for non-identifier text such as strings, comments, and non-Go files. Positions are 1-based `file:line:col`.
  - Locate declarations with `gopls workspace_symbol <query>`.
  - Before changing a symbol's signature or behaviour, run `gopls references <pos>`; use `gopls implementation <pos>` for interfaces and `gopls call_hierarchy <pos>` for callers.
  - Rename with `gopls rename -d <pos> <name>` to preview, then `-w` to apply. Without `-d` or `-w` it prints every edited file in full.
- Read a package's exported API with `go doc <pkg>` and one symbol with `go doc <pkg>.<Symbol>`.
- After adding or upgrading dependencies, run `go run golang.org/x/vuln/cmd/govulncheck@latest ./...`.
