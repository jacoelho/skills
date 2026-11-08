import { atom, read, update } from 'claude-code'
import type { EngineInterface, ModelForkResult, Register, RenderSurface, SessionCompactInput, SessionCompactResult } from 'claude-code'

import type { HandoffBand } from '../../types'
import {
  type Paths,
  type Settings,
  type Snooze,
  compactionRoute,
  decideOffer,
  fileName,
  redact,
  renderTemplate,
  resolvePaths,
  seedText,
  settingsFrom,
  unfence,
  unsentTail,
} from './handoff'

const band = atom({ plugin: 'jacoelho', key: 'handoff' } as const, null as HandoffBand | null)

const LOG_LINES = 400

// Everything the module holds between events. `register` replaces it whole on
// every load, so no field can be left over from an earlier one.
type Runtime = {
  settings: Settings
  // Null until session.start knows the home folder.
  paths: Paths | null
  // Who is forking: one fork at a time, whether the band or a compaction asked.
  fork: 'band' | 'compaction' | null
  snooze: Snooze
  // Cached per model; dropped on any settings change.
  threshold: { model: string; tokens: number } | null
  // handoff.log is read, changed and written whole: writes go one after another.
  logQueue: Promise<void>
}

let rt: Runtime = runtime(settingsFrom({}))

function runtime(settings: Settings): Runtime {
  return { settings, paths: null, fork: null, snooze: 'armed', threshold: null, logQueue: Promise.resolve() }
}

type Written = { kind: 'saved'; file: string; text: string } | { kind: 'failed'; reason: string }

async function setBand($: EngineInterface, value: HandoffBand | null) {
  await update($, band, () => value)
}

// Moves the band from `ready` to `continuing`, atomically: two presses before a
// redraw cannot both win. Resolves the file this call claimed, or null.
async function claimContinue($: EngineInterface): Promise<string | null> {
  // `update` may run the change again on a write conflict; the last run decides.
  const claim: { file: string | null } = { file: null }
  await update($, band, (b): HandoffBand | null => {
    claim.file = b?.phase === 'ready' ? b.file : null
    return b?.phase === 'ready' ? { phase: 'continuing', file: b.file } : b
  })
  return claim.file
}

// A note under a handoff that is still to be used; a failed Continue goes back to ready.
async function note($: EngineInterface, text: string) {
  await update($, band, (b): HandoffBand | null =>
    b?.phase === 'ready' || b?.phase === 'continuing' ? { phase: 'ready', file: b.file, note: text } : b,
  )
}

function forkFailure(r: Extract<ModelForkResult, { isAnswered: false }>): string {
  switch (r.reason) {
    case 'nothing-to-fork':
      return 'nothing to fork yet: run one turn first'
    case 'api-error':
      return `the model call failed (HTTP ${r.status ?? 'no response'})`
    case 'empty-reply':
      return 'the model replied with no text'
    case 'aborted':
      return 'the model call was interrupted'
  }
}

const message = (err: unknown) => (err instanceof Error ? err.message : String(err))

function log($: EngineInterface, line: string): Promise<void> {
  rt.logQueue = rt.logQueue.then(() => appendLog($, line))
  return rt.logQueue
}

async function appendLog($: EngineInterface, line: string) {
  if (!rt.paths) return
  const path = rt.paths.log
  try {
    const old = (await $.fs.exists(path)) ? String(await $.fs.read(path)) : ''
    const lines = old ? old.trimEnd().split('\n').slice(-(LOG_LINES - 1)) : []
    lines.push(`${new Date(await $.clock.now()).toISOString()} ${line}`)
    await $.fs.write(path, `${lines.join('\n')}\n`)
  } catch (err) {
    $.ui.log(`handoff: could not write ${path}: ${message(err)}`, { to: 'debug' })
  }
}

// The session's auto-compact point, or the model's window when auto-compact is off.
async function compactThreshold($: EngineInterface): Promise<number> {
  const model = await $.session.model()
  if (rt.threshold?.model === model) return rt.threshold.tokens
  const { context } = await $.session.usage({ breakdown: 'summary' })
  const tokens = context.breakdown?.autoCompactThreshold ?? context.breakdown?.rawMaxTokens ?? context.window
  rt.threshold = { model, tokens }
  return tokens
}

// Writes the handoff with a fork of the main thread and saves it. Every
// failure comes back as a reason a person can act on.
async function writeHandoff($: EngineInterface, paths: Paths): Promise<Written> {
  let template: string
  try {
    template = String(await $.fs.read(paths.prompt))
  } catch (err) {
    return { kind: 'failed', reason: `${paths.prompt}: cannot read the prompt file (${message(err)})` }
  }
  const cwd = await $.session.cwd()
  const shown = paths.home && cwd.startsWith(`${paths.home}/`) ? `~${cwd.slice(paths.home.length)}` : cwd
  const prompt = renderTemplate(template, paths.prompt, { cwd: shown })
  if (prompt.kind === 'error') return { kind: 'failed', reason: prompt.reason }

  const reply = await $.model.fork({ prompt: prompt.text })
  if (!reply.isAnswered) return { kind: 'failed', reason: forkFailure(reply) }
  const text = redact(unfence(reply.text))
  if (!text) return { kind: 'failed', reason: 'the model replied with no text' }

  const file = `${paths.dir}/${fileName(text, new Date(await $.clock.now()))}`
  try {
    await $.fs.write(file, `${text}\n`)
  } catch (err) {
    return { kind: 'failed', reason: `cannot save ${file} (${message(err)})` }
  }
  return { kind: 'saved', file, text }
}

// Takes the fork for `who` and writes; a second writer gets the reason it lost.
async function forkAs($: EngineInterface, who: 'band' | 'compaction'): Promise<Written> {
  if (!rt.paths) return { kind: 'failed', reason: 'the session has not started' }
  if (rt.fork) return { kind: 'failed', reason: `a handoff is already being written (by the ${rt.fork})` }
  rt.fork = who
  try {
    return await writeHandoff($, rt.paths)
  } finally {
    rt.fork = null
  }
}

async function write($: EngineInterface) {
  if (rt.fork) {
    $.ui.toast(`A handoff is already being written (by the ${rt.fork}).`)
    return
  }
  await setBand($, { phase: 'writing' })
  const written = await forkAs($, 'band')
  switch (written.kind) {
    case 'saved':
      await setBand($, { phase: 'ready', file: written.file })
      await log($, `ok ${written.file} ${written.text.split(/\s+/).length} words`)
      return
    case 'failed':
      await setBand($, { phase: 'failed', error: written.reason })
      await log($, `failed: ${written.reason}`)
      return
  }
}

// /clear, then the saved handoff as the first prompt of the fresh conversation.
// Not a plugin compaction: a plugin's own $.session.compact() skips its own
// session.compact hook, so it could not answer that compaction with the handoff.
async function continueFresh($: EngineInterface) {
  const file = await claimContinue($)
  if (file === null) return

  let seed: string
  try {
    seed = seedText(String(await $.fs.read(file)).trim(), file)
  } catch (err) {
    await note($, `Cannot read ${file}: ${message(err)}`)
    return
  }
  try {
    await $.command.run({ command: 'clear' })
  } catch (err) {
    await note($, `Could not clear the conversation: ${message(err)}`)
    return
  }
  await setBand($, null)
  rt.snooze = 'armed'
  await log($, `continued fresh from ${file}`)
  try {
    // Resolves once the seed's turn starts.
    await $.prompt.submit({ text: seed, asUser: true })
  } catch (err) {
    // The conversation is already clear: hand the seed to the person instead.
    const filled = await $.prompt.fill({ text: seed }).catch(() => ({ isFilled: false }))
    const where = filled.isFilled ? 'It is in the prompt box; press Enter to send it.' : `Paste it from ${file}.`
    $.ui.toast(`Could not send the handoff (${message(err)}). ${where}`)
    await log($, `seed not sent: ${message(err)}`)
  }
}

async function copyHandoff($: EngineInterface, file: string, surface: RenderSurface) {
  try {
    const r = await $.ui.copy({ text: String(await $.fs.read(file)), surface })
    await note($, r.isCopied ? 'Copied.' : `Copy failed: ${r.reason}`)
  } catch (err) {
    await note($, `Copy failed: ${message(err)}`)
  }
}

async function checkOffer($: EngineInterface) {
  const current = await read($, band)
  // Writing, ready, continuing or failed: the band is busy with a handoff.
  if (current && current.phase !== 'offer') return
  const { context } = await $.session.usage()
  if (context.tokens === undefined) return
  const threshold = await compactThreshold($)
  const decision = decideOffer(rt.settings.offer, threshold, context.tokens, rt.snooze)
  rt.snooze = decision.snooze
  if (decision.show) await setBand($, { phase: 'offer', tokens: context.tokens, threshold })
  else if (current) await setBand($, null)
}

// The transcript becomes the handoff, followed by what the fork did not see.
// Any failure falls back to Claude Code's own compaction.
async function compactToHandoff(
  $: EngineInterface,
  e: SessionCompactInput,
  next: (e: SessionCompactInput) => Promise<SessionCompactResult>,
): Promise<SessionCompactResult> {
  const written = await forkAs($, 'compaction')
  if (written.kind === 'failed') {
    await log($, `compaction (${e.trigger}) left to Claude Code: ${written.reason}`)
    return next(e)
  }
  await log($, `compaction (${e.trigger}) replaced by ${written.file}`)
  rt.snooze = 'armed'
  await setBand($, null)
  return { messages: [{ role: 'user', text: seedText(written.text, written.file), toolUses: [] }, ...unsentTail(e.messages)] }
}

export const register: Register = (on, options) => {
  rt = runtime(settingsFrom(options))

  on('session.start', async ($, e, next) => {
    rt.paths = resolvePaths(rt.settings, (await $.env.get('HOME')) ?? '', $.plugin.root)
    await $.command.register({ name: 'handoff', description: 'Write a handoff of this chat now, then continue fresh from it' })
    // A reload ends whatever the band was waiting on.
    const b = await read($, band)
    if (b?.phase === 'writing') await setBand($, null)
    if (b?.phase === 'continuing') await setBand($, { phase: 'ready', file: b.file })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    try {
      await checkOffer($)
    } catch (err) {
      $.ui.log(`handoff: offer check failed: ${message(err)}`, { to: 'debug' })
    }
    return result
  })

  // Turning auto-compact on or off, or changing its window, moves the threshold.
  on('classic.ConfigChange', async ($, e, next) => {
    rt.threshold = null
    return next(e)
  })

  on('session.compact', async ($, e, next) => {
    if (compactionRoute(rt.settings.onCompact, e.trigger, e.agentId) === 'core') return next(e)
    return compactToHandoff($, e, next)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'handoff' }, async $ => {
    if (rt.fork) return { text: `A handoff is already being written (by the ${rt.fork}).` }
    void write($)
    return { text: 'Writing the handoff. The band above the prompt shows when it is ready.' }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const b = await read($, band)
    if (!b || e.props.hasSurvey) return next(e)
    // The offer waits out a running turn; progress and results do not.
    if (b.phase === 'offer' && e.props.isWorking) return next(e)
    const rest = await next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    const close = () => setBand($, null)

    let body
    switch (b.phase) {
      case 'offer': {
        const k = (n: number) => `${Math.round(n / 1000)}k`
        body = (
          <Box flexDirection="row" gap={1}>
            <Text dimColor>
              Context at {k(b.tokens)} of {k(b.threshold)} before auto-compact. Write a handoff to continue fresh?
            </Text>
            <Button key="handoff-write" label="Write handoff" variant="primary" onPress={() => void write($)} />
            <Button
              key="handoff-dismiss"
              label="Not now"
              role="dismiss"
              onPress={() => {
                rt.snooze = 'snoozed'
                return close()
              }}
            />
          </Box>
        )
        break
      }
      case 'writing':
        body = <Text dimColor>Writing the handoff…</Text>
        break
      case 'continuing':
        body = <Text dimColor>Clearing the conversation to continue from {b.file}…</Text>
        break
      case 'ready':
        body = (
          <Box flexDirection="column">
            <Text dimColor wrap="truncate-middle">
              Handoff saved to {b.file}
            </Text>
            <Box flexDirection="row" gap={1}>
              {/* /clear waits for an idle session; offered only then, so it cannot cut a running turn. */}
              {e.props.isWorking ? null : (
                <Button key="handoff-continue" label="Continue fresh" variant="primary" onPress={() => continueFresh($)} />
              )}
              <Button key="handoff-copy" label="Copy" onPress={press => copyHandoff($, b.file, press.surface)} />
              <Button key="handoff-close" label="Close" role="dismiss" onPress={close} />
            </Box>
            {b.note ? <Text dimColor>{b.note}</Text> : null}
          </Box>
        )
        break
      case 'failed':
        body = (
          <Box flexDirection="column">
            <Text color="red">The handoff did not finish: {b.error}</Text>
            <Box flexDirection="row" gap={1}>
              <Button key="handoff-retry" label="Try again" variant="primary" onPress={() => void write($)} />
              <Button key="handoff-close" label="Close" role="dismiss" onPress={close} />
            </Box>
          </Box>
        )
        break
    }
    return (
      <Box flexDirection="column">
        {rest}
        {body}
      </Box>
    )
  })
}
