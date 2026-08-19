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
 * @property {number} value
 * @property {number} minSpendCents
 * @property {"UNUSED" | "USED" | "EXPIRED"} status
 */
