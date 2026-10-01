# Vue behaviour tests

## Observable contracts

Test rendered output, user interaction, emitted values, and meaningful failures. Prefer those over component internals, snapshot-only assertions, or checking that a mocked action was called when the requirement concerns the action's result.

Use the existing test tooling. Vue Test Utils with Vitest is a suitable component-test option in a Vite project, not a requirement to replace another working runner. Use a real browser for layout, focus behaviour, and browser APIs that a DOM emulator cannot establish.

Await Vue Test Utils operations such as `trigger` and `setValue` before checking the resulting DOM. `nextTick` flushes Vue's scheduled updates; `flushPromises` helps resolve already-pending promise handlers. Neither substitutes for advancing a timer or controlling unresolved network work. Prefer deferred promises and explicit responses over arbitrary sleeps.

Mount lifecycle-dependent composables in a host component, install/provide their dependencies before mount, and unmount it to verify disposal. Async `setup` requires a `Suspense` boundary in the harness. For Teleport, create and remove the target and assert against the actual teleported DOM when that behaviour matters; a stub cannot prove it.

For request-driven UI, cover obsolete results arriving after a scope/parameter change and cleanup on unmount. Derive save, permission-loss, and scope-switch expectations from the application's contracts.

## Pinia, only if selected

For store behaviour tests, create a fresh real Pinia per test so actions execute. For store state and ownership, see [Components](components.md#shared-state-when-pinia-is-selected).

`createTestingPinia` stubs actions by default. Use that to isolate a component, and use real actions (`stubActions: false`) or real Pinia when testing their effects. With Vitest globals disabled, pass `createSpy: vi.fn`; a recognised global Jest/Vitest spy factory can be used automatically. The need for `createSpy` is environmental, not a universal version-1 requirement.

With testing Pinia, pass store plugins through `createTestingPinia({ plugins: [...] })`; install the testing instance into the test app. For direct plugin-dependent store tests, honour the plugin's app-installation lifecycle. `fakeApp` exists for testing-Pinia cases that need an installed app without mounting a component.

Use the runner's typed mock helpers for mocked actions. Keep one test's store state, listeners, and mock implementations from leaking into another. Clearing call history alone does not reset state or mock implementations.

Pinia `$subscribe` follows watcher scheduling. Await the appropriate Vue update when testing the default subscription, or select `flush: 'sync'` only when synchronous delivery is the intended contract.

## Sources

- [Vue testing guide](https://vuejs.org/guide/scaling-up/testing.html)
- [Vue Test Utils asynchronous behaviour](https://test-utils.vuejs.org/guide/advanced/async-suspense.html)
- [Vue Test Utils Teleport](https://test-utils.vuejs.org/guide/advanced/teleport.html)
- [Pinia testing](https://pinia.vuejs.org/cookbook/testing.html)
- [Pinia core concepts](https://pinia.vuejs.org/core-concepts/)
- [Pinia subscriptions](https://pinia.vuejs.org/core-concepts/state.html#subscribing-to-the-state)
