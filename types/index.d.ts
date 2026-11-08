// The band the handoff mod draws above the prompt; null draws nothing.
//   offer:      context passed the offer point; Write handoff / Not now.
//   writing:    the band's fork is writing the handoff.
//   ready:      saved at `file`; Continue fresh / Copy / Close.
//   continuing: /clear is queued for the handoff at `file`; no buttons, so it runs once.
//   failed:     `error` says why; Try again / Close.
export type HandoffBand =
  | { phase: 'offer'; tokens: number; threshold: number }
  | { phase: 'writing' }
  | { phase: 'ready'; file: string; note?: string }
  | { phase: 'continuing'; file: string }
  | { phase: 'failed'; error: string }

declare module 'claude-code' {
  interface PluginState {
    jacoelho: { handoff: HandoffBand | null }
  }
}
