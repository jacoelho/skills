<!-- spec-lint: active -->
# Discount code redemption

> Worked example for the Spectacular skills. The capability, owner, and decisions are illustrative. It shows [case tables](../../references/declarations.md#case-tables), whose rows meet at the expiry and exhaustion boundaries with matching values, and a [rule table](../../references/declarations.md#rule-tables) that orders the rejection reasons. Its decisions live in [the decision record](discount-redemption.decisions.md), which the linter reads to resolve each Q a Basis cites.

Decision owner: pricing product owner

Lifecycle: anchored

## Intent and boundary

A customer with a valid discount code gets the discount at checkout, and a campaign never grants more redemptions than it budgeted. Usefulness is observed as discounted orders and remaining redemptions that never go below zero.

Included: redeeming a code at checkout; rejecting an expired or exhausted code.

Preserved: none; this is the first revision.

Excluded:

- redeeming the same code twice for one order (Q-DISC-001);
- stacking several codes on one order;
- refunds restoring a redemption.

## Governing context and basis

The boundary is the checkout service's apply-code request, observed through the order and campaign read endpoints. A code's expiry instant and redemption budget are set by the campaign owner. Code matching ignores letter case. Remaining redemptions is the budget minus the redemptions applied so far.

## Contract

### REQ-DISC-001 - Redeem a valid code

Statement: When a customer applies a discount code that is before its expiry instant and has remaining redemptions, the checkout service shall apply the discount to the order and reduce the code's remaining redemptions by exactly one.

Basis: Q-DISC-003; Q-DISC-004

#### AC-DISC-001 - Valid codes are redeemed at their limits

Expected: Every row of the case table below.

Oracle: Q-DISC-003 and Q-DISC-004; campaign settings are fixture values chosen per row, not read from the implementation.

Boundary: The checkout service API.

Counterexample: An implementation that treats the last remaining redemption as exhausted fails the state row; one that matches codes case-sensitively fails the identity row.

Code SPRING10 expires at 2026-03-01T00:00:00Z unless a row says otherwise.

| Dimension | Situation | Expected |
| --- | --- | --- |
| Time | Applied at 2026-02-28T23:59:59.999Z, 5 remaining | Discount applied; 4 remaining |
| State | Applied before expiry, 1 remaining | Discount applied; 0 remaining |
| Identity | Applied as `spring10` before expiry, 5 remaining | Discount applied; 4 remaining |

### REQ-DISC-002 - Reject an expired or exhausted code

Statement: If a customer applies a discount code that is at or after its expiry instant or has no remaining redemptions, then the checkout service shall reject the request with the reason in the first row of the rule table that applies, without changing the order or the code's remaining redemptions.

| Order | Applies when | Reason |
| --- | --- | --- |
| 1 | The request arrives at or after the code's expiry instant. | `expired` |
| 2 | Otherwise. | `exhausted` |

Basis: Q-DISC-002; Q-DISC-003; Q-DISC-004

#### AC-DISC-002 - Expired and exhausted codes are rejected with their reason and change nothing

Expected: Every row of the case table below.

Oracle: Q-DISC-002, Q-DISC-003 and Q-DISC-004.

Boundary: The checkout service API.

Counterexample: An implementation that treats expiry as inclusive fails the time row; one that checks the budget first reports `exhausted` in the order row; one that rejects but still decrements reports 4 or -1 remaining.

Code SPRING10 expires at 2026-03-01T00:00:00Z.

| Dimension | Situation | Expected |
| --- | --- | --- |
| Time | Applied at exactly 2026-03-01T00:00:00Z, 5 remaining | Rejected as `expired`; order total unchanged; 5 remaining |
| State | Applied before expiry, 0 remaining | Rejected as `exhausted`; order total unchanged; 0 remaining |
| Order | Applied after expiry with 0 remaining | Rejected as `expired`, row 1 before row 2; order total unchanged; 0 remaining |
