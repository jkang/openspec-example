import { assertUserStatusValue } from '../domain/logic.js'
import { assertCreditDays } from './accountsReceivable.js'

/**
 * B 端用户管理服务：用户列表/检索/详情（订单聚合）/禁用启用（HTTP → Service → Domain → Repo 单向依赖）
 * 归属治理边界：User Context（user-admin 新增 taxonomy）；只读消费 Order Context 的 Order.userId 归属事实
 */
export class AdminUserService {
  /**
   * @param {any} userRepo
   * @param {any} orderRepo
   */
  constructor(userRepo, orderRepo) {
    this.userRepo = userRepo
    this.orderRepo = orderRepo
  }

  /**
   * 用户订单数聚合（按 Order.userId 归属匹配）
   * @param {string} userId
   * @returns {number} 该用户订单总数
   */
  orderCount(userId) {
    /** @param {import('../domain/types.js').Order} o */
    return this.orderRepo.findAll().filter(o => o.userId === userId).length
  }

  /**
   * 用户列表：注册时间倒序 + 订单数聚合 + 手机号/昵称关键词过滤（R-ADM-002/003）
   * 空/空白关键词返回全量；响应脱敏（不含 passwordHash）
   * @param {{ keyword?: string }} [input]
   * @returns {Array<{ id: string, nickname: string, phone: string, orderCount: number, createdAt: string, status: string, role?: string }>}
   */
  list({ keyword } = {}) {
    const k = keyword && String(keyword).trim()
    const users = this.userRepo.findAll()
      .map(u => ({
        id: u.id,
        nickname: u.nickname,
        phone: u.phone,
        orderCount: this.orderCount(u.id),
        createdAt: u.createdAt,
        status: u.status,
        role: u.role,
        creditDays: Number(u.creditDays) || 0
      }))
      .filter(u => !k || u.phone.includes(k) || u.nickname.toLowerCase().includes(k.toLowerCase()))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))

    return users
  }

  /**
   * 用户详情：基础信息 + 该用户订单聚合（按创建时间倒序，R-ADM-004）
   * @param {string} id 用户 ID
   * @returns {{ id: string, nickname: string, phone: string, createdAt: string, status: string, role?: string, orders: Array<object> }}
   * @throws {Error} USER_NOT_FOUND 用户不存在
   */
  getDetail(id) {
    const user = this.userRepo.findById(id)
    if (!user) throw new Error('USER_NOT_FOUND')

    const orders = this.orderRepo.findAll()
      .filter(o => o.userId === user.id)
      .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))

    return {
      id: user.id,
      nickname: user.nickname,
      phone: user.phone,
      createdAt: user.createdAt,
      status: user.status,
      role: user.role,
      creditDays: Number(user.creditDays) || 0,
      orders
    }
  }

  /**
   * 配置客户账期（story-ar-credit-customer，R-AR-001）：0~365 整数
   * @param {string} id 用户 ID
   * @param {number} creditDays 账期天数（0=现结）
   * @returns {{ id: string, nickname: string, creditDays: number }}
   * @throws {Error} INVALID_CREDIT_DAYS 账期非法
   * @throws {Error} USER_NOT_FOUND 用户不存在
   */
  setCreditDays(id, creditDays) {
    const days = assertCreditDays(creditDays)
    const user = this.userRepo.findById(id)
    if (!user) throw new Error('USER_NOT_FOUND')
    user.creditDays = days
    this.userRepo.save(user)
    return { id: user.id, nickname: user.nickname, creditDays: days }
  }

  /**
   * 禁用/启用用户：状态 `正常` ↔ `禁用`（R-ADM-005/006），幂等
   * @param {string} id 用户 ID
   * @param {"正常" | "禁用"} status 目标状态
   * @returns {{ id: string, nickname: string, status: string }}
   * @throws {Error} INVALID_STATUS 状态值非法
   * @throws {Error} USER_NOT_FOUND 用户不存在
   */
  setStatus(id, status) {
    assertUserStatusValue(status)
    const user = this.userRepo.findById(id)
    if (!user) throw new Error('USER_NOT_FOUND')
    user.status = status
    this.userRepo.save(user)
    return { id: user.id, nickname: user.nickname, status: user.status }
  }
}
