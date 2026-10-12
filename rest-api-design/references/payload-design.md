# Payload design

Read this when choosing request/response schemas, field semantics, patch formats, or embedded representations. HTTP and JSON standards define interoperability; envelope shapes, field casing, and expansion syntax are API conventions. Preserve an established convention unless the requested contract change requires replacing it.

## Field contracts

Define create, replacement, partial-update, and response shapes explicitly. Share schemas only where their contracts agree. For every field record its meaning, type, constraints, requiredness, nullability, default, and write permission. Classify server-assigned identity, computed totals, timestamps, secrets, and immutable-after-create fields separately from ordinary mutable inputs. Describe which response shape a mutation returns, including server normalization.

Choose how domain input objects handle unknown fields and supplied read-only fields. Reject unknown domain fields by default to expose misspellings; support a documented extension object where arbitrary keys are needed. Protocol document members follow the selected media type's rules. Enforce field write permissions before assigning values. OpenAPI `readOnly`/`writeOnly` annotations describe direction; they do not themselves enforce runtime authorization or validation. OpenAPI 3.2 permits implementations to ignore or reject read-only input, so specify the behavior instead of assuming tooling chooses it. [OpenAPI 3.2 schema annotations](https://spec.openapis.org/oas/v3.2.0.html#validating-readonly-and-writeonly).

Give omission, explicit `null`, zero, `false`, empty string, empty array, and empty object distinct meanings where the domain distinguishes them. For example, on creation, omitted `nickname` may select a default while `null` means no nickname; on an update, omission may preserve its current value. Record whether defaults are applied once at creation or computed during reads. JSON Schema `default` is an annotation; validation does not fill missing values. Implement documented server defaults explicitly. [JSON Schema annotations](https://json-schema.org/understanding-json-schema/reference/annotations).

For response fields, distinguish unavailable, redacted, absent through projection, and explicitly empty values. Define stable casing and enum spellings. Decide whether an enum is closed or extensible, and require an unknown-value fallback in consumers when response values may grow. Adding a response enum value can break exhaustive clients; Google's compatibility guidance calls for explicit documentation and caution, rather than assuming every additive change is safe. [Google AIP-180](https://google.aip.dev/180#adding-components).

## Values and shape

- **Numbers and identifiers:** JSON forbids NaN and infinity; widely interoperable exact integers lie between `-(2^53)+1` and `(2^53)-1`. Choose a documented decimal string or another exact encoding when monetary precision or larger integers require it. Define currency, scale, rounding, and units; use opaque strings for identifiers when arithmetic has no meaning. [RFC 8259 §6](https://www.rfc-editor.org/rfc/rfc8259.html#section-6).
- **Time:** distinguish instants, calendar dates, local times, and durations. Use RFC 3339 strings for instants; specify accepted offsets, output normalization, fractional precision, and leap-second policy. Recurring local schedules need a time-zone rule as well as a clock time. State duration units explicitly. [RFC 3339 §5.6](https://www.rfc-editor.org/rfc/rfc3339.html#section-5.6).
- **Objects and arrays:** object member order carries no meaning; arrays carry order. Describe whether a domain collection is ordered, allows duplicates, or represents a set. Reject duplicate object keys at the input boundary to avoid parser-dependent interpretation. Use UTF-8 for interoperable JSON. [RFC 8259 §§4–5, 8.1](https://www.rfc-editor.org/rfc/rfc8259.html#section-4).
- **Envelopes and bounds:** choose a direct object or array when sufficient. Use a collection envelope when pagination, links, totals, or other metadata need a body location; metadata in headers is another option. Declare content types and supported negotiation. Bound body bytes, string lengths, nesting, array counts, and mutation batches. A single-resource `data` wrapper is a convention, not an HTTP requirement.

## Replacement and partial updates

Use `PUT` for replacement of the target state represented by the contract, with documented treatment of server-owned fields and omitted optional writable fields. Use `PATCH` for partial changes. Select and document a patch media type; `application/json` alone does not identify a standard patch algorithm. HTTP PATCH requires the entire change set to apply atomically: a failure must leave none of its changes applied. Advertise accepted patch types through `Accept-Patch` when discovery is useful. [RFC 5789 §§2–3](https://www.rfc-editor.org/rfc/rfc5789.html#section-2).

| Format | Choose when | Consequences |
| --- | --- | --- |
| `application/merge-patch+json` | Object fields need simple changes | Omitted members remain; `null` removes an object member; arrays are replaced wholesale. It cannot express setting an object member to JSON null. Non-object patches replace the whole target. [RFC 7396 §2](https://www.rfc-editor.org/rfc/rfc7396.html#section-2). |
| `application/json-patch+json` | Explicit removal, null assignment, or array operations matter | An ordered operation array uses JSON Pointer paths. Ignore members undefined for that operation, such as `comment`; unknown `op` values remain errors, and paths still require validation and authorization. `test` checks an expected value; failed operations prevent the HTTP patch from committing. Array indices depend on the current representation. [RFC 6902 §§3–5](https://www.rfc-editor.org/rfc/rfc6902.html#section-3). |

Document allowable paths and operations, then enforce caller permissions before evaluating each operation. `test` requires permission to observe its comparison outcome; success/failure can reveal a protected value. `copy`/`move` require permission to read source values; every written or removed path requires write permission. Cover protected descendants when an operation compares, copies, replaces, or removes a whole object. Validate the resulting domain state before committing. Pair patches that depend on a known representation with the conditional-write contract in [failures and retries](contract-decisions.md#failures-and-retries); a field-level `test` does not detect unrelated concurrent changes. Verify rejected tests and source reads cannot disclose protected fields or commit earlier operations. [RFC 6902 §§4–5](https://www.rfc-editor.org/rfc/rfc6902.html#section-4).

```http
PATCH /customers/c_42 HTTP/1.1
Content-Type: application/merge-patch+json
If-Match: "v7"

{"nickname":null,"tags":["priority"]}
```

For a contract allowing nickname removal, this removes that member, replaces all tags, and preserves omitted fields. To assign explicit null to an existing nickname member, JSON Patch uses `[{"op":"replace","path":"/nickname","value":null}]`.

## Related representations

Choose IDs for references, links for navigation, and embedded objects when a bounded read benefits clients. Embedding describes related state; define explicitly whether writes mutate the relationship, the related resource, or neither. Resource identity and lifecycle belong in [resources and methods](resources-and-methods.md).

For expansion and field projection, whitelist selectable relationships/fields, specify defaults, and bound depth, fan-out, total included objects, bytes, and query cost. Authorize every included object and field; selection never grants access. Define partial collections and how clients fetch the rest. JSON:API supplies concrete relationship linkage, `include`, and sparse-fieldset conventions; use its full contract when adopting its media type, or document your own syntax. [JSON:API relationships and inclusion](https://jsonapi.org/format/#document-resource-object-relationships), [sparse fieldsets](https://jsonapi.org/format/#fetching-sparse-fieldsets).
