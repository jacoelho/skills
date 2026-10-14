# Goal prompts

Use only when the user asks for a goal prompt or asks to express a task as a goal for an agent. Merely mentioning a goal in an ordinary prompt-refinement request does not select this mode.

Return a portable prompt for pursuing the requested outcome. Include only the following elements that the task needs, with light headings when useful:

- **Objective:** the concrete outcome or deliverable, expressed directly.
- **Completion:** observable conditions derived from the user's requirements, with proportionate evidence or verification. For research or diagnosis, completion can be an evidence-backed answer or documented uncertainty rather than a predetermined conclusion.
- **Scope and constraints:** required behaviour, exclusions, permitted actions, and any explicitly supplied deadlines, resource limits, or budgets. Preserve exact values; leave unspecified limits unspecified.
- **Context and inputs:** the minimum facts, accessible references, and dependencies the executor needs. Preserve completed work so a handoff continues rather than restarts.
- **Execution boundary:** continue authorised work through verification and correction until completion criteria hold. Where relevant, identify prerequisites that need user input or external change, and preserve approval boundaries for consequential actions. Avoid endless exploration, arbitrary retry counts, or promises of unavailable background execution.
- **Final evidence:** the deliverable and a concise account of verification and unresolved limitations, where useful.

Derive completion criteria from the request; do not invent metrics or expand scope to make the goal appear measurable. Preserve mandated methods while leaving routine implementation choices to the executor. When necessary evidence or authority is missing, make it a prerequisite rather than assuming it exists.

Drafting a goal prompt does not start a goal, schedule work, create a chat, or execute the task. If the user separately requests those actions, use the host's actual capabilities and permissions. Keep deployment instructions outside the copyable goal prompt unless the user requests that instruction surface.
