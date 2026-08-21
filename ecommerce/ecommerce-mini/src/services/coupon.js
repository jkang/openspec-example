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
   * 候选集 = 全场通用券 (userId 为 null) + 该用户持有的券
   * @param {string} userId 用户ID
   * @param {number} orderTotalCents 订单总额
   * @returns {import("../domain/types.js").Coupon | null} 最优优惠券
   */
  getBestCoupon(userId, orderTotalCents) {
    const allCoupons = this.couponRepo.findAll()
    const availableCoupons = allCoupons.filter(c =>
      c.status === 'UNUSED'
      && orderTotalCents >= c.minSpendCents
      && ((c.userId ?? null) === null || c.userId === userId)
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

  /**
   * 列出当前用户可见的券：全场通用券 (ACTIVE 规则模板除外) + 本人持有的券
   * @param {string} [userId] 不传时仅返回全场通用券
   */
  list(userId = null) {
    return this.couponRepo.findAll().filter(c => {
      const ownerId = c.userId ?? null
      if (ownerId !== null) return ownerId === userId
      return c.status !== 'ACTIVE'
    })
  }
}
