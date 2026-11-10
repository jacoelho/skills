import type { Register } from 'claude-code'

import { register as handoff } from './handoff/register'

// The engine loads one hooks module per plugin; each capability registers its own hooks.
export const register: Register = (on, options) => {
  handoff(on, options)
}
