import { test } from "node:test";
import assert from "node:assert";
import { calculateTotal, calculateDiscount } from "./logic.js";

test("calculateTotal sums up item prices", () => {
  const items = [
    { priceCents: 100, quantity: 2 },
    { priceCents: 50, quantity: 1 },
  ];
  const total = calculateTotal(items);
  assert.strictEqual(total, 250);
});

test("calculateDiscount - FLAT coupon", () => {
  /** @type {import("./types.js").Coupon} */
  const coupon = { id: 'c1', name: 'Test', type: 'FLAT', value: 2000, minSpendCents: 10000, status: 'UNUSED' };
  
  // 达到门槛
  assert.strictEqual(calculateDiscount(12000, coupon), 2000);
  
  // 未达门槛
  assert.strictEqual(calculateDiscount(8000, coupon), 0);
  
  // 订单金额小于优惠额
  assert.strictEqual(calculateDiscount(1000, { ...coupon, minSpendCents: 0 }), 1000);
});

test("calculateDiscount - PERCENTAGE coupon", () => {
  /** @type {import("./types.js").Coupon} */
  const coupon = { id: 'c2', name: 'Test', type: 'PERCENTAGE', value: 9, minSpendCents: 10000, status: 'UNUSED' };
  
  // 9折: 10000 * (1 - 0.9) = 1000
  assert.strictEqual(calculateDiscount(10000, coupon), 1000);
  
  // 向下取整: 1555 * (1 - 0.95) = 77.75 -> 77
  /** @type {import("./types.js").Coupon} */
  const coupon95 = { id: 'c3', name: 'Test', type: 'PERCENTAGE', value: 9.5, minSpendCents: 0, status: 'UNUSED' };
  assert.strictEqual(calculateDiscount(1555, coupon95), 77);
});
