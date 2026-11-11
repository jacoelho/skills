# Implementation: [capability or feature]

> Progress record for `jacoelho:spectacular-spec-implementation`. The contracts own behaviour and coverage; this file only tracks the work and is deleted at close unless kept. It has one writer. Do not add the spec-lint marker.

Contracts: [path sha256:<hash>, one per contract]
Lifecycle: [from the contract header]
Status: [planning | approved | implementing | accepted | blocked]
Checks: [the repository's check command]

## Gap map

| Requirement | Status | Evidence |
| --- | --- | --- |
| [REQ-CAP-001] | [satisfied / untested / partial / missing / conflicting: class] | [test name, or file:line] |

## Design

[One line for one module: "Design: extends <module>; no new seams." Otherwise the table from references/design.md.]

| Owner (path) | Owns | Seams it exposes | Consumers | May depend on |
| --- | --- | --- | --- | --- |

Decisions: [design decisions with their reason; changes to the design are added here, never made silently]

## C-1 [title] - after: [-]

Seams: [declarations this change introduces, or none]
Tests: cites [AC and INV IDs]; edge: [cases]; properties: [input domains]; open: [Q IDs]

Unit markers: `[ ]` pending, `[~]` in progress, `[x]` done, `[a]` accepted, `[!]` blocked (reason in Notes).

- [ ] U-1.1 Write failing tests - owner: [module path] - edits: [test paths, plus declarations the tests need]
- [ ] U-1.2 [unit] - after: U-1.1 - owner: [module path] - edits: [paths]

Notes: [unit decisions, returned decisions, blocked reasons, red and green evidence with commands, acceptance]

Fix units for a change's conformance findings are added to it as `C-n-Fk`. Findings against the whole stack get a last section in the same layout:

## STACK Whole-stack conformance fixes - after: [last change]
