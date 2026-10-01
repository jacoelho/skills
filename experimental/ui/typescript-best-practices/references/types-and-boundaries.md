# Types and runtime boundaries

## Validate external values

Treat JSON, form input, route/query parameters, and storage/vendor output as `unknown` until validated. Static annotations, `as`, non-null assertions, and generated interfaces do not perform runtime checks. A sample JSON document establishes examples of values, not the complete API schema.

A predicate `value is T` promises that its checks establish the whole type, including required fields, discriminants, nested values, and applicable numeric/string constraints. Its false branch also excludes `T` from the input type: a predicate claiming `number` must not reject some numbers merely because they fail a business rule. Use a boolean check or a parser for that rule. Prefer a parser returning validated values when normalisation or detailed errors are needed.

Reuse the boundary's existing parser or runtime schema. If a schema library already owns that validation, infer its output type rather than maintaining a competing interface and guard. Without one, use a focused typed parser; this guidance does not require a new dependency. Construct or return the validated value, keeping raw records at the parsing boundary. Follow the relevant protocol's unknown-field policy rather than automatically discarding extra fields.

Choose narrowing that proves the needed fact. Before using `in` on unknown data, check that the value is a non-null object, then check the property's value. `in` also sees inherited properties; use an own-property check when the contract requires ownership. Discriminants narrow known unions, while `typeof` and `instanceof` answer different questions; no fixed ranking replaces those checks.

Use assertions only where an independently established invariant exceeds what the compiler can express. Keep them narrow and explain that invariant. A blanket ban on every assertion is not useful: `as const` preserves literal information and does not pretend to validate external data.

## Model meaningful states

Use discriminated unions when variants have different required data or operations; independent optional fields need not become variants. Follow the owning contract's discriminant name. Where a closed union must be exhaustive, have the unhandled branch require `never`. That assignment is a compiler check, not a runtime check: if an unexpected value can still arrive, throw a safe error rather than returning the supposedly unreachable value as a successful result.

Distinguish absent, `undefined`, and `null` according to the contract. `value != null` is a valid check excluding both nullish values. Optional chaining returns `undefined` when its receiver is nullish; it does not validate a required field or replace an error branch. Use `??` rather than `||` when valid zero, false, or empty-string values must survive defaulting.

`Partial<T>` makes properties optional; it is not a domain update schema. In particular, omitted and null-valued fields can have different wire meanings. Define update contracts deliberately and preserve the distinction required by the consumer.

Model lookup absence explicitly. `Record<K, V>` promises every key in `K`; sparse groups usually need a partial record or map. Array selection needs an empty-input policy. `Object.keys` returns runtime keys, which may exceed the properties visible in a structural type; casting them all to `keyof T` requires an independently established invariant.

## Domain values and collection invariants

Brand primitives when confusing two meanings would violate a real contract. Reuse the owner's convention rather than introducing a competing brand shape. A brand is erased at runtime; its parser or constructor establishes validity and owns any necessary assertion. Keep conversions there. Brands neither validate incoming data nor provide an authorisation boundary.

Use the least restrictive type that makes the operation defined for every allowed input. A sum with an initial value can accept an empty array; selecting a required first element needs either a non-empty input or an absent-result branch. For a read-only consumer:

```ts
type NonEmpty<T> = readonly [T, ...T[]]

function first<T>(values: NonEmpty<T>): T {
  return values[0]
}
```

Validate incoming arrays before treating them as non-empty. Readonly access prevents this consumer from emptying the tuple, but mutable aliases can still invalidate it; control ownership or take an owned snapshot if the invariant must survive later work. A non-empty tuple guarantees index zero, not an arbitrary numeric index. With `noUncheckedIndexedAccess`, a computed lookup still needs an absence policy or a compiler-visible bound.

An array of readonly pairs models paired elements, not a flat array whose length the compiler proves even. Choose it only when pairing belongs to the domain. A range represented by a start and numeric duration still admits negative, non-finite, or out-of-range values. Validate numeric bounds and date validity at construction, including the derived endpoint where required; a representation change alone does not enforce these constraints.

## Ownership and inference

Use readonly input types when a function only reads caller-owned data. TypeScript `readonly`, `Readonly<T>`, and `as const` restrict assignment through the typed view; they do not freeze runtime objects. `Readonly<T>` is shallow. Mutable aliases may still change the object, and a readonly property containing a `Map` does not itself disable `set`.

Local mutation can be the clearest implementation when ownership is exclusive. Copy data to preserve a real ownership boundary, not merely to satisfy an “immutable everywhere” slogan.

Let local values infer naturally. Annotate exported/public boundaries when it fixes the intended contract or catches accidental widening. Choose `interface` or `type` for the required semantics, not as a correctness ranking.

Use `satisfies` (TypeScript 4.9+) to check assignability without replacing the expression's type with the target type. Contextual typing still affects inference: `{ label: 'care' } satisfies { label: string }` has a string-valued property, not a guaranteed `'care'` literal. Use `as const satisfies ...` on a literal when literal preservation and readonly inference are intended and compatible with the consumer. Neither operator performs runtime validation or freezes objects.

## Utility and generic types

Use built-in utilities where they express the real operation. Type parameters should describe a relationship between inputs and outputs. Avoid a generic `parse<T>` that asserts arbitrary input to the caller's chosen type without a runtime schema/parser.

Derive a related view with `Pick`, `Omit`, indexed access, `Parameters`, `ReturnType`, or `Awaited` when it intentionally shares its source contract. Give an independent capability its own values and translate at the boundary; deriving domain types from transport or storage solely to save declarations can couple unrelated contracts.

Conditional and mapped utilities need explicit supported inputs. A recursive object utility may mishandle arrays, tuples, functions, maps, dates, unions, or recursion depth. Implement only the cases demanded by actual consumers and verify both accepted and rejected assignments; omit a “deep” helper when a specific domain type is clearer.

## Sources

- [TypeScript narrowing and type predicates](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
- [Type assertions and inference](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html)
- [Readonly properties and arrays](https://www.typescriptlang.org/docs/handbook/2/objects.html)
- [Utility types](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [The satisfies operator](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html)
- [Contextual inference with satisfies](https://github.com/microsoft/TypeScript/issues/55189)
- [Type predicate true and false branches](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html#inferred-type-predicates)
- [Unchecked indexed access](https://www.typescriptlang.org/tsconfig/noUncheckedIndexedAccess.html)
- [Why Object.keys returns string keys](https://github.com/microsoft/TypeScript/wiki/FAQ#why-does-objectkeys-return-string)
