# Engineering workflows

Four standalone skill packages. Repository packages are authoritative; installed
packages are verified copies.

| Skill | Responsibility |
| --- | --- |
| [planning-and-task-breakdown](planning-and-task-breakdown/SKILL.md) | Convert accepted requirements and architecture into dependency-aware implementation tasks |
| [research](research/SKILL.md) | Resolve relevant dependency versions and distinguish primary-source facts, project decisions, inference and executed observations |
| [simplify](simplify/SKILL.md) | Reduce complexity while preserving observable behavior and meaningful test guarantees |
| [code-review](code-review/SKILL.md) | Review affected execution paths, requirements, standards and relevant security/performance boundaries |

The planner consumes accepted requirements and architecture. [Spectacular](../spectacular/README.md)
owns behavioral contracts; [evolve-architecture](../evolve-architecture/SKILL.md)
owns architecture selection and migration design. [find-architecture-opportunities](../find-architecture-opportunities/SKILL.md)
identifies bounded structural candidates without turning a hypothesis into an
accepted design. Research supplies evidence; it does not replace project authority.

Each skill folder contains its complete instructions, UI metadata and any optional
resources. Evaluation runners, fixtures, results and development examples remain
local and are excluded from publication and installed payloads.

## Installation status

The packages are implemented. Installation remains pending an unresolved native
architecture-selection check; source review and structural checks do not establish
behavioral effectiveness.

After validation, back up and install the four complete folders under
`~/.codex/skills`. Compare existing installed files with their snapshots before
replacement, verify installed hashes, then retire the named `research` and
`code-review` duplicates under `~/.agents/skills`. Confirm discovery in a fresh
session. Installation has not been performed.
