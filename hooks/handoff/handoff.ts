import type { PluginOptions, SessionCompactTrigger, SessionMessage } from 'claude-code'

// When the band offers a handoff: never, or at a percent of the session's
// auto-compact threshold.
export type OfferPolicy = { kind: 'off' } | { kind: 'at'; percent: number }

// What manual and auto compaction do: `core` leaves them to Claude Code;
// `handoff` replaces the transcript with a handoff the model writes.
export type CompactMode = 'core' | 'handoff'

export type Settings = {
  offer: OfferPolicy
  onCompact: CompactMode
  // Absent: the prompt bundled with the plugin.
  promptFile?: string
  // Absent: ~/.claude/handoffs.
  dir?: string
}

// Absolute paths, fixed once the session's home folder is known.
export type Paths = { home: string; prompt: string; dir: string; log: string }

const DEFAULT_PERCENT = 70

// Option keys as declared in .claude-plugin/plugin.json `userConfig`. The
// engine validates types and bounds before the module loads; empty means unset.
export function settingsFrom(options: PluginOptions): Settings {
  const raw = Number(options.handoff_offer_at ?? DEFAULT_PERCENT)
  const percent = Number.isFinite(raw) ? Math.min(100, Math.max(0, raw)) : DEFAULT_PERCENT
  const text = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined)
  return {
    offer: percent === 0 ? { kind: 'off' } : { kind: 'at', percent },
    onCompact: options.handoff_on_compact === 'handoff' ? 'handoff' : 'core',
    promptFile: text(options.handoff_prompt_file),
    dir: text(options.handoff_dir),
  }
}

export function resolvePaths(settings: Settings, home: string, pluginRoot: string): Paths {
  const expand = (path: string) => (path === '~' || path.startsWith('~/') ? home + path.slice(1) : path)
  const dir = settings.dir ? expand(settings.dir) : `${home}/.claude/handoffs`
  return {
    home,
    prompt: settings.promptFile ? expand(settings.promptFile) : `${pluginRoot}/hooks/handoff/prompts/handoff.md`,
    dir,
    log: `${dir}/handoff.log`,
  }
}

export type Rendered = { kind: 'ok'; text: string } | { kind: 'error'; reason: string }

const PLACEHOLDER = /\{\{\s*([^}]*?)\s*\}\}/g

// Fills `{{name}}` placeholders. An unknown one is an error rather than
// literal braces reaching the model; the reason names the file to fix.
export function renderTemplate(template: string, file: string, vars: Readonly<Record<string, string>>): Rendered {
  const unknown = new Set<string>()
  const text = template.replace(PLACEHOLDER, (whole, name: string) => {
    if (Object.hasOwn(vars, name)) return vars[name] as string
    unknown.add(whole)
    return whole
  })
  if (unknown.size > 0) {
    const known = Object.keys(vars).map(k => `{{${k}}}`).join(', ')
    return { kind: 'error', reason: `${file}: unknown placeholder ${[...unknown].join(', ')} (known: ${known})` }
  }
  if (text.trim() === '') return { kind: 'error', reason: `${file}: the prompt is empty` }
  return { kind: 'ok', text }
}

// Not now holds the offer back until the context drops under the offer point.
export type Snooze = 'armed' | 'snoozed'

export type OfferDecision = { show: boolean; snooze: Snooze }

// Whether the band offers a handoff after a turn, and the snooze that follows.
export function decideOffer(policy: OfferPolicy, threshold: number, tokens: number, snooze: Snooze): OfferDecision {
  if (policy.kind === 'off' || threshold <= 0) return { show: false, snooze }
  if (tokens < Math.round((threshold * policy.percent) / 100)) return { show: false, snooze: 'armed' }
  return { show: snooze === 'armed', snooze }
}

// Who compacts this transcript. A subagent's always goes to core: a fork reads
// the main thread. A precompute is core's own warm-up for the next compaction.
export function compactionRoute(mode: CompactMode, trigger: SessionCompactTrigger, agentId: string | undefined): CompactMode {
  if (agentId !== undefined || mode === 'core') return 'core'
  return trigger === 'auto' || trigger === 'manual' ? 'handoff' : 'core'
}

const SECRET = '<secret removed>'

// Common token formats are cut before the handoff is saved or seeded. A safety
// net under the prompt's own rule, not a guarantee: free-form passwords pass.
export function redact(text: string): string {
  return text
    .replace(/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, SECRET)
    .replace(
      /\b(sk-[A-Za-z0-9_-]{16,}|[sr]k_(?:live|test)_[A-Za-z0-9]{16,}|gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|glpat-[A-Za-z0-9_-]{20,}|xox[a-z]-[A-Za-z0-9-]{10,}|AIza[0-9A-Za-z_-]{30,}|AKIA[0-9A-Z]{16}|eyJ[A-Za-z0-9_-]{8,}\.eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,})\b/g,
      SECRET,
    )
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/-]{20,}=*/g, `$1${SECRET}`)
}

// The model sometimes wraps the whole reply in a code fence despite the prompt.
export function unfence(text: string): string {
  const t = text.trim()
  const m = /^```(?:markdown|md)?\n([\s\S]*)\n```$/.exec(t)
  return (m ? (m[1] as string) : t).trim()
}

export function fileName(text: string, at: Date): string {
  const title = /^#\s*Handoff:\s*(.+)$/m.exec(text)?.[1] ?? ''
  const slug =
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 48) || 'session'
  const pad = (n: number) => String(n).padStart(2, '0')
  const stamp = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`
  return `${stamp}-${slug}.md`
}

// What the last model request did not carry: the newest assistant message and
// everything after it (its tool results, a prompt submitted since). A fork
// re-sends that request, so its handoff cannot cover them; a compaction that
// replaces the transcript keeps them, with their engine handles, after the seed.
export function unsentTail(messages: readonly SessionMessage[]): SessionMessage[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === 'assistant') return messages.slice(i)
  }
  return [...messages]
}

// The one user message a fresh transcript starts from.
export function seedText(handoff: string, file: string): string {
  return `This conversation was handed off to a fresh context. The handoff below is everything carried over; it is also saved at ${file}.\n\n${handoff}`
}
