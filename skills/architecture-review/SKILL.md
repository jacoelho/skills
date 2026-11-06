---
name: architecture-review
description: "Architecture, design or maintainability review of code: a diff, branch, refactor, module or subsystem. Use for coupling, change at a distance, where logic should live, ownership and boundaries. Judges design rather than hunting line-level defects."
argument-hint: "[diff | branch | module path]"
---

# Architecture review

Central question: does this design reduce the knowledge needed to understand, use,
change, verify and operate the system while preserving its guarantees, or does it
only move complexity elsewhere?

The review is read-only. The design standard is the rules in
[lenses](references/lenses.md), together with the project's authority documents
(agent instructions, contracts, decision records) and any user instructions in
context; where those conflict with a lens rule, they win. Explicit requirements,
persisted data formats and operational constraints are binding whether or not
anyone restates them; where the code cannot show whether stored data or deployed
consumers depend on something, list it under Coverage to verify rather than
assuming either way. Judge anything the
standard does not cover by demonstrated consequence, not by conformance to a named
methodology or pattern. A breach of the standard is reportable with the rule cited
as evidence; its severity still comes from its consequence.

## Steps

**1. Fix the scope.** Use the change the user names; otherwise the current branch
against its base plus uncommitted work; for a named module, its public surface and
callers.

A *module* is the smallest unit that groups several types or functions behind
a visibility boundary, set by the language or by a convention the project
states: a package, crate, namespace or library; a single class counts only when
the language offers nothing larger. A
*boundary* is either a module's exported surface together with all its
consumers, or one point where external input (user data, files, another
process, the network) enters a module. A library's public API is a boundary
whose consumers are unknown: judge it by what callers can depend on, not by the
callers in the repository. Reviewing a boundary includes the code on both sides. A boundary
is *changed* when the scope modifies its surface, or code on either side that
produces or consumes it.

Read the project's authority documents. When they distinguish a version in
force from a proposed one, judge against the version in force and report code
that depends on the proposal under Coverage.

Done when every boundary the scope crosses is listed with its consumers. Select
changed boundaries first, then the rest; within each group, rank by the number
of distinct types, functions, input formats and documented rules consumers
reference across the boundary, then by number of consumers, treating a public
API's consumer count as larger than any in-repository count. Review the top
eight, or the total budget the user or an orchestrator sets, and record the rest as
uninspected.
Steps 2–5 apply to the selected boundaries. A scope too large for one reviewer
is split across agents by `/jacoelho:architecture-remediate` (with `reviewOnly`
for a review that edits nothing); an agent given a role from **Split review
roles** follows that role.

**2. Trace ownership.** For each selected boundary, identify the owner of each
fact, invariant, state transition and resource, and which other modules depend on
that knowledge. Done when every selected boundary has a named owner or a recorded
ambiguity. Carry each ambiguity to step 4 as a candidate breach of **Complete
design** (lens 8); its scenario is two plausible readings that behave
differently.

**3. Apply the lenses in priority order.** Read [lenses](references/lenses.md) and
work through them, change at a distance first. Run the change-impact scenarios on
every selected changed boundary and on any module where step 2 or lens 1 found shared or
hidden knowledge. Done when every selected boundary has passed through each lens
that applies to it.

This review owns judgements of ownership, coupling and boundary placement. When
your instructions assign a judgement to a specialist, such as public API shape or
a performance investigation, hand off only that judgement, or report it as
unassessed when handoff is unavailable.

**4. Confirm each candidate.** Before reporting, demonstrate a concrete scenario
(inputs, a future change, a failure) that produces the consequence, and check for
existing safeguards that prevent it. Classify a finding as *confirmed* when the
code already exhibits the consequence (for an ambiguity, when the code already
relies on both readings) or when it is an introduced breach (below), and
*conditional* otherwise, stating the condition and evidence it can arise.

A breach with no demonstrable consequence yet is a Low finding only when the
reviewed change introduces it. The change introduces a breach when it creates or
extends it (a new copy of duplicated policy, a new caller of a global), but not
when it moves or reformats code that already breached; in a rewrite, compare
against the code it replaces. Let such a finding's Impact name the risk the rule
guards against, and omit Change scenario and Regression test. List every other
breach without a demonstrable consequence one line each at the end of
Improvements; a module review introduces nothing, so all of its such breaches go
there. Report a style
preference (naming, layout, formatting that breaches no rule) only when the user
asked for one. Consolidate findings sharing a root
cause. A root cause can be a missing concept rather than shared code: when
several confirmed or conditional candidates each exist because the model lacks
the same named concept, report one finding whose Recommendation adds that
concept and whose Location lists every candidate. It takes the highest severity
among them, and is confirmed when any of them is. For
example, a dialog that sleeps 100 ms before refocusing the input and a
settings screen that sets a global flag to suppress that refocus are one
finding: dialogs do not restore focus to whatever held it before they opened.

**5. Stop** when steps 3–4 cover the selected boundaries, or when missing evidence
blocks an assessment; then name what would need to be verified.

## Split review roles

A review split across agents gives each agent one role. The orchestrator decides
how many agents run, the selection budget, and which boundaries each agent gets;
these roles define what each agent does and returns. One agent may be given
several roles, and then performs them in order.

- **Scope:** complete step 1 for the whole scope and return the full ranked
  boundary list with consumers, the authority documents read, and the standard
  that applies. Partition as the orchestrator directs. Review only when also
  given the other roles.
- **Group review:** given the full boundary list, a group of it and the
  standard, run steps 2–5 on the group. Follow a dependency into any other
  boundary when needed, and cite only lines you read. Return five parts:
  findings in the report's finding format; one-line breaches for Improvements;
  coordination items for Change at a distance; Coverage items (uninspected,
  unassessed and to verify); and the step-2 ownership map: each fact, invariant
  and resource, its owner, and its dependents.
- **Merge:** given every group's five parts, merge each part: keep every
  group's Improvements, Change at a distance and Coverage items, including each
  uninspected boundary and partition split, and consolidate findings with the same
  root cause as in step 4, keeping the strongest evidence and re-reading the
  code to settle disagreements on severity or classification. Where the
  ownership maps show knowledge with dependents in more than one group, run the
  lens 1 change-impact scenarios on it and confirm any candidate as in step 4.
  Verify each merged finding against the code, including its cited lines;
  correct references, and drop or downgrade what the code does not support.
  Then write the whole report.

## Severity

Grade by consequence, whichever lens found it; report most severe first. A
resource bound that breaks a stated operating limit is at least High.

- **Critical:** data loss, a broken essential guarantee, or likely severe
  correctness failure.
- **High:** significant correctness risk, or coupling likely to cause defects or
  substantial change amplification on a plausible change; for example, a likely
  future change that breaks a distant module without any test or compile error.
- **Medium:** a concrete weakness likely to cause misuse, divergence or costly
  change: unclear ownership, leaking abstraction, fragmented invariant.
- **Low:** a demonstrable improvement with limited consequence, or a breach the
  change introduces with no consequence yet (step 4).

## Recommendations

Recommend the clean target state that removes the root cause, at the smallest
scope that achieves it. When the defect exposes ambiguous ownership, invalid
state, duplicated policy or unsafe sequencing, change the model or boundary so the
class of defect cannot recur; fix an isolated mistake locally. Recommend deleting
the obsolete path, not a compatibility wrapper, shim or parallel implementation,
except where **Delete obsolete paths** (lens 5) keeps one.

A recommended test passes **Contract tests** and **No tautological tests** (lens
7) and runs through the public surface, existing or defined by the
recommendation. For each confirmed finding with a demonstrated consequence,
describe a regression test: the observable input or action, and the expected
result taken from the requirement. When no such test exists, say so and why.

When a recommendation moves a boundary, ownership or contract, name the project
document that records it and must change with it (lens 8).

## Report

1. **Assessment:** three to five sentences: design properties any fix must
   preserve, the dominant weaknesses, the main source of coupling or complexity,
   and, when reviewing a change, whether it improves or worsens maintainability.
2. **Findings**, most severe first:

   **[Severity] Title**: confirmed | conditional
   - **Location:** files, symbols, lines; only lines read in this review.
   - **Evidence:** the code or dependency relationship, and the rule breached when
     there is one.
   - **Impact:** the concrete consequence and the scenario that triggers it, or,
     for a breach with no consequence yet, as in step 4.
   - **Change scenario:** a realistic modification that exposes the weakness,
     required for lens 1 findings with a demonstrated consequence.
   - **Recommendation:** the change, and which concepts, dependencies, states or
     coordination steps disappear.
   - **Regression test:** as in Recommendations.
   - **Trade-off:** included when the recommendation has a real cost.
3. **Change at a distance:** synchronised updates, hidden dependencies, and
   duplicated knowledge that could diverge; mark each as necessary coordination or
   avoidable coupling, and name the best opportunity to localise change. Refer to
   findings by title rather than restating them. When there is nothing, say so in
   one line.
4. **Improvements:** a short prioritised list favouring changes that remove
   concepts, shorten dependency chains, and reduce the places a future change must
   touch; then the breaches step 4 routes here.
5. **Coverage:** what was left uninspected, specialist judgements left
   unassessed, and what would need to be verified.

When the review finds nothing material, say so and list what was inspected.
