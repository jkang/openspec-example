import { calculateDiscount } from '../domain/logic.js'

export class CouponService {
  constructor(couponRepo) {
    this.couponRepo = couponRepo
  }

  validate(couponId, orderTotalCents) {
    const coupon = this.couponRepo.findById(couponId)
    if (!coupon) {
      throw new Error('COUPON_NOT_FOUND')
    }

    if (coupon.status !== 'UNUSED') {
      throw new Error('COUPON_ALREADY_USED')
    }

    if (orderTotalCents < coupon.minSpendCents) {
      throw new Error('COUPON_THRESHOLD_NOT_MET')
    }
    
    return coupon
  }

  /**
   * 获取最优优惠券
   * @param {string} userId 用户ID (目前优惠券是全场通用的，但未来可能与用户绑定)
   * @param {number} orderTotalCents 订单总额
   * @returns {import("../domain/types.js").Coupon | null} 最优优惠券
   */
  getBestCoupon(userId, orderTotalCents) {
    const allCoupons = this.couponRepo.findAll()
    const availableCoupons = allCoupons.filter(c => 
      c.status === 'UNUSED' && orderTotalCents >= c.minSpendCents
    )

    if (availableCoupons.length === 0) return null

    // 计算减免金额并排序
    const ratedCoupons = availableCoupons.map(coupon => ({
      coupon,
      discount: calculateDiscount(orderTotalCents, coupon)
    }))

    // 按折扣额降序，若相同则按 ID 升序以保证确定性
    ratedCoupons.sort((a, b) => {
      if (b.discount !== a.discount) return b.discount - a.discount
      return a.coupon.id.localeCompare(b.coupon.id)
    })

    return ratedCoupons[0].coupon
  }

  redeem(couponId) {
    const coupon = this.couponRepo.findById(couponId)
    if (coupon) {
      coupon.status = 'USED'
      this.couponRepo.save(coupon)
    }
  }

  list() {
    return this.couponRepo.findAll()
  }
}
