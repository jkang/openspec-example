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
