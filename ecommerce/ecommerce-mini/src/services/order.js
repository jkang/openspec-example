import { calculateDiscount } from '../domain/logic.js'

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

    // 1. Validate stock and calculate subtotal
    let subtotalCents = 0
    const orderItems = []

    for (const item of cart.items) {
      const product = this.productRepo.findById(item.productId)
      if (!product) throw new Error(`Product ${item.productId} not found`)
      if (product.stock < item.quantity) throw new Error('OUT_OF_STOCK')
      
      subtotalCents += product.priceCents * item.quantity
      orderItems.push({
        productId: item.productId,
        priceCents: product.priceCents,
        quantity: item.quantity
      })
    }

    // 2. Coupon Validation & Calculation
    let effectiveCouponId = couponId
    let discountCents = 0

    // 如果没传 couponId，尝试自动推荐最优券
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

    // 3. Deduct stock (Simulated Transaction)
    for (const item of cart.items) {
      const product = this.productRepo.findById(item.productId)
      product.stock -= item.quantity
      this.productRepo.save(product)
    }

    // 4. Create Order
    const order = {
      id: `order_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      status: 'PENDING_PAYMENT',
      totalCents: subtotalCents, // 订单总额记录商品总额
      discountCents,
      actualPaidCents,
      couponId: effectiveCouponId,
      items: orderItems
    }
    this.orderRepo.save(order)

    // 5. Redeem Coupon
    if (effectiveCouponId) {
      this.couponService.redeem(effectiveCouponId)
    }

    // 6. Clear Cart
    this.cartRepo.save({ userId, items: [] })

    return order
  }

  checkout(userId, couponId = null) {
    return this.createOrder(userId, couponId)
  }
}
