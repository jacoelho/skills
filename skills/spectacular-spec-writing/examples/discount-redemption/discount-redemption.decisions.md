# Requirements clarification: discount code redemption

Scope: redeeming a discount code at checkout, and rejecting expired or exhausted codes.
Source state: illustrative worked example; no code.
Workspace state: examples folder of the Spectacular skills.

## Open

### Q-DISC-001 - The same code twice on one order

Applying the same code twice to one order: does the second apply again, succeed unchanged, or fail? Left out of this change, because the outcomes differ on whether the budget drops twice. Needs the pricing product owner before retry work starts.

## Decided

### Q-DISC-002 - Reason for a code both expired and exhausted

Which reason does a code that is both expired and exhausted report? `expired` first: expiry is the campaign's own end, and customers can act on it. Decided by the pricing product owner.

Rejected: `exhausted` first, because it suggests the code might return.

### Q-DISC-003 - Expiry instant

Is a code valid at its expiry instant? No. A code is valid strictly before its expiry instant, measured by the checkout service's clock when the request is received. Decided by the pricing product owner.

Rejected: valid through the expiry instant, because campaigns announce the instant as the end.

### Q-DISC-004 - Redemption budget

May a campaign grant more redemptions than its budget? No. The budget is a hard cap: a code with no remaining redemptions is rejected, and a rejected request changes neither the order nor the campaign. Decided by the pricing product owner.

Rejected: a soft cap that tolerates a few extra redemptions under load, because the budget is a cost the campaign owner signs off.

## Handoff

Next action: implement REQ-DISC-001 and REQ-DISC-002; Q-DISC-001 blocks only repeated redemption.
