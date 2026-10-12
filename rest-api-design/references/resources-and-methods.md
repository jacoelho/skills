# Resources, methods, and relationships

Use this reference when choosing resource names, containment, relationship mutations, or actions. These are design defaults synthesized from the sources below. HTTP defines method semantics; Google AIPs, Azure guidelines, and JSON:API define particular API conventions. Adopt a convention deliberately and respect established consumer contracts.

## Naming and identity

- **Name the client's concept.** Prefer plural domain nouns for collections (`/orders`, `/people`), with an identifier for an instance (`/orders/o17`). Name genuine singleton resources by their meaning (`/account/settings`). Follow an existing API's vocabulary and casing rather than renaming public paths for style. Plural collections are Google's convention; Google uses camelCase collection segments, while Azure prefers kebab-case or allows camelCase. Neither casing is an HTTP requirement. [AIP-122](https://google.aip.dev/122), [Azure URL guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#uniform-resource-locators-urls)
- **Separate identity from display.** Choose stable identifiers with documented uniqueness scope, allocation, permitted characters, and length. Keep mutable titles or usernames separate unless rename semantics intentionally change identity. Treat identifiers as opaque to clients. Return the canonical identifier even when a convenience route such as `/users/me` resolves it; distinguish aliases from independent resources. [AIP-122: IDs and aliases](https://google.aip.dev/122#resource-id-segments), [Azure JSON guidelines](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#json)
- **Specify case and escaping.** URI paths are case-sensitive by default; scheme and host are case-insensitive. Choose one spelling for service-defined segments. Define identifier comparison and normalization explicitly, especially for user-supplied Unicode. Encode data per URI component when reserved characters would become delimiters. Prefer simple single-segment IDs; if IDs can contain `/`, verify their handling across clients, proxies, and routing. Percent-encoding a reserved character does not generally make it equivalent to the unencoded delimiter. [RFC 3986 §§2.2–2.4 and 6.2.2](https://www.rfc-editor.org/rfc/rfc3986.html#section-2.2)

## Containment and associations

Choose a canonical identity before adding contextual traversal routes. Google's one-canonical-parent model is useful for ownership; other associations are references rather than additional parents. [AIP-124](https://google.aip.dev/124)

| Situation | Design choice | Consequence to specify |
| --- | --- | --- |
| Item exists only within an order | `/orders/o17/items/i4` | Identifier scope, parent deletion, and whether moving the item changes identity. |
| Document can move between folders | `/documents/d8`; list through `/folders/f2/documents` or a filter | Preserve document identity; contextual routes enforce membership and the same authorization rules. |
| Article references an independent author | Canonical `/people/p9`; article carries a reference or related link | Replacing the author changes the association, not the person's identity or content. |
| User belongs to many teams | Membership collection, when the association has role, expiry, or approval state | Membership owns its attributes and lifecycle; team and user remain separate resources. |

The table is this skill's synthesis: use hierarchy for real containment and stable references for independent lifecycles. Nest only as far as ownership or identifier scope requires; every traversed relationship need not appear in the canonical path. Specify each association's cardinality, write owner, uniqueness, ordering if meaningful, and behavior when either endpoint is deleted. [AIP-121: resource hierarchy and lifecycle](https://google.aip.dev/121)

- **Distinguish related entities from linkage.** A related-resource URL retrieves entities; a relationship URL retrieves or mutates their linkage. Removing linkage leaves an independent entity intact. JSON:API demonstrates this distinction with `/articles/a1/author` and `/articles/a1/relationships/author`; its exact paths and payload shape apply when adopting JSON:API. [JSON:API relationships](https://jsonapi.org/format/#document-resource-object-relationships)
- **Promote meaningful memberships.** For example, `POST /teams/t1/memberships` with `{"user":"/users/u7","role":"editor"}` creates membership `m3`; `DELETE /teams/t1/memberships/m3` removes membership, not user `u7`. Define whether the same pair may have multiple memberships or historical records. For a small bounded association with no attributes, a reference field or set may suffice. Define whether a mutation replaces the whole set or adds/removes individual members; paged or filtered subsets must not masquerade as complete replacement input. [AIP-124: many-to-many associations](https://google.aip.dev/124#many-to-many-associations), [JSON:API relationship updates](https://jsonapi.org/format/#crud-updating-relationships)

## Updates, actions, and operation resources

Choose by client intent and lifecycle, not by forcing every behavior into CRUD. Read [HTTP methods and statuses](contract-decisions.md#resources-and-methods) for method semantics and [failures and retries](contract-decisions.md#failures-and-retries) for preconditions, deduplication, and side-effect recovery.

| Intent | Example | Selection rule |
| --- | --- | --- |
| Change editable resource state | `PATCH /subscriptions/s1` | Use a documented patch format when setting state faithfully expresses the operation; the server still enforces valid transitions. |
| Perform a domain command | `POST /orders/o17:cancel` | Use an action when the command has its own permissions, inputs, or consequences that a field assignment obscures. |
| Create a separately useful artifact or job | `POST /exports` | Use a resource when clients need identity, history, status, results, or cancellation for that work. |

Colon actions are a Google/Azure convention, not mandatory URI syntax. Reserve their delimiter in identifiers when adopting it; use an existing action convention consistently. Prefer standard operations when their semantics fit, without inventing artificial resources merely to hide a command. [AIP-136](https://google.aip.dev/136), [Azure actions](https://github.com/microsoft/api-guidelines/blob/vNext/azure/Guidelines.md#performing-an-action)

For asynchronous work, link the accepted request to a status resource such as `/operations/op5`. Define terminal success, failure, and cancellation; result identity; polling bounds; retention; and whether cancellation stops effects or only requests a best effort. Reject failures that prevent acceptance in the initiating response; expose later execution failures in the operation. Keep the status resource distinct from the business resource being changed. `202` acknowledges acceptance, not completion. [AIP-151](https://google.aip.dev/151), [RFC 9110 §15.3.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.3)
