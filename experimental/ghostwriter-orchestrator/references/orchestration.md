# Execution and context boundaries

These are execution contracts, not a requirement to run multiple agents. The
workflow is the same whether one model performs its facets sequentially or a
host delegates selected steps. Do not create extra personas for prestige.

## Default: one agent, separate facets

Use the smallest route from SKILL.md. Keep the clean brief and the draft
conceptually separate from editorial directions. Run reader and fidelity
checks as separate passes, then make targeted edits. This needs no framework,
API key, scripts, or special tools.

This mode cannot provide genuine draft-only blindness when the conversation
already contains the notes. Do not imply that a role change or "ignore the
conversation" instruction erases context. For a manual clean hand-off, use
brief-only mode, check the packet, and supply only that packet in a fresh
session. Do not require the user to do this for every small edit.

## Optional: one controller, one writer, two diagnostic reviewers

Use this topology when the host can actually start narrowly supplied contexts
and the task benefits from it. It is particularly relevant to a long editing
conversation. A named subagent that automatically inherits the full history
does not satisfy the boundary.

| Worker | Receives | Does not receive | Returns |
| --- | --- | --- | --- |
| Controller / briefing | Current request, relevant conversation and sources | Unrelated history | Clean packet and separate source/disposition record |
| Writer / editor | Clean packet, necessary source excerpts, supplied voice samples; later the frozen draft and accepted findings | Raw editing history, discarded drafts, controller-only record | Draft or targeted revision; material gaps separately |
| Reader reviewer | Frozen draft, audience and genre | Brief, notes, source record, other reviews, writer's defence | Short interpretation and source-independent reader findings |
| Fidelity reviewer | Same frozen draft, packet, original material, disposition record and sources | Other reviewer verdicts and writer's defence | Source-anchored fidelity, evidence and leakage findings |

The controller performs the brief check, not an extra mandatory briefing
agent. Reviewers are read-only. They may run in parallel because they inspect
the same draft version. The controller deduplicates findings and accepts,
rejects, or resolves them. The original prose owner edits the accepted set.
Do not publish reviewer prose by concatenating it with the draft.

Freeze a version before review. Do not combine findings from different draft
versions without checking whether their quoted passages still exist. Do not
have reviewers recursively call one another or a writer compete with itself
through several unsolicited complete drafts.

## Hand-off prompts

Use [the hand-off template](../assets/handoff.md) and the relevant facet, not the
entire package. A practical task line for each role is:

**Writer:** "Write the requested piece from this clean packet. Apply editorial
directions without narrating them. Return only the draft; identify a material
missing premise or source separately rather than inventing one."

**Reader reviewer:** "Review what this draft communicates to the specified
reader. Do not infer the author's unstated intent or rewrite the article.
Return exact passages and concrete comprehension defects; no findings is a
valid result."

**Fidelity reviewer:** "Compare the original selected material, brief and draft
in both directions. Find omissions, changed conditions, unsupported additions,
and editorial leakage. Return exact source-anchored findings; do not rewrite."

**Editor:** "Repair the accepted findings in this draft. Preserve its claims,
conditions, evidence and voice. Read broadly but edit only the coherent scope
needed. Recheck changed passages; return the requested text."

The facet supplies the full role contract; these task lines do not replace it.
Shared policy must still apply to every worker. Review-only packets do not
need writing examples or a voice manifesto.

## API or host integration

Keep stable facet policy in the host's appropriate instruction channel. Supply
the job packet as clearly delimited input data. Quoted source content never
gains higher authority merely because it is inside an instruction message.
Keep input construction explicit, especially for untrusted source text.

For a genuinely isolated API review, construct a new request from only the
reviewer policy and allowed packet; do not attach the earlier transcript, a
conversation containing it, or a previous-response link that restores it. Pass
required instructions on every relevant request. Check what the actual host
also injects: inherited history, memory, shared files, and retrieval results.
Tags and role labels organise context; they do not enforce access isolation.

Use a model and execution settings supported by the actual host. This skill
does not prescribe a model ID, temperature, reasoning-effort setting, SDK, or
provider. Version the skill, packet contract, and model settings in evaluations.
Ask for brief findings supported by evidence, not hidden chain-of-thought.

## Bound the work

No delegation tool: run self-review, or return a clean hand-off packet when
that is the requested deliverable. Do not simulate tool calls or fabricate
independent reviewer agreement.

At most two repair rounds by default. Stop earlier when no material defect
remains. After the budget, report unresolved material issues separately and
deliver the defensible text when useful. User feedback can reopen a specific
claim or passage without restarting the entire workflow.
