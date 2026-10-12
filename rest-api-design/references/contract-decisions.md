# Contract decisions

Distinguish HTTP requirements from product conventions. Apply a decision only when the operation needs it; respect explicit user requirements and existing external contracts.

## Resources and methods

- Use [resources and methods](resources-and-methods.md) for names, canonical paths, relationships, actions, and operation resources. Document whether a missing single resource returns `404` and whether an empty collection returns `200` with an empty list.
- `GET` and `HEAD` do not request state changes; incidental server-side effects such as logging remain possible. `POST` submits processing or creates under a collection. `PUT` replaces the target resource (or creates it at a client-chosen URI if supported). `PATCH` applies a documented partial-update format, including how omitted fields and explicit `null` differ. `DELETE` requests removal and is idempotent in intended effect, though repeat responses may differ; document whether removal is soft, reversible, or asynchronous.
- Use `201 Created` when a resource is created; include `Location` when its URI needs to be conveyed or differs from the request target. For accepted asynchronous work, use `202 Accepted` with a way to inspect its status. Use `204 No Content` only with no response body. An overall failed operation needs a failure status; a documented batch or partial-result operation may return per-item outcomes within a successful response.

## Failures and retries

- Choose statuses by client action: malformed syntax (`400`), unsupported media type (`415`), understood and syntactically valid content whose instructions cannot be processed (`422`), unauthenticated (`401` with the applicable challenge), authenticated but disallowed (`403`), absent (`404`), state conflict (`409`), failed supplied precondition (`412`), required but absent precondition (`428`), rate limit (`429`). Document the API's policy where more than one status is reasonable. Concealing a forbidden resource as `404` can be an explicit security policy. Preserve the distinction between client and server faults.
- A consistent error body should expose a stable machine-readable type or code, a safe human explanation, and request-specific detail when useful. For RFC 9457 Problem Details, use `application/problem+json`; use a stable type URI for application-specific problems and `about:blank` when the HTTP status fully describes the problem. Provide `title`, `status`, `detail`, and `instance` as appropriate; align body `status`, when present, with the HTTP status. Document extensions. Clients should branch on stable machine fields, not human-readable `title` or `detail`. Do not expose stack traces, secret values, or private resource existence through errors.
- Define retries for non-idempotent mutations. When an operation requires safe retries for `POST` or `PATCH`, design server-side support and use the `Idempotency-Key` request header by default; merely sending a header to an unsupported server gives the client no guarantee. Specify key scope, canonical request fingerprint, retention period, terminal response replay, and behavior for in-progress duplicates and the same key with different input. Bind keys to the relevant principal or tenant; reject unauthorized replay. Bound the retention store. A timeout alone does not prove a mutation failed. RFC 9110 defines method idempotence; the header convention is described by an expired IETF Internet-Draft, not a published RFC.
- If a mutation crosses an external side-effect boundary, persist an operation record before the call and propagate a stable operation ID or provider-supported idempotency key. Represent in-progress and unknown outcomes; reconcile an unknown outcome before another attempt. Define the pending response or status resource, terminal replay, and compensation or partial-commit behavior. Do not promise exactly-once effects without support across the boundary.
- For writes that may race, document an optimistic-concurrency strategy such as `ETag` with `If-Match`; return `412` when a supplied precondition fails. If a precondition is required but missing, use `428` or document another policy. Define whether a `409` domain conflict remains possible. Identify the atomic point at which the write and its result become committed.

## Representations and caching

- Use [payload design](payload-design.md) for schemas, field semantics, content types, projection, and expansion limits. Use [queries and pagination](queries-and-pagination.md) for collection selection, ordering, continuation, token security, and traversal guarantees.
- State cache behavior when relevant. `Cache-Control`, validators such as `ETag`, and `304 Not Modified` should reflect the representation and authorization context. Avoid shared caching of sensitive user-specific responses unless explicitly safe.
- When responses vary by negotiated headers, define the corresponding `Vary` fields and validators for each representation. Field selection and embedded relationships are part of the representation's cache identity. [RFC 9110](https://www.rfc-editor.org/rfc/rfc9110.html#section-12.5.5), [RFC 9111](https://www.rfc-editor.org/rfc/rfc9111.html).

## Security and evolution

- State authentication and per-operation authorization, including ownership, tenant isolation, and field-level write permissions. Apply authorization or an existence-hiding policy before revealing whether a target exists; document `403`/`404` behavior. Define rate or cost limits for abusive operations.
- Record compatibility expectations for consumers, including unknown fields, enum values, error types, and statuses. Even additive changes can break strict clients. Preserve existing machine-field meanings; plan versioning, negotiation, or migration overlap when a change is incompatible with existing clients. Define deprecation and removal when needed.
- Describe changed public behavior in the project's API specification, including request and response schemas, status codes, security requirements, pagination, errors, and examples. When an implementation exists, verify examples against it and exercise invalid input, forbidden access, retries, and concurrent writes where material.

## Primary references

- [HTTP Semantics (RFC 9110)](https://www.rfc-editor.org/rfc/rfc9110.html): methods, statuses, preconditions, content negotiation.
- [Additional HTTP Status Codes (RFC 6585)](https://www.rfc-editor.org/rfc/rfc6585.html): `428 Precondition Required` and `429 Too Many Requests`.
- [Problem Details for HTTP APIs (RFC 9457)](https://www.rfc-editor.org/rfc/rfc9457.html): standard problem representation.
- [HTTP Caching (RFC 9111)](https://www.rfc-editor.org/rfc/rfc9111.html): cache storage, freshness, and reuse.
- [Idempotency-Key HTTP Header Field (expired IETF draft)](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/): header convention for key-based retries; apply it as this skill's default while accurately identifying its draft status.
- [OpenAPI Specification](https://spec.openapis.org/oas/): machine-readable HTTP API descriptions.
- [OWASP API Security Top 10](https://api-security.owasp.org/editions/2023/en/0x11-t10/): object and property authorization risks.
