/**
 * @typedef {Object} Product
 * @property {string} id
 * @property {string} name
 * @property {number} priceCents
 * @property {number} stock
 * @property {string} [imageUrl]
 * @property {string} [description]
 * @property {"active" | "deleted"} [status] 上架/下架状态；缺省视为 active
 * @property {string|null} [categoryId] 所属分类；null 表示未分类
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} name
 * @property {number} [sortOrder] 排序号（越小越靠前）
 * @property {"active" | "deleted"} [status] 分类状态；缺省视为 active
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
 * @property {"PENDING_PAYMENT" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED"} status
 * @property {number} totalCents
 * @property {number} discountCents
 * @property {number} actualPaidCents
 * @property {string} [couponId]
 * @property {OrderItem[]} items
 * @property {string} userId
 * @property {string} [createdAt] 下单时间（ISO 8601）
 * @property {string} [paidAt] 支付时间（ISO 8601，支付成功时写入；销售看板时间归属基准，R-DASH-005）
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

/**
 * @typedef {Object} User
 * @property {string} id 用户 ID（格式 user_<seq>，如 user_1001）
 * @property {string} phone 手机号（11 位中国大陆手机号，全局唯一）
 * @property {string} passwordHash 密码哈希（scrypt:<salt>:<hash>），不存明文
 * @property {string} nickname 昵称（≤20 字；未填时默认 "<尾号>用户"）
 * @property {"正常" | "禁用"} status 用户状态（注册默认"正常"；B 端启停动作迁移）
 * @property {"客户" | "运营" | "客服" | "老板"} [role] 用户角色（注册默认"客户"；运营可访问 B 端用户管理 R-ADM-001；老板为只读看板角色，可访问 GET /api/admin/dashboard/*，无管理写权限，R-DASH-006）
 * @property {string} createdAt 创建时间 (YYYY-MM-DD HH:mm)
 */

/**
 * @typedef {Object} Session
 * @property {string} token 会话凭证（随机 UUID）
 * @property {string} userId 归属用户
 * @property {string} createdAt 创建时间 (YYYY-MM-DD HH:mm)
 */
