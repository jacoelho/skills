# Contract decisions

## HTTP methods and statuses

- `PUT` and `DELETE` are idempotent; `POST` and `PATCH` are not unless the API makes them so. Document whether `DELETE` is soft, reversible, or asynchronous, and what a repeat returns.
- Document whether a missing single resource returns `404` and an empty collection `200` with an empty list.
- `201` with `Location` when the created URI differs from the request target; `202` only with a way to inspect status (`202` is acceptance, not completion). An overall failed operation needs a failure status; only a documented batch operation returns per-item outcomes inside a success.

## Failures and retries

Status policy where more than one status is plausible:

| Case | Status |
| --- | --- |
| Valid syntax, content cannot be processed (domain validation) | `422`; reserve `400` for malformed syntax |
| Forbidden resource whose existence is protected | `404` as explicit concealment policy; otherwise `403`. Apply authorization or the concealment policy before revealing existence |
| Supplied precondition fails | `412` |
| Precondition required but absent | `428` |
| Rate or cost limit | `429` with `Retry-After` |
| Temporary unavailability | `503` with `Retry-After` when an estimate exists |

Document client backoff. `Retry-After` is also useful on `202` polling responses.

**Error body.** Expose a stable machine-readable type or code; clients branch on it, never on `title` or `detail`. With RFC 9457, use a stable type URI for application problems and `about:blank` only when the status says everything; body `status` must match the HTTP status. Never expose stack traces, secrets, or private resource existence.

**Idempotency-Key.** Sending a header to a server without support guarantees nothing; safe `POST`/`PATCH` retries need server-side design. Default to the `Idempotency-Key` header ([IETF Internet-Draft, not an RFC; check current status](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/)). Azure-aligned APIs use `Repeatability-Request-ID`/`Repeatability-First-Sent` instead. Process in this order:

1. Missing key on an operation that requires one: `400`.
2. Atomically insert-if-absent the key, scoped to the principal or tenant (unique constraint or equivalent), marked in progress with the request fingerprint. If inserted, execute; store the response only when terminal (success or a deterministic 4xx). Release the key only when the failure is known to precede any commit or side effect (key record and mutation in one transaction); otherwise mark the outcome unknown and reconcile before re-executing. An in-progress lease must outlast the maximum execution time or be fenced. Another principal's key never replays.
3. Existing key, different canonical request fingerprint: `422`.
4. Existing key, original still in progress: `409`.
5. Existing key, same fingerprint, terminal: replay the stored response.

Specify the fingerprint fields, retention period, a bounded store, what a replayed terminal response contains, and the response to a retry while the original is in progress (409). A timeout does not prove a mutation failed.

**External side effects.** Persist an operation record before the external call and propagate a stable operation ID or provider idempotency key. Represent in-progress and unknown outcomes; reconcile an unknown outcome before retrying. Define compensation or partial-commit behaviour. Do not promise exactly-once across a boundary that does not support it.

**Concurrent writes.** Use `ETag` with `If-Match` for racing writes. Define whether a `409` domain conflict remains possible and the atomic commit point.

## Representations and caching

- Field selection and embedded relationships are part of the cache identity; define `Vary` and validators per representation. Do not share-cache user-specific responses unless explicitly safe.
- See [payload design](payload-design.md) and [queries and pagination](queries-and-pagination.md).

## Security and evolution

- State per-operation authorization: ownership, tenant isolation, field-level write permissions, rate or cost limits.
- Additive changes (new fields, enum values, error types, statuses) can still break strict clients; state what clients must tolerate.
- Update the API description for changed public behaviour. When an implementation exists, exercise invalid input, forbidden access, retries, and concurrent writes where material.

References: [OWASP API Security Top 10](https://api-security.owasp.org/editions/2023/en/0x11-t10/) (object and property authorization).
