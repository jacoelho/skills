# Components and reactive lifecycles

## State and component boundaries

Use `ref` for ordinary reactive state and `computed` for derived values. Keep computed getters free of side effects. `shallowRef` is useful for immutable snapshots or external objects whose internals Vue should not proxy; it offers no distinct deep-reactivity benefit for a primitive.

Destructuring primitive properties from a `reactive` object loses their reactive connection. Preserve the object or use refs/getters at the consumer boundary. This differs from the Vue 3.5 `defineProps` compiler transform.

Extract components around coherent responsibilities or actual reuse, and composables around stateful behaviour with a clear owner. A fixed number of template sections or lines does not establish a useful boundary. Keep local state local unless a real consumer requires sharing it.

Use typed props and events for parent/child contracts. Treat props as read-only, including nested values unless a shared mutation contract is explicit. For deep-tree context, use a typed `InjectionKey`, define who owns mutation, and handle a missing provider. Returning a plain object of refs from a composable preserves reactivity when callers destructure it.

For reactive derivations of wrapper inputs, declare props. Vue documents `useAttrs()` as non-reactive; do not depend on it as a general watch source, particularly for attribute presence/enumeration. Forward attributes at render time or use the documented update lifecycle for DOM effects.

## Shared state, when Pinia is selected

Use a store only when client state has actual shared consumers. Setup stores return the state Pinia manages; underscore names do not make returned state private. Use `storeToRefs` to destructure reactive state/getters; actions may be destructured directly.

Outside component setup, use the correct installed Pinia instance explicitly when ambient resolution is ambiguous. Ensure it exists before a navigation guard needs it. SSR needs request-scoped instances; HMR and persistence require their own integrations and are not automatic consequences of choosing Pinia.

Follow the application's authentication, privacy, URL, and persistence contracts before adopting generic token-store, URL-filter, or persistence examples.

## Models

`defineModel` is the recommended model macro from Vue 3.4. An optional `defineModel<T>()` can be `undefined`; `{ required: true }` marks the prop required at runtime and removes that optional branch from the inferred model type. It does not validate arbitrary business constraints; add explicit runtime validation when values cross a trust boundary.

Initialise the parent's model when the child expects a value. A child default can leave parent and child out of sync when the parent supplies `undefined`. Do not attribute unexpected update events to unmounting without a reproduction; inspect assignments and the component's declared contract.

## Watch sources and depth

Watch the smallest source that captures the intended behaviour. Prefer `computed` when the result is derivable without a side effect.

- `watch(aRef, ...)` and `watch(() => object.field, ...)` track their source; nested mutation needs the appropriate depth.
- Watching a reactive object directly is implicitly deep. With `deep: false`, Vue still observes its root-level mutations; this is not a reference-only subscription.
- Vue 3.5+ supports numeric depth. For a ref holding an array, `deep: 1` observes replacement and array mutations, but not nested element fields. Use it only if those deeper changes are irrelevant.
- Traversal is still work. Selective sources can be cheaper than walking a broad object at any depth.

## Asynchronous effects and disposal

Register `onWatcherCleanup` (Vue 3.5+) synchronously while the watcher runs, before the first `await`. The callback's `onCleanup` argument remains supported and can be passed to a helper; a nested helper does not require the newer API.

For a request owned by a watcher:

1. Capture the request's identity and scope; register cancellation before starting asynchronous work.
2. Handle HTTP failure, response validation, and expected cancellation distinctly.
3. Before committing results, errors, or loading-state changes (including `finally`), ensure the request still belongs to the active watcher and scope. Aborting alone cannot undo already-completed work or a server mutation.

`watchEffect` tracks dependencies read during synchronous execution, before the first `await`. Watchers created synchronously in setup are stopped on unmount; watchers created later or outside that scope need explicit disposal. Give timers, listeners, subscriptions, and external instances the same visible owner. Use `onScopeDispose` for resources owned by a composable's active effect scope.

Dispose pending timers as well as watchers they may create; otherwise a timer can create an unowned watcher after unmount. Compiler-transformed top-level `await` in `<script setup>` preserves the component context, unlike an arbitrary asynchronous callback.

For adaptable read inputs, `MaybeRefOrGetter<T>` and `toValue` require Vue 3.3+. Evaluate `toValue(input)` inside the reactive effect so getter dependencies are tracked. A callback-valued input needs a distinct contract because `toValue` calls functions. For caller-owned writable state, require a writable ref or explicit setter; wrapping a plain value does not write back to the caller.

## Rendering and lifecycle boundaries

Treat untrusted content as text; never compile or render an untrusted string as a Vue template. Vue escapes interpolated text and ordinary attribute bindings, but `v-html`, `innerHTML`, and unvalidated URLs or styles can create injection vulnerabilities. At the rendering/trust boundary, validate untrusted URLs and values and sanitize user-authored HTML before rendering it, using the project's existing or approved mechanism. If an existing backend stores or shares the content, apply the same checks there so other clients receive safe data. Use a sandbox when intentionally rendering user-authored HTML; do not add a backend or sanitizer dependency solely to satisfy this guidance.

When a component can be cached by `<KeepAlive>`, deactivation is not unmounting. Pause visibility-bound timers, polling, subscriptions, observers, and media in `onDeactivated`; resume or refresh them in `onActivated`, and keep final resource cleanup in `onUnmounted`.

If the application uses SSR, browser and DOM side effects belong in `onMounted` with cleanup in `onUnmounted`; these hooks do not run during server rendering. Follow the installed SSR framework's documented data-loading hook (`onServerPrefetch` where applicable), and create app, router, and store instances per request so mutable state cannot leak between users. Keep server and client output deterministic to avoid hydration mismatches.

## DOM details

`useId` (Vue 3.5+) provides IDs for labels and ARIA relationships, with SSR/client stability where applicable. It is not a persisted domain identifier or list key. Use stable domain identities for stateful list rendering.

`<Teleport defer>` (Vue 3.5+) permits a target rendered later in the same mount/update tick. It does not wait for a target created by a later network request or timer. Ensure the target exists at resolution time.

## Sources

- [Vue reactivity fundamentals](https://vuejs.org/guide/essentials/reactivity-fundamentals.html)
- [Pinia core concepts](https://pinia.vuejs.org/core-concepts/)
- [Pinia outside component usage](https://pinia.vuejs.org/core-concepts/outside-component-usage.html)
- [Vue component v-model](https://vuejs.org/guide/components/v-model.html)
- [Vue watchers: sources, depth, cleanup, and stopping](https://vuejs.org/guide/essentials/watchers.html)
- [Vue composables](https://vuejs.org/guide/reusability/composables.html)
- [Vue security best practices](https://vuejs.org/guide/best-practices/security.html)
- [Vue KeepAlive](https://vuejs.org/guide/built-ins/keep-alive.html)
- [Vue SSR](https://vuejs.org/guide/scaling-up/ssr.html#writing-ssr-friendly-code)
- [Vue lifecycle hooks](https://vuejs.org/api/composition-api-lifecycle.html)
- [Vue fallthrough attributes](https://vuejs.org/guide/components/attrs.html#accessing-fallthrough-attributes-in-javascript)
- [Vue script-setup top-level await](https://vuejs.org/api/sfc-script-setup.html#top-level-await)
- [Vue reactivity utilities](https://vuejs.org/api/reactivity-utilities.html)
- [Vue useId](https://vuejs.org/api/composition-api-helpers.html#useid)
- [Vue deferred Teleport](https://vuejs.org/guide/built-ins/teleport.html#deferred-teleport)
