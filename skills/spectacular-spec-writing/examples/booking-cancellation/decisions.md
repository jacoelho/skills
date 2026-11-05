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

## Decision record

| ID | Question or decision | State | Basis / answer / authority | Prerequisites | Affected work | Resolution condition |
| --- | --- | --- | --- | --- | --- | --- |
| Q-BOOK-001 | Which bookings can a customer cancel? | resolved | Pending only; a confirmed booking is rejected as a conflict because refunds are out of scope. Booking product owner. | none | REQ-BOOK-001, REQ-BOOK-003 | Answered |
| Q-BOOK-002 | What does cancelling an already cancelled booking return? | resolved | Success with no change, so client retries are safe. Booking product owner. | Q-BOOK-001 | REQ-BOOK-002 | Answered |
| Q-BOOK-003 | When cancellation and confirmation of one booking race, which wins? | excluded | No answer yet; plausible answers differ on whether stock is released. Excluded from this increment. | Q-BOOK-001 | concurrent cancel and confirm | Booking product owner decides before concurrency work starts |
| Q-BOOK-004 | What does a cancellation request from anyone other than the booking's owner, or for an unknown booking, return? | excluded | No answer yet; plausible answers differ on whether a booking's existence is disclosed. Excluded from this increment, so every requirement is scoped to the owner. | none | non-owner and unknown-booking requests | Booking product owner decides before access-control work starts |

## Handoff

Settled decisions: Q-BOOK-001, Q-BOOK-002 (booking product owner).
Reopened decisions: none.
Remaining questions: Q-BOOK-003 and Q-BOOK-004, owner booking product owner; they block only concurrent cancel and confirm, and non-owner or unknown-booking requests, which are excluded.
Next action: write bounded contract.
Unblocked scope: REQ-BOOK-001 to REQ-BOOK-003 in [contract.md](contract.md).
Executed checks: none; all evidence is planned.
