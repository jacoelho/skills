# Invocation Contract

The main skill is:

```text
pr-human-review
```

It should be self-starting. The human should not need to provide a long prompt such as “create local state, show cards, do not patch”. Those are the default rules of the skill.

## Accepted forms

```text
pr-human-review
pr-human-review <base-branch>
pr-human-review origin/<base-branch>
pr-human-review --base=<ref>
```

## Base resolution

| Input | Base ref |
|---|---|
| no argument | `origin/main` |
| `main` | `origin/main` |
| `develop` | `origin/develop` |
| `release/1.4` | `origin/release/1.4` |
| `origin/develop` | `origin/develop` |
| `--base=abc1234` | `abc1234` |

The diff base commit is then:

```bash
git merge-base <base-ref> HEAD
```

Do not silently substitute another base ref. If the selected ref is missing, show the error and available remote branches.

## Default startup actions

1. Resolve base ref.
2. Compute merge-base and head.
3. Create/reuse `.agents/reviews/<safe-branch>/sessions/<base-short>..<head-short>/`.
4. Collect git diff evidence.
5. Create/update `diff-map.md`, `risk-register.md`, and `coverage.md`.
6. Show the first batch of high-value review cards.
7. End with the reply menu.
8. Wait for human feedback.
