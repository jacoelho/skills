---
name: rest-api-design
description: Design or review framework-agnostic REST API contracts. Use when choosing resources, paths, HTTP methods, response codes, representations, errors, pagination, concurrency, or API evolution; not for framework setup or runtime tuning alone.
---

# REST API design

Design the public HTTP contract around client-visible resources and behavior. Apply this skill to new APIs, contract changes, and API design reviews in any language or framework. Explicit user requirements and established external contracts take precedence over these defaults.

## Workflow

1. **Inventory the contract.** Read existing routes, API descriptions, client usage, tests, and domain rules when they exist. For a new API, identify actors and requested operations. Record every affected operation and any existing promise to consumers. Ask only about choices that materially change correctness or an external contract and cannot be inferred.
2. **Model resources and transitions.** Identify each resource's stable identity, owner, lifecycle, and valid state changes. Map every requested operation to a resource or a justified operation resource. Keep storage tables, framework types, and internal service boundaries out of the public model.
3. **Specify every operation.** Build a contract matrix with method, path, request and response shapes, success and failure statuses, headers, authorization, validation, side effects, retry behavior, and concurrency behavior. Define collection bounds and continuation where relevant.
4. **Resolve failure and evolution cases.** Account for invalid input, missing or unauthorized resources, duplicate requests, stale writes, partial failure, and existing-client compatibility where applicable. Record the decision for each material case.
5. **Verify and deliver.** Cover every affected operation and material edge case with a table or concrete request/response examples. If an implementation exists, compare it with the contract; for implementation work, test changed observable behavior. Update the project's API description when the public contract changes or its description is stale. For a design without implementation, check examples and decisions for internal consistency. Report remaining material gaps and trade-offs.

## Reference routing

Read the relevant sections of [contract decisions](references/contract-decisions.md):

- **Resources and methods** for paths, method semantics, and success statuses.
- **Failures and retries** for error responses, idempotency keys, and concurrent writes.
- **Representations and collections** for field contracts, pagination, cursors, and caching.
- **Security and evolution** for authorization, compatibility, and API descriptions.
