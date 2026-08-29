import crypto from 'crypto'

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
 * 订单状态机迁移表（唯一事实来源）
 * key: 当前状态；value: 允许迁移到的状态集合
 */
export const ORDER_TRANSITIONS = {
  PENDING_PAYMENT: ['PAID', 'CANCELLED'],
  PAID: ['SHIPPED'],
  SHIPPED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: []
}

/**
 * 校验订单状态迁移合法性
 * @param {"PENDING_PAYMENT"|"PAID"|"SHIPPED"|"COMPLETED"|"CANCELLED"} from
 * @param {"PENDING_PAYMENT"|"PAID"|"SHIPPED"|"COMPLETED"|"CANCELLED"} to
 * @throws {Error} ORDER_STATUS_INVALID 非法迁移
 */
export function assertOrderTransition(from, to) {
  const allowed = ORDER_TRANSITIONS[from] || []
  if (!allowed.includes(to)) throw new Error('ORDER_STATUS_INVALID')
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

/**
 * 注册手机号格式校验：11 位中国大陆手机号
 * @param {string} phone 手机号
 * @throws {Error} INVALID_PHONE 格式不合法（非 1\d{10}）
 */
export function assertPhoneFormat(phone) {
  if (!/^1\d{10}$/.test(phone || '')) {
    throw new Error('INVALID_PHONE')
  }
}

/**
 * 注册密码强度校验：6 ~ 32 位
 * @param {string} password 密码
 * @throws {Error} PASSWORD_TOO_SHORT 不足 6 位
 * @throws {Error} PASSWORD_TOO_LONG 超过 32 位
 */
export function assertPasswordRule(password) {
  if (typeof password !== 'string' || password.length < 6) {
    throw new Error('PASSWORD_TOO_SHORT')
  }
  if (password.length > 32) {
    throw new Error('PASSWORD_TOO_LONG')
  }
}

/**
 * 注册昵称校验：必填且 ≤20 字
 * @param {string} nickname 昵称
 * @throws {Error} NICKNAME_REQUIRED 为空
 * @throws {Error} NICKNAME_TOO_LONG 超过 20 字
 */
export function assertNicknameRule(nickname) {
  if (!nickname || !nickname.trim()) {
    throw new Error('NICKNAME_REQUIRED')
  }
  if (nickname.length > 20) {
    throw new Error('NICKNAME_TOO_LONG')
  }
}

/**
 * 默认昵称：由手机号后 4 位生成，如 13888217536 → 7536用户
 * @param {string} phone 合法手机号
 * @returns {string} 默认昵称
 */
export function defaultNickname(phone) {
  return `${phone.slice(-4)}用户`
}

/**
 * 密码哈希（scrypt 加盐，零第三方依赖）
 * @param {string} password 明文密码
 * @returns {string} 存储格式 scrypt:<saltHex>:<hashHex>
 */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

/**
 * 密码校验（供登录 Story 复用）
 * @param {string} password 明文密码
 * @param {string} stored 存储的 scrypt:<salt>:<hash>
 * @returns {boolean} 是否匹配
 */
export function verifyPassword(password, stored) {
  if (!stored || !stored.startsWith('scrypt:')) return false
  const [, salt, hash] = stored.split(':')
  const candidate = crypto.scryptSync(password, salt, 64).toString('hex')
  return candidate === hash
}

/**
 * 登录账户级门禁：禁用用户禁止登录
 * @param {import("./types.js").User | undefined} user 目标用户
 * @throws {Error} USER_DISABLED 用户状态为禁用
 */
export function assertUserEnabled(user) {
  if (user && user.status === '禁用') {
    throw new Error('USER_DISABLED')
  }
}

/**
 * B 端用户状态流转校验：仅允许「正常」与「禁用」（R-ADM-005/006）
 * @param {string} status 目标状态
 * @throws {Error} INVALID_STATUS 状态值非法（非 正常/禁用）
 */
export function assertUserStatusValue(status) {
  if (status !== '正常' && status !== '禁用') {
    throw new Error('INVALID_STATUS')
  }
}
