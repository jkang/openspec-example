import { assertOrderTransition } from '../domain/logic.js'

/**
 * 模拟支付服务：支付成功后扣减库存、核销优惠券、推进订单状态
 */
export class PaymentService {
  constructor(orderRepo, productRepo, couponService) {
    this.orderRepo = orderRepo
    this.productRepo = productRepo
    this.couponService = couponService
  }

  /**
   * 支付订单
   * @param {string} orderId
   * @returns {import('../domain/types.js').Order}
   * @throws {Error} ORDER_NOT_FOUND 订单不存在
   * @throws {Error} ORDER_ALREADY_PAID 已支付（幂等提示）
   * @throws {Error} OUT_OF_STOCK 支付时库存不足（订单保持 PENDING_PAYMENT）
   */
  pay(orderId) {
    const order = this.orderRepo.findById(orderId)
    if (!order) throw new Error('ORDER_NOT_FOUND')
    if (order.status === 'PAID') throw new Error('ORDER_ALREADY_PAID')
    assertOrderTransition(order.status, 'PAID')

    // 支付时二次校验库存（下单后可能被其他订单扣光）
    for (const item of order.items) {
      const product = this.productRepo.findById(item.productId)
      if (!product) throw new Error('PRODUCT_NOT_FOUND')
      if (product.stock < item.quantity) throw new Error('OUT_OF_STOCK')
    }

    // 扣减库存
    for (const item of order.items) {
      const product = this.productRepo.findById(item.productId)
      product.stock -= item.quantity
      this.productRepo.save(product)
    }

    // 核销优惠券
    if (order.couponId) {
      this.couponService.redeem(order.couponId)
    }

    // 推进状态：写入支付时间（paidAt）作为销售看板时间归属基准（R-DASH-005）
    order.status = 'PAID'
    order.paidAt = new Date().toISOString()
    this.orderRepo.save(order)
    return order
  }
}
