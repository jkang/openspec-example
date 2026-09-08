/**
 * 应收账款服务（story-ar-credit-customer / accounts-receivable capability / Order Context 扩展）
 *
 * 职责边界（Service 层）：
 * - `onOrderShipped(order)`：订单履约（SHIPPED）时若归属用户为账期客户（creditDays>0）→
 *   自动生成应收（amountCents=order.actualPaidCents、dueDate=发货日+creditDays、receivedCents=0）；
 *   现结客户（creditDays=0）不生成（R-AR-004）。一单一应收（findByOrderId 幂等防重）。
 * - 应收读取辅助（listByUserId / 状态与逾期推导口径），供回款/看板 Story 复用。
 * 金额全程 priceCents 整型分（R-AR-005）；dueDate 为 YYYY-MM-DD。
 */
export class AccountsReceivableService {
  /**
   * @param {any} receivableRepo 应收仓储
   * @param {any} userRepo 用户仓储（读 creditDays）
   */
  constructor(receivableRepo, userRepo, receiptRepo = null) {
    this.receivableRepo = receivableRepo
    this.userRepo = userRepo
    this.receiptRepo = receiptRepo
  }

  /**
   * 订单发货 → 账期客户自动生成应收（R-AR-003）。现结客户无操作。
   * @param {import('../domain/types.js').Order} order 已置 SHIPPED 的订单
   * @returns {import('../domain/types.js').Receivable | null} 生成的应收或 null（现结客户/重复）
   */
  onOrderShipped(order) {
    const user = this.userRepo.findById(order.userId)
    const creditDays = Number(user && user.creditDays) || 0
    if (!user || creditDays <= 0) return null // 现结客户：不生成应收（R-AR-004）
    if (this.receivableRepo.findByOrderId(order.id)) return null // 幂等防重（一单一应收）

    const shippedAt = order.shippedAt || order.updatedAt || order.createdAt || new Date().toISOString()
    const receivable = {
      id: `ar_${Math.random().toString(36).substr(2, 9)}`,
      userId: order.userId,
      orderId: order.id,
      amountCents: order.actualPaidCents || 0,
      receivedCents: 0,
      dueDate: addDaysYMD(shippedAt, creditDays),
      createdAt: new Date().toISOString()
    }
    this.receivableRepo.save(receivable)
    return receivable
  }

  /**
   * 应收单视图：补 已回合计/剩余/结清/逾期 派生字段（回款/看板 Story 复用）
   * @param {import('../domain/types.js').Receivable} r
   * @param {number} received 该单已回合计（由回款登记汇总传入；本文件默认读 r.receivedCents）
   * @returns {object} 带派生字段的应收视图
   */
  toView(r, received) {
    const got = typeof received === 'number' ? received : (r.receivedCents || 0)
    const balance = (r.amountCents || 0) - got
    const today = new Date().toISOString().slice(0, 10)
    return Object.assign({}, r, {
      receivedCents: got,
      balance,
      settled: balance <= 0,
      overdue: balance > 0 && r.dueDate < today
    })
  }

  listByUserId(userId) {
    return this.receivableRepo.findByUserId(userId)
  }

  /**
   * 应收只读聚合（story-ar-dashboard，R-AR-201~203，纯只读）：
   * 总应收/已回/未回余额/逾期金额 + 客户欠款集中度。逾期 = 到期日已过且剩余>0。
   * @returns {{ totalCents: number, receivedCents: number, balanceCents: number, overdueCents: number, byCustomer: Array<object> }}
   */
  summary() {
    const views = this.listAll('ALL') // 含 customer 昵称与派生字段
    const users = this.userRepo.findAll()
    const creditById = Object.fromEntries(users.map(u => [u.id, Number(u.creditDays) || 0]))
    const totalCents = views.reduce((n, r) => n + r.amountCents, 0)
    const receivedCents = views.reduce((n, r) => n + r.receivedCents, 0)
    const balanceCents = views.reduce((n, r) => n + r.balance, 0)
    const overdueCents = views.reduce((n, r) => (r.overdue ? n + r.balance : n), 0)
    const byUser = {}
    views.forEach(r => {
      if (!byUser[r.userId]) byUser[r.userId] = { userId: r.userId, nickname: r.customer, count: 0, balanceCents: 0, overdueCents: 0, creditDays: creditById[r.userId] || 0 }
      byUser[r.userId].count += 1
      byUser[r.userId].balanceCents += r.balance
      if (r.overdue) byUser[r.userId].overdueCents += r.balance
    })
    return {
      totalCents,
      receivedCents,
      balanceCents,
      overdueCents,
      byCustomer: Object.values(byUser).sort((a, b) => b.balanceCents - a.balanceCents)
    }
  }

  /**
   * 应收单全量视图（B 端，运营/老板）：每单补 客户昵称 + 已回/剩余/结清/逾期 派生字段。
   * @param {string} [statusFilter] ALL|OPEN(未结清)|OVERDUE|SETTLED
   * @returns {Array<object>} 视图列表（含 customer 昵称）
   */
  listAll(statusFilter = 'ALL') {
    const users = this.userRepo.findAll()
    const byId = Object.fromEntries(users.map(u => [u.id, u]))
    let list = this.receivableRepo.findAll().map(r => {
      const v = this.toView(r, r.receivedCents)
      return Object.assign(v, { customer: byId[r.userId] ? byId[r.userId].nickname : r.userId })
    })
    if (statusFilter === 'OPEN') list = list.filter(r => !r.settled)
    else if (statusFilter === 'OVERDUE') list = list.filter(r => r.overdue)
    else if (statusFilter === 'SETTLED') list = list.filter(r => r.settled)
    return list
  }

  /**
   * 回款登记（R-AR-102/103，仅运营写）：金额 >0 且 ≤ 剩余 → Receipt 流水 + receivedCents 累加。
   * @param {string} receivableId 应收 ID
   * @param {number} amountCents 回款金额（分整型）
   * @param {string} operator 操作人用户 ID
   * @returns {object} 更新后应收视图
   * @throws {Error} RECEIVABLE_NOT_FOUND / INVALID_RECEIPT_AMOUNT / RECEIVABLE_SETTLED
   */
  recordReceipt(receivableId, amountCents, operator) {
    const r = this.receivableRepo.findById(receivableId)
    if (!r) throw new Error('RECEIVABLE_NOT_FOUND')
    const amt = Number(amountCents)
    if (!Number.isInteger(amt) || amt <= 0) throw new Error('INVALID_RECEIPT_AMOUNT')
    const balance = (r.amountCents || 0) - (r.receivedCents || 0)
    if (balance <= 0) throw new Error('RECEIVABLE_SETTLED')
    if (amt > balance) throw new Error('INVALID_RECEIPT_AMOUNT')
    if (this.receiptRepo) {
      this.receiptRepo.save({
        id: `rcpt_${Math.random().toString(36).substr(2, 9)}`,
        receivableId,
        amountCents: amt,
        recordedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
        operator
      })
    }
    r.receivedCents = (r.receivedCents || 0) + amt
    this.receivableRepo.save(r)
    return this.toView(r, r.receivedCents)
  }
}

/**
 * ISO 日期 + N 天 → YYYY-MM-DD（本地时区日切）
 * @param {string} iso ISO 8601 时间
 * @param {number} days 天数
 * @returns {string} YYYY-MM-DD
 */
export function addDaysYMD(iso, days) {
  const d = new Date(iso)
  d.setDate(d.getDate() + Number(days))
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 客户账期校验：0~365 整数
 * @param {number} creditDays
 * @throws {Error} INVALID_CREDIT_DAYS
 */
export function assertCreditDays(creditDays) {
  const n = Number(creditDays)
  if (!Number.isInteger(n) || n < 0 || n > 365) throw new Error('INVALID_CREDIT_DAYS')
  return n
}
