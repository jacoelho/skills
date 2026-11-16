Feature: Booking cancellation

  Scenario: Cancelling a pending booking releases its unit
    Given stock S has 1 total unit
    And booking B1 is pending and holds the only unit of stock S
    And stock S has 0 units available
    When the owner of booking B1 requests its cancellation
    Then booking B1 is cancelled
    And stock S has 1 unit available

  Scenario: Cancelling an already cancelled booking succeeds without change
    Given stock S has 1 total unit
    And booking B2 for stock S is cancelled
    And stock S has 1 unit available
    When the owner of booking B2 requests its cancellation
    Then the cancellation succeeds
    And booking B2 is still cancelled
    And stock S has 1 unit available

  Scenario: Cancelling a confirmed booking is rejected as a conflict
    Given stock S has 1 total unit
    And booking B3 is confirmed and holds the only unit of stock S
    And stock S has 0 units available
    When the owner of booking B3 requests its cancellation
    Then the cancellation is rejected as a conflict
    And booking B3 is still confirmed
    And stock S has 0 units available
