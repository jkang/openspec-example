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

/**
 * 创建券规则校验（运营后台）
 * @param {{ type: "FLAT" | "PERCENTAGE", value: number, minSpendCents: number }} rule
 * @throws {Error} INVALID_DISCOUNT_RATE PERCENTAGE 折扣值 ≤0 或 ≥10
 * @throws {Error} COUPON_VALUE_EXCEEDS_THRESHOLD FLAT 减免金额 ≥ 使用门槛
 */
export function validateCouponRule(rule) {
  if (rule.type === 'PERCENTAGE' && (rule.value <= 0 || rule.value >= 10)) {
    throw new Error('INVALID_DISCOUNT_RATE')
  }
  if (rule.type === 'FLAT' && rule.minSpendCents > 0 && rule.value >= rule.minSpendCents) {
    throw new Error('COUPON_VALUE_EXCEEDS_THRESHOLD')
  }
}

/**
 * 单人发放校验（运营后台）
 * @param {import("./types.js").Coupon} template 规则模板
 * @param {string} userId 目标用户
 * @param {import("./types.js").Coupon[]} allCoupons 全量券（用于重复发放检查）
 * @throws {Error} INVALID_USER_ID 用户 ID 不匹配 user_\d+
 * @throws {Error} COUPON_NOT_ACTIVE 模板非 ACTIVE
 * @throws {Error} COUPON_ALREADY_ISSUED 同模板同用户存在 UNUSED 实例
 */
export function validateIssue(template, userId, allCoupons) {
  if (!/^user_\d+$/.test(userId || '')) {
    throw new Error('INVALID_USER_ID')
  }
  if (template.status !== 'ACTIVE') {
    throw new Error('COUPON_NOT_ACTIVE')
  }
  const alreadyIssued = allCoupons.some(c =>
    c.templateId === template.id && c.userId === userId && c.status === 'UNUSED'
  )
  if (alreadyIssued) {
    throw new Error('COUPON_ALREADY_ISSUED')
  }
}
