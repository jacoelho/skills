# Modules, configuration, and verification

## Match the executing environment

Select `target`, `lib`, `module`, and `moduleResolution` for the actual browser, bundler, Node, or other host. Declaration availability is not runtime availability; including DOM types or a newer library does not install browser APIs or polyfills.

Use the framework's compiler integration for framework-specific source formats. For code executed directly by Node, use an appropriate Node module mode and its extension/package rules. Do not copy another runtime's import conventions or a generic preset without checking how code is emitted and loaded.

Use the active project's effective configuration and local compiler version. `strict` enables a family of checks; `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` are separate options. Consider them when uncertain lookups or absent-versus-undefined semantics matter. Tightening configuration across an existing project is a distinct migration, not an incidental repair for one type error.

Prefer supported compiler options and the selected integration's configuration. Legacy/deprecated flags, declaration emission, source maps, path aliases, and resolution modes require a real build/deployment purpose. A `paths` alias does not itself rewrite runtime imports.

## Module contracts

Respect the project's documented module boundaries. Keep a type, its invariant enforcement, and its behaviour under one clear owner. TypeScript does not require a particular folder layout or dependency-injection framework.

Export the intended public surface. Use type-only imports/exports where required by the compiler/module settings and when they clarify that no runtime value exists. Named and default exports are both valid; follow framework entrypoint conventions. TypeScript offers several module styles, not a universal ban on default imports.

Use a named options object when several arguments are easy to swap or have independent optional meanings. Keep simple positional APIs and framework callbacks when their order is clear. Treat allocation cost as a measurement question rather than imposing a blanket exception for parsers or rendering code.

Inject clocks, randomness, network/storage access, and other effects where a real boundary needs them. Prefer concrete dependencies and small consumer-owned contracts to service locators, global mutable registries, or speculative service frameworks.

## Verification

Run the project's actual type-check path. A syntax transform or build does not prove type safety; neither does a regular-expression scan for `any`, casts, or file length. For generic utilities, check meaningful accepted/rejected assignments and runtime behaviour when the utility has executable code.

Check boundary failures and async completion/cancellation with deterministic fixtures. Use real implementations at the behaviour's required test boundary; controlled fakes for clocks, network failures, or races can make otherwise elusive outcomes reproducible. Follow repository test rules and framework guidance for component work. Generated tests that merely assert the generated object exists or mirror its implementation do not establish its contract. Report missing toolchains instead of treating an unrun check as passed.

## Sources

- [TypeScript choosing compiler options](https://www.typescriptlang.org/docs/handbook/modules/guides/choosing-compiler-options.html)
- [TypeScript module resolution](https://www.typescriptlang.org/docs/handbook/modules/reference.html)
- [Strict checking](https://www.typescriptlang.org/tsconfig/strict.html)
- [Unchecked indexed access](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html)
- [Exact optional properties](https://www.typescriptlang.org/tsconfig/exactOptionalPropertyTypes.html)
- [Verbatim module syntax](https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html)
