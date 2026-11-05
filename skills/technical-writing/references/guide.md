# Guide profile

A guide takes one reader through one task to a known result. This covers how-to guides, tutorials and runbooks.

## Questions it must answer

Use these to find gaps. The order is advisory.

1. Who is this for, and what will they have achieved at the end?
2. What must be true before starting: access, tools, versions, state, backups?
3. What are the steps, in the order they must happen?
4. How does the reader know each consequential step worked?
5. What is the final expected result?
6. What can go wrong, and how does the reader recover or roll back?

## Rules

- Give each step one action. Number steps that must happen in order.
- Put the condition or warning before the action it governs: "Before deleting the volume, stop the service."
- Give the expected output or observable state after any step whose failure would otherwise be silent.
- Mark steps that are destructive or hard to reverse, and say how to undo them, or that they can't be undone.
- Use exact commands, names and paths from the source. Show placeholders as placeholders.
- Keep concepts out of the steps. Link to an explanation, or put a short one before the steps.

## Traps

- **Hidden assumptions.** A step that needs a login, a running service or an earlier step's output needs that stated first.
- **Order from the notes, not the task.** Notes record what someone did; the guide records what must happen first. Reorder only when the source supports the dependency. When the true order is unclear, report it.
- **Resolved conflicts.** When sources give different values or steps, show the conflict in the guide and report it. Do not choose one because it looks newer or more plausible unless the source says it supersedes the other.
- **Invented recovery.** A failure path comes from the source. When there isn't one, report the gap rather than writing a generic fix.
- **Happy path only.** Known failure modes in the source stay in the guide.
