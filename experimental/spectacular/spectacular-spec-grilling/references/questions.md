# Question patterns

Select a question because it removes an important behavioural ambiguity, not because it completes a questionnaire.

## Select the next mode

“What decision could this work prevent, and what evidence is missing?”

- Unclear need or outcome: observe a representative workflow and test the proposed outcome.
- Clear value, uncertain feasibility or current behaviour: run a bounded prototype, benchmark, or trace.
- Existing contract with a defect: reproduce the failure, identify whether the rule or implementation is wrong, then repair the applicable boundary.
- Clear, bounded behaviour: implement and assess the increment.
- Mechanical local correction: make the focused change and check its result.

Several situations may apply. Choose the next commitment whose answer prevents the greatest dependent rework; this is a routing aid, not a mandatory sequence.

## Need and useful outcome

“What work is impossible or unnecessarily difficult today, and what observation would show that this change fixes it?”

Follow with a real or representative task when the requested feature may be only one possible solution. Treat the workflow outcome as the need; a report, export, API, or automation is only a candidate means.

## Identity and quantification

“Two requests carry the same identifier but different content. Should the second be rejected, replace the first, or be treated as a separate request?”

Ask about identifier scope before retention policy when retention depends on that scope. Inspect an existing binding API contract before asking either.

## Time and competing events

“A cancellation and a completion request arrive together. Which observable outcomes are permitted?”

Separate a required winner-selection rule from a requirement that either winner is acceptable provided the state invariant holds. The latter does not necessarily require specifying an algorithm or wall-clock priority.

## Failure and uncertain completion

“The operation commits, but the response is lost. On retry, what should the caller observe and which effects may repeat?”

Use the case to separate what the caller knows from state retained by the system; an ambiguous response does not establish rollback.

## Permissions

“Access changes between preparation and a new request for the result. At which boundary must the current permission apply?”

Treat a request already in progress as a separate decision when its outcome differs. Treat a permission-service outage as an evidence and failure-policy question; selecting an authentication mechanism does not settle it.

## Scope versus prohibitions

“Is automatic retry absent from this increment, or is the caller prohibited from retrying?”

Keep those commitments distinct. An excluded delete feature also leaves side effects of other operations to be decided explicitly.

## Quantitative targets

“Which workload and observation boundary make this latency target meaningful?”

When nobody knows the feasible target, ask which decision the benchmark should inform. A precise bound without workload and measurement conditions is not acceptance evidence.

## Duplicate authority

“These two documents both define cancellation's stock effect. Can we make one the owner and replace the other definition with a reference?”

Establish equivalence first. Relocating an unchanged statement may be editorial; choosing between different effects is a product change.

## Refinement or conflict

“The shared rule permits completion within five seconds, while this endpoint requires two. Is this an intentional endpoint-specific guarantee under the same workload, or an outdated duplicate?”

Different numbers need not contradict each other. Check the operation, quantifier, population, and whether the stronger bound is feasible and authorised.

## Hidden coupling

“Each booking spec looks consistent alone, but both operations can act on the same stock. Which shared invariant must survive their interleaving?”

Trace the actual interaction and assign the invariant one owner.

## Evidence and authority

“Who or what can establish that this output serves the workflow, rather than merely matching the proposed example?”

A user can authorise a product preference. A performance result needs an observation under stated conditions. An inaccessible source calls for a bounded investigation rather than more interviewing.

## Irreversibility

“What existing promise or data would be expensive to change after this decision?”

Use the answer to decide when evidence is needed. Preserving an option may simply mean leaving a capability unimplemented; a generic plugin system or configuration mechanism is itself a commitment.

## A dependent question that must wait

Example of a dependent batch: “Is identity per account or global?” and “How long should the global identity registry retain entries?”

Settle identity scope first. The second question presupposes a global registry and its mechanism before either is justified.

## Investigation boundary

“What is the smallest check, under which limit, that could change this decision?”

State the question or claim, scope or timebox, actual boundary, input and environment state, expected observation, deliverable, limits, and next decision. Identify whether the result is a supplied report, an inspected artifact, or a check executed here; a supplied report of an execution is not a check run or inspected by the current agent. Include a check or command reference only for an execution that actually occurred. Keep findings separate from a recommendation. A passing fixture establishes only the exercised case; it does not establish every concurrent execution, failure mode, or production guarantee.

## Observed behaviour versus promise

“Is this behaviour required, accidental, or proposed?”

Code, configuration, and existing tests can reveal observations or inferences. They become a retained promise only when an authoritative decision supports them. For a defect, preserve the reproduction while intent is resolved; a repair can follow the existing contract without rewriting it.
