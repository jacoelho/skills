# Generated-text rules

These rules flag phrasing that makes PR descriptions, issues and articles read as machine-written. Each one targets a defect a reader would object to in any text. None of them proves authorship. All are review cues. Only `Workflow.EditorialMarkers` fails a document.

## Kept

| Rule | Level | Flags | Deliberately not flagged |
| --- | --- | --- | --- |
| `Register.StockVocabulary` | suggestion | Figurative stock words such as "delve into" and "the realm of" | Literal senses: the Delve debugger, underscores, showcase apps. One hit is weak evidence; clusters matter. |
| `Register.Significance` | suggestion | Claims of importance: "plays a pivotal role", "stands as a testament", "evolving landscape" | Bit shifts. A shift needs "significant", "fundamental" or "paradigm" to match. |
| `Register.ParticipleTail` | suggestion | Trailing commentary: ", highlighting…" | ", ensuring…" and ", reflecting…", which state real consequences |
| `Register.Signposting` | suggestion | Announcements: "let's dive in", "without further ado" | Reading plans such as "In this post, I will explore" |
| `Register.Hedging` | suggestion | Padding and stacked hedges: "it is worth noting that", "may potentially" | Single modals; "not widely available" |
| `Register.VagueAttribution` | suggestion | Unnamed authorities: "experts agree", "studies show" | Nothing. A nearby citation does not exempt the claim. |
| `Register.Summary` | suggestion | Summing openers at the start of a sentence: "In conclusion,", "Despite these challenges" | "Overall", "Ultimately" |
| `Register.FormulaicHeading` | suggestion | Stock headings: "Key takeaways", "Why it matters" | "Conclusion", "Final thoughts". Blind spot: bold pseudo-headings. |
| `Register.Contrast` | suggestion | Strawman contrasts: "not just X but Y", "it's not X, it's Y" | "X, not Y"; "not only … but also"; imperatives |
| `Register.Flourish` | suggestion | Rhetorical reveals: "Here's the thing", "The result?" | Real questions |
| `Register.EmDash` | suggestion | U+2014 | En dashes and ranges. American prose will draw suggestions, a British-profile trade-off. |
| `Register.Emoji` | suggestion | Pictographs in headings and list items | Technical glyphs such as ✓ and → |
| `Clarity.UnsupportedQuality` | suggestion | Promotional adjectives: "groundbreaking", "state-of-the-art" | "transformative"; the spaced "next generation" |
| `Workflow.ProcessLeakage` | warning | Pasted chat replies: "Certainly!", knowledge-cutoff disclaimers, "As an AI language model, I" | "I hope this helps", "Would you like me to", "Let me know if"; AI product features |
| `Workflow.GeneratedMarkup` | warning | Chat-tool citation and tracking markup, including in link targets | Ordinary tracking parameters. Blind spot: fenced examples are flagged too. |
| `Workflow.Placeholder` | warning | Unfilled slots: `[YOUR NAME]`, `2026-XX-XX` | Slots in code spans, link text, `[ADD]` title prefixes, identifiers such as `INSERT_BATCH_SIZE` that do not end in `URL` or `HERE` |

`scripts/test-profiles.py` checks four things: a sample of excluded sentences passes the whole profile, each phrase has one owner, `Register` rules stay suggestions, and only `Workflow.EditorialMarkers` is an error.

## Rejected

| Concept | Reason |
| --- | --- |
| Passive voice, adverbs, intensifiers | They fire on human technical writing, and passive is often right there. |
| Transitions ("However,", "for example"), formal words ("implement") | They are normal technical prose. |
| Colons, semicolons, tricolons | They are legitimate punctuation and lists. |
| Figurative verbs ("stays", "holds", "lands") | They are literal in technical prose. |
| Negations ("No caller changes"), ", so…" clauses, "a single", "every" | They state scope and mechanism precisely. |
| Concessive "While X, Y" | It fires on human text only. |
| Code tokens and paths in prose | They belong in code spans, which Vale skips. |
| Absolute claims ("the only way to") | They are legitimate in technical prose. |
| Curly quotes, title case | Curly quotes are correct British typography; `Technical.HeadingCase` owns title case. |
| Elegant variation, cut-offs, citation validity | Vale cannot see them. |
