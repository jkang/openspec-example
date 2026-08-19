Feature: Ecommerce Smoke Test
  @e2e
  Scenario: Basic storefront load
    Given I open the storefront
    Then I should see the product list
