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
}

export class SessionRepo {
  constructor() {
    this.sessions = new Map()
  }

  /**
   * 创建会话
   * @param {string} userId 归属用户
   * @returns {import('../domain/types.js').Session}
   */
  create(userId) {
    const session = {
      token: crypto.randomUUID(),
      userId,
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
}
