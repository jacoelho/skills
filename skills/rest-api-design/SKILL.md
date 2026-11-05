---
name: rest-api-design
description: "Designs or reviews framework-agnostic REST/HTTP API contracts and OpenAPI descriptions: resource naming and relationships, methods and actions, payloads, filters and sorting, cursor or keyset pagination, errors, idempotent retries, concurrency, and evolution. Not for framework setup or runtime tuning alone."
argument-hint: "[requirements | OpenAPI file]"
---

# REST API design

Design the public HTTP contract around client-visible resources and behaviour, in any language or framework. Explicit user requirements take precedence over these defaults.

**Compatibility.** Treat a published contract with live external consumers as an operational constraint unless the user explicitly accepts breaking it: preserve its paths, vocabulary, casing, conventions, and machine-field meanings, and plan versioning or migration overlap for incompatible changes. Unreleased APIs, and internal APIs whose consumers change in the same task, may break, with a migration note for consumers.

**Conventions.** Separate HTTP requirements from conventions. Pick one coherent convention per API; adopt Google AIPs, Azure guidelines, or JSON:API only where they fit, and do not present one provider's style as a REST requirement.

## Workflow

1. **Inventory the contract.** Read existing routes, API descriptions, client usage, tests, and domain rules. Record every affected operation and existing consumer promise. Ask only about choices that change correctness or an external contract and cannot be inferred.
2. **Model resources and transitions.** Stable identity, owner, lifecycle, relationships, valid state changes. Canonical paths; containment versus association. Keep storage tables, framework types, and internal service boundaries out of the public model.
3. **Specify every operation** as a matrix: method, path, request/response shapes, success and failure statuses, headers, authorization, validation, side effects, retry and concurrency behaviour. Define writable fields and omitted/null semantics; choose an explicit patch format when needed.
4. **Specify collection traversal.** Filter grammar, caller-authorized query fields, sort order and tie-breaker, limits, pagination mechanism, end signal, behaviour under concurrent changes.
5. **Resolve failure and evolution cases.** Invalid input, missing or unauthorized resources, duplicate requests, stale writes, partial failure, existing-client compatibility. Record a decision for each material case.
6. **Deliver.** A table or concrete request/response examples covering:
   - every affected operation;
   - relationship mutation, omitted versus null, unsupported filters, tied sort values, data changed between pages (where relevant);
   - implementation compared with the contract, and changed observable behaviour tested (when an implementation exists);
   - the project's API description updated when the public contract changes;
   - remaining gaps and trade-offs.

## Reference routing

Read only the references relevant to the affected contract:

- [Resources and methods](references/resources-and-methods.md): naming, identity, containment and associations, actions, operation resources.
- [Payload design](references/payload-design.md): field semantics, unknown fields, patch formats, relationship representation, bounded expansion.
- [Queries and pagination](references/queries-and-pagination.md): filters, search, QUERY/POST search, sorting, cursor/keyset, token binding, traversal consistency.
- [Contract decisions](references/contract-decisions.md): status policy, errors, Idempotency-Key, Retry-After, concurrent writes, caching, authorization, evolution.
