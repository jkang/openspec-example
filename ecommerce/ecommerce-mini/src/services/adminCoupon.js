import { validateCouponRule, validateIssue } from '../domain/logic.js'

const formatTime = (date) => {
  const pad = (n) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export class AdminCouponService {
  constructor(couponRepo, issuanceRepo) {
    this.couponRepo = couponRepo
    this.issuanceRepo = issuanceRepo
  }

  nextTemplateId() {
    const ruleCount = this.couponRepo.findAll().filter(c => (c.userId ?? null) === null).length
    let n = ruleCount + 1
    let id = `CPN-${String(n).padStart(3, '0')}`
    while (this.couponRepo.findById(id)) {
      n += 1
      id = `CPN-${String(n).padStart(3, '0')}`
    }
    return id
  }

  /**
   * 创建券规则，创建即 ACTIVE
   * @param {{ name: string, type: "FLAT" | "PERCENTAGE", value: number, minSpendCents: number, expiryDate?: string }} rule
   * @returns {import("../domain/types.js").Coupon}
   */
  create(rule) {
    validateCouponRule(rule)
    const coupon = /** @type {import("../domain/types.js").Coupon} */ ({
      id: this.nextTemplateId(),
      name: rule.name,
      type: rule.type,
      value: rule.value,
      minSpendCents: rule.minSpendCents ?? 0,
      expiryDate: rule.expiryDate ?? null,
      status: 'ACTIVE',
      userId: null
    })
    this.couponRepo.save(coupon)
    return coupon
  }

  /**
   * 券规则列表（全场通用券，非发放实例），含 issuedCount 聚合
   */
  list() {
    return this.couponRepo.findAll()
      .filter(c => (c.userId ?? null) === null)
      .map(c => ({ ...c, issuedCount: this.couponRepo.countByTemplateId(c.id) }))
  }

  /**
   * 单人发放：以模板为蓝本生成用户归属实例 + 沉淀发放记录
   * @param {string} templateId
   * @param {string} userId
   * @param {string} [operator]
   * @returns {{ instance: import("../domain/types.js").Coupon, issuance: import("../domain/types.js").Issuance }}
   */
  issue(templateId, userId, operator = '王琳') {
    const template = this.couponRepo.findById(templateId)
    if (!template) {
      throw new Error('COUPON_NOT_FOUND')
    }
    validateIssue(template, userId, this.couponRepo.findAll())

    const instance = /** @type {import("../domain/types.js").Coupon} */ ({
      id: `${templateId}-${this.couponRepo.countByTemplateId(templateId) + 1}`,
      name: template.name,
      type: template.type,
      value: template.value,
      minSpendCents: template.minSpendCents,
      expiryDate: template.expiryDate ?? null,
      status: 'UNUSED',
      userId,
      templateId
    })
    this.couponRepo.save(instance)

    const issuance = {
      id: `ISS-${Date.now()}`,
      time: formatTime(new Date()),
      couponId: templateId,
      couponName: template.name,
      userId,
      operator
    }
    this.issuanceRepo.save(issuance)

    return { instance, issuance }
  }

  /**
   * 最近发放记录（最新在前）
   */
  listIssuances() {
    return this.issuanceRepo.findAll().slice().reverse()
  }
}
