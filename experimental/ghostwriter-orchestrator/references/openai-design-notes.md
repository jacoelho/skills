# OpenAI guidance and design decisions

Checked 13 October 2026. This reference is for maintainers, not routine writer
context. The editorial rules are design choices; OpenAI has not validated this
particular ghostwriting skill or its five-facet arrangement.

## Sources

1. OpenAI, Prompt engineering:
   https://developers.openai.com/api/docs/guides/prompt-engineering
   The documentation recommends clear instruction/context boundaries and
   representative fixtures before changing prompts. This skill keeps selected
   article material, editorial directions, sources and review findings distinct.

2. OpenAI, Reasoning best practices:
   https://developers.openai.com/api/docs/guides/reasoning-best-practices
   Keep instructions direct, use delimiters, and specify the intended outcome.
   Do not request private chain-of-thought. This skill requests concrete
   editorial findings and artifacts instead of reasoning transcripts. Optional
   examples load only where calibration is needed.

3. OpenAI, Evaluation best practices:
   https://developers.openai.com/api/docs/guides/evaluation-best-practices
   Define objectives, data and metrics; evaluate task-specific behaviours;
   include typical, edge and adversarial cases; and use human expert judgement.
   Architecture changes should be driven by evaluation. Here, source fidelity,
   comprehension, leakage, edit restraint and execution honesty remain separate.
   More agents are not assumed to mean better writing.

4. OpenAI, Build skills (Codex documentation redirects to ChatGPT Learn):
   https://learn.chatgpt.com/docs/build-skills
   Skills use SKILL.md with name and description, plus optional supporting
   files. Progressive disclosure keeps the router small; maintenance and
   evaluation material do not become routine drafting instructions.

## Local decisions, not externally established optima

Five editorial facets; one prose owner; optionally isolated reader and fidelity
reviewers; two article-repair rounds by default; three adversarial maintenance
perspectives; a frozen final probe set and an unopened reserve. These choices
need evaluation on actual author work. Role names and source delimiters do not
enforce context isolation. A current model API, agent runtime or benchmark is
not implied by the presence of a skill file or a hand-off card.
