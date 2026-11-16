import type { On } from 'claude-code'
import { type Engine, expect, test } from 'claude-code/testing'

import { MAX_SHOWN, type LintFinding, blockText, findingKey, newFindings, nulPaths, parseLint } from '../hooks/spec-lint/findings'

const finding = (path: string, line: number, code = 'dangling-reference', message = 'No declaration for REQ-A-009.'): LintFinding =>
  ({ severity: 'error', code, path, line, message })

test('nulPaths splits git grep -z output and drops the trailing separator', () => {
  expect(nulPaths('specs/a.md\0specs/b c.md\0')).toEqual(['specs/a.md', 'specs/b c.md'])
  expect(nulPaths('')).toEqual([])
})

test('parseLint reads the linter JSON findings and rejects any other shape', () => {
  const json = JSON.stringify({ active_documents: 1, findings: [finding('/r/specs/a.md', 7)] })
  expect(parseLint(json)).toEqual([finding('/r/specs/a.md', 7)])
  expect(() => parseLint('{"findings": [{"code": 1}]}')).toThrow()
  expect(() => parseLint('{"active_documents": 1}')).toThrow()
  expect(() => parseLint('not json')).toThrow()
})

test('newFindings keeps a finding that only moved lines out, and reports a new one', () => {
  const baseline = new Set([findingKey(finding('/r/a.md', 7))])
  const moved = finding('/r/a.md', 12)
  const added = finding('/r/a.md', 3, 'rule-table-otherwise', 'REQ-A-001: the last row must be Otherwise.')
  const sameMessageOtherFile = finding('/r/b.md', 7)

  expect(newFindings(baseline, [moved, added, sameMessageOtherFile])).toEqual([added, sameMessageOtherFile])
})

test('blockText shows paths relative to the root and caps the list', () => {
  const many = Array.from({ length: MAX_SHOWN + 2 }, (_, i) => finding('/repo/specs/a.md', i + 1))
  const text = blockText(many, '/repo')

  expect(text).toContain('- specs/a.md:1: error dangling-reference: No declaration for REQ-A-009.')
  expect(text).not.toContain(`specs/a.md:${MAX_SHOWN + 1}:`)
  expect(text).toContain('- and 2 more')
  expect(blockText([finding('/elsewhere/x.md', 4)], '/repo')).toContain('- /elsewhere/x.md:4:')
})

const ROOT = '/repo'

type Rig = { findings: LintFinding[]; lints: number; pythonMissing: boolean; statuses: string[] }

function rig(on: On): Rig {
  const r: Rig = { findings: [], lints: 0, pythonMissing: false, statuses: [] }
  const ok = (stdout: string, exitCode = 0) => ({ value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }) as never
  on('session.cwd', async () => ({ value: `${ROOT}/specs` }) as never)
  on('process.run', async (_, e) => {
    const argv = e.argv
    if (argv[0] === 'python3') {
      if (r.pythonMissing) throw new Error('spawn python3 ENOENT')
      r.lints++
      expect(argv.slice(-3)).toEqual(['specs/a.md', 'specs/a.decisions.md', 'specs/a.evidence.md'])
      return ok(JSON.stringify({ findings: r.findings }), r.findings.length ? 1 : 0)
    }
    if (argv.includes('--show-toplevel')) return ok(`${ROOT}\n`)
    if (argv.includes('grep')) {
      if (argv.includes('*.decisions.md')) return ok('specs/a.decisions.md\0')
      if (argv.includes('*.evidence.md')) return ok('specs/a.evidence.md\0')
      return ok('specs/a.md\0')
    }
    throw new Error(`unexpected command: ${argv.join(' ')}`)
  })
  on('ui.status', async (_, e) => {
    if (e.text) r.statuses.push(e.text)
    return { value: undefined } as never
  })
  on('ui.log', async () => ({ value: undefined }) as never)
  on('classic.UserPromptSubmit', async () => ({}) as never)
  on('classic.Stop', async () => ({}) as never)
  return r
}

const prompt = ($: Engine) => $.classic.UserPromptSubmit({ prompt: 'edit the spec' } as never)
const stop = ($: Engine, stop_hook_active = false) => $.classic.Stop({ stop_hook_active } as never)
const OFF = { options: { comment_policy: 'off' } }

test('a finding the turn introduced is sent back at Stop with a repository-relative path', OFF, async ($, on) => {
  const r = rig(on)
  await prompt($)
  r.findings = [finding(`${ROOT}/specs/a.md`, 9)]

  const result = await stop($)

  expect(result.block).toContain('- specs/a.md:9: error dangling-reference: No declaration for REQ-A-009.')
})

test('a finding already present when the prompt was sent does not stop the turn', OFF, async ($, on) => {
  const r = rig(on)
  r.findings = [finding(`${ROOT}/specs/a.md`, 9)]
  await prompt($)
  r.findings = [finding(`${ROOT}/specs/a.md`, 14)]

  expect((await stop($)).block).toBeUndefined()
})

test('a reported finding is not sent back again at the next Stop', OFF, async ($, on) => {
  const r = rig(on)
  await prompt($)
  r.findings = [finding(`${ROOT}/specs/a.md`, 9)]
  expect((await stop($)).block).toContain('specs/a.md:9')

  expect((await stop($)).block).toBeUndefined()
})

test('findings introduced while fixing are sent back, at most twice per prompt', OFF, async ($, on) => {
  const r = rig(on)
  await prompt($)
  r.findings = [finding(`${ROOT}/specs/a.md`, 9)]
  expect((await stop($)).block).toContain('specs/a.md:9')

  r.findings = [finding(`${ROOT}/specs/a.md`, 9), finding(`${ROOT}/specs/a.md`, 3, 'rule-table-otherwise', 'REQ-A-001: Otherwise.')]
  expect((await stop($, true)).block).toContain('specs/a.md:3')

  r.findings = [...r.findings, finding(`${ROOT}/specs/a.md`, 5, 'rule-table-order', 'REQ-A-001: order.')]
  expect((await stop($, true)).block).toBeUndefined()

  await prompt($)
  r.findings = [...r.findings, finding(`${ROOT}/specs/a.md`, 6, 'rule-table-obligation', 'REQ-A-001: shall.')]
  expect((await stop($)).block).toContain('specs/a.md:6')
})

test('without python3 the turn ends unchecked and the status says so once', OFF, async ($, on) => {
  const r = rig(on)
  r.pythonMissing = true
  await prompt($)
  await prompt($)

  expect((await stop($)).block).toBeUndefined()
  expect(r.statuses).toEqual(['spec-lint: off this session (linter unavailable; see debug log)'])
})

test('spec_lint off lints nothing', { options: { comment_policy: 'off', spec_lint: 'off' } }, async ($, on) => {
  const r = rig(on)
  await prompt($)
  r.findings = [finding(`${ROOT}/specs/a.md`, 9)]

  expect((await stop($)).block).toBeUndefined()
  expect(r.lints).toBe(0)
})
