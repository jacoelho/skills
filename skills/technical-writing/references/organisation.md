# Organisation rules

Read for every draft, improvement, reorganisation and review. The contract in `SKILL.md` outranks everything here.

## Document

- Answer the reader's task early. State what they get or must do before the background.
- Put prerequisites before anything that depends on them.
- Give each section one recognisable reader question. If a section answers two, split it. If two sections answer one, merge them.
- Spend space where a mistake costs most: uncertain, dangerous, irreversible or disputed material gets more detail than routine mechanics.
- Keep useful layering. A summary may precede detail that justifies it.
- If reordering exposes missing reasoning or an unresolved conflict, report it. Do not smooth it over with a transition.

## Sections and headings

- Write informative headings in sentence case. A reader scanning only the headings should learn the shape of the argument.
- Peer headings share one grammatical form.
- Keep current state, proposal, rationale, consequence and uncertainty apart when combining them hides how they relate.

## Paragraphs

A paragraph break is a claim: the blank line tells the reader one unit of thought ended. Make it true.

- Build an explanation in layers. Start from what the reader sees or does, then add one new concept per sentence. Link each step to the one before with a word that states the relationship, such as "because", "so" or "however". Use one only when the source supports that relationship.
- Introduce a new term in its own sentence before a sentence uses it. A paragraph that introduces more than two new terms usually covers more than one job.
- Give each paragraph one job, not necessarily one idea or one sentence shape.
- Start a new paragraph when the paragraph's job, actor, time, alternative, certainty or normative status changes. Break only at such a turn, never just to shorten a block. A break inside one argument tells the reader it ended.
- Let length follow weight. The paragraph carrying the decision or the risk may be the longest.
- Put a warning or decision the reader must not miss at the start of a paragraph or in its own paragraph, never buried mid-paragraph. Keep its condition in the same sentence.
- In Markdown files a single newline joins lines, so separate paragraphs with a blank line. GitHub PR and issue bodies render a single newline as a line break, so do not hard-wrap prose there.
- Keep evidence next to its claim and each qualifier next to what it limits.
- Do not merge similar statements whose scope, certainty or evidence differ.
- Make a condition visible before or alongside the consequence it limits.

## Sentences

- Name the actor when ownership or mechanism matters.
- Prefer direct verbs to abstract-noun chains: "evaluate", not "perform an evaluation of".
- Give each sentence one idea. Keep descriptive sentences to 25 words or fewer and instructions to 20 or fewer, as a ceiling rather than a target. A number, an identifier, a code span or a quoted phrase counts as one word.
- Split without detaching a qualifier. Put the condition first ("When no reader is available, the review skips the check"), or repeat the subject or condition in the next sentence. Keep a longer sentence only when it holds one inseparable condition or a quoted identifier.
- Use a full stop, not a semicolon, between two claims.
- When a change replaces something the reader need not act on, name the old state in a phrase: "the scheduler reads limits from the config file instead of environment variables".
- Prefer active voice. Use passive voice only when the actor is unknown or irrelevant, or the outcome is the point.
- Replace "it", "this" or "these" with the noun when the previous sentence offers more than one candidate. Keep "that" after verbs such as "show", "ensure" and "recommend".
- Keep technical terms to three words or fewer. Restructure a longer one with "of", "for" or "on". Spell out a long official name on first use, then use one short form.
- Prefer short, literal words. Avoid idioms and figurative phrasal verbs ("roll out", "spin up") when a direct verb ("release", "start") fits. Avoid figures that stand in for a statement, such as "load-bearing" for "necessary" or "earns its keep" for "is worth keeping". Use a figure only when it explains what the literal phrase cannot, and only once: a figure repeated through a section stands in for the explanation.
- Use one term for one concept. Do not vary technical nouns for style.
- Introduce an acronym on first use unless the audience already treats it as a standard term.
- Replace unsupported adjectives such as "robust", "seamless", "scalable" or "simple" with the mechanism or consequence the source gives. If it gives none, cut the adjective.

## Scan surfaces

These rules apply only where readers scan and compare: headings, list items, table cells, summaries, status lines, PR titles and findings.

- Put the differentiating words first. Peers that open identically force the reader to read every item.
- Use one structure and one term across peers, with the same fields in the same order.
- Let a peer differ only when the difference means something. Keep a meaningful exception visibly different.
- Make the opening wording match the dominant evidence. When evidence is mixed, say it is mixed.

## Choosing a form

- Lists for parallel items.
- Prose for causal sequences and arguments.
- Numbered lists for steps that must happen in order.
- Tables only when readers compare stable fields across items.
- No deep nesting or decorative callouts.
- Bold a list item's opening words only when they are the term the item defines or what a reader scans for. Bold for one thing a scanning reader must not miss, not for emphasis throughout.

## Priority

When these rules conflict:

1. A safety condition may precede the differentiator, even in a scan surface. "Before deleting the volume, stop the service" keeps its order.
2. Never drop a qualifier to make peers parallel. Never force mixed evidence into one polarity.
3. Scan-surface rules do not apply to paragraphs. Uniform paragraphs read as a template.
4. Do not manufacture variety or uniformity. Repetition that carries meaning stays. Variation that carries none goes.

## Remove

Do not polish a sentence that should not exist: cut it.

Throat-clearing, sales language, rhetorical questions, decorative emphasis, sincerity markers ("honestly", "to be clear"), forced groups of three, artificial conclusions, and transitions that assert a relationship the text has not established. A closing moral or slogan ("boring wins") goes too: state the judgement as a claim about this case ("we chose Postgres because we already run it"). Also remove reports of checks that found nothing and need no action from the reader. Also remove a clause the reader could infer from the one before, such as "…, and nobody restarts them manually" after "failed workers restart automatically". Keep a clause that adds a fact or limits scope, such as a removed flag, and a subject or condition repeated after a split. Keep drawbacks, dissent, exceptions and open questions visible: they are not noise.

Also remove a sentence that answers a question the reader would not have asked. The same goes for a sentence that rules out a failure instead of describing behaviour, such as "this does not delete existing files" when nothing suggested it would. It plants the worry it denies. Keep it when the reader could reasonably expect the failure: a changed default, a removed option, or behaviour the old version had. Name the old state as the sentence rule on replaced state describes.

## Check the repair

Splitting and cutting fail in their own ways. After repairs, reread each changed passage and undo any cut that lost information or a connection:

- Every sentence is complete. Do not compress into fragments, slogans, abbreviations or arrow chains to meet a length limit: cut a whole clause that carries nothing instead.
- The connectives the reasoning needs survive: "because", "so", "but", "unless".
- No pattern was traded for another, such as "load-bearing" for "critical". Write the literal statement.
- Sentences and paragraphs did not become uniform. Length still follows the thought.
