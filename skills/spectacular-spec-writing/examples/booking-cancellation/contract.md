<!-- spec-lint: active -->
# Booking cancellation

> Worked example for the Spectacular skills. The capability, owner, and decisions are illustrative. It follows `assets/capability.md`; [decisions.md](decisions.md) is the working record behind it, [cancellation.feature](cancellation.feature) holds the executable examples its ACs point to, and [the stock contract](../stock/contract.md) owns the invariant it preserves. Lint it with that contract by passing `examples/`; alone it reports the invariant reference as dangling.

Contract revision: example-1
Decision owner: booking product owner
Effective scope: booking service, target version

## Intent and boundary

A customer who no longer needs a pending booking can cancel it, and its reserved unit returns to stock for other customers. Usefulness is observed as released stock and safe client retries.

Included: the owner cancelling a pending booking; the owner repeating a cancellation; rejecting the owner's cancellation of a confirmed booking.
Excluded: refunds; cancelling confirmed bookings; cancellation racing confirmation of the same booking (Q-BOOK-003); requests from anyone other than the booking's owner and requests for unknown bookings (Q-BOOK-004).
Preserved: INV-STOCK-001.

## Governing context and basis

The boundary is the booking service's cancellation request, observed through the booking and stock read endpoints. A booking's owner is the customer who made it. Decisions Q-BOOK-001 and Q-BOOK-002 in [the decision record](decisions.md) settle the outcomes below.

## Contract

### REQ-BOOK-001 — Cancel a pending booking

Status: accepted
Statement: When the owner of a pending booking requests its cancellation, the booking service shall atomically mark the booking cancelled and release its reserved unit.
Basis: Q-BOOK-001, resolved by the booking product owner.
References: INV-STOCK-001

### REQ-BOOK-002 — Repeated cancellation changes nothing

Status: accepted
Statement: When the owner of a cancelled booking requests its cancellation, the booking service shall report success without changing the booking or stock.
Basis: Q-BOOK-002, resolved by the booking product owner so that client retries are safe.
References: INV-STOCK-001

### REQ-BOOK-003 — Confirmed bookings cannot be cancelled

Status: accepted
Statement: If the owner of a confirmed booking requests its cancellation, then the booking service shall reject the request as a conflict without changing the booking or stock.
Basis: Q-BOOK-001, resolved by the booking product owner; refunds are outside this increment.

## Acceptance

Each AC points to the scenario that owns its expected values rather than repeating them.

### AC-BOOK-001 — Pending booking is cancelled and its unit released

Covers: REQ-BOOK-001, INV-STOCK-001
Expected: Scenario "Cancelling a pending booking releases its unit" in cancellation.feature passes.
Verification: Planned at the booking service API; not executed.

### AC-BOOK-002 — Repeated cancellation succeeds without change

Covers: REQ-BOOK-002, INV-STOCK-001
Expected: Scenario "Cancelling an already cancelled booking succeeds without change" in cancellation.feature passes.
Verification: Planned at the booking service API; not executed. A second release here would breach INV-STOCK-001.

### AC-BOOK-003 — Confirmed booking is rejected

Covers: REQ-BOOK-003
Expected: Scenario "Cancelling a confirmed booking is rejected as a conflict" in cancellation.feature passes.
Verification: Planned at the booking service API; not executed.

## Implementation discretion

How the booking change and stock release are made atomic, such as one transaction or a conditional update, is open to the implementer.
