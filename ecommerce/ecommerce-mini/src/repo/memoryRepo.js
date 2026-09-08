import crypto from 'crypto'

export class ProductRepo {
  constructor() {
    this.products = new Map()
  }

  save(product) {
    this.products.set(product.id, product)
  }

  findAll() {
    return Array.from(this.products.values())
  }

  findById(id) {
    return this.products.get(id)
  }

  clear() {
    this.products.clear()
  }
}

export class CategoryRepo {
  constructor() {
    this.categories = new Map()
  }

  save(category) {
    this.categories.set(category.id, category)
  }

  findAll() {
    return Array.from(this.categories.values())
  }

  findById(id) {
    return this.categories.get(id)
  }

  clear() {
    this.categories.clear()
  }
}

export class CartRepo {
  constructor() {
    this.carts = new Map()
  }

  findByUserId(userId) {
    return this.carts.get(userId)
  }

  save(cart) {
    this.carts.set(cart.userId, cart)
  }

  clear() {
    this.carts.clear()
  }
}

export class OrderRepo {
  constructor() {
    this.orders = new Map()
  }

  save(order) {
    this.orders.set(order.id, order)
  }

  findById(id) {
    return this.orders.get(id)
  }

  findAll() {
    return Array.from(this.orders.values())
  }

  clear() {
    this.orders.clear()
  }
}

export class CouponRepo {
  constructor() {
    this.coupons = new Map()
  }

  save(coupon) {
    this.coupons.set(coupon.id, coupon)
  }

  findById(id) {
    return this.coupons.get(id)
  }

  findAll() {
    return Array.from(this.coupons.values())
  }

  countByTemplateId(templateId) {
    return this.findAll().filter(c => c.templateId === templateId).length
  }

  clear() {
    this.coupons.clear()
  }
}

export class IssuanceRepo {
  constructor() {
    this.issuances = new Map()
  }

  save(issuance) {
    this.issuances.set(issuance.id, issuance)
  }

  findAll() {
    return Array.from(this.issuances.values())
  }

  clear() {
    this.issuances.clear()
  }
}

export class UserRepo {
  constructor() {
    this.users = new Map()
    this.sequence = 1000
  }

  /**
   * 生成下一个用户 ID（user_<seq>，对齐既有 user_\d+ 校验约定）
   * @returns {string} 如 user_1001
   */
  nextId() {
    this.sequence += 1
    return `user_${this.sequence}`
  }

  save(user) {
    this.users.set(user.id, user)
  }

  findAll() {
    return Array.from(this.users.values())
  }

  findById(id) {
    return this.users.get(id)
  }

  findByPhone(phone) {
    return Array.from(this.users.values()).find(u => u.phone === phone)
  }

  /** 微信 openid 命中查询（wechat-auth，Q1：openid 单小程序一对一） */
  findByOpenid(openid) {
    if (!openid) return undefined
    return Array.from(this.users.values()).find(u => u.openid === openid)
  }

  clear() {
    this.users.clear()
    this.sequence = 1000
  }
}

export class StockConfigRepo {
  constructor() {
    // 缺省配置：全局默认阈值 10 件 + 空覆盖表（R-STOCK-004）
    this.config = { globalThreshold: 10, overrides: {} }
  }

  getConfig() {
    return this.config
  }

  setGlobalThreshold(threshold) {
    this.config.globalThreshold = threshold
    return this.config
  }

  setOverride(productId, threshold) {
    this.config.overrides[String(productId)] = threshold
    return this.config
  }

  clear() {
    this.config = { globalThreshold: 10, overrides: {} }
  }
}

export class SessionRepo {
  constructor() {
    this.sessions = new Map()
  }

  /**
   * 创建会话
   * @param {string} userId 归属用户
   * @param {"WEB" | "MINIPROGRAM"} [channel] 会话来源渠道（默认 WEB；微信授权登录传 MINIPROGRAM，Q7）
   * @returns {import('../domain/types.js').Session}
   */
  create(userId, channel = 'WEB') {
    const session = {
      token: crypto.randomUUID(),
      userId,
      channel,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    }
    this.sessions.set(session.token, session)
    return session
  }

  findByToken(token) {
    return this.sessions.get(token)
  }

  /**
   * 删除会话（退出登录销毁凭证）
   * @param {string} token 会话凭证
   * @returns {boolean} 是否存在并删除
   */
  delete(token) {
    return this.sessions.delete(token)
  }

  clear() {
    this.sessions.clear()
  }
}

/**
 * 小程序渠道配置仓储（memory 模式，story-miniprogram-channel-config）：
 * 接口与 file `ChannelConfigFileRepo` 一致（getConfig / save / clear）。
 * 默认配置 = defaultChannelConfig（appid 空 / appsecret 空 / mchid 空 / enabled=false，R-CHN-009 默认停用）。
 */
export class ChannelConfigRepo {
  constructor() {
    // 默认停用（R-CHN-009，防止未配置即开放）
    this.config = { appid: '', appsecret: '', mchid: '', enabled: false }
  }

  getConfig() {
    return this.config
  }

  save(cfg) {
    this.config = cfg
    return this.config
  }

  clear() {
    this.config = { appid: '', appsecret: '', mchid: '', enabled: false }
  }
}

/**
 * 应收账款仓储（memory 模式，story-ar-credit-customer，accounts-receivable capability）：
 * 接口与 file `ReceivableFileRepo` 一致（save / findAll / findById / findByUserId / findByOrderId / clear）。
 */
export class ReceivableRepo {
  constructor() {
    this.receivables = new Map()
  }

  save(r) {
    this.receivables.set(r.id, r)
    return r
  }

  findAll() {
    return Array.from(this.receivables.values())
  }

  findById(id) {
    return this.receivables.get(id)
  }

  findByUserId(userId) {
    return this.findAll().filter(r => r.userId === userId)
  }

  findByOrderId(orderId) {
    return this.findAll().find(r => r.orderId === orderId)
  }

  clear() {
    this.receivables.clear()
  }
}

/**
 * 回款流水仓储（memory 模式，story-ar-receipt-entry）：接口与 file 一致（save/findAll/findByReceivableId/clear）。
 */
export class ReceiptRepo {
  constructor() {
    this.receipts = new Map()
  }

  save(rcpt) {
    this.receipts.set(rcpt.id, rcpt)
    return rcpt
  }

  findAll() {
    return Array.from(this.receipts.values())
  }

  findByReceivableId(receivableId) {
    return this.findAll().filter(r => r.receivableId === receivableId)
  }

  clear() {
    this.receipts.clear()
  }
}
