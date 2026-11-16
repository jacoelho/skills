import type { EngineInterface, Register } from 'claude-code'

import { LINTER, MARKER, blockText, findingKey, newFindings, nulPaths, parseLint } from './findings'

const GIT_TIMEOUT_MS = 3_000
const LINT_TIMEOUT_MS = 15_000
// Turns sent back per prompt: a fix that itself introduces findings is reported,
// but a fix loop cannot run unbounded.
const MAX_SEND_BACKS = 2

type Lint = { root: string; keys: Set<string> }

// Findings as of the last check: taken when the person sends a prompt and moved
// forward at each Stop, so a finding is reported once and one kept on purpose
// does not stop later turns. Held by one registration; a reload starts over.
type Session = { baseline: Lint | null; failureShown: boolean; sendBacks: number }

function fail($: EngineInterface, s: Session, err: unknown) {
  $.ui.log(`spec-lint: ${message(err)}`, { to: 'debug' })
  if (s.failureShown) return
  s.failureShown = true
  $.ui.status('spec-lint: off this session (linter unavailable; see debug log)')
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err))

// Lists working-tree files only, so a tracked file deleted in the tree is never passed on.
async function grepPaths($: EngineInterface, root: string, args: string[]): Promise<string[] | null> {
  const r = await $.process.run(['git', '-c', 'core.quotePath=false', 'grep', '-z', '-l', '--untracked', ...args], {
    cwd: root, stdin: '', timeoutMs: GIT_TIMEOUT_MS,
  })
  if (r.exitCode === 1) return []
  return r.exitCode === 0 && !r.isStdoutTruncated ? nulPaths(r.stdout) : null
}

// Every contract in the repository is linted together, so a reference into another
// contract resolves; decision records are passed so each Basis question resolves.
async function lint($: EngineInterface): Promise<{ root: string; findings: ReturnType<typeof parseLint> } | null> {
  const cwd = await $.session.cwd()
  const top = await $.process.run(['git', 'rev-parse', '--show-toplevel'], { cwd, stdin: '', timeoutMs: GIT_TIMEOUT_MS })
  if (top.exitCode !== 0) return null
  const root = top.stdout.trim()
  const contracts = await grepPaths($, root, ['-F', '-e', MARKER, '--', '*.md'])
  if (contracts === null) return null
  // A repository with no contract yet still gets a baseline, so a first contract is checked.
  if (contracts.length === 0) return { root, findings: [] }
  // Without the records every cited question would look unresolved and be sent back.
  const records = await grepPaths($, root, ['-e', '', '--', '*.decisions.md'])
  if (records === null) throw new Error('git grep for decision records failed')
  // An evidence map is checked only when it is passed, so a stale row is caught as the test changes.
  const maps = await grepPaths($, root, ['-e', '', '--', '*.evidence.md'])
  if (maps === null) throw new Error('git grep for evidence maps failed')
  const run = await $.process.run(['python3', `${$.plugin.root}/${LINTER}`, '--json', ...contracts, ...records, ...maps], {
    cwd: root, stdin: '', timeoutMs: LINT_TIMEOUT_MS,
  })
  if (run.isStdoutTruncated) throw new Error('linter output truncated')
  const findings = parseLint(run.stdout)
  // An input or read error makes the findings incomparable with the baseline's.
  const broken = findings.find(f => f.code === 'input-error' || f.code === 'read-error')
  if (broken) throw new Error(`linter ${broken.code}: ${broken.path}: ${broken.message}`)
  // The marker appearing only inside fenced examples is not a contract.
  return { root, findings: findings.filter(f => f.code !== 'no-active-documents') }
}

// The turn's result, with the findings introduced since the baseline added as a block.
async function check($: EngineInterface, s: Session, agentId: string | undefined, r: { block?: string }) {
  if (agentId !== undefined || s.baseline === null || s.sendBacks >= MAX_SEND_BACKS) return r
  const before = s.baseline
  let added
  try {
    const now = await lint($)
    if (!now || now.root !== before.root) return r
    added = newFindings(before.keys, now.findings)
    s.baseline = { root: now.root, keys: new Set(now.findings.map(findingKey)) }
  } catch (err) {
    fail($, s, err)
    return r
  }
  if (added.length === 0) return r
  s.sendBacks++
  const text = blockText(added, before.root)
  return { ...r, block: r.block ? `${r.block}\n\n${text}` : text }
}

export const register: Register = (on, options) => {
  if (options.spec_lint === 'off') return
  const s: Session = { baseline: null, failureShown: false, sendBacks: 0 }

  // turn.start and classic.Stop without a matcher belong to comment-policy, and the
  // engine allows one unmatched hook per event in a plugin.
  on('classic.UserPromptSubmit', async ($, e, next) => {
    s.sendBacks = 0
    try {
      const r = await lint($)
      s.baseline = r && { root: r.root, keys: new Set(r.findings.map(findingKey)) }
    } catch (err) {
      s.baseline = null
      fail($, s, err)
    }
    return next(e)
  })

  on('classic.Stop', { stop_hook_active: false }, async ($, e, next) => {
    const r = await next(e)
    return check($, s, e.agent_id, r)
  })

  // Without this, edits made while fixing would be absorbed by the next prompt's baseline unreported.
  on('classic.Stop', { stop_hook_active: true }, async ($, e, next) => {
    const r = await next(e)
    return check($, s, e.agent_id, r)
  })
}
