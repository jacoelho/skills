# Vue language tools and template diagnostics

## Active configuration

Place `vueCompilerOptions` in the configuration that actually governs the SFC files, or in a base configuration that it extends. A root solution config that merely lists project references does not propagate options into those projects. `tsconfig.app.json` is a common filename, not a required one.

Enable TypeScript strict checking and consider `vueCompilerOptions.strictTemplates` for stronger template diagnostics. Verify the installed language-tools version's option definitions before relying on individual unknown-component/prop/event/directive checks; defaults and related options can change.

For a reported template error, check the component's declared contract and registration before weakening checking. `fallthroughAttributes` can check attributes against the component's root element; it is not merely an autocomplete setting. For a wrapper, explicitly define fallthrough behaviour (`inheritAttrs`, root structure, and `v-bind="$attrs"`) where needed. A compiler option cannot establish the component's runtime forwarding contract.

CSS-module strictness, fallthrough-attribute inference, and data-attribute allowances are version-specific options. Use the installed option schema and a minimal diagnostic fixture instead of pasting a historical `vueCompilerOptions` table. Options that once accepted a Boolean may have changed shape, defaults, or name.

## Editor integration

Distinguish a CLI `vue-tsc` failure from editor-only diagnostics. Check the editor's Vue extension/language server and TypeScript integration versions against the workspace dependencies. Use Vue Official in VS Code; configure other editors according to the current Vue language-tools instructions for that client.

`ts_ls` versus `vtsls` support depends on the language server and editor integration. Do not require an editor migration or global language-server downgrade based on an old issue. Keep editor-setting changes scoped to a demonstrated editor problem.

## Diagnostic directives

Where supported, `@vue-expect-error` applies to the next template node and can document an intentional negative type fixture, detecting when the expected error disappears. `@vue-ignore` suppresses diagnostics on the next node; `@vue-skip` skips checking the next node and its children. Neither fixes a type contract. Use the narrowest justified scope with an explanation. `@vue-generic` supplies type arguments such as `{number}`, not a type-parameter declaration such as `{T extends string}`.

Prefer a minimal template fixture and the project's local `vue-tsc` to establish the actual behaviour of directives and compiler options. Avoid broad configuration changes to silence one unexplained diagnostic.

## Sources

- [Vue TypeScript overview and editor support](https://vuejs.org/guide/typescript/overview.html)
- [Vue language-tools compiler options](https://github.com/vuejs/language-tools/wiki/Vue-Compiler-Options)
- [Vue language-tools directive comments](https://github.com/vuejs/language-tools/wiki/Directive-Comments)
- [Vue language-tools Neovim integration](https://github.com/vuejs/language-tools/wiki/Neovim)
- [Vue fallthrough attributes](https://vuejs.org/guide/components/attrs.html)
- [Vue generic component syntax](https://vuejs.org/api/sfc-script-setup.html#generics)
