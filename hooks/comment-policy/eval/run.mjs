// Runs the judge over the labelled cases with the real model, through `claude -p`,
// and reports each case's verdict. It spends tokens, so it is run by hand after a
// change to the judge's instructions or the policy, never by the test suite:
//
//   bun hooks/comment-policy/eval/run.mjs [runs]
//
// A .mjs file, so the plugin's type check, which knows only the engine's
// globals, leaves this Bun script alone.
import { readFileSync } from 'node:fs'

import { citedSpecs, judgeItems, judgePrompt, judgeSystem, parseVerdicts } from '../review.ts'
import { CASES, SPEC_IDS } from './cases.ts'

const runs = Number(process.argv[2] ?? 1)
const policy = readFileSync(new URL('../policy.md', import.meta.url), 'utf8')

const comments = CASES.map(c => {
  const text = c.source.split('\n')[c.line - 1]
  const at = text.search(/\/\/|#/)
  return { path: c.path, language: c.language, startLine: c.line - 1, endLine: c.line - 1, text: text.slice(at).trimEnd(), isWholeLine: text.slice(0, at).trim() === '' }
})
const sources = new Map(CASES.map(c => [c.path, c.source.split('\n')]))
const items = judgeItems(comments, p => sources.get(p))

let misses = 0
for (let run = 1; run <= runs; run++) {
  const child = Bun.spawnSync(
    ['claude', '-p', '--model', 'haiku', '--effort', 'low', '--tools', '', '--no-session-persistence', '--setting-sources', '', '--system-prompt', judgeSystem(policy)],
    { stdin: new TextEncoder().encode(judgePrompt(items, citedSpecs(comments, SPEC_IDS))) },
  )
  if (child.exitCode !== 0) throw new Error(`claude -p failed (exit ${child.exitCode}): ${child.stderr.toString().slice(0, 500)}`)
  const flagged = new Map(parseVerdicts(child.stdout.toString(), items).map(f => [f.id, f]))
  console.log(`run ${run}`)
  CASES.forEach((c, i) => {
    const f = flagged.get(i + 1)
    const got = f ? 'flag' : 'keep'
    if (got !== c.expected) misses++
    console.log(`  ${got === c.expected ? 'ok  ' : 'MISS'} ${c.expected.padEnd(4)} ${got.padEnd(4)} ${c.name}${f ? `: ${f.verdict}: ${f.reason}` : ''}`)
  })
}
console.log(`${misses} misses in ${runs * CASES.length} verdicts`)
process.exit(misses === 0 ? 0 : 1)
