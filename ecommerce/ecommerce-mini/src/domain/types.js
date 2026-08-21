/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {number} priceCents
 * @property {number} stock
 * @property {string} [imageUrl]
 */

/**
 * @typedef {Object} CartItem
 * @property {string} id
 * @property {string} productId
 * @property {number} quantity
 */

/**
 * @typedef {Object} Cart
 * @property {string} userId
 * @property {CartItem[]} items
 */

/**
 * @typedef {Object} OrderItem
 * @property {string} productId
 * @property {number} priceCents
 * @property {number} quantity
 */

/**
 * @typedef {Object} Order
 * @property {string} id
 * @property {"PENDING_PAYMENT" | "PAID"} status
 * @property {number} totalCents
 * @property {number} discountCents
 * @property {number} actualPaidCents
 * @property {string} [couponId]
 * @property {OrderItem[]} items
 * @property {string} userId
 */

/**
 * @typedef {Object} Coupon
 * @property {string} id
 * @property {string} name
 * @property {"FLAT" | "PERCENTAGE"} type
 * @property {number} value FLAT 为减免金额 (cents)；PERCENTAGE 为折扣率 (如 9 表示 9 折)
 * @property {number} minSpendCents 使用门槛 (0 表示无门槛)
 * @property {"UNUSED" | "USED" | "EXPIRED" | "ACTIVE"} status ACTIVE 为运营创建的规则模板
 * @property {string|null} [expiryDate] 有效期至 (YYYY-MM-DD)
 * @property {string|null} [userId] 归属用户；null 表示全场通用券
 * @property {string|null} [templateId] 发放实例关联的规则模板 id
 */

/**
 * @typedef {Object} Issuance
 * @property {string} id
 * @property {string} time 发放时间 (YYYY-MM-DD HH:mm)
 * @property {string} couponId 规则模板 id
 * @property {string} couponName
 * @property {string} userId 目标用户
 * @property {string} operator 操作人
 */
