# Change handling

Do not treat every disagreement as permission to rewrite the requirement.

## Diagnose before editing

For a syntax-only correction, translate the settled obligation into [EARS](ears.md) while preserving applicability, response, prohibitions, quantifiers, and authority. A change from permission to guarantee is a semantic change, not formatting. Keep quoted external sources intact and refer to their binding clauses from local EARS statements.

Classify each disagreement with [the source mismatch classes](mismatch.md) before synchronising sources; the class names the source to repair.

When a contract changes, preserve enough prior wording and decision history for a reviewer to see what changed and why, following repository convention. Keep that history outside the current contract; readers should not have to apply a sequence of contradictory amendments to learn the active rule.

Keep unresolved replacement proposals in the decision record. Challenging an existing obligation does not retire it: retain its identified source until an authorised revision or governing source settles what applies, and isolate work that depends on the conflict.

## Defects

For a defect, deliver a reproduction as an executed observation, the governing REQ or INV (or the `unspecified case` class when none settles it), the behaviour the fix must preserve, and the reproduction as a regression test listed in the evidence map for the governing rule's AC. Change the contract only for a specification defect; an implementation defect leaves it unchanged, and an `unspecified case` waits for its decision.

Until the fix lands, record the behaviour the code misses as the governing AC's Unchecked part, and the defect in the decision record's handoff. The fix closes both: it lists its regression test, clears the Unchecked part (`evidence.py unchecked <contract> <AC> --clear`) or narrows it to what still goes unchecked, and removes the defect from the handoff, which lists only remaining work. An Unchecked part left behind keeps reporting `partial-ac` after the fix ships.

## Impact envelope

Trace the changed obligation to related rules, examples, verification, interfaces, consumers, existing data, pending work, and in-flight operations when they can affect this change. Inspect direct references and the few semantic dependencies needed to avoid a false handoff; do not turn the impact pass into an inventory of the whole system.

For a deliberate change to shipped behaviour, identify coexistence or correction obligations only when an existing external contract, deployed behaviour, persisted data, in-flight operation, compatibility promise, or other binding constraint requires them. A new or greenfield requirement does not create a migration obligation by itself.

When target and deployed contracts differ, name each applicable version and any transition rule separately. Do not replace a deployed obligation with the target rule until the binding transition permits it.

List which earlier results are invalidated and which remain relevant. An unchanged test name does not preserve evidence after its expectation, implementation, fixture, or environment changes.

## Reconcile the increment

Identify the contract revision in the next handoff. Communicate changed obligations and cancelled work to affected implementers, and point them to the evidence they must refresh. Independent work can continue when it does not depend on the changed decision.

Distinguish recommending a correction from possessing authority to adopt it. Record user-provided decisions directly; do not create unnecessary repeat-approval gates. When authority or evidence for a replacement is absent, preserve the existing contract, record the proposal and affected work in the decision record, and make the consequence explicit.

## Migrating many contracts

A format change across many existing contracts, such as moving evidence into maps or rewriting every Expected, is mechanical in shape but judgement in each row, so plan it to be audited.

- **Partition by map.** Give each worker its contracts and their evidence maps, and nothing else. The script locks a map's directory while it writes, so parallel commands never lose a row; it cannot stop two workers from making conflicting judgements about one AC.
- **Give each worker a private scratch folder.** Shared scratch files collide; a worker that writes another's file corrupts both runs.
- **Feed rows on standard input.** Collect a contract's rows in a file in the worker's scratch folder, one per line as AC, test file, and test name separated by tabs, and pass it with `evidence.py add <contract> - < rows.tsv`, or write them in a heredoc with a quoted delimiter (`<<'EOF'`). Never put a test name holding `'`, `$`, or a backtick in a shell argument.
- **Apply the row rule, not proximity.** A row belongs under an AC only when its check observes at the AC's Boundary and asserts part of its Situation and Expected ([evidence map](declarations.md#evidence-map)). Record what the listed checks leave out as the AC's Unchecked row.
- **Write each Expected from the covered rule.** Take the requirement from the REQ or INV and the AC, and every value from a source the Oracle can name. A value only a test or the code states is a candidate decision question, not part of Expected. An Expected narrowed to what a test happens to check hides a gap.
- **Keep the defects it finds out of the migration.** When a rewritten Expected or a decision taken during the migration shows the code breaking an accepted rule, record it as a defect pending fix ([Defects](#defects)) and leave the code alone. Land the migration first, then fix each defect as its own change, so the history keeps the format change apart from the behaviour changes and each fix can be reviewed and reverted alone.
- **Lint each contract as it is finished**, with `--untested`, and fix every error before the next.
- **Audit a seeded random sample.** Draw rows across every map with a recorded seed, and read each test body against its AC's Situation, Expected, and Boundary; draw rewritten Expected and Oracle fields and read each against the covered statement and the Oracle's source, oversampling Oracles that cite only the covered rule. Report the error count with its bound: no errors in 30 rows still allows an error rate near 10%. Fix the defects the audit finds as classes across all workers' output, not only in the sampled rows.
