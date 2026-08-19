const { Given, Then } = require('@cucumber/cucumber');
const { expect } = require('chai');

Given('I open the storefront', async function () {
  // Mocking navigation for infrastructure check
  await this.page.goto('http://localhost:5173');
});

Then('I should see the product list', async function () {
  const content = await this.page.textContent('body');
  expect(content).to.contain('Minimal Store');
});
