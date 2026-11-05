# Payload design

## Field contracts

Define create, replace, partial-update, and response shapes separately, and share schemas only where the contracts agree. For each field record meaning, type, constraints, requiredness, nullability, default, and write permission. Keep server-assigned, computed, secret, and immutable-after-create fields apart from mutable inputs. State which representation a mutation returns, including any server normalization.

**Unknown and read-only input.** Reject unknown domain fields by default so misspellings surface. Where arbitrary keys are needed, provide a documented extension object. Protocol document members follow their media type's rules. Specify what happens to supplied read-only fields: OpenAPI 3.2 lets implementations either ignore or reject them, and `readOnly`/`writeOnly` enforce nothing at runtime. [OpenAPI 3.2](https://spec.openapis.org/oas/v3.2.0.html#validating-readonly-and-writeonly)

**Absence.** Give omission, explicit `null`, zero, `false`, and empty values distinct meanings wherever the domain distinguishes them. Example: on create, an omitted `nickname` takes the default and `null` means none; on update, omission preserves the current value. JSON Schema `default` is only an annotation, so implement server defaults explicitly and state whether they are applied at creation or computed on read.

**Responses.** Distinguish unavailable, redacted, projected-out, and empty values. Declare each enum closed or extensible. Consumers need an unknown-value fallback, because adding a response enum value can break exhaustive clients. [AIP-180](https://google.aip.dev/180#adding-components)

## Values and shape

- Encode money and integers beyond ±(2^53−1) exactly: decimal strings or integer minor units, documented. Define currency, scale, rounding, and units.
- Distinguish instants, calendar dates, local times, and durations. Recurring local schedules need a time-zone rule. Specify accepted offsets, output normalization, and precision.
- State whether each array is ordered, allows duplicates, or represents a set. Reject duplicate object keys at the boundary.
- Use a collection envelope only where pagination or metadata needs a body location. Bound body bytes, string lengths, nesting, array counts, and batch sizes.

## Replacement and partial updates

`PUT` replaces the contract's target state; document how server-owned and omitted optional fields are treated. `PATCH` needs a named patch media type, because `application/json` alone defines no patch algorithm. A PATCH applies atomically. Advertise `Accept-Patch` when discovery helps. [RFC 5789](https://www.rfc-editor.org/rfc/rfc5789.html#section-2)

| Format | Choose when | Consequences |
| --- | --- | --- |
| `application/merge-patch+json` | Simple object field changes | Omitted members remain; `null` removes; arrays are replaced wholesale; cannot set a member to JSON null; a non-object patch replaces the whole target. [RFC 7396](https://www.rfc-editor.org/rfc/rfc7396.html#section-2) |
| `application/json-patch+json` | Null assignment, explicit removal, or array operations | Ordered operations with JSON Pointer paths. Members undefined for an operation are ignored, but unknown `op` values are errors. Array indices depend on the current representation. [RFC 6902](https://www.rfc-editor.org/rfc/rfc6902.html#section-3) |

**JSON Patch authorization.** Document the allowed paths and operations, then authorize each operation before evaluating it:

- `test` needs read permission on its path, because its outcome reveals the value.
- `copy` and `move` need read permission on the source.
- Every written or removed path needs write permission, including protected descendants when a whole object is replaced, removed, compared, or copied.

Validate the resulting domain state before commit. A failed operation must not disclose protected values or commit earlier operations. A field-level `test` does not detect unrelated concurrent changes, so pair representation-dependent patches with `If-Match`.

```http
PATCH /customers/c_42 HTTP/1.1
Content-Type: application/merge-patch+json
If-Match: "v7"

{"nickname":null,"tags":["priority"]}
```

This removes `nickname`, replaces all tags, and preserves omitted fields. To set `nickname` to explicit null, use JSON Patch: `[{"op":"replace","path":"/nickname","value":null}]`.

## Related representations

Use IDs for references, links for navigation, and embedding for bounded reads. State whether writes to an embedded object mutate the relationship, the related resource, or neither.

For expansion and field projection:

- Allowlist the selectable relationships and fields, and specify defaults.
- Bound depth, fan-out, total included objects, bytes, and query cost.
- Authorize every included object and field; selecting a field never grants access to it.
- Define partial collections and how clients fetch the remainder.

JSON:API `include` and sparse fieldsets apply only when adopting its media type; otherwise document your own syntax. [JSON:API inclusion](https://jsonapi.org/format/#fetching-includes), [sparse fieldsets](https://jsonapi.org/format/#fetching-sparse-fieldsets)
