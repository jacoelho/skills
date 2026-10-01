# TypeScript contracts

## Props and defaults

Use typed `defineProps` and `defineEmits` in SFCs. Mark a prop optional when callers may omit it; supplying a default is a separate decision from whether the prop is required.

Vue 3.5+ preserves reactivity for variables destructured from `defineProps` within the same `<script setup>` block. Pass a getter to a watcher or composable that must observe subsequent prop changes:

```ts
const { label = 'Untitled' } = defineProps<{ label?: string }>()
watch(() => label, handleChange)
```

`withDefaults` remains valid, including with union types. For mutable object/array defaults used with `withDefaults`, use a factory to avoid sharing a default between component instances. Destructure defaults do not need that factory. Before Vue 3.5, use the props object or supported `toRef`/`toRefs` patterns instead of assuming reactive destructuring.

Boolean/string unions have a separate runtime-casting rule. A type such as `false | string` can still receive `true` when the compiler infers `[Boolean, String]` and a caller supplies an empty attribute. If empty strings must remain strings, use a deliberate runtime declaration with `[String, Boolean]` and the required validation, or choose a simpler prop contract. Destructuring does not change Boolean casting.

## Component and exposed types

Use exported domain or props types when those are the actual shared contract. For consumer-side extraction, `vue-component-type-helpers` offers `ComponentProps`, `ComponentEmit`, `ComponentSlots`, and `ComponentExposed`. Add a dependency only when extraction is needed.

`InstanceType<typeof Component>` is valid for constructible, non-generic SFCs. Its `$props` describes the public accepted props, which may include framework attributes and listener props; choose that surface deliberately rather than treating it as an error.

The SFC compiler resolves type-based macro declarations from syntax, not arbitrary TypeScript evaluation. A type that works in application TypeScript may fail inside `defineProps`, especially a conditional/mapped helper over another component. Prefer an explicit compiler-resolvable props declaration for a wrapper and verify both SFC compilation and template checking.

Generic `<script setup generic="T">` components require Vue 3.3+. For their public instance, use `ComponentExposed`, not `InstanceType`:

```ts
import { useTemplateRef } from 'vue'
import type { ComponentExposed } from 'vue-component-type-helpers'
import GenericForm from './GenericForm.vue'

const form = useTemplateRef<ComponentExposed<typeof GenericForm>>('form')
```

Expose only the imperative operations consumers need with `defineExpose`; prefer props and events for ordinary data flow.

## Template refs

`useTemplateRef` requires Vue 3.5+. Static SFC ref inference additionally requires compatible Vue language tools (introduced in 2.1). Use an explicit type for refs the tooling cannot infer, such as dynamic targets. Ref values may be `null` before mount and after conditional removal; narrow them before access.

A returned object captures a plain local's value at return time. If a composable creates an external instance later, return a getter or a suitable ref rather than `{ instance }` while the local is still `null`. Prefer `shallowRef` when the external instance should retain its own identity and internal state model, and dispose it with its owning scope.

## Custom directives and app properties

Where the installed Vue and language-tools declarations support it, augment `GlobalDirectives` for global directive template typing. `ComponentCustomProperties` is for public component-instance properties such as an app-provided `$greet`. Keep custom directive state in a typed owner such as a `WeakMap` rather than assigning undeclared fields to `HTMLElement`.

## Runtime boundaries

For external JSON, general type guards, or shared TypeScript domain types, use [Types and boundaries](../../typescript-best-practices/references/types-and-boundaries.md). Vue's prop declarations and route types do not replace the application's wire/domain validation contract.

## Sources

- [Vue TypeScript with Composition API](https://vuejs.org/guide/typescript/composition-api.html)
- [Vue script setup, including macro limits and generic components](https://vuejs.org/api/sfc-script-setup.html)
- [Vue props validation](https://vuejs.org/guide/components/props.html#prop-validation)
- [Vue Boolean prop casting](https://vuejs.org/guide/components/props.html#boolean-casting)
- [Vue component type helpers](https://github.com/vuejs/language-tools/tree/master/packages/component-type-helpers)
- [TypeScript narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
