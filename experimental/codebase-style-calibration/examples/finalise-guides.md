# Finalise guide prompt

Use the accumulated answers from the `codebase-style-calibration` rounds.

Create these repository-specific files:

1. `STYLE_GUIDE.md`
2. `CODE_REVIEW_RULEBOOK.md`
3. `AI_GENERATED_CODE_CHECKLIST.md`
4. `AGENT_PROMPTS.md`, if useful
5. `LINTER_OPPORTUNITIES.md`, if useful

Requirements:

- Only include rules supported by real code, generated probes, mutated probes, or explicit feedback.
- Mark confidence for each rule.
- Include accepted and rejected examples.
- Separate confirmed rules from tentative rules.
- Avoid generic advice unless it was validated in this repository.
- Make the rules operational enough for code review or static analysis.
