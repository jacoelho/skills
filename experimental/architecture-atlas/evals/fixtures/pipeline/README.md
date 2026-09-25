# Synthetic request pipeline

`handle` decodes a request, records it and publishes a request-ID event. The
caller supplies both the in-memory mapping and the publisher. This fixture
contains no deployed consumer, database or HTTP server.

## Design note — not implemented

A future version should retry failed publication and acknowledge incoming
messages only after confirmed delivery. There is no incoming-message
acknowledgement API or retry loop in this fixture.

## Historical documentation claim — verify against code

Publication and recording are one atomic transaction. The map is durable.

This intentionally stale claim is retained to exercise source/document conflict
review. Code is the evidence for current behaviour.
