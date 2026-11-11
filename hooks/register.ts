import type { Register } from 'claude-code'

import { register as handoff } from './handoff/register'
import { register as promptIntake } from './prompt-intake/register'

// The engine loads one hooks module per plugin; each capability registers its own hooks.
export const register: Register = (on, options) => {
  promptIntake(on, options)
  handoff(on, options)
}
