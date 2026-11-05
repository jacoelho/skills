Feature: Booking cancellation
  # Contract: contract.md, revision example-1
  # Oracle: decisions Q-BOOK-001 and Q-BOOK-002 in decisions.md; INV-STOCK-001 in ../stock/contract.md
  # Boundary: booking service cancellation request; booking and stock read endpoints
  # Evidence: proposed examples; not executed
  # Rule: needs Gherkin 6 or later; the @REQ and @INV tags keep traceability without it.

  Rule: REQ-BOOK-001 cancels a pending booking

    @REQ-BOOK-001 @INV-STOCK-001
    Scenario: Cancelling a pending booking releases its unit
      Given stock S has 1 total unit
      And booking B1 is pending and holds the only unit of stock S
      And stock S has 0 units available
      When the owner of booking B1 requests its cancellation
      Then booking B1 is cancelled
      And stock S has 1 unit available

  Rule: REQ-BOOK-002 makes a repeated cancellation change nothing

    @REQ-BOOK-002 @INV-STOCK-001
    Scenario: Cancelling an already cancelled booking succeeds without change
      Given stock S has 1 total unit
      And booking B2 for stock S is cancelled
      And stock S has 1 unit available
      When the owner of booking B2 requests its cancellation
      Then the cancellation succeeds
      And booking B2 is still cancelled
      And stock S has 1 unit available

  Rule: REQ-BOOK-003 rejects cancelling a confirmed booking

    @REQ-BOOK-003
    Scenario: Cancelling a confirmed booking is rejected as a conflict
      Given stock S has 1 total unit
      And booking B3 is confirmed and holds the only unit of stock S
      And stock S has 0 units available
      When the owner of booking B3 requests its cancellation
      Then the cancellation is rejected as a conflict
      And booking B3 is still confirmed
      And stock S has 0 units available

  # Question Q-BOOK-003: cancellation racing confirmation of one booking.
  # Question Q-BOOK-004: requests from anyone other than the owner, or for an unknown booking.
  # Both are excluded from this increment; no Then until the booking product owner decides.
