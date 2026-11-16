# Requirements clarification: booking cancellation

> Worked example of the `spectacular-spec-grilling` record. It is the working input to [contract.md](contract.md), not a second specification, so it carries no spec-lint marker.

Session status: handed off
Scope: customer cancellation of a single booking in the booking service
Source state: no prior contract; answers supplied by the booking product owner in this session
Workspace state: illustrative; no code revision

## Established context

- Bookings are pending until payment, then confirmed (booking product owner).
- Each booking holds one reserved unit of stock (booking product owner).
- Available units of each stock stay between zero and its total units (INV-STOCK-001, owned by the inventory product owner).
- A booking's owner is the customer who made it (booking product owner).

## Open

### Q-BOOK-003 - Cancellation racing confirmation

When cancellation and confirmation of one booking race, which wins? Left out of this change, because plausible answers differ on whether stock is released. Needs the booking product owner before concurrency work starts; builds on Q-BOOK-001.

### Q-BOOK-004 - Requests from others or for unknown bookings

What does a cancellation request from anyone other than the booking's owner, or for an unknown booking, return? Left out of this change, so every requirement is scoped to the owner; plausible answers differ on whether a booking's existence is disclosed. Needs the booking product owner before access-control work starts.

## Decided

### Q-BOOK-001 - Cancellable bookings

Which bookings can a customer cancel? Pending only; a confirmed booking is rejected as a conflict, because refunds are out of scope. Decided by the booking product owner.

Rejected: cancelling confirmed bookings too, because that needs refunds.

### Q-BOOK-002 - Repeated cancellation

What does cancelling an already cancelled booking return? Success with no change, so client retries are safe. Decided by the booking product owner; builds on Q-BOOK-001.

Rejected: a conflict error, because clients would treat a retried success as a failure.

## Handoff

Next action: implement the contract; Q-BOOK-003 and Q-BOOK-004 block only the excluded work.
