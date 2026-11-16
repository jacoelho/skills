// The spectacular linter's findings as the hook compares and reports them.

export const MARKER = '<!-- spec-lint: active -->'
export const LINTER = 'skills/spectacular-spec-review/scripts/spec_lint.py'
export const MAX_SHOWN = 20

export type LintFinding = { severity: string; code: string; path: string; line: number; message: string }

// Paths from `git grep -z -l`: NUL-separated, relative to the repository root.
export function nulPaths(stdout: string): string[] {
  return stdout.split('\0').filter(p => p.length > 0)
}

export function parseLint(stdout: string): LintFinding[] {
  const parsed: unknown = JSON.parse(stdout)
  const findings = (parsed as { findings?: unknown }).findings
  if (!Array.isArray(findings)) throw new Error('linter JSON has no findings list')
  return findings.map(f => {
    const { severity, code, path, line, message } = f as Record<string, unknown>
    if (typeof severity !== 'string' || typeof code !== 'string' || typeof path !== 'string'
      || typeof line !== 'number' || typeof message !== 'string') {
      throw new Error('linter finding has an unexpected shape')
    }
    return { severity, code, path, line, message }
  })
}

// Line numbers are left out: an edit above a finding moves it without making it new.
export const findingKey = (f: LintFinding) => `${f.path}\0${f.code}\0${f.message}`

export function newFindings(baseline: ReadonlySet<string>, current: readonly LintFinding[]): LintFinding[] {
  return current.filter(f => !baseline.has(findingKey(f)))
}

export function blockText(findings: readonly LintFinding[], root: string): string {
  const shown = findings.slice(0, MAX_SHOWN).map(f => {
    const path = f.path.startsWith(`${root}/`) ? f.path.slice(root.length + 1) : f.path
    return `- ${path}:${f.line}: ${f.severity} ${f.code}: ${f.message}`
  })
  const more = findings.length > shown.length ? [`- and ${findings.length - shown.length} more`] : []
  return [
    'spec-lint: this turn introduced findings in spectacular contracts. Fix each, or say why it stands:',
    ...shown,
    ...more,
  ].join('\n')
}
