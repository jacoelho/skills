# Queries and pagination

## Query contract

- **Method.** Use `GET` with query parameters for bounded selection. GET request content has no defined semantics and can fail through intermediaries. For large or sensitive query inputs, prefer `QUERY` ([RFC 10008](https://www.rfc-editor.org/rfc/rfc10008.html)). QUERY is safe and idempotent, its responses are cacheable with the request content in the cache key, and servers advertise accepted formats via `Accept-Query`. Check support in clients, proxies, CDNs, and frameworks. Where QUERY is unsupported, fall back to a `POST` search operation. Document that it is read-only along with its retry guarantees, caching, and continuation, because intermediaries treat POST as unsafe.
- **Grammar.** Use typed parameters for a few independent filters and a documented expression grammar when grouping is required. Specify fields, operators, literal types, escaping, repeated parameters, omitted versus empty, and maximum size and depth. [AIP-160](https://google.aip.dev/160) is one grammar; note that it binds `OR` tighter than `AND`.
- **Unknown or unsupported parameters.** Reject unknown, unsupported, mistyped, or unauthorized filter, sort, and search inputs with the API's safe error policy (do not reveal protected field existence). Never silently ignore or drop them, because a dropped predicate returns a broader result set than the client asked for. Parse once into validated values, and map only allowlisted fields to parameterized storage queries.
- **Query authorization is separate from read authorization.** Authorize the fields, operators, and relationships used in filtering, sorting, and search before execution, including defaults and cursor continuation. Redacting output is not enough: `salary > 100000` reveals salary through result membership. Permit search-only fields only under an explicit disclosure policy. [OData security](https://learn.microsoft.com/en-us/odata/webapi/odata-security)
- **Semantics.** Define how filters combine (for example, AND across fields and OR within a repeated parameter), plus null versus absent, case sensitivity, matching, array membership, and timestamp precision. Prefer half-open time ranges (`from <= t < before`). Keep exact filtering separate from full-text search.
- Document array serialization and literal `+` handling rather than relying on parser defaults.

Example: `status=open&status=pending` means either status; `created_from` is inclusive and `created_before` exclusive; the two predicates are ANDed.

```http
GET /orders?status=open&status=pending&created_from=2026-10-01T00%3A00%3A00Z&created_before=2026-11-01T00%3A00%3A00Z&sort=-created_at,id&page_size=50
```

## Ordering and page selection

Define the default order and an allowlist of sortable fields, with per-field direction, multi-sort precedence, null placement, and collation. Always append a unique tie-breaker, and carry every effective sort value in the continuation state. `-` here is an example convention; [AIP-132](https://google.aip.dev/132#ordering) uses a ` desc` suffix.

Apply tenant scope, authorization, and filters before selecting a page, and compute counts over the same scope. Never strip unauthorized rows after paging. Deduplicate root resources before paging when joins multiply rows.

| Mechanism | Decision |
| --- | --- |
| Offset | Page jumps over bounded, mostly stable collections; cap the depth. Inserts and deletes shift pages, and skipped rows are still computed. |
| Cursor token | The public contract. It may encode a seek boundary, offset, snapshot, or server-held position; opacity alone gives neither efficiency nor consistency. |
| Keyset/seek | Deep sequential traversal on supported indexes; no arbitrary jumps. |

## Seek implementation

For non-null `created_at DESC, id ASC`, after a page ending at `(last_created_at, last_id)`:

```sql
SELECT id, created_at
FROM orders
WHERE tenant_id = :tenant_id
  AND (created_at < :last_created_at
       OR (created_at = :last_created_at AND id > :last_id))
ORDER BY created_at DESC, id ASC
LIMIT :page_size_plus_one;
```

- Repeat the authorization and filter predicates on every page.
- A row comparison `(a, b) > (:a, :b)` works only when all keys share a direction; mixed directions need the expanded form above.
- Nullable keys need explicit branches matching `NULLS FIRST/LAST`, because row comparison yields unknown at a null pair.
- Match collation and precision to the effective order.
- Fetch page size plus one to detect continuation, and derive the token from the last *returned* item.
- For reverse traversal, seek before the first item with every direction and null placement reversed, then restore the response order.

## Continuation, security, and consistency

- **Page size.** Specify the default and maximum, and how zero, negative, malformed, and excessive values are handled. A short or empty page can still carry a continuation token, so clients stop on the explicit end signal (for example, an omitted `next_cursor`), never on item count. [AIP-158](https://google.aip.dev/158)
- **Cursor binding.** Make tokens opaque, URL-safe, and tamper-protected; encoding alone provides neither integrity nor confidentiality. Bind each token to the effective filters, ordering, tenant or resource scope, and caller scope. Reject a mismatched token before querying, and reauthorize every page: a token conveys position, never permission. Define expiry and distinct invalid and expired errors ([RFC 9865](https://www.rfc-editor.org/rfc/rfc9865.html#section-2.1) gives SCIM's model), plus restart behaviour. Bound any retained state.
- **Traversal guarantee.** State it explicitly. Live keyset traversal avoids offset shift, but inserts or changed sort and filter values can still cause omissions or duplicates. A consistent full traversal needs a snapshot with defined retention, expiry, and authorization, and revoked access still applies.

Example: a continuing page returns `{"orders":[{"id":"ord_7"}],"next_cursor":"opaque"}`, and the next request repeats the same filters and order with `cursor=opaque`. The final page omits `next_cursor`. Link-based navigation uses `next`/`prev` relations ([RFC 8288](https://www.rfc-editor.org/rfc/rfc8288.html)).

## Cost bounds

- Bound query complexity, relationship fan-out, page depth and size, response bytes, execution time, and concurrent expensive searches.
- Require an index or an explicit cost budget for every supported filter and order combination.
- Make totals optional, and label each as exact or estimated, with its scope and consistency point. Exact counts can dominate page cost.
- Verify examples for tied keys, mixed directions, nulls, empty, intermediate, and final pages, changed filters, protected query fields, revoked permissions, expiry, and live mutations.
