---
name: architecture
description: "Architecture, design or maintainability review of code: a diff, branch, refactor, module or subsystem, and on request the fixes for its findings. Use for coupling, change at a distance, where logic should live, ownership and boundaries, or when asked to fix, remediate or refactor toward them. Judges design rather than hunting line-level defects."
argument-hint: "[diff | branch | module path] [facet or rule names] [fix]"
---

# Architecture

Central question: does this design reduce the knowledge needed to understand, use,
change, verify and operate the system while preserving its guarantees, or does it
only move complexity elsewhere?

The review is read-only. It edits code only in [Fix](#fix), which runs when the
user asks to fix, remediate or apply the findings. The design standard is the rules in
[facets](references/facets.md), together with the project's authority documents
(agent instructions, contracts, decision records) and any user instructions in
context; where those conflict with a facet rule, they win. Explicit requirements,
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
eight, or the total budget the user sets, and record the rest as
uninspected.

**Focus.** The user may name facets or rules to review, in the facets' own
names or in their words: "implicit" or "hidden state machines" is the facet 4
signal for hidden state machines, and "enforcement" the facet 8 signal for
unenforced rules, and "axiomatic design", "design matrix" or "functional
independence" is facet 2's requirement map. Name the resolved facets and rules in the report. A focus
steers step 1: before ranking, search for the focus's signals (fields written
from several modules for facet 1, import lists for dependency rules,
deprecated, legacy or compatibility markers and forwarding wrappers for facet
6) and, within each group above, rank the boundaries they flag first. Only the
focus opens candidates; steps 2 and 4, consolidation and severity are
unchanged, and Coverage lists the facets not applied.

Steps 2–5 apply to the selected boundaries.

**2. Trace ownership.** For each selected boundary, identify the owner of each
fact, invariant, state transition and resource, and which other modules depend on
that knowledge. Then build the *requirement map*: list what the selected
boundaries must deliver, each a behaviour a consumer relies on, taken from the
project's documents, tests and public surface, and for each requirement the
modules that must change when it changes, each cell citing the line that shows
it. Rows cover only the selected boundaries; a cell not read goes to Coverage.
Done when every selected boundary has a named owner or a recorded ambiguity, and
a requirement map. Carry each ambiguity to step 4 as a candidate breach of **Complete
design** (facet 9); its scenario is two plausible readings that behave
differently.

**3. Apply the facets in priority order.** Read [facets](references/facets.md) and
work through them, single source of truth first. Run the change-impact scenarios on
every selected changed boundary and on any module where step 2 or facets 1 and 2 found shared or
hidden knowledge. Done when every selected boundary has passed through each facet
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

## Severity

Grade by consequence, whichever facet found it; report most severe first. A
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
except where **Delete obsolete paths** (facet 6) keeps one.

A recommended test passes **Contract tests** and **No tautological tests** (facet
8) and runs through the public surface, existing or defined by the
recommendation. For each confirmed finding with a demonstrated consequence,
describe a regression test: the observable input or action, and the expected
result taken from the requirement. When no such test exists, say so and why.

When a recommendation moves a boundary, ownership or contract, name the project
document that records it and must change with it (facet 9).

For a finding about coupled requirements, show their rows of the requirement
map before and after the recommended change.

When the class of defect could be reintroduced by a later change, name the
cheapest guard that rejects it, taking the first that can: a design in which the
defect cannot be expressed, a type, a lint or architecture check (a forbidden
import, a banned call), a test. A guard runs in the project's existing checks; one
that nothing runs guards nothing.

## Report

1. **Assessment:** three to five sentences: design properties any fix must
   preserve, the dominant weaknesses, the main source of coupling or complexity,
   when reviewing a change, whether it improves or worsens maintainability, and
   the inspected boundaries' shape from the requirement map (uncoupled,
   decoupled or coupled; facet 2), decided after step 4 and naming any coupled
   requirements.
2. **Findings**, most severe first:

   **[Severity] Title**: confirmed | conditional
   - **Location:** files, symbols, lines; only lines read in this review.
   - **Evidence:** the code or dependency relationship, and the rule breached when
     there is one.
   - **Impact:** the concrete consequence and the scenario that triggers it, or,
     for a breach with no consequence yet, as in step 4.
   - **Change scenario:** a realistic modification that exposes the weakness,
     required for facet 1 and 2 findings with a demonstrated consequence.
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

## Fix

Fix runs in this session, one finding at a time. Each fix is committed on its
own, so the commit before it is the tree it is judged against, and proven by the
check in **Loop** step 2. Start no subagent except as **Delegation** says.

### Setup

1. **Clean tree.** The checkout must have no uncommitted changes, since the
   worktree would lack them; when it has some, stop and ask before reviewing.
2. **Resume or review.** `<tag>` is the user's, else the scope's last path
   element (`billing`). When `../<repo>-architecture-<tag>/ledger.md` exists
   and has `open` findings, resume from it and the `review.md` beside it, and
   skip to **Loop**. When it exists with none open, add a numeric suffix to the
   tag. Otherwise run steps 1–5 on the scope and report.
3. **Workspace.** Create a worktree at `../<repo>-architecture-<tag>/tree` on a
   new branch `architecture/<tag>` from the reviewed revision, unless the user
   asks to work in the current checkout; then branch first when it is on the
   default branch. Every edit, reset and commit happens there. Nothing is pushed.
4. **Ledger.** Save the review report as `../<repo>-architecture-<tag>/review.md`
   and copy the [ledger](assets/ledger.md) beside it, both outside the worktree
   so no reset touches them. Enter each finding, and each Improvements breach
   the focus opened.
5. **Budget.** The candidates are the user's choice; otherwise, with a focus,
   every entry the focus opened, and without one, every Critical and High
   finding. Mark the ten most severe candidates `open`, or as many as the user
   sets, and every other entry `deferred`.
6. **Checks.** Record the repository's verification commands (agent
   instructions, Makefile, CI) in the ledger and run them once. When they fail
   before any fix, stop and report: a red base proves nothing.

### Loop

Take the most severe `open` finding; among equals, the one other findings
depend on. Update the ledger after every step, so an interrupted run resumes
from it.

1. **Dispose.** Re-read the cited code. Mark the finding `rejected`, with the
   reason, when it does not hold. Mark it `pending`, with the question and the
   options, when its fix needs an owner's decision: a product behaviour, a
   breaking change to an external contract, or a persisted or wire format
   change. Either way, take the next finding.
2. **Check first.** Write the acceptance check: one command that exits non-zero
   while the defect is present and zero once it is gone, usually a test the fix
   adds, selected exactly and meeting the tests rule in
   [Recommendations](#recommendations), or for a structural finding (a diverged
   duplicate, a forbidden dependency) the guard below. Run it before changing
   anything; it must fail, by assertion rather than by a build error where the
   surface allows. A check that passes means the finding or the check is wrong:
   correct one of them once, then mark the finding `rejected` if it still
   passes. Only when no command can fail on HEAD, as for a type change that
   makes a state unrepresentable, the check is the contract tests covering the
   affected behaviour, added first when none exist, passing before and after;
   the ledger then records what the commit makes unrepresentable or deletes.
3. **Fix** the root cause as [Recommendations](#recommendations) directs: the
   smallest change that removes it, the obsolete path deleted, the recording
   document updated, and the guard added when the class could recur.
4. **Prove.** Run the acceptance check, the affected packages' tests and the
   formatter. Commit the finding alone with a message naming it, and record the
   commit and the check in the ledger as `fixed`.
5. **Give up cleanly.** When a second attempt fails the same check, the attempts
   share a wrong assumption: reset the worktree to the last commit, mark the
   finding `blocked` with that assumption and what was learned, and take the
   next finding.

### Close

When no `open` finding remains:

1. Run the recorded verification commands. A failure is fixed at its root; when
   one finding's commit causes it and two attempts fail, revert that commit and
   mark the finding `blocked`.
2. Review the branch diff against the reviewed revision once, with steps 2–5
   and every facet whatever the focus, on the boundaries the commits changed,
   reporting only breaches the diff introduces. Each is fixed through **Loop**
   whatever its severity and the budget, or its commit is reverted and its
   finding marked `blocked`. Do not review again after that pass.
3. Run the verification commands again when step 2 changed anything.

### Delegation

- `jacoelho:consultant`, once per finding, when its disposition or fix design
  stays uncertain after reading the code.
- `jacoelho:critic`, once on the final diff, when it changes an exported API, a
  persisted or wire format, a schema, concurrency, or security. Resolve material
  findings, then rerun the verification commands.

Do not ask whether to continue while an `open` finding remains.

### Fix report

The branch and worktree; per `fixed` finding, its commit and acceptance check;
`pending` findings with the owner's question and options; `blocked` and
`rejected` findings with their reasons; `deferred` findings; the verification and
critic outcomes.
