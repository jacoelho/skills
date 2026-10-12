# Hand off a selected opportunity

Use this only when the user authorizes selection or explicitly requests a transition to `$evolve-architecture`.

## Select

- When the user names a candidate ID, select that candidate unless it has already been disproved.
- When the user delegates the choice, select the highest-ranked viable candidate and state why it survives its strongest counterargument.
- The selection chooses **what architectural problem to pursue**, not **how to solve it**. Do not design interfaces or turn the proposed direction into a predetermined implementation strategy.

## Discovery Handoff

Emit a compact handoff containing:

- candidate ID and title;
- target outcome and present cost;
- verified evidence with files, symbols, tests, history, or ADRs;
- current owner, runtime path, and source of truth when known;
- proposed architectural direction, explicitly marked as a hypothesis;
- known contracts, constraints, preserved behavior, and non-goals;
- bounded scope and likely migration or deletion work;
- selection-critical unknowns;
- strongest counterargument and confidence.

The handoff is input to `$evolve-architecture`, not an accepted design. Detailed alternatives, interface design, migration planning, and implementation belong there.

## Transition

- In a later message, the user can refer to the report-local ID; do not require them to copy the handoff.
- When both skills are explicitly requested in one task, create the handoff and continue directly under `$evolve-architecture` without requiring another user turn.
- Do not repeat the full report in the handoff. When continuing in the same task, do not duplicate the handoff in the final answer.
