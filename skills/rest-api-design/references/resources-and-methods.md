# Resources, methods, and relationships

## Naming and identity

- **Name the client's concept.** Plural collection nouns and named singletons (`/account/settings`) are Google's convention. Google uses camelCase segments; Azure prefers kebab-case and allows camelCase. Neither is an HTTP requirement. [AIP-122](https://google.aip.dev/122), [Azure URL guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#uniform-resource-locators-urls)
- **Separate identity from display.** Document each identifier's uniqueness scope, allocation, characters, and length. Keep mutable titles and usernames out of identity unless renaming is meant to change identity. Treat IDs as opaque strings ([Azure JSON guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#json)). A convenience alias such as `/users/me` still returns the canonical identifier; an alias is not an independent resource ([AIP-122: aliases](https://google.aip.dev/122#resource-id-aliases)).
- **Specify case and escaping.** Paths are case-sensitive; scheme and host are not. Define comparison and normalization for user-supplied Unicode IDs. Prefer single-segment IDs. A percent-encoded `/` is not equivalent to the delimiter, so IDs that contain `/` must be verified across clients, proxies, and routers. [RFC 3986 §§2.2–2.4, 6.2.2](https://www.rfc-editor.org/rfc/rfc3986.html#section-2.2)

## Containment and associations

Choose one canonical identity, with at most one canonical parent ([AIP-124](https://google.aip.dev/124)), before adding contextual routes. Nest only as far as ownership or identifier scope requires.

| Situation | Design choice | Consequence to specify |
| --- | --- | --- |
| Item exists only within an order | `/orders/o17/items/i4` | Identifier scope, parent deletion, and whether moving changes identity. |
| Document can move between folders | `/documents/d8`; list through `/folders/f2/documents` or a filter | Identity survives moves; contextual routes enforce membership and the same authorization. |
| Article references an independent author | Canonical `/people/p9`; article carries a reference | Replacing the author changes the association, not the person. |
| User belongs to many teams, and membership has role, expiry, or approval | Membership collection | Membership owns its attributes and lifecycle. |

For each association, specify cardinality, write owner, uniqueness, ordering, and behaviour when either endpoint is deleted.

- **Related entities versus linkage.** A related-resource URL returns entities; a relationship URL reads or mutates linkage, and removing linkage leaves the entity intact. JSON:API's exact paths (`/articles/a1/relationships/author`) apply only when adopting JSON:API. [JSON:API relationships](https://jsonapi.org/format/#document-resource-object-relationships)
- **Memberships.** `DELETE /teams/t1/memberships/m3` removes the membership, not user `u7`. Define whether one pair can have several memberships or historical records. For a small association with no attributes, a reference set suffices. Define whether a mutation replaces the whole set or adds and removes members; a paged or filtered subset must never be accepted as full replacement input. [AIP-124](https://google.aip.dev/124#many-to-many-associations), [JSON:API relationship updates](https://jsonapi.org/format/#crud-updating-relationships)

## Updates, actions, and operation resources

Choose by client intent and lifecycle. See [HTTP methods and statuses](contract-decisions.md#http-methods-and-statuses) and [failures and retries](contract-decisions.md#failures-and-retries).

| Intent | Example | Selection rule |
| --- | --- | --- |
| Change editable state | `PATCH /subscriptions/s1` | When setting state faithfully expresses the operation; the server still enforces valid transitions. |
| Domain command | `POST /orders/o17:cancel` | When the command has its own permissions, inputs, or consequences that a field assignment obscures. |
| Separately useful artifact or job | `POST /exports` | When clients need identity, history, status, results, or cancellation. |

Colon actions are a Google/Azure convention ([AIP-136](https://google.aip.dev/136), [Azure actions](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#performing-an-action)). Adopting them reserves `:` in identifiers. Do not invent resources only to hide a command.

**Asynchronous work.** Link the `202` response to a status resource (`/operations/op5`) that is distinct from the business resource. Define terminal success, failure, and cancellation; result identity; polling bounds; and retention. State whether cancellation stops effects or is best effort. Failures that prevent acceptance belong in the initiating response; later failures belong in the operation. [AIP-151](https://google.aip.dev/151)
