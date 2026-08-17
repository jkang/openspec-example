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

    if (orderTotalCents < coupon.thresholdCents) {
      throw new Error('COUPON_THRESHOLD_NOT_MET')
    }

    // 可选：有效期校验（此处简化，假设都在有效期内，或者后续扩展）
    
    return coupon
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
