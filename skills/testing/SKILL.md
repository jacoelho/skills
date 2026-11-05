---
name: testing
description: Test-quality criteria for designing tests before they are written and reviewing existing ones - defect detection, independent expected values, boundaries, doubles, isolation, flakiness and cost. Not a test-first workflow (see `mattpocock-skills:tdd`).
argument-hint: "[design | review] [code or test path]"
---

# Testing

## Modes

- **Design** (usual: consulted before tests exist): recommend tests in the design output below. "No new tests needed" is valid if you name the existing tests that already catch the defects.
- **Review**: report findings in the review format below. Give per-test verdicts or fixes only when asked. A failing test for a contract defect is evidence, not a fix, so it is always required.

Read the contract (docs, types, callers, requirements), implementation, tests, fixtures and assertion helpers.

A finding or recommended test must name one of: a defect that would go undetected (the wrong implementation or input that passes); a behaviour-preserving refactor that breaks a test; or a real maintenance or diagnostic cost. Report unverified premises as uncertainties.

## Describable defects need a failing test

If you can state "given this input and action, the contract says A, the code does B", specify a test that fails on current code: setup, action, expected value with its contract source, actual result. If you can run code, run it and report the failure; otherwise mark it "not run". Never replace it with prose: if the contract states the right result, the test pins it, however obvious the defect.

Exception: the contract does not define the right result. Say so, name the decision and its owner, and describe the test each option implies. This exception is narrow. If every reasonable contract rejects the current behaviour (a duplicated side effect, data loss, a crash), specify the test for that invariant (for example, "the side effect happens at most once") and flag the remaining choice in the same finding.

## Criteria

File each finding under one criterion, its main cause, so one issue is not reported twice. Use the bold label in the report.

**Coverage.** Value a test by the defects it catches, how faithfully it reproduces real behaviour, and how clear its failures are. Before claiming a gap, say what existing assertions leave unprotected. Unit and integration tests of one behaviour can catch different defects. Redundancy needs proof that deleting the test loses nothing; similar setup or covered lines are not proof. Line coverage shows what ran, not what was checked. Mutation testing, where available, is direct evidence. Choose tests by risk and cost, not pyramid ratios. Cost includes feedback time: a slow test runs less often and catches defects later.

**Oracle.** Expected values come from a source independent of the code: worked examples, the contract, properties, or a reference model checked against known examples. Trace expected and actual values to their sources. Flag tests that assert their own setup, compute expected from actual, or copy production logic, and name a wrong implementation they would accept. Returning an input unchanged may be the contract. Shared helpers or literals alone are not tautology. Characterisation tests record current behaviour; they do not show it is correct. Add properties (round-trips, invariants, equivalence with a simpler model) alongside worked examples when the input space is large or edge cases are hard to enumerate.

**Boundary.** Prefer the boundary consumers use. Public does not mean contract; internal functions can own real invariants. A claim about application behaviour needs at least one test through the production entry point (HTTP handler, CLI, queue consumer). To show coupling, name a behaviour-preserving refactor that breaks the test. Exact bytes, stored formats, counts, destinations and ordering are valid assertions when contractual.

**Assertions.** Several actions or assertions can support one guarantee. Assert every fact it needs, including what must not happen: duplicates, wrong destinations, effects after rejection. Match counts and ordering to real delivery and retry semantics; one local call does not prove exactly-once. Use distinct input values so swapped or ignored inputs show up. An expected error or plain completion can be the expected result.

**Doubles.** Use the cheapest scope that keeps the claimed behaviour. A double shows how your code handles a response or that it makes a required call, never how the provider behaves. For reused fakes with logic, list where they differ from the real thing and check what tests rely on against it. Fixed-response stubs need no such check. Run your own mapping, serialisation and dispatch before the double takes over. Keep one real-system test for assumptions a double cannot check.

For "data is saved" claims: commit fixture data, keep production transaction lifetimes, and read back through a new session so ORM caches or rollback fixtures cannot hide a missing save or commit. Test partial failure when atomicity is promised. Bound waits for delayed visibility.

**Isolation.** Each test owns its state, resources, cleanup and deadline, and passes in any order and under the suite's parallelism. Inject clocks and random sources; log the seed or failing input of generated tests and bound their exploration. Wait for observable events, not sleeps; a wall-clock wait needs a timing contract, deadline, and failure message showing the state reached. Controlled schedules give reproducible interleavings. Race detectors (`go test -race`) find unsynchronised memory access, but only on paths that run. Use both: schedules check ordering, detectors check memory access. Retries must not hide flakes.

**Diagnostics.** Keep a case's inputs, action and expectation visible together; helpers hide only irrelevant mechanics. A failure message names the scenario, inputs, and expected versus actual. Report demonstrated costs, not naming or formatting taste.

**Testability.** Keep decisions separate from side effects. An interface or adapter needs a real boundary (I/O, process, vendor, second production implementation) or a production consumer; test substitution alone is not enough. Exposing state only for assertions adds coupling. Test-only bypasses cannot prove the behaviour they replace. Faster tests do not justify extra production work or duplicated logic. Show a regression test fails on the old defect where feasible.

**Safety.** Harm the test run itself causes.

## Severity

Base it on consequences supported by the inspected paths and the remaining suite gap.

- P0: the test run causes severe, hard-to-reverse harm (production data, real charges, real users). Missing coverage is never P0.
- P1: the test run writes to shared environments or leaks secrets; or a serious failure on an inspected production path can go undetected (a double's limits alone do not show this); or a test defect broadly disables checks (assertions that never run).
- P2: ungated live-network or external-service use; a non-trivial defect can go undetected; a behaviour-preserving refactor breaks tests; flakiness, isolation or diagnostics materially weaken verification.
- P3: a trivial defect can go undetected, or limited maintenance or diagnostic cost.

Report P0-P2 by default; P3 when cleanup is in scope. No quotas.

## Repeat reviews

One finding is one guarantee broken by one cause; group its locations. Rewording or moving an issue does not make it new. The caller supplies earlier findings; a changed conclusion needs changed code, requirements or evidence, or an explained correction. Absence from a later report is not resolution. Write no tracking files.

## Output

Open with one sentence: scope, outcome, completeness.

Design, one entry per test: `<scenario> - <boundary>; catches: <defect>; expected: <value and independent source>; doubles: <what is substituted and why>; reuse: <existing test or none>`. List blocking contract questions separately.

Review, ordered by severity then location:

```text
1. [<priority>][<label>] <factual title> - <file:line>
   <Evidence, consequence, what existing tests cover.> Failing test: <spec; run or "not run">
```

Mark observed results versus static reasoning. If nothing qualifies: "No material findings in the inspected scope." Close with checks passed, failed or not run, and limits; an unrun check is not a pass.
