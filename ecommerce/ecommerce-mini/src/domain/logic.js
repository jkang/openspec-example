export function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
}

/**
 * 商品新增/修改校验（运营后台）
 * @param {{ priceCents?: number, stock?: number }} input
 * @throws {Error} INVALID_PRICE priceCents 必须 > 0
 * @throws {Error} INVALID_STOCK stock 必须 >= 0
 */
export function validateProductInput(input) {
  if (typeof input.priceCents === 'number' && input.priceCents <= 0) {
    throw new Error('INVALID_PRICE')
  }
  if (typeof input.stock === 'number' && input.stock < 0) {
    throw new Error('INVALID_STOCK')
  }
}

/**
 * 商品状态归一：缺省 status 视为 active
 * @param {import("./types.js").Product | undefined} product
 * @returns {"active" | "deleted"}
 */
export function normalizeStatus(product) {
  return product && product.status ? product.status : 'active'
}

/**
 * 分类唯一性校验：同名 active 分类拒绝
 * @param {import("./types.js").Category[]} categories 全量分类
 * @param {string} name 待校验名称
 * @param {string} [excludeId] 编辑时排除自身
 * @throws {Error} CATEGORY_NAME_EXISTS
 */
export function assertCategoryNameUnique(categories, name, excludeId) {
  const dup = categories.some(c =>
    c.name === name && normalizeStatus(c) === 'active' && c.id !== excludeId
  )
  if (dup) throw new Error('CATEGORY_NAME_EXISTS')
}

/**
 * 分类有效性校验：id 存在且 active
 * @param {import("./types.js").Category | undefined} category
 * @throws {Error} CATEGORY_NOT_FOUND
 */
export function assertCategoryActive(category) {
  if (!category || normalizeStatus(category) === 'deleted') throw new Error('CATEGORY_NOT_FOUND')
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
