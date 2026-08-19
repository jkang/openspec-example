export function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
}

/**
 * 计算折扣金额
 * @param {number} totalCents 订单总额
 * @param {import("./types.js").Coupon} coupon 优惠券
 * @returns {number} 折扣金额 (cents)
 */
export function calculateDiscount(totalCents, coupon) {
  if (!coupon || totalCents < coupon.minSpendCents) {
    return 0;
  }

  if (coupon.type === 'FLAT') {
    return Math.min(totalCents, coupon.value);
  } else if (coupon.type === 'PERCENTAGE') {
    // value 为折扣率，例如 9 表示 9 折
    // 折扣额 = 总价 * (1 - 折扣率/10)
    // 结果向下取整至 cent
    const discount = totalCents * (1 - coupon.value / 10);
    // 使用精准的四舍五入偏移处理浮点数误差，确保 10000 * 0.1 得到 1000 而不是 999
    return Math.floor(discount + 0.00001);
  }

  return 0;
}
