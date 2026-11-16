# Vale rules

This file records why each custom rule exists and what it deliberately leaves alone.

## Generated-text rules

These rules flag phrasing that makes PR descriptions, issues and articles read as machine-written. Each one targets a defect a reader would object to in any text. None of them proves authorship. All are review cues. Only `Workflow.EditorialMarkers` fails a document.

### Kept

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

### Rejected

| Concept | Reason |
| --- | --- |
| Passive voice, adverbs, intensifiers | They fire on human technical writing, and passive is often right there. |
| Transitions ("However,", "for example"), formal words ("implement") | They are normal technical prose. |
| Colons, semicolons, tricolons | They are legitimate punctuation and lists, so they are no sign of generated text. `Clarity.Semicolon` flags semicolons for a different reason: readability. |
| Figurative verbs ("stays", "holds", "lands") | They are literal in technical prose. |
| Negations ("No caller changes"), ", so…" clauses, "a single", "every" | They state scope and mechanism precisely. |
| Concessive "While X, Y" | It fires on human text only. |
| Code tokens and paths in prose | They belong in code spans, which Vale skips. |
| Absolute claims ("the only way to") | They are legitimate in technical prose. |
| Curly quotes, title case | Curly quotes are correct British typography; `Technical.HeadingCase` owns title case. |
| Elegant variation, cut-offs, citation validity | Vale cannot see them. |
| Negative restatement after "and" ("and nobody…", "and no longer…") | Such a clause can add a fact ("and never fail a run"). `references/organisation.md` owns the prose rule. |

## Readability rules

These `Clarity` rules back the sentence rules in `references/organisation.md`. They flag dense prose regardless of who wrote it. All are suggestions.

| Rule | Flags | Deliberately not flagged |
| --- | --- | --- |
| `Clarity.LongSentence` | A sentence over 30 tokens. The drafting target is 25. A 25-word threshold would flag about a third of the sentences in recent commit bodies, too many to act on. | Headings, tables, code |
| `Clarity.SentenceAverage` | A document whose sentences average over 22 words | Single long sentences, which `LongSentence` owns |
| `Clarity.Semicolon` | A semicolon in a prose sentence | Code spans, fenced code, tables |
| `Clarity.AmbiguousReference` | "This" or "These" as a bare subject before a common verb: "This catches…" | "This check catches…"; "It is safe to…" (an expletive "it", not a reference) |
| `Clarity.LongParagraph` | A paragraph over 200 tokens | Tables, headings, the first paragraph of a list item |

Rejected for readability: bans on passive voice, perfect tenses and "-ing" forms, and American spelling. They come from Simplified Technical English, which targets non-native readers of maintenance manuals, and they make developer prose stilted. The organisation rules limit passive voice instead.
