# Article profile

An article explains an idea or argues a position from the author's selected material. The author's meaning and voice are the standard, not a template.

## Questions to settle first

- What is the main point, and who needs to understand it?
- Which claims are the author's opinion, which are reported, and which are observed?
- What must the reader already know, and what must the article explain?
- Which notes are content, and which are directions to the writer? Directions are never content.

When the material leaves the main point or audience unclear, say so rather than writing around it.

## Explain before compressing

- Let the reader grasp the main point before adding secondary implications.
- Choose a sequence that suits the argument. Do not force thesis, example, caveat.
- Keep the supporting step that makes a conclusion understandable. Naming both ends of a relationship is not explaining it.
- Introduce a term where it becomes useful, and keep necessary technical terms.
- A necessary explanation may grow when unpacked. Cut duplicates and detours before cutting explanation.
- Under a hard word limit, cut repetition and optional examples first.

## Evidence and invention

- Do not invent statistics, studies, quotations, causes, examples presented as real, or first-person experience. An illustration must be permitted by the material and clearly hypothetical.
- You may state a connection the premises entail. Do not add a factual premise, and keep inference distinguishable from observation.
- "May" does not become "will". An observation does not become a cause. An opinion does not become a finding.
- Preserve the source's actual strength. Over-caution is also a distortion: a recurring observation must not shrink into a mere possibility.
- Keep quotations exact, and remove the quotation marks from anything paraphrased.
- When a selected claim conflicts with reliable evidence, report the conflict. Do not change the thesis silently.
- Show a claim's strength once, in the sentence that makes it, then move on. Do not write commentary about what the evidence can or cannot show, or labels such as "this is my view rather than a finding" when the wording already says so. Repeated hedging buries the argument and is not fidelity.

## Voice

When the user asks for a named voice, load that voice skill, such as `voice-practitioner`. If it is unavailable, say so in the findings and continue without it. The contract in `SKILL.md` and this profile outrank any voice. A voice may override the sentence rules and the ban on rhetorical questions in the organisation reference, and Vale's long-sentence alerts.

Follow supplied samples for cadence, vocabulary, directness and level of explanation. Do not borrow their facts, anecdotes or unusual phrases, and do not let voice strengthen a claim. Without samples, write natural, precise prose and invent no persona.

Scan-surface rules apply only to the article's headings and lists. Vary sentence length when it helps the explanation. Do not chop every sentence short.

## Leakage

Direct leakage is any reference to this drafting session, the writer, revisions, working labels or review findings.

Indirect leakage is harder to see, and lint cannot detect it:

- A rejected topic returns as a disclaimer: "although mentoring also matters, it is out of scope here".
- A comparison exists only to answer earlier feedback.
- A writing direction becomes a claim about the subject. "Make it practical" becomes "this is a practical rather than academic approach".

Ask whether a passage serves the reader or the editing exchange. A direction to leave out a topic usually means omitting it, not announcing the omission. A scope statement the reader needs stays.

## Examples

Missing premise. Material: "the town planted trees; energy bills fell", with no causal evidence. Writing "Consequently, residents paid less" asserts an unsupported cause. Keep both observations without the link, or report the gap. Do not insert a plausible mechanism.

Correct the claim, not a caveat. "Faster generation always increases the backlog, although this depends on review capacity" contradicts itself. Write "The backlog grows when more changes are submitted than reviewers finish."

Keep the condition. Material: a retry is safe only under the same idempotency key. "Retries are safe" drops it. Write "Reuse the same idempotency key when retrying, so the service recognises the retry."

Leave effective prose alone. "The queue grew because new requests arrived faster than the worker could finish them" needs no rewrite into abstractions.
