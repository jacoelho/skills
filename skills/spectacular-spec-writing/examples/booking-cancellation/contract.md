<!-- spec-lint: active -->
# Booking cancellation

> Worked example for the Spectacular skills. The capability, owner, and decisions are illustrative. It follows `assets/capability.md`; [booking-cancellation.decisions.md](booking-cancellation.decisions.md) is the decision record behind it, [booking-cancellation.evidence.md](booking-cancellation.evidence.md) lists the scenario tests that check its ACs, and [the stock contract](../stock/contract.md) owns the invariant it preserves. Lint it with that contract by passing `examples/`; alone it reports the invariant reference as dangling.

Decision owner: booking product owner

Lifecycle: anchored

## Intent and boundary

A customer who no longer needs a pending booking can cancel it, and its reserved unit returns to stock for other customers. Usefulness is observed as released stock and safe client retries.

Included: the owner cancelling a pending booking; the owner repeating a cancellation; rejecting the owner's cancellation of a confirmed booking.

Preserved: INV-STOCK-001.

Excluded: refunds; cancelling confirmed bookings; cancellation racing confirmation of the same booking (Q-BOOK-003); requests from anyone other than the booking's owner and requests for unknown bookings (Q-BOOK-004).

## Governing context and basis

The boundary is the booking service's cancellation request, observed through the booking and stock read endpoints. A booking's owner is the customer who made it. Decisions Q-BOOK-001 and Q-BOOK-002 in [the decision record](booking-cancellation.decisions.md) settle the outcomes below.

## Contract

### REQ-BOOK-001 - Cancel a pending booking

Statement: When the owner of a pending booking requests its cancellation, the booking service shall atomically mark the booking cancelled and release its reserved unit.

Basis: Q-BOOK-001

Rationale: releasing the unit is what keeps INV-STOCK-001's bound after a cancellation.

#### AC-BOOK-001 - Pending booking is cancelled and its unit released

Covers: INV-STOCK-001

Situation: Stock S has 1 total unit; booking B1 is pending and holds it, so S has 0 units available; the owner of B1 requests its cancellation.

Expected: B1 is cancelled and S has 1 unit available.

Oracle: Q-BOOK-001: a cancelled pending booking gives back the unit it reserved.

Boundary: The booking service API.

Counterexample: A cancellation that leaves B1 pending, or leaves S at 0 available units, fails.

### REQ-BOOK-002 - Repeated cancellation changes nothing

Statement: When the owner of a cancelled booking requests its cancellation, the booking service shall report success without changing the booking or stock.

Basis: Q-BOOK-002

Rationale: a retry must not release the unit twice, which would break INV-STOCK-001.

#### AC-BOOK-002 - Repeated cancellation succeeds without change

Covers: INV-STOCK-001

Situation: Stock S has 1 total unit and 1 available; booking B2 for S is cancelled; its owner requests its cancellation again.

Expected: The request succeeds, B2 is still cancelled, and S still has 1 unit available.

Oracle: Q-BOOK-002: a retry is answered with success and changes nothing.

Boundary: The booking service API.

Counterexample: A retry that releases the unit again reports 2 available units for S and fails.

### REQ-BOOK-003 - Confirmed bookings cannot be cancelled

Statement: If the owner of a confirmed booking requests its cancellation, then the booking service shall reject the request as a conflict without changing the booking or stock.

Basis: Q-BOOK-001

#### AC-BOOK-003 - Confirmed booking is rejected

Situation: Stock S has 1 total unit; booking B3 is confirmed and holds it, so S has 0 units available; the owner of B3 requests its cancellation.

Expected: The request is rejected as a conflict, B3 is still confirmed, and S still has 0 units available.

Oracle: Q-BOOK-001: only pending bookings can be cancelled; refunds are out of scope.

Boundary: The booking service API.

Counterexample: A rejection that still releases the unit, leaving S at 1 available, fails.

## Implementation discretion

How the booking change and stock release are made atomic, such as one transaction or a conditional update, is open to the implementer.
