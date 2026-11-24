import type { EngineInterface, Register } from 'claude-code'

import {
  type Comment,
  type Diff,
  type Finding,
  type PendingComment,
  DIFF_ARGS,
  JUDGE_BATCH,
  MAX_FILES,
  MAX_JUDGED,
  MAX_PENDING,
  PATHSPECS,
  STATUS_ARGS,
  addedComments,
  blockText,
  citedSpecs,
  emptyDiff,
  fingerprint,
  isDirective,
  judgeItems,
  judgePrompt,
  judgeSystem,
  parseFileDiff,
  parseLsTree,
  parseScan,
  parseStatus,
  parseVerdicts,
  pendingOf,
  quotesSpec,
  ruleFindings,
  specIds,
  supported,
} from './review'

const GIT_TIMEOUT_MS = 10_000
const SCAN_TIMEOUT_MS = 10_000
const JUDGE_TIMEOUT_MS = 20_000
// Thinking counts toward the cap; the reply itself is a short JSON list.
const JUDGE_MAX_TOKENS = 4096
const JUDGE_MODEL = 'haiku'
const MAX_SOURCE_BYTES = 1 << 20
// Fingerprints of settled comments kept between sessions, newest last; about
// 16 bytes each in the plugin's store, which all its hooks share.
const SETTLED_KEY = 'comment-policy.settled'
const MAX_SETTLED = 5_000
const MAX_REMOVED = 10_000
// One collection's share of its hook's 10 s budget, across all its commands.
const COLLECT_BUDGET_MS = 4_000
// A file modified this close to its hashing may change again within the same
// mtime, so its blob id is not reused (git's racy-clean rule).
const RACY_MS = 2_000
const MAX_HASHES = 10_000
const PROBE_TIMEOUT_MS = 3_000
// Tools a subagent may run without writing files the review cares about.
const NO_FILE_WRITES = new Set(['TodoWrite', 'WebFetch', 'WebSearch'])
// The file tools, by the argument that names the file they write.
const FILE_TOOLS: Record<string, string> = { Edit: 'file_path', MultiEdit: 'file_path', Write: 'file_path', NotebookEdit: 'notebook_path' }

// The reviewed files as they stood at one moment: the commit checked out, and
// the content of every reviewed path that differed from it, by blob id; null
// for a path missing from the working tree or not a regular file.
type Snapshot = { root: string; head: string; files: Map<string, string | null> }

// Held by one registration and so started over on a reload.
type Session = {
  // Where the next collection's diff starts: the end of the last collection,
  // or the start of the first turn after an idle spell.
  baseline: Snapshot | null
  // Turns started and not yet ended, by turn id, with the subagent each runs
  // in (undefined for the main loop). A change made while one is open is
  // Claude's; one made while none is, the user's.
  open: Map<string, string | undefined>
  // What each subagent with an open turn has written: the repository paths its
  // file tools named, or anyPath once it ran a tool that can write anywhere.
  // inFlight counts its running calls of other tools, whose writes are not
  // known until they return.
  scopes: Map<string, { paths: Set<string>; anyPath: boolean; inFlight: number }>
  // Turns that ended and wait for a collection to succeed before they close,
  // so a failed collection's changes are still attributed when it is retried.
  closing: Set<string>
  // The repository root and the same directory as the session names it, which
  // differ under a symlink; file tools name paths the session's way.
  aliases: string[]
  // Comments the turns wrote and no Stop has judged yet, oldest first, by
  // fingerprint; they belong to pendingRoot.
  pending: Map<string, PendingComment>
  pendingRoot: string | null
  // Text of the lines removed since the last idle spell, so a comment cut in
  // one turn and pasted in the next counts as moved.
  removed: string[]
  // This hook sent the current prompt's turn back; it does so at most once.
  sentBack: boolean
  // Fingerprints of settled comments, from this session or an earlier one.
  settled: Set<string> | null
  // Persistent conditions already shown.
  noted: Set<string>
  emptyBlobs: Map<string, string>
  // Blob ids of hashed files by root and path, reused while size and mtime hold.
  hashes: Map<string, { size: number; mtimeMs: number; hashedAt: number; id: string }>
  // The collection waiting in the queue, which later turn ends join; null when
  // none waits.
  nextCollect: { closing: Set<string>; done: Promise<void> } | null
  // Snapshots and collections run one at a time, since subagent turns end
  // concurrently; the tail of that queue.
  queue: Promise<void>
}

function noteOnce($: EngineInterface, s: Session, key: string, text: string) {
  if (s.noted.has(key)) return
  s.noted.add(key)
  $.ui.status(`comment-policy: ${text}`)
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err))

type GitInit = { stdin?: string; timeoutMs?: number }

class OutOfTime extends Error {}
class TooManyChanges extends Error {}

async function timeLeft($: EngineInterface, until: number): Promise<number> {
  const ms = until - (await $.clock.now())
  if (ms <= 0) throw new OutOfTime('the collection ran out of time')
  return Math.min(ms, GIT_TIMEOUT_MS)
}

async function git($: EngineInterface, cwd: string, args: readonly string[], init: GitInit = {}) {
  return $.process.run(['git', '-c', 'core.quotePath=false', ...args], { cwd, stdin: init.stdin ?? '', timeoutMs: init.timeoutMs ?? GIT_TIMEOUT_MS })
}

async function checked($: EngineInterface, cwd: string, args: readonly string[], init: GitInit = {}) {
  const r = await git($, cwd, args, init)
  if (r.exitCode !== 0 || r.isStdoutTruncated) throw new Error(`git ${args.find(a => !a.startsWith('-'))} failed (exit ${r.exitCode}): ${r.stderr.slice(0, 300)}`)
  return r.stdout
}

async function repositoryRoot($: EngineInterface, s: Session): Promise<string | null> {
  const cwd = await $.session.cwd()
  const top = await git($, cwd, ['rev-parse', '--show-toplevel', '--show-prefix'], { timeoutMs: PROBE_TIMEOUT_MS })
  if (top.exitCode !== 0) {
    noteOnce($, s, 'git', 'off here (not a git repository)')
    return null
  }
  const [root = '', prefix = ''] = top.stdout.split('\n')
  const below = prefix.replace(/\/$/, '')
  const alias = below && cwd.endsWith(`/${below}`) ? cwd.slice(0, -below.length - 1) : cwd
  s.aliases = [...new Set([root, alias])]
  return root
}

// Only regular files are hashed: `git hash-object --stdin-paths` stops at the
// first path it cannot read, such as a dangling link.
async function regularFile($: EngineInterface, path: string) {
  const st = await $.fs.stat(path).catch(() => undefined)
  return st !== undefined && st.kind === 'file' && !st.isLink ? st : undefined
}

async function isRegularFile($: EngineInterface, path: string): Promise<boolean> {
  return (await regularFile($, path)) !== undefined
}

async function snapshot($: EngineInterface, s: Session, root: string, until: number): Promise<Snapshot> {
  const head = await git($, root, ['rev-parse', '--verify', '--quiet', 'HEAD^{commit}'], { timeoutMs: await timeLeft($, until) })
  const paths = parseStatus(await checked($, root, STATUS_ARGS, { timeoutMs: await timeLeft($, until) })).filter(supported)
  const files = new Map<string, string | null>()
  const toHash: { p: string; size: number; mtimeMs: number }[] = []
  for (const p of paths) {
    const st = await regularFile($, `${root}/${p}`)
    const known = s.hashes.get(`${root}\0${p}`)
    if (!st) files.set(p, null)
    else if (known && known.size === st.size && known.mtimeMs === st.mtimeMs && known.hashedAt - st.mtimeMs > RACY_MS) files.set(p, known.id)
    else toHash.push({ p, size: st.size, mtimeMs: st.mtimeMs })
  }
  if (toHash.length > 0) {
    const hashedAt = await $.clock.now()
    const ids = (await checked($, root, ['hash-object', '-w', '--stdin-paths'], { stdin: `${toHash.map(f => f.p).join('\n')}\n`, timeoutMs: await timeLeft($, until) })).trim().split('\n')
    if (s.hashes.size + toHash.length > MAX_HASHES) s.hashes.clear()
    toHash.forEach((f, i) => {
      files.set(f.p, ids[i]!)
      s.hashes.set(`${root}\0${f.p}`, { size: f.size, mtimeMs: f.mtimeMs, hashedAt, id: ids[i]! })
    })
  }
  return { root, head: head.exitCode === 0 ? head.stdout.trim() : '', files }
}

async function emptyBlob($: EngineInterface, s: Session, root: string, until: number): Promise<string> {
  let id = s.emptyBlobs.get(root)
  if (!id) s.emptyBlobs.set(root, (id = (await checked($, root, ['hash-object', '-w', '-t', 'blob', '--stdin'], { timeoutMs: await timeLeft($, until) })).trim()))
  return id
}

async function headBlobs($: EngineInterface, root: string, head: string, paths: readonly string[], until: number): Promise<Map<string, string>> {
  if (!head || paths.length === 0) return new Map()
  return parseLsTree(await checked($, root, ['--literal-pathspecs', 'ls-tree', '-r', '-z', head, '--', ...paths], { timeoutMs: await timeLeft($, until) }))
}

// What changed in the reviewed files between two snapshots of one repository,
// compared file by file, so a commit, a merge conflict or a sparse checkout in
// between changes nothing.
async function changes($: EngineInterface, s: Session, from: Snapshot, to: Snapshot, until: number): Promise<Diff> {
  const paths = new Set([...from.files.keys(), ...to.files.keys()])
  if (from.head !== to.head) {
    const base = from.head || (await checked($, from.root, ['hash-object', '-t', 'tree', '--stdin'], { timeoutMs: await timeLeft($, until) })).trim()
    const tip = to.head || base
    const moved = await checked($, from.root, ['diff', '--name-only', '-z', '--no-renames', base, tip, '--', ...PATHSPECS], { timeoutMs: await timeLeft($, until) })
    for (const p of moved.split('\0')) if (p && supported(p)) paths.add(p)
  }
  const list = [...paths]
  const atStart = await headBlobs($, from.root, from.head, list, until)
  const atEnd = from.head === to.head ? atStart : await headBlobs($, from.root, to.head, list, until)
  // A deleted or renamed file is compared too: its removed lines are what show
  // a comment in the new file as moved rather than written.
  const changed = list.flatMap(p => {
    const a = (from.files.has(p) ? from.files.get(p) : atStart.get(p)) ?? null
    const b = (to.files.has(p) ? to.files.get(p) : atEnd.get(p)) ?? null
    return a === b ? [] : [{ p, a, b }]
  })
  if (changed.length > MAX_FILES) throw new TooManyChanges(`${changed.length} changed files is over ${MAX_FILES}`)
  const diff = emptyDiff()
  if (changed.length === 0) return diff
  const empty = await emptyBlob($, s, from.root, until)
  const skipped: string[] = []
  for (const { p, a, b } of changed) {
    try {
      parseFileDiff(p, await checked($, from.root, [...DIFF_ARGS, a ?? empty, b ?? empty], { timeoutMs: await timeLeft($, until) }), diff)
    } catch (err) {
      if (err instanceof OutOfTime || (await $.clock.now()) >= until) throw err
      skipped.push(p)
      $.ui.log(`comment-policy: ${p} not compared: ${message(err)}`, { to: 'debug' })
    }
  }
  if (skipped.length > 0) noteOnce($, s, 'diff', `${skipped.length} changed files were not compared (${skipped.slice(0, 3).join(', ')})`)
  return diff
}

async function scanFiles($: EngineInterface, s: Session, root: string, files: readonly string[], until?: number) {
  if (s.noted.has('ast-grep-missing')) return null
  const timeoutMs = until === undefined ? SCAN_TIMEOUT_MS : Math.min(await timeLeft($, until), SCAN_TIMEOUT_MS)
  try {
    const run = await $.process.run(['ast-grep', 'scan', '--config', `${$.plugin.root}/hooks/comment-policy/sgconfig.yml`, '--json=compact', ...files], {
      cwd: root,
      stdin: '',
      timeoutMs,
    })
    if (run.exitCode !== 0 || run.isStdoutTruncated) throw new Error(`exit ${run.exitCode}: ${run.stderr.slice(0, 300)}`)
    return parseScan(run.stdout)
  } catch (err) {
    // A rejection does not say why the command failed; whether ast-grep starts
    // at all does.
    const installed = await $.process.run(['ast-grep', '--version'], { stdin: '', timeoutMs: PROBE_TIMEOUT_MS }).then(() => true, () => false)
    if (installed) noteOnce($, s, 'ast-grep-failed', `a review was skipped (ast-grep scan failed: ${message(err)})`)
    else noteOnce($, s, 'ast-grep-missing', 'off (ast-grep is not installed)')
    return null
  }
}

// A Stop's review: its findings, the pending comments it reviewed, and those
// to settle; the Stop applies it only when its dispatch was not abandoned.
type Review = { findings: Finding[]; reviewed: string[]; settle: string[] }

// The paths a collection may count as Claude's, or null for any. While the
// main loop has no open turn and every open subagent turn wrote only through
// the file tools, a change to another path is the user's.
function attributable(s: Session, ignoring?: string): Set<string> | null {
  const paths = new Set<string>()
  for (const [turnId, agentId] of s.open) {
    if (turnId === ignoring) continue
    const scope = agentId === undefined ? undefined : s.scopes.get(agentId)
    if (!scope || scope.anyPath || scope.inFlight > 0) return null
    for (const p of scope.paths) paths.add(p)
  }
  return paths
}

// The comments Claude's turns wrote since the baseline, added to pending; the
// baseline then moves to now and the ended turns close. A failed or slow
// snapshot, diff or scan keeps both, so the next collection retries with the
// same attribution. Returns whether the baseline moved.
async function collect($: EngineInterface, s: Session, ignoring?: string): Promise<boolean> {
  const from = s.baseline
  if (!from) {
    for (const id of s.closing) closeTurn(s, id)
    return true
  }
  const until = (await $.clock.now()) + COLLECT_BUDGET_MS
  let to: Snapshot | undefined
  let diff: Diff
  try {
    to = await snapshot($, s, from.root, until)
    diff = await changes($, s, from, to, until)
  } catch (err) {
    // Too many changes stay too many, so those are passed over; anything else
    // is retried with the next collection's.
    if (err instanceof TooManyChanges && to) {
      noteOnce($, s, 'changes', `comments were not collected (${message(err)})`)
      return advance(s, to)
    }
    noteOnce($, s, 'collect', `comments were not collected (${message(err)}); the next collection retries`)
    return false
  }
  s.removed = [...s.removed, ...diff.removed].slice(-MAX_REMOVED)
  const allowed = attributable(s, ignoring)
  const files: string[] = []
  for (const p of diff.added.keys()) if ((!allowed || allowed.has(p)) && (await isRegularFile($, `${from.root}/${p}`))) files.push(p)
  if (files.length > 0) {
    const scans = await scanFiles($, s, from.root, files, until).catch(err => {
      noteOnce($, s, 'collect', `comments were not collected (${message(err)}); the next collection retries`)
      return null
    })
    if (!scans) return false
    const settled = await loadSettled($, s)
    const isKnown = (c: Comment) => settled.has(fingerprint(from.root, c)) || s.pending.has(fingerprint(from.root, c))
    let dropped = 0
    for (const c of addedComments(scans, { added: diff.added, removed: s.removed }, isKnown)) {
      if (s.pending.size < MAX_PENDING) s.pending.set(fingerprint(from.root, c), pendingOf(c))
      else dropped++
    }
    if (dropped > 0) $.ui.toast(`comment-policy: ${dropped} added comments were not kept for review; ${MAX_PENDING} already wait`)
  }
  return advance(s, to)
}

function advance(s: Session, to: Snapshot): true {
  s.baseline = to
  for (const id of s.closing) closeTurn(s, id)
  s.closing.clear()
  return true
}

// The rules and the judge on the pending comments still in their files, oldest
// first. Only pending comments no longer in their files leave pending here.
async function judgePending($: EngineInterface, s: Session, signal: AbortSignal): Promise<Review | null> {
  const root = s.pendingRoot
  if (!root || s.pending.size === 0) return null
  const waitingNow = new Map(s.pending)
  const order = new Map([...waitingNow.keys()].map((k, i) => [k, i]))
  const files: string[] = []
  for (const p of new Set([...waitingNow.values()].map(p => p.path))) if (await isRegularFile($, `${root}/${p}`)) files.push(p)
  const scans = files.length > 0 ? await scanFiles($, s, root, files) : new Map()
  if (!scans) return null

  const settled = await loadSettled($, s)
  const located = addedComments(scans, emptyDiff(), c => settled.has(fingerprint(root, c)), [...waitingNow.values()])
    .filter(c => waitingNow.has(fingerprint(root, c)))
    .sort((a, b) => order.get(fingerprint(root, a))! - order.get(fingerprint(root, b))!)
  // A pending comment the user rewrote or deleted, or one settled meanwhile, leaves.
  const present = new Set(located.map(c => fingerprint(root, c)))
  for (const k of waitingNow.keys()) if (!present.has(k)) s.pending.delete(k)

  const findings: Finding[] = []
  for (const c of located) for (const reason of ruleFindings(c)) findings.push({ comment: c, kind: 'rule', reason })
  const ruled = new Set(findings.map(f => f.comment))
  const now = located.filter(c => !isDirective(c) && !ruled.has(c)).slice(0, MAX_JUDGED)
  const batches: Comment[][] = []
  for (let i = 0; i < now.length; i += JUDGE_BATCH) batches.push(now.slice(i, i + JUDGE_BATCH))
  const verdicts = await Promise.all(batches.map(b => judge($, root, b, signal)))

  // A comment with a verdict is settled, whatever the verdict: one the model
  // keeps on purpose must not stop every later turn, in this session or the next.
  const judged = batches.flatMap((b, i) => (verdicts[i] ? b : []))
  for (const v of verdicts) if (v) findings.push(...v)
  return {
    findings,
    reviewed: [...ruled, ...judged, ...located.filter(isDirective)].map(c => fingerprint(root, c)),
    settle: [...ruled, ...judged].map(c => fingerprint(root, c)),
  }
}

// The stored fingerprints, or null when the store cannot be read.
async function readStored($: EngineInterface): Promise<string[] | null> {
  try {
    const stored = await $.store.get(SETTLED_KEY)
    return Array.isArray(stored) ? stored.filter((k): k is string => typeof k === 'string') : []
  } catch (err) {
    $.ui.log(`comment-policy: verdict store unreadable: ${message(err)}`, { to: 'debug' })
    return null
  }
}

async function loadSettled($: EngineInterface, s: Session): Promise<Set<string>> {
  s.settled ??= new Set((await readStored($)) ?? [])
  return s.settled
}

// Another session may have written since this one loaded, so the store is read
// again and merged; when that read fails nothing is written, so the stored
// fingerprints are never replaced by this session's alone.
async function saveSettled($: EngineInterface, s: Session, added: readonly string[]) {
  if (added.length === 0) return
  for (const k of added) s.settled?.add(k)
  const stored = await readStored($)
  if (stored === null) return
  const merged = new Set([...stored, ...added])
  await $.store.set(SETTLED_KEY, [...merged].slice(-MAX_SETTLED)).catch(err => $.ui.log(`comment-policy: verdicts not stored: ${message(err)}`, { to: 'debug' }))
}

// The rule ids the repository's specs/ defines, tracked or not; none when it
// has no specs or git cannot read them.
async function specRules($: EngineInterface, root: string): Promise<Set<string>> {
  const r = await git($, root, ['grep', '--untracked', '--no-color', '-h', '-o', '-E', '^#{1,6} [A-Z][A-Z0-9]*-[0-9]+', '--', 'specs/'], { timeoutMs: PROBE_TIMEOUT_MS }).catch(() => null)
  return r && r.exitCode === 0 ? specIds(r.stdout) : new Set()
}

// The judge's findings for one batch, or null when it gave no usable answer.
async function judge($: EngineInterface, root: string, comments: readonly Comment[], signal: AbortSignal): Promise<Finding[] | null> {
  if (comments.length === 0) return []
  const sources = new Map<string, string[] | undefined>()
  for (const c of comments) {
    if (sources.has(c.path)) continue
    const text = await $.fs.read(`${root}/${c.path}`).catch(() => undefined)
    sources.set(c.path, text !== undefined && text.length <= MAX_SOURCE_BYTES ? text.split('\n') : undefined)
  }
  const items = judgeItems(comments, p => sources.get(p))
  const specs = await specRules($, root)
  try {
    const policy = await $.fs.read(`${$.plugin.root}/hooks/comment-policy/policy.md`)
    const r = await $.model.complete({
      model: JUDGE_MODEL,
      system: judgeSystem(policy),
      prompt: judgePrompt(items, citedSpecs(comments, specs)),
      effort: 'low',
      maxTokens: JUDGE_MAX_TOKENS,
      timeoutMs: JUDGE_TIMEOUT_MS,
    }, { signal })
    if (!r.isAnswered) throw new Error(r.reason)
    // parseVerdicts keeps ids within 1..comments.length.
    return parseVerdicts(r.text, items)
      .filter(v => !quotesSpec(v.evidence, specs))
      .map(v => ({ comment: comments[v.id - 1]!, kind: v.verdict, reason: v.reason, evidence: v.evidence }))
  } catch (err) {
    $.ui.toast(`comment-policy: judge unavailable (${message(err)}); those comments wait for the next review`)
    return null
  }
}

async function withPolicy($: EngineInterface, context: readonly string[] | undefined): Promise<string[]> {
  try {
    const policy = await $.fs.read(`${$.plugin.root}/hooks/comment-policy/policy.md`)
    return [...(context ?? []), policy]
  } catch (err) {
    $.ui.log(`comment-policy: policy not added: ${message(err)}`, { to: 'debug' })
    return [...(context ?? [])]
  }
}

// A main-loop turn's start: the baseline moves to now, so changes made while no
// turn was open (the user's) are never reviewed. When another turn was open as
// this one arrived, its changes so far are collected instead. A late start, one
// whose hook ran out of budget so the turn began before this ran, collects
// everything since the baseline as the turn's, so its first writes are kept.
async function beginMain($: EngineInterface, s: Session, turnId: string, idle: boolean, late: boolean) {
  const root = await repositoryRoot($, s)
  if (root !== s.pendingRoot) {
    s.pending.clear()
    s.pendingRoot = root
  }
  if (root === null) {
    s.baseline = null
    return
  }
  if (s.baseline?.root === root && (late || !idle)) {
    await collect($, s, late ? undefined : turnId)
    return
  }
  await rebase($, s, root)
}

async function rebase($: EngineInterface, s: Session, root: string) {
  s.removed = []
  try {
    s.baseline = await snapshot($, s, root, (await $.clock.now()) + COLLECT_BUDGET_MS)
  } catch (err) {
    s.baseline = null
    noteOnce($, s, 'snapshot', `a turn was not reviewed (${message(err)})`)
  }
}

function queued(s: Session, work: () => Promise<void>): Promise<void> {
  const run = s.queue.then(work)
  s.queue = run.catch(() => {})
  return run
}

// At most one collection runs and one waits; a turn end arriving meanwhile
// joins the waiting one, so a burst of subagent ends costs two collections.
// A turn stays open until its changes are collected, so a turn start queued
// behind its collection still sees it.
function collectSoon($: EngineInterface, s: Session, closing: readonly string[] = []): Promise<void> {
  if (s.nextCollect) {
    for (const id of closing) s.nextCollect.closing.add(id)
    return s.nextCollect.done
  }
  const waiting = { closing: new Set(closing), done: Promise.resolve() }
  s.nextCollect = waiting
  waiting.done = queued(s, async () => {
    s.nextCollect = null
    for (const id of waiting.closing) s.closing.add(id)
    await collect($, s)
  })
  return waiting.done
}

// The open-turn id standing for a subagent whose turn start this hook did not
// hear, until its turn ends.
const unheard = (agentId: string) => `unheard:${agentId}`

function closeTurn(s: Session, turnId: string) {
  const agentId = s.open.get(turnId)
  s.open.delete(turnId)
  if (agentId !== undefined && ![...s.open.values()].includes(agentId)) s.scopes.delete(agentId)
}

function scopeOf(s: Session, agentId: string) {
  let scope = s.scopes.get(agentId)
  if (!scope) s.scopes.set(agentId, (scope = { paths: new Set(), anyPath: false, inFlight: 0 }))
  if (![...s.open.values()].includes(agentId)) s.open.set(unheard(agentId), agentId)
  return scope
}

// The repository path a file tool call names, '' for a path outside the
// repository, or undefined when the call is not a file tool's or its path is
// unusable.
function namedPath(s: Session, tool: string, input: Record<string, unknown>): string | undefined {
  const arg = FILE_TOOLS[tool]
  const raw = arg === undefined ? undefined : input[arg]
  if (typeof raw !== 'string' || !raw.startsWith('/') || s.aliases.length === 0) return undefined
  const parts: string[] = []
  for (const part of raw.split('/')) {
    if (part === '..') parts.pop()
    else if (part && part !== '.') parts.push(part)
  }
  const path = `/${parts.join('/')}`
  const root = s.aliases.find(a => path.startsWith(`${a}/`))
  return root === undefined ? '' : path.slice(root.length + 1)
}

export const register: Register = (on, options) => {
  const mode = options.comment_policy
  if (mode !== 'on' && mode !== 'review') return
  const s: Session = {
    baseline: null,
    open: new Map(),
    scopes: new Map(),
    closing: new Set(),
    aliases: [],
    pending: new Map(),
    pendingRoot: null,
    removed: [],
    sentBack: false,
    settled: null,
    noted: new Set(),
    emptyBlobs: new Map(),
    hashes: new Map(),
    nextCollect: null,
    queue: Promise.resolve(),
  }

  // `review` is for setups that already load the policy, such as a rules file.
  if (mode === 'on') {
    on('classic.SessionStart', async ($, e, next) => {
      const r = await next(e)
      return { ...r, additionalContext: await withPolicy($, r.additionalContext) }
    })

    on('classic.SubagentStart', async ($, e, next) => {
      const r = await next(e)
      return { ...r, additionalContext: await withPolicy($, r.additionalContext) }
    })
  }

  // The root is resolved in the main loop only: a subagent's working directory
  // may be another worktree.
  on('turn.start', async ($, e, next) => {
    const idle = s.open.size === 0
    if (e.agentId !== undefined) {
      s.open.delete(unheard(e.agentId))
      if (!s.scopes.has(e.agentId)) s.scopes.set(e.agentId, { paths: new Set(), anyPath: false, inFlight: 0 })
    }
    s.open.set(e.turnId, e.agentId)
    // A start that ran out of budget let the turn begin before its snapshot;
    // an interrupt aborts the signal too, but leaves budget, and rebases.
    const { signal, budget } = next
    await queued(s, async () => {
      const late = signal.aborted && budget.remainingMs <= 0
      if (e.agentId === undefined) await beginMain($, s, e.turnId, idle, late)
      else if (s.baseline && idle && !late) await rebase($, s, s.baseline.root)
    })
    return next(e)
  })

  // handoff owns the unmatched turn.complete, and a plugin has one per event.
  on('turn.complete', { isAborted: false }, async ($, e, next) => {
    await collectSoon($, s, e.agentId === undefined ? [e.turnId] : [e.turnId, unheard(e.agentId)])
    return next(e)
  })
  on('turn.complete', { isAborted: true }, async ($, e, next) => {
    await collectSoon($, s, e.agentId === undefined ? [e.turnId] : [e.turnId, unheard(e.agentId)])
    return next(e)
  })

  // A file tool's path is credited before it writes, and any other tool counts
  // as writing anywhere while it runs, so a collection taken meanwhile never
  // passes over the write.
  on('tool.call', async ($, e, next) => {
    if (e.agentId === undefined || NO_FILE_WRITES.has(e.tool)) return next(e)
    const scope = scopeOf(s, e.agentId)
    const path = namedPath(s, e.tool, e as unknown as Record<string, unknown>)
    if (path !== undefined) {
      if (path) scope.paths.add(path)
      return next(e)
    }
    scope.inFlight++
    try {
      const r = await next(e)
      if (r.deny === undefined && !r.isReadOnly) scope.anyPath = true
      return r
    } finally {
      scope.inFlight--
    }
  })

  on('classic.Stop', async ($, e, next) => {
    const r = await next(e)
    if (e.agent_id !== undefined) return r
    if (!e.stop_hook_active) s.sentBack = false
    // A turn this hook sent back once ends; what it wrote while fixing waits
    // in pending for the next prompt's Stop.
    if (s.sentBack) return r
    await collectSoon($, s)
    if (next.signal.aborted) return r
    const result = await judgePending($, s, next.signal).catch(err => {
      noteOnce($, s, 'review', `a review was skipped (${message(err)})`)
      return null
    })
    // Nothing waits between this check and the return, so a review applied
    // here always reaches the agent; an abandoned Stop leaves its comments
    // pending to be judged again.
    if (!result || next.signal.aborted) return r
    for (const k of result.reviewed) s.pending.delete(k)
    for (const k of result.settle) s.settled?.add(k)
    void queued(s, () => saveSettled($, s, result.settle))
    if (result.findings.length === 0) return r
    s.sentBack = true
    const text = blockText(result.findings, s.pending.size)
    return { ...r, block: r.block ? `${r.block}\n\n${text}` : text }
  })
}
