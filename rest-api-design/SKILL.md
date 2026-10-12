---
name: rest-api-design
description: "Design or review framework-agnostic REST API contracts: resource naming and relationships, methods and actions, payloads, filters and sorting, cursor or keyset pagination, errors, concurrency, and evolution. Not for framework setup or runtime tuning alone."
---

# REST API design

Design the public HTTP contract around client-visible resources and behavior. Apply this skill to new APIs, contract changes, and API design reviews in any language or framework. Explicit user requirements and established external contracts take precedence over these defaults.

Distinguish HTTP requirements from design conventions. Choose one coherent convention for the API; adopt Google AIPs, Azure guidelines, or JSON:API only where they fit the project's contract. Record material trade-offs instead of presenting one provider's style as a REST requirement.

## Workflow

1. **Inventory the contract.** Read existing routes, API descriptions, client usage, tests, and domain rules when they exist. For a new API, identify actors and requested operations. Record every affected operation and any existing promise to consumers. Ask only about choices that materially change correctness or an external contract and cannot be inferred.
2. **Model resources and transitions.** Identify stable identity, owner, lifecycle, relationships, and valid state changes. Choose canonical paths and distinguish containment from association. Map operations to resource reads or writes, justified actions, or operation resources. Keep storage tables, framework types, and internal service boundaries out of the public model.
3. **Specify every operation.** Build a contract matrix with method, path, request and response shapes, success and failure statuses, headers, authorization, validation, side effects, retry behavior, and concurrency behavior. Define writable fields and omitted/null semantics; choose an explicit patch format when needed.
4. **Specify collection traversal.** For list or search operations, define filter grammar, sort order and tie-breaker, query and expansion limits, pagination mechanism, continuation and end signals, and behavior under concurrent changes. Distinguish an opaque cursor's public contract from its offset, keyset, or snapshot implementation.
5. **Resolve failure and evolution cases.** Account for invalid input, missing or unauthorized resources, duplicate requests, stale writes, partial failure, and existing-client compatibility where applicable. Record the decision for each material case.
6. **Verify and deliver.** Cover every affected operation and material edge case with a table or concrete request/response examples. Include relationship mutation, omitted versus null fields, unsupported filters, tied sort values, and changed data between pages when relevant. If an implementation exists, compare it with the contract; for implementation work, test changed observable behavior. Update the project's API description when the public contract changes or its description is stale. For a design without implementation, check examples and decisions for internal consistency. Report remaining material gaps and trade-offs.

## Reference routing

Read only the references relevant to the affected contract:

- [Resources and methods](references/resources-and-methods.md): naming, canonical identity, containment and associations, methods, actions, and operation resources.
- [Payload design](references/payload-design.md): input/output schemas, field semantics, patch formats, relationship representation, and bounded expansion.
- [Queries and pagination](references/queries-and-pagination.md): filters, search, sorting, offset/cursor/keyset choices, token contracts, and traversal consistency.
- [Contract decisions](references/contract-decisions.md): HTTP semantics and statuses, errors, retries, concurrent writes, caching, authorization, and evolution.
