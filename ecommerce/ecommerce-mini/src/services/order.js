import { calculateDiscount, assertOrderTransition } from '../domain/logic.js'

export class OrderService {
  constructor(cartRepo, orderRepo, productRepo, couponService) {
    this.cartRepo = cartRepo
    this.orderRepo = orderRepo
    this.productRepo = productRepo
    this.couponService = couponService
  }

  createOrder(userId, couponId = null) {
    const cart = this.cartRepo.findByUserId(userId)
    if (!cart || cart.items.length === 0) {
      throw new Error('CART_EMPTY')
    }

    // 1. Validate stock and calculate subtotal (不扣减库存)
    let subtotalCents = 0
    const orderItems = []

    for (const item of cart.items) {
      const product = this.productRepo.findById(item.productId)
      if (!product) throw new Error(`Product ${item.productId} not found`)
      if (product.stock < item.quantity) throw new Error('OUT_OF_STOCK')

      subtotalCents += product.priceCents * item.quantity
      orderItems.push({
        productId: item.productId,
        name: product.name,
        priceCents: product.priceCents,
        quantity: item.quantity
      })
    }

    // 2. Coupon Validation & Calculation（不核销优惠券）
    let effectiveCouponId = couponId
    let discountCents = 0

    if (!effectiveCouponId) {
      const bestCoupon = this.couponService.getBestCoupon(userId, subtotalCents)
      if (bestCoupon) {
        effectiveCouponId = bestCoupon.id
      }
    }

    if (effectiveCouponId) {
      const coupon = this.couponService.validate(effectiveCouponId, subtotalCents)
      discountCents = calculateDiscount(subtotalCents, coupon)
    }

    const actualPaidCents = Math.max(0, subtotalCents - discountCents)

    // 3. Create Order（不扣库存、不核销券，等待支付成功）
    const order = {
      id: `order_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      status: 'PENDING_PAYMENT',
      totalCents: subtotalCents,
      discountCents,
      actualPaidCents,
      couponId: effectiveCouponId,
      items: orderItems,
      createdAt: new Date().toISOString()
    }
    this.orderRepo.save(order)

    // 4. Clear Cart
    this.cartRepo.save({ userId, items: [] })

    return order
  }

  checkout(userId, couponId = null) {
    return this.createOrder(userId, couponId)
  }

  /** 取消订单：仅 PENDING_PAYMENT → CANCELLED（未扣库存/未核销券，无释放动作） */
  cancelOrder(orderId) {
    const order = this.orderRepo.findById(orderId)
    if (!order) throw new Error('ORDER_NOT_FOUND')
    if (order.status !== 'PENDING_PAYMENT') throw new Error('ORDER_NOT_CANCELLABLE')
    assertOrderTransition(order.status, 'CANCELLED')
    order.status = 'CANCELLED'
    this.orderRepo.save(order)
    return order
  }

  /** 发货：PAID → SHIPPED */
  markShipped(orderId) {
    const order = this.orderRepo.findById(orderId)
    if (!order) throw new Error('ORDER_NOT_FOUND')
    assertOrderTransition(order.status, 'SHIPPED')
    order.status = 'SHIPPED'
    this.orderRepo.save(order)
    return order
  }

  /** 完成：SHIPPED → COMPLETED */
  markCompleted(orderId) {
    const order = this.orderRepo.findById(orderId)
    if (!order) throw new Error('ORDER_NOT_FOUND')
    assertOrderTransition(order.status, 'COMPLETED')
    order.status = 'COMPLETED'
    this.orderRepo.save(order)
    return order
  }

  /** B 端订单列表：状态过滤（白名单）+ 关键词搜索（订单号/用户 ID） */
  listAdmin({ status, keyword } = {}) {
    let orders = this.orderRepo.findAll()

    if (status && status !== 'ALL') {
      orders = orders.filter(o => o.status === status)
    }

    if (keyword && String(keyword).trim()) {
      const k = String(keyword).trim().toLowerCase()
      orders = orders.filter(o =>
        o.id.toLowerCase().includes(k) || o.userId.toLowerCase().includes(k)
      )
    }

    return orders
  }

  /** C 端按用户查询订单：仅返回该用户订单，按创建时间倒序（同毫秒按保存顺序倒序） */
  listByUser(userId) {
    return this.orderRepo
      .findAll()
      .map((order, index) => ({ order, index }))
      .filter(x => x.order.userId === userId)
      .sort((a, b) => {
        const ta = a.order.createdAt || ''
        const tb = b.order.createdAt || ''
        if (ta !== tb) return tb.localeCompare(ta)
        return b.index - a.index // createdAt 相同（同毫秒）时，后保存的在前
      })
      .map(x => x.order)
  }
}
