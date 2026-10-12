---
name: planning-and-task-breakdown
description: Plan implementation from accepted requirements and architecture, break work into executable slices, or reconcile an existing task plan. Use when sequencing and dependencies need explicit coordination; architecture selection and requirements clarification remain separate decisions.
---

# Planning and Task Breakdown

Produce a plan that an implementer can execute without inventing consequential requirements or ownership decisions.

## Ground the work

Read the requested outcome, relevant code and checks, authoritative requirements, accepted architecture and any existing plan. Identify the current owner and observable boundary for the affected capability. Record material assumptions and missing evidence.

Consume accepted architecture, including migration and deletion constraints. Architecture selection remains with the architecture workflow; requirements remain with their authoritative source. If evidence invalidates a settled decision, identify the conflict and the dependent work that must wait rather than quietly redesigning it.

For an existing plan, reconcile actual progress with its status. Preserve completed outcomes while their acceptance evidence remains applicable. Retain historical evidence, but reopen affected acceptance and dependencies when governing requirements or relevant implementation changes invalidate it. Update only affected tasks and mark superseded work explicitly instead of retaining competing plans.

## Shape executable slices

Prefer vertical slices that deliver an observable outcome through the affected boundary. Include integration, caller migration and removal of superseded paths when the accepted design requires them. Preparatory work is useful when it enables a specific slice or protects a required contract.

For each consequential task, identify:

- Outcome and authoritative requirement or architecture references.
- Dependencies and the evidence or output needed from each prerequisite.
- One responsible owner, permitted write scope and likely files or boundaries to inspect; file estimates are guidance, not caps.
- Observable acceptance boundary and independent expected behavior.
- Relevant verification commands or probes, including their prerequisites and availability.
- Stop or replan conditions: the assumption, contract conflict, ownership overlap or failed verification that changes the task.

Separate investigation from implementation when its result could alter the approach. Give the investigation a concrete question, evidence to gather, bounded effort and decision output. Block only tasks that actually depend on that output; identify work that can proceed independently.

When concurrent work is worthwhile, give writers disjoint ownership or sequence overlapping edits. A dependency is satisfied by its stated acceptance evidence, not merely by a task being marked done.

## Deliver and finish

Reference requirements and decisions rather than reproducing their rules in a second specification. Put operational detail in the plan where an implementer needs it, including commands derived from the repository and honest limits when checks cannot run.

Keep simple work inline and proportionate. Use [assets/plan.md](assets/plan.md) only when a durable plan or receiving-agent handoff benefits from the compact template; adapt it to existing repository conventions. Identify the governing and workspace state associated with checked evidence; a receiver compares the relevant current state before reusing that evidence. Planning alone does not require a new file, approval stage, reviewer panel or commit.

Finish when every accepted outcome has an executable task and verification, dependencies are ordered without cycles, write ownership is clear, and consequential unknowns have explicit investigation or resolution paths. State any remaining blocked outcome and the decision needed to unblock it.
