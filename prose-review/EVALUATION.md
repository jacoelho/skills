# Adversarial Evaluation

The skill was evaluated from five independent perspectives. The goal was not a numeric “human” score; it was to find design failures that could make the editor destructive or self-defeating.

## 1. Editorial architecture agent
Finding: five reviewers could become five subjective votes on whether prose “sounds AI”.
Change: facets now have orthogonal responsibilities; findings require concrete reader/reasoning cost; synthesis clusters causes rather than counting votes.

Finding: convergence could sand away idiosyncrasy.
Change: minor findings may remain; subjective/cosmetic conflicts stop iteration; unaffected prose is not rewritten for uniformity.
Verdict: acceptable.

## 2. Meaning and epistemic-safety agent
Finding: removing hedges could accidentally strengthen claims.
Change: uncertainty/confidence are invariants; epistemic review must identify the object of uncertainty rather than merely remove qualifiers.

Finding: demands for mechanisms/examples could trigger fabrication.
Change: remedies must be grounded in supplied text/sources/context; otherwise report missing support.
Verdict: acceptable.

## 3. Anti-formula agent
Finding: a banned-word/punctuation list would be brittle and punish legitimate prose.
Change: isolated constructions are explicitly non-defects; reviewers look for repeated rhetorical machinery and unjustified regularity.

Finding: “vary sentence length” could produce fake burstiness.
Change: variation is never a target; form must follow function.
Verdict: acceptable.

## 4. Human-reader / hostile editor agent
Finding: the original approach risked over-reviewing sentences while missing argument-level boredom.
Change: argument-shape maps paragraph function; semantic-density asks what new understanding each sentence adds; conclusion must perform new work.

Finding: “natural” prose could become merely shorter.
Change: compression guardrails preserve mechanisms, examples, difficult reasoning, and necessary pacing.
Verdict: acceptable.

## 5. Skill/runtime agent
Finding: reviewer responsibilities and stopping rules needed to be executable without hidden shared context.
Change: each facet has a narrow contract; all see the same revision independently; the orchestrator owns synthesis/rewrite; fresh reviewers are used after each edit; maximum five cycles.

Finding: “acceptable” needed a material threshold rather than perfection.
Change: convergence is zero blockers + zero high-confidence majors + no regressions/inventions; minors may remain.
Verdict: acceptable.

## Final assessment
The design converged after addressing correlated reviewers, meaning drift, fabrication pressure, detector-gaming, fake randomness, and over-editing. Its central invariant is that prose becomes less alien by making its structure answer to the underlying thought, not by adding noise or chasing an AI-detection score.
