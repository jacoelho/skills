# Queries and pagination

Use this reference when designing collection selection, search, ordering, or traversal. The defaults below are design choices; Google AIPs are Google conventions, PostgreSQL examples describe database behavior, and RFC 9865 applies specifically to SCIM.

## Query contract

- Use `GET` with query parameters for bounded collection selection. GET request content has no generally defined semantics and can fail through intermediaries. For large or sensitive query inputs, define a `POST` search operation or query resource with explicit read-only versus creation semantics, statuses, retry guarantees, caching, and continuation. HTTP intermediaries do not infer read-only behavior from its body. [RFC 9110, GET](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.3.1).
- Choose typed parameters for a small set of independent filters; choose a documented expression grammar when grouping and composition are required. Specify supported fields/operators, literal types, escaping, repeated-parameter handling, omitted versus empty values, and maximum expression size/depth. Parse once into validated query values; map allowlisted fields and parameterized values to storage queries. Reject unsupported or mistyped inputs consistently. [AIP-160](https://google.aip.dev/160) provides one grammar and validation model; adopting it also adopts its unusual `OR`-before-`AND` precedence.
- Authorize the caller's use of filter, sort, and search fields, operators, and traversed relationships before execution, including defaults and cursor continuation. A global allowlist, visible-row scope, and output redaction are insufficient: `salary > 100000` can reveal a protected salary through result membership even when salary is omitted. Define query permissions separately from read permissions; permit search-only fields only with an explicit policy accepting their disclosure. Reject unauthorized query features using the API's safe error policy, rather than silently dropping predicates. [Microsoft OData security guidance](https://learn.microsoft.com/en-us/odata/webapi/odata-security) excludes hidden properties from the query model and identifies disclosure through joins.
- Define how filters combine: AND across fields, OR within a repeated value set, or another explicit rule. Specify null versus absent fields, case sensitivity, string matching, array membership, relationship traversal, enum values, timestamp precision/time zones, and inclusive/exclusive bounds. Prefer half-open time intervals (`from <= time < before`) when adjacent ranges must avoid overlap. Separate exact filtering from full-text search; document search fields, ranking, and index freshness when relevant.
- Encode query values with a URL library. Percent-encode delimiters that are value data; document array serialization and literal `+` handling rather than relying on parser defaults. URI encoding does not define an application's query grammar. [RFC 3986, percent-encoding](https://www.rfc-editor.org/rfc/rfc3986.html#section-2.1).

Example contract: `status=open&status=pending` means either status; `created_from` is inclusive, `created_before` exclusive; the status and time predicates combine with AND. Its request is:

```http
GET /orders?status=open&status=pending&created_from=2026-10-01T00%3A00%3A00Z&created_before=2026-11-01T00%3A00%3A00Z&sort=-created_at,id&page_size=50
```

## Ordering and page selection

Define default order and an allowlist of client-selectable sort fields. Specify per-field directions, multi-sort precedence, null placement, and string collation/case behavior. Append a unique tie-breaker within the collection scope, and retain every effective sort value in continuation state. The example uses descending creation time then ascending ID; `-` is this example's convention, whereas [AIP-132](https://google.aip.dev/132#ordering) uses `desc` suffixes. [PostgreSQL ordering](https://www.postgresql.org/docs/current/queries-order.html) demonstrates independent directions and null placement.

Apply tenant boundaries, authorization, and requested filters before selecting a page; counts must use the same visible scope. Avoid paginating unrestricted rows and stripping unauthorized entries afterward. Deduplicate root resources before paging when relationship joins multiply rows; a page counts resources, not join tuples.

| Mechanism | Meaning and decision |
| --- | --- |
| Offset | Skip N ordered results. Supports page jumps for bounded, mostly stable collections; cap depth. Inserts/deletes before the offset shift pages. Large offsets still require computing skipped rows. |
| Cursor token | Public continuation contract. May encode a seek boundary, offset, snapshot, or server-held position; opacity alone supplies neither efficiency nor consistency. |
| Keyset/seek | Select results strictly after the last ordering tuple. Prefer for deep sequential traversal with supported indexes; arbitrary page jumps require another mechanism. |

Offset cost and unique-order requirements follow [PostgreSQL LIMIT/OFFSET](https://www.postgresql.org/docs/current/queries-limit.html). Choose the mechanism from traversal needs and data behavior, not its parameter name.

## Seek implementation

For non-null `created_at` and `id`, after a page ending at `(last_created_at, last_id)`:

```sql
SELECT id, created_at
FROM orders
WHERE tenant_id = :tenant_id
  AND (created_at < :last_created_at
       OR (created_at = :last_created_at AND id > :last_id))
ORDER BY created_at DESC, id ASC
LIMIT :page_size_plus_one;
```

Include the same authorization and filter predicates on every page. For both keys ascending, use `(created_at, id) > (:last_created_at, :last_id)`; for both descending, use `<`. Mixed directions need the expanded predicate above. Nullable keys require explicit branches consistent with `NULLS FIRST/LAST`; ordinary row comparison can become unknown at a null pair. Match collation, precision, and comparison operators to the effective order. These seek predicates are derived from [PostgreSQL row comparison semantics](https://www.postgresql.org/docs/current/functions-comparisons.html#ROW-WISE-COMPARISON).

Fetch at most page size plus one to detect continuation; return page size items and derive the token from the last returned item, not the lookahead item. For reverse traversal, seek before the first item, reverse each direction and null placement during selection, then restore response order. Add reverse traversal only when needed.

## Continuation, security, and consistency

- Specify default/maximum page sizes and handling of zero, negative, malformed, and excessive values. Permit page-size changes during traversal only when supported and documented. A short or empty page can still have continuation; clients stop on the explicit end signal, not item count. Choose one end convention, such as omitted `next_cursor`, and show it in examples. [AIP-158](https://google.aip.dev/158) permits variable page sizes and short pages with continuation.
- Make tokens opaque, URL-safe, and tamper-protected; encoding alone is neither integrity nor confidentiality. Bind continuation to effective filters, ordering, tenant/resource scope, and relevant caller scope. Validate mismatches before querying and reauthorize each page; a token conveys position, never permission. Define expiry, invalid/mismatched/expired errors, and restart behavior. Protect sensitive token content and bound any retained state. [RFC 9865](https://www.rfc-editor.org/rfc/rfc9865.html#section-2.1) distinguishes invalid and expired cursors for SCIM; adapt its error model to the API's existing error contract.
- State the traversal guarantee. Live keyset traversal avoids offset shifting but inserts or changed sort/filter values can still cause omissions or duplicates. Immutable ordering reduces movement without making a snapshot. Complete consistent traversal requires a snapshot or equivalent mechanism with defined identity, retention, authorization, and expiry; revoked access still takes effect.

For the example contract, a continuing page returns `{"orders":[{"id":"ord_7"}],"next_cursor":"opaque"}`; the next request repeats its filters and order with `cursor=opaque`. Its final page returns `{"orders":[]}` when empty, or the remaining orders, with `next_cursor` omitted. If navigation uses links instead, define their context and `next`/`prev` relations using [RFC 8288](https://www.rfc-editor.org/rfc/rfc8288.html).

## Cost bounds and delivery

Bound query complexity, relationship fanout, page depth/size, response bytes, execution time, and concurrent expensive searches. Require indexes or an explicit cost budget for supported filter/order combinations; matching index order can avoid sorting for limited queries. [PostgreSQL indexes and ordering](https://www.postgresql.org/docs/current/indexes-ordering.html).

Make totals optional; label exact versus estimated, filtered scope, and consistency point. Exact counts can dominate page cost; PostgreSQL's full-table count scans all rows or index entries. [PostgreSQL aggregates](https://www.postgresql.org/docs/current/functions-aggregate.html). Verify examples for tied keys, mixed directions, nulls, empty/intermediate/final pages, changed filters, protected query fields and relationships, revoked row or query permissions, expiry, and live mutations.
