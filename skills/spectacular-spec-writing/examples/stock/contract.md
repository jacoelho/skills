<!-- spec-lint: active -->
# Stock availability

> Worked example for the Spectacular skills. The capability, owner, and policy are illustrative. This contract is the canonical home of the shared stock invariant that [the booking cancellation contract](../booking-cancellation/contract.md) references. Lint both contracts together by passing `examples/`; together they lint clean under `--strict`.

Contract revision: example-1
Decision owner: inventory product owner
Lifecycle: anchored
Effective scope: booking service, target version

## Intent and boundary

Customers are offered only units that exist, so every booking the service accepts can be honoured.

Included: the bound on the available units of each stock.
Excluded: replenishing or recounting stock; reservation and release rules, which the contracts of the capabilities that reserve and release own.
Preserved: none; this is the first revision.

## Governing context and basis

Total units are the units the inventory owner records for a stock. Available units are total units not held by a booking. Both are observed through the stock read endpoint.

## Contract

### INV-STOCK-001 - Available units stay within total units

Status: accepted
Statement: The booking service shall keep the available units of each stock between zero and its total units.
Basis: Stock policy adopted by the inventory product owner.

## Acceptance

### AC-STOCK-001 - Any request sequence keeps units in bounds

Covers: INV-STOCK-001
Situation: Stock S has 2 total units; any generated sequence of booking, cancellation, and repeated cancellation requests for S is sent to the booking service API.
Expected: After every request, stock S reports between 0 and 2 available units.
Basis: The inventory owner's stock policy fixes the bound independently of the booking implementation.
Verification: Planned property test at the booking service API; not executed.
Counterexample: A repeated cancellation that releases its unit twice reports 3 available units.
