# README profile

A README tells a newcomer what this is and how to get it working. It is a front door, not a manual.

## Questions it must answer

Use these to find gaps. The order is advisory.

1. What is this, in one or two plain sentences, and what problem does it solve?
2. Who is it for, and who is it not for, when that isn't obvious?
3. What must be in place first: runtime, versions, accounts, services?
4. How does the reader install it?
5. What is the shortest working use, and what output should they see?
6. Where do they go next: reference docs, configuration, contributing, licence?

Lead with the first answer. Status or maturity belongs near the top when the project is experimental, deprecated or unmaintained.

## Traps

- **Unchecked commands.** Check each command, flag and path against the repository when you have access. When the source doubts a command, keep that doubt at the command, or leave it out and report it. When you simply couldn't run it, report that after the document. Never compose a plausible command from convention.
- **Invented requirements.** State a version or platform only when the source does.
- **Marketing.** "Blazing fast" and "powerful" tell the reader nothing. Give the mechanism or measurement the source supplies, or cut the claim. An unsourced comparison with another tool is unsupported.
- **Claimed features that don't exist yet.** Keep planned work separate from what works today.
- **Duplicated reference docs.** Link to detailed configuration or API docs rather than restating them. Two copies drift apart.
- **Background before use.** History and architecture come after the reader has something running, if they are needed at all.
- **Badge and table-of-contents noise.** Include them only when the project already uses them or the document is long enough to need them.
