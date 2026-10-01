# Build and routing integration

## TypeScript and bundlers

Use the project's active frontend configuration and local toolchain. `moduleResolution: "bundler"` requires TypeScript 5.0+ and a compatible `module` setting; it models bundler resolution, including extensionless imports and package exports. It does not require every dependency to declare an `exports` field.

For a Vite browser application, start from a compatible Vue/TypeScript configuration. Code executed directly by Node may need a separate Node-oriented configuration. Follow the runtime's resolution semantics rather than applying one configuration to every package in a workspace.

For a resolution failure, inspect the effective configuration and the package's public entry points, then use the local compiler's resolution trace. Disabling `resolvePackageJsonExports` can make TypeScript accept an import the runtime rejects; reverting to legacy `node` resolution is not a general repair. Fix the public import, package metadata, or demonstrated version incompatibility.

Vite transforms TypeScript without type-checking it. Use the configured `vue-tsc` check for SFC scripts and templates; building successfully is a separate result.

## Vite and hot reload

For a hot-reload problem, establish whether it is client rendering or SSR, reproduce with the installed plugin versions, and inspect the resolved plugin configuration.

Register the Vue SFC transform through the integration that owns it. A framework may already install it. Duplicate plugin names are a diagnostic clue, not proof that deduplication is safe: one plugin factory may intentionally return several plugins. Correct the duplicate owner rather than filtering the final plugin array by name.

Treat issue-specific HMR flags, cache clearing, server restarts, and dependency upgrades as investigated fixes. Do not copy obsolete SSR configuration or change package versions solely because a skill example suggests it.

## Routes, when Vue Router is used

Read and validate the parameters needed by the current route. A type assertion is not validation. Observe specific reactive parameters when a component instance is reused across navigation; mounting and route `beforeEnter` do not run again for every parameter change.

Use return-based navigation guards for clear control flow. The legacy `next` argument remains supported but is error-prone; mixing styles or calling it twice can break navigation. Await/return asynchronous guard work, and throw unexpected errors for router error handling. An awaited guard falling through with `undefined` correctly permits navigation. Client guards improve navigation flow; server authorisation still decides access.

When subsequent behavior depends on successful navigation, await `router.push` or `router.replace` and inspect the result with `isNavigationFailure`; aborted, cancelled, and duplicated navigations resolve as failures, while successful navigation (including redirects) is falsy.

Keep route metadata for route policy rather than fetched private records. Use documented data-loading APIs; a `loader` property is not a standard route-record fetch hook. Experimental integrations need explicit selection and version checks. A `Promise.race` timeout does not cancel the underlying work or establish an authenticated result.

Typed route maps are available in Vue Router 4.4+. File-based route generation is an optional integration, not a prerequisite for typed routes. If it is selected, use that installed version's documented exports and generated route names. A route name that resembles a file path is still a name, not the navigated URL. Naming a route in a type does not prove that an arbitrary component is currently rendered under it.

For async parameter-driven reads, apply watcher cancellation and stale-result handling from [Components](components.md). Derive scope-change and pending-mutation behaviour from the application's contracts.

## Sources

- [TypeScript module resolution](https://www.typescriptlang.org/docs/handbook/modules/reference.html#the-moduleresolution-compiler-option)
- [Vue TypeScript tooling](https://vuejs.org/guide/typescript/overview.html)
- [Vite TypeScript support](https://vite.dev/guide/features.html#typescript)
- [Vue Router typed routes](https://router.vuejs.org/guide/advanced/typed-routes.html)
- [Vue Router Composition API](https://router.vuejs.org/guide/advanced/composition-api.html)
- [Vue Router navigation guards](https://router.vuejs.org/guide/advanced/navigation-guards.html)
- [Vue Router navigation failures](https://router.vuejs.org/guide/advanced/navigation-failures.html)
