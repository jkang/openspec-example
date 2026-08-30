import { calculateDiscount, assertOrderTransition } from '../domain/logic.js'

/** 销售统计有效状态集合（R-DASH-001/002/003）：CANCELLED / PENDING_PAYMENT 不计入任何指标 */
export const SALES_STATUSES = ['PAID', 'SHIPPED', 'COMPLETED']

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

  /**
   * 销售只读聚合查询（sales-dashboard / data-insights BC 消费，R-DASH-001~005，order-management delta spec）：
   * 过滤 `status ∈ 状态集合`（默认 PAID/SHIPPED/COMPLETED）且 `paidAt ∈ [from, to)` 的订单，
   * 返回销售指标（实付汇总/订单计数/优惠让利汇总/用券订单计数）与按日分桶的趋势序列。
   * 纯只读：不改变订单写入语义、不触发任何写操作。
   * @param {{ from: string|number|Date, to: string|number|Date, statuses?: string[], granularity?: 'day' }} [input]
   * @returns {{ salesCents: number, orderCount: number, discountCents: number, couponOrderCount: number, trend: Array<{ date: string, salesCents: number }> }}
   */
  aggregateSales({ from, to, statuses = SALES_STATUSES, granularity = 'day' } = {}) {
    const fromMs = new Date(from).getTime()
    const toMs = new Date(to).getTime()

    const matched = this.orderRepo
      .findAll()
      .filter(o => o.paidAt) // 仅已支付订单具备时间归属（R-DASH-005）
      .filter(o => statuses.includes(o.status))
      .filter(o => {
        const t = new Date(o.paidAt).getTime()
        return t >= fromMs && t < toMs
      })

    let salesCents = 0
    let discountCents = 0
    let couponOrderCount = 0
    for (const o of matched) {
      salesCents += o.actualPaidCents || 0
      discountCents += o.discountCents || 0
      if (o.couponId) couponOrderCount += 1
    }
    const orderCount = matched.length

    let trend = []
    if (granularity === 'day') {
      trend = this.buildDailyTrend(fromMs, toMs, matched)
    }

    return { salesCents, orderCount, discountCents, couponOrderCount, trend }
  }

  /**
   * 按日分桶趋势序列：从 from 所在本地日 00:00 起逐日推进至 to，
   * 每日桶 = [当日 00:00, 次日 00:00) ∩ [from, to)，累计该桶内订单实付金额。
   * 日期标签为本地时区 YYYY-MM-DD；序列合计 = 区间销售额总额。
   * @param {number} fromMs
   * @param {number} toMs
   * @param {Array<import('../domain/types.js').Order>} orders
   * @returns {Array<{ date: string, salesCents: number }>}
   */
  buildDailyTrend(fromMs, toMs, orders) {
    const DAY_MS = 24 * 60 * 60 * 1000
    const buckets = []
    const startOfDay = (ms) => {
      const d = new Date(ms)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }
    const formatDay = (ms) => {
      const d = new Date(ms)
      const mm = String(d.getMonth() + 1).padStart(2, '0')
      const dd = String(d.getDate()).padStart(2, '0')
      return `${d.getFullYear()}-${mm}-${dd}`
    }

    let cursor = startOfDay(fromMs)
    while (cursor < toMs) {
      const bucketEnd = Math.min(cursor + DAY_MS, toMs)
      let sales = 0
      for (const o of orders) {
        const t = new Date(o.paidAt).getTime()
        if (t >= cursor && t < bucketEnd) sales += o.actualPaidCents || 0
      }
      buckets.push({ date: formatDay(cursor), salesCents: sales })
      cursor += DAY_MS
    }
    return buckets
  }
}
