---
name: code-review-orchestrator
description: Multi-agent code review orchestrator for broad, high-signal reviews. Use when Codex is asked to run a code review with multiple subagents, fan out review facets, analyze a pasted diff, PR, branch, commit range, file, directory, current diff, or current codebase across correctness, security, performance, maintainability smells, contracts, tests, or conventions, deduplicate overlapping findings, verify candidates, and produce a concise evidence-backed summary.
---

# Code Review Orchestrator

## Goal

Run the review as an orchestrator. Scope the target from the user request,
launch independent facet subagents, deduplicate candidate findings, verify
plausible issues, and report only findings backed by concrete evidence.
Subagents collect evidence; the main agent owns synthesis, ranking, and the
final answer.

## Phase 0 - Input And Scope

Gather the review target before launching agents.

Use the first matching scope source:

1. Pasted diff or patch: review exactly that diff. Use any paths in the diff to
   read surrounding context.
2. Explicit target: review the supplied PR number, branch, commit range, file,
   or directory.
3. Natural-language scope: infer the requested module, behavior, concern, or
   review mode from the prompt.
4. Current diff fallback: run `git diff @{upstream}...HEAD` when an upstream
   exists; fall back to `git diff main...HEAD` or `git diff HEAD~1`.

Also run `git diff HEAD` when there are uncommitted changes or the range diff
is empty. If the user supplies both a diff and a broader request, review the
diff first and use the broader code only as context unless the user explicitly
asks for a codebase-wide review.

For prompts like `review the current codebase`, `review this repo`, or similar,
perform a best-effort codebase review:

- Inspect repo manifests, top-level layout, entrypoints, public APIs, recently
  changed files when available, large or complex files, tests around selected
  modules, and governing `AGENTS.md`/`CLAUDE.md` files.
- Build a representative review set before launching agents and include the
  selected paths or excerpts in each agent prompt.
- Exclude generated, vendored, dependency, and build output directories unless
  the user asks to review them.
- Do not imply exhaustive coverage. Name the selected areas and material limits
  in the final summary.

Treat the resulting diff, target, path set, or representative codebase sample
as the review scope. Read surrounding functions, callers, callees, tests, and
governing instruction files only as needed to judge in-scope behavior.

Ask one short question only when the target is ambiguous enough that a
reasonable default would review the wrong thing.

## Phase 1 - Facet Agents

Launch one subagent per facet in a single tool message when the environment
provides a subagent mechanism. If no subagent mechanism is available, run the
facets serially and disclose that limitation in the final summary.

Use the supplied facets when the user gave them. Otherwise choose 5-10 facets
from the facet prompt library below. Prefer facets with different failure
mechanisms over broad category coverage.

Give each subagent a self-contained prompt:

- review target and exact scope
- diff, target excerpt, selected path set, or representative codebase excerpts
  plus paths to relevant files
- the single facet it owns
- the matching facet prompt from the library below
- instruction to ignore unrelated facets except where needed as evidence
- instruction to return at most 8 findings and never pad weak ones
- output schema below

Do not share intermediate conclusions between facet agents. Do not let one
facet suppress another. Verification decides whether concrete uncertain
candidates survive.

Facet output schema:

```json
[
  {
    "facet": "short-kebab-case",
    "file": "path/to/file.ext",
    "line": 123,
    "finding": "one-sentence statement of what is wrong",
    "evidence": "specific line, quote, command output, or traced behavior",
    "risk": "concrete consequence if left unchanged",
    "smallest_correct_fix": "minimal fix that makes the behavior correct"
  }
]
```

Use `line: null` only when no line number exists.

## Facet Prompt Library

Use these prompts verbatim where they fit. Omit irrelevant facets; do not make
agents run broad prompts against code that cannot contain that defect class.
When the review scope is not a diff, adapt references to changed lines, hunks,
or introduced behavior to the selected code regions and their current behavior.

### runtime-correctness

Read every hunk or selected code region line by line, then read the enclosing
function for each one. Bugs in unchanged lines of a touched or selected
function are in scope when the review target exposes them. For every changed or
selected line ask: what input, state, timing, or platform makes this line wrong?
Look for inverted or wrong conditions, off-by-one errors, null or undefined
dereferences, missing `await`, falsy-zero checks, wrong-variable copy/paste,
swallowed errors, unescaped regex metacharacters, and boundary cases the code
does not exclude.

### removed-behavior

For every deleted or replaced line, name the invariant or behavior it enforced.
Then search the new code for where that invariant is re-established. Flag a
candidate only when you cannot find the replacement guarantee: removed guards,
dropped error paths, narrowed validation, removed cleanup, lost ordering, or a
deleted test that was covering a real behavior.

### cross-file-contract

For each changed or selected function, method, type, endpoint, event, or
exported value, trace its callers and callees. Check whether the review target
breaks or violates a call-site contract: new or undocumented precondition,
changed return shape, changed exception/error behavior, changed mutability,
changed async timing, changed ordering, or changed ownership/lifetime. Also
check whether related code in the same scope makes an existing call unsafe.

### language-framework-pitfalls

Identify the languages and frameworks touched by the review scope, then hunt
for their classic traps. Examples: JavaScript falsy-zero, loose equality,
missing `await`, closure-captured loop variables, React stale closures or unsafe
render effects; Python mutable defaults, late-binding closures, broad exception
swallowing; Go nil-map writes, range-variable capture, nil interface confusion;
Rust accidental clone-heavy hot paths or incorrect `Send`/`Sync` assumptions;
SQL injection and transaction boundary mistakes; timezone/DST drift; float
equality. Flag only pitfalls introduced, exposed, or evidenced by the review
scope.

### wrapper-proxy-cache

Use this facet when the review scope adds, modifies, or includes a wrapper,
proxy, cache, decorator, adapter, provider, middleware, or repository-like
forwarding type.
Check that every method routes to the wrapped instance rather than back through
a registry, session, global singleton, or the wrapper itself. Look for accidental
recursion, bypassed cache invalidation, missing forwarded methods, mismatched
errors, lost context/cancellation, incorrect lifetime ownership, and behavior
the wrapper fails to preserve for callers.

### security-data-integrity

Focus only on concrete security or data-integrity issues introduced by or
evidenced in the review scope. Trace untrusted input, credentials,
authorization decisions, tenant/user boundaries, persistence writes, migrations,
deserialization, subprocess calls, file paths, network targets, and logs. Flag
injection, auth bypass, privilege escalation, cross-tenant data exposure,
sensitive data leakage, unsafe deserialization, path traversal, command
execution, transactionality bugs, and data corruption with a specific trigger.
Do not report generic hardening, theoretical best practices, rate limiting, or
denial-of-service unless the review scope creates or proves a concrete exploit
or corruption path.

### concurrency-resources-performance

Look for timing, lifecycle, and cost regressions. Flag data races, missed
cancellation, goroutine/task/thread leaks, lock misuse, use-after-close,
resource leaks, non-atomic read/modify/write sequences, sequential execution of
independent operations, repeated I/O, duplicate serialization, blocking work
added to startup or hot paths, and long-lived closures that retain large
enclosing scopes. Name the cheaper or safer implementation.

### tests-behavior

Review tests only as evidence for changed or selected behavior. Check whether
the diff removes a test that protected a real invariant, changes assertions to
match a buggy implementation, adds behavior without any test or executable check
for the new contract, or leaves selected codebase behavior unprotected where
tests are the expected project feedback mechanism. Report missing tests only
when you can name the concrete behavior now unprotected and the failure it would
have caught. Do not report generic "add more tests" findings.

### simplification-reuse-altitude

Look for changed or selected code that duplicates an existing helper,
reimplements an existing pattern inconsistently, leaves dead code behind, adds
an abstraction, parameter, hook, or extension point with no current need, or
fixes the symptom at the wrong depth. Special cases layered onto shared
infrastructure are evidence the fix may not be deep enough. Prefer deleting
complexity, inlining speculative generality, or generalizing the underlying
mechanism when the local special case leaves the same bug class possible
elsewhere.

### domain-modeling-smells

Look for changed or selected code where names obscure the real domain concept,
the same fields or parameters repeatedly travel together, or primitives and
strings stand in for concepts with hidden validation or formatting rules. Flag
Mysterious Name only when the unclear name hides an invariant, makes call-site
intent ambiguous, or prevents an honest domain name from being expressed. Flag
Data Clumps and Primitive Obsession only when they make invalid states
representable, duplicate validation, or spread a domain rule across call sites.
Prefer renaming to the real concept, introducing a small domain type, or
bundling repeated fields into one explicit value object.

### change-coupling-smells

Look for changed or selected code where the same logic shape appears in
multiple places, the same switch or if-cascade recurs on the same concept, one
logical change requires scattered edits, or one module is being changed for
unrelated reasons. Flag Duplicated Code, Repeated Switches, Shotgun Surgery, or
Divergent Change only when the evidence shows future changes are likely to miss
a site, diverge behavior, or force unrelated edits. Prefer extracting the
shared shape, centralizing the dispatch table or polymorphic behavior, gathering
code that changes together, or splitting unrelated reasons for change.

### object-boundary-smells

Look for changed or selected code where a method reaches into another object's
data more than its own, callers navigate long message chains, a class or
function mostly delegates onward, or a subtype or implementation ignores the
contract it inherits. Flag Feature Envy, Message Chains, Middle Man, or Refused
Bequest only when the boundary causes leaked internals, fragile call paths,
unnecessary indirection, or contracts that implementers cannot honestly satisfy.
Prefer moving behavior onto the data it uses, hiding traversal behind one
method, deleting pure pass-through layers, or replacing inheritance with
composition.

### project-conventions

Find the instruction files that govern the changed code: repository
`AGENTS.md`/`CLAUDE.md`, user-level instructions if available, and any
directory-level instruction file that is an ancestor of a changed or selected
file. Check only explicit rules. Flag a violation only when you can quote the
exact rule and the exact changed or selected line that breaks it. Do not infer
"spirit of the doc" style preferences.

## Phase 2 - Deduplicate and Normalize

Wait for all facet agents. Flatten their findings and drop entries that lack
specific evidence or a concrete risk.

Architecture and simplification candidates may survive as full findings when
the evidence proves a present structural failure mode in the review scope.
Concrete maintainability risk includes missed update sites, duplicated
invariants, divergent behavior, change amplification, unclear ownership,
invalid states being representable, unnecessary dependency paths, and
abstractions that make the current code harder to reason about without serving
the current spec.

Deduplicate across the full set, not per facet. Two findings are duplicates
when they identify the same root problem, even if they came from different
facets or cite different symptoms. Keep the version with the clearest evidence
and most actionable fix; merge distinct risk details into the retained finding.
Do not merge findings that share a line but describe different mechanisms.

Normalize each survivor:

- `finding`: what is wrong, not the proposed fix
- `evidence`: the decisive observation supporting it
- `risk`: a concrete correctness, security, operational, performance, or
  maintainability consequence
- `smallest_correct_fix`: the smallest change that restores the invariant,
  contract, or simpler structure

Do not report style, naming, preference, speculative architecture, or missing
tests unless tied to a concrete changed behavior, selected in-scope behavior,
explicit project rule, or maintainability failure mode with concrete evidence.
Reject generic cleanup claims such as "could be cleaner", personal naming
preferences, broad SOLID advice, speculative future extension, or extraction
because code is duplicated once without a divergence or change-risk mechanism.

## Phase 3 - Verify

Run one verifier subagent for each remaining correctness, security, data,
contract, concurrency, high-impact cleanup, or ambiguous maintainability-smell
candidate. Give the verifier the candidate, the review scope, and any relevant
surrounding code. The verifier returns exactly one verdict:

- **CONFIRMED** - the code proves the issue; cite the decisive line or trace.
- **PLAUSIBLE** - the mechanism is real but one trigger/config/runtime fact is
  missing; name the missing fact.
- **REFUTED** - the code contradicts the finding or proves the risk impossible;
  cite the refuting line or invariant.

For architecture and simplification candidates, verification confirms that the
cited structure exists, the maintainability risk follows from that structure,
and the proposed smallest fix removes the structural condition. No runtime
trigger is required for a confirmed maintainability finding.

Keep CONFIRMED findings. Keep PLAUSIBLE findings only when the risk is concrete
and the missing confirmation fact is explicitly named. Drop REFUTED findings.

## Phase 4 - Gap Sweep

For thorough reviews, high-risk diffs, or inconsistent facet results, run one
fresh sweep subagent after verification. Give it the deduplicated survivor list
and ask only for missed findings not already listed. Add only new findings with
specific evidence, then deduplicate and verify them using the same rules.

## Output

Report findings first, ranked by severity and confidence. Include confirmed
architecture and simplification findings in this same list, usually below
correctness, security, and data-loss findings unless the maintainability risk is
severe. Use this structure:

```markdown
Finding: <what is wrong>
Evidence: <specific proof>
Risk: <concrete consequence>
Smallest correct fix: <minimal fix>
```

After findings, include a short summary of review scope and coverage limits. If
nothing survives verification, say so directly and name any material limits,
such as unavailable runtime, skipped generated files, or serial execution due
to missing subagent support.
