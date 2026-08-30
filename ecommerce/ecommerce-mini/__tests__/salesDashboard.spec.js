import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert'
import { OrderRepo, ProductRepo, CartRepo, CouponRepo } from '../src/repo/memoryRepo.js'
import { OrderService } from '../src/services/order.js'
import { CouponService } from '../src/services/coupon.js'
import { createServer } from '../src/http/server.js'

// 测试后门（reset / user-role）仅在 NODE_ENV=test 下启用
process.env.NODE_ENV = 'test'

// ==================== 只读聚合 aggregateSales（@unit，order-management delta spec） ====================

describe('order-management 只读聚合 aggregateSales（@unit）', () => {
  let orderRepo
  let orders

  beforeEach(() => {
    orderRepo = new OrderRepo()
    const productRepo = new ProductRepo()
    const cartRepo = new CartRepo()
    const couponService = new CouponService(new CouponRepo())
    orders = new OrderService(cartRepo, orderRepo, productRepo, couponService)
  })

  /** @param {Partial<import('../src/domain/types.js').Order>} o */
  const saveOrder = (o) => orderRepo.save({
    id: `o_${Math.random().toString(36).slice(2, 8)}`,
    userId: 'user_1001',
    status: 'PAID',
    totalCents: 0,
    discountCents: 0,
    actualPaidCents: 0,
    couponId: null,
    items: [],
    ...o
  })

  // 本地时间构造：趋势按本地日分桶（与 API 维度换算口径一致），跨时区测试确定性
  const localISO = (y, m, d, h = 0, min = 0, s = 0, ms = 0) =>
    new Date(y, m - 1, d, h, min, s, ms).toISOString()

  // 固定区间：本地 2026-08-01 00:00（含）~ 2026-08-08 00:00（不含），跨 7 个自然日
  const FROM = localISO(2026, 8, 1)
  const TO = localISO(2026, 8, 8)

  it('口径：仅 PAID/SHIPPED/COMPLETED 计入；CANCELLED / PENDING_PAYMENT 不计入任何指标（R-DASH-001/002/003）', () => {
    saveOrder({ status: 'PAID', paidAt: localISO(2026, 8, 2), actualPaidCents: 10000 })
    saveOrder({ status: 'SHIPPED', paidAt: localISO(2026, 8, 3), actualPaidCents: 20000 })
    saveOrder({ status: 'COMPLETED', paidAt: localISO(2026, 8, 4), actualPaidCents: 30000 })
    saveOrder({ status: 'CANCELLED', paidAt: localISO(2026, 8, 2, 6), actualPaidCents: 40000, discountCents: 4000 })
    saveOrder({ status: 'PENDING_PAYMENT', paidAt: localISO(2026, 8, 2, 7), actualPaidCents: 50000, discountCents: 5000 })
    saveOrder({ status: 'PAID' }) // 无 paidAt：无时间归属，不计入

    const agg = orders.aggregateSales({ from: FROM, to: TO })
    assert.strictEqual(agg.orderCount, 3)
    assert.strictEqual(agg.salesCents, 10000 + 20000 + 30000)
    assert.strictEqual(agg.discountCents, 0) // 被排除订单的让利不得计入
  })

  it('口径：销售额=SUM(actualPaidCents)，优惠让利=SUM(discountCents) 独立单列（R-DASH-001/002）', () => {
    saveOrder({ paidAt: localISO(2026, 8, 2), actualPaidCents: 10000, discountCents: 1000, couponId: 'C1' })
    saveOrder({ status: 'SHIPPED', paidAt: localISO(2026, 8, 3), actualPaidCents: 20000, discountCents: 0 })
    saveOrder({ status: 'COMPLETED', paidAt: localISO(2026, 8, 4), actualPaidCents: 30000, discountCents: 3000, couponId: 'C2' })

    const agg = orders.aggregateSales({ from: FROM, to: TO })
    assert.strictEqual(agg.salesCents, 10000 + 20000 + 30000) // 实付汇总，不含让利
    assert.strictEqual(agg.discountCents, 1000 + 3000) // 让利单列
    assert.strictEqual(agg.couponOrderCount, 2) // 用券订单计数
  })

  it('时间区间边界：[from, to)——paidAt=from 计入、paidAt=to 不计入（R-DASH-005）', () => {
    saveOrder({ paidAt: FROM, actualPaidCents: 10000 }) // == from → 计入
    saveOrder({ paidAt: TO, actualPaidCents: 20000 }) // == to → 不计入
    saveOrder({ paidAt: localISO(2026, 7, 31, 23, 59, 59, 999), actualPaidCents: 30000 }) // < from → 不计入
    saveOrder({ paidAt: localISO(2026, 8, 7, 23, 59, 59, 999), actualPaidCents: 40000 }) // < to → 计入

    const agg = orders.aggregateSales({ from: FROM, to: TO })
    assert.strictEqual(agg.orderCount, 2)
    assert.strictEqual(agg.salesCents, 10000 + 40000)
  })

  it('空区间返回零指标（sales/orders/discount/coupon 全 0，不报错）', () => {
    saveOrder({ paidAt: localISO(2026, 8, 2), actualPaidCents: 10000, discountCents: 1000, couponId: 'C1' })
    const agg = orders.aggregateSales({ from: localISO(2020, 1, 1), to: localISO(2020, 1, 2) })
    assert.strictEqual(agg.orderCount, 0)
    assert.strictEqual(agg.salesCents, 0)
    assert.strictEqual(agg.discountCents, 0)
    assert.strictEqual(agg.couponOrderCount, 0)
    assert.strictEqual(agg.trend.length, 1) // 区间内单日空桶
    assert.strictEqual(agg.trend[0].salesCents, 0)
  })

  it('趋势：按日分桶，序列合计 = 区间销售额总额（order-management delta spec）', () => {
    saveOrder({ paidAt: FROM, actualPaidCents: 10000 })
    saveOrder({ status: 'SHIPPED', paidAt: localISO(2026, 8, 3, 12), actualPaidCents: 20000 })
    saveOrder({ status: 'COMPLETED', paidAt: localISO(2026, 8, 5), actualPaidCents: 7000 })

    const agg = orders.aggregateSales({ from: FROM, to: TO })
    assert.strictEqual(agg.trend.length, 7) // 7 个自然日
    const sum = agg.trend.reduce((n, t) => n + t.salesCents, 0)
    assert.strictEqual(sum, agg.salesCents) // 序列合计 = 总额
    // 桶归属：08-01 计入首日、08-03 计入第 3 日、08-05 计入第 5 日
    const byDate = Object.fromEntries(agg.trend.map(t => [t.date, t.salesCents]))
    const dates = Object.keys(byDate)
    assert.strictEqual(dates[0], '2026-08-01')
    assert.strictEqual(byDate[dates[0]], 10000)
    assert.strictEqual(byDate[dates[2]], 20000)
    assert.strictEqual(byDate[dates[4]], 7000)
    assert.strictEqual(byDate[dates[6]], 0)
  })

  it('用券订单占比口径：couponOrderCount 仅计 couponId 非空成交订单', () => {
    saveOrder({ paidAt: localISO(2026, 8, 2), actualPaidCents: 10000, couponId: 'C1' })
    saveOrder({ paidAt: localISO(2026, 8, 3), actualPaidCents: 20000, couponId: '' }) // 空串不算用券
    saveOrder({ paidAt: localISO(2026, 8, 4), actualPaidCents: 30000, couponId: null })
    const agg = orders.aggregateSales({ from: FROM, to: TO })
    assert.strictEqual(agg.orderCount, 3)
    assert.strictEqual(agg.couponOrderCount, 1)
    assert.strictEqual(Math.round((agg.couponOrderCount / agg.orderCount) * 1000) / 10, 33.3)
  })
})

// ==================== 销售看板 API（@api，sales-dashboard spec） ====================
// 每个 it 独立 server 实例：保证订单/券状态互不污染（券核销与 paidAt 聚合均为跨用例状态）

/** 启动独立 server 实例，返回 base + close */
async function startServer() {
  const { server } = createServer()
  await new Promise(resolve => server.listen(0, () => resolve(undefined)))
  const address = server.address()
  const port = address && typeof address === 'object' ? address.port : 0
  return { base: `http://127.0.0.1:${port}`, close: () => server.close() }
}

describe('销售看板 API GET /api/admin/dashboard/sales（@api）', () => {
  const post = (base, path, body) => fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  const get = (base, path, headers = {}) => fetch(`${base}${path}`, { headers })

  /** 注册 → 角色后门 → 登录，返回含最新 role 的会话 */
  async function setupUser(base, phone, nickname, role) {
    await post(base, '/api/auth/register', { phone, nickname, password: '123456' })
    const roleRes = await post(base, '/api/__test/user-role', { phone, role })
    assert.strictEqual(roleRes.status, 200)
    const login = await post(base, '/api/auth/login', { phone, password: '123456' })
    assert.strictEqual(login.status, 201)
    const body = await login.json()
    return {
      user: body.user,
      authHeaders: { 'Content-Type': 'application/json', Authorization: `Bearer ${body.sessionToken}` }
    }
  }

  /** 注册买家 → 加购 → 下单 → 支付，返回已支付订单（paidAt=now） */
  async function createPaidOrder(base, phone, nickname, productId, quantity = 1) {
    const auth = await setupUser(base, phone, nickname, '客户')
    await fetch(`${base}/api/cart/items`, {
      method: 'POST', headers: auth.authHeaders, body: JSON.stringify({ productId, quantity })
    })
    const order = await (await fetch(`${base}/api/orders`, {
      method: 'POST', headers: auth.authHeaders, body: JSON.stringify({})
    })).json()
    const payRes = await post(base, `/api/payments/${order.id}`)
    assert.strictEqual(payRes.status, 200)
    return payRes.json()
  }

  it('运营角色：看板 200 返回指标与趋势（与今日订单一致，R-DASH-001/002/004）', async () => {
    const { base, close } = await startServer()
    try {
      // 商品 1（29900 元）命中种子券自动最优方案 PERCENT9（9 折让利 2990）
      const paid = await createPaidOrder(base, '13800001001', '看板买家甲', '1')
      assert.strictEqual(paid.couponId, 'PERCENT9')
      assert.strictEqual(paid.discountCents, 2990)
      assert.strictEqual(paid.actualPaidCents, 26910)

      const operator = await setupUser(base, '13600001001', '看板运营', '运营')
      const res = await get(base, '/api/admin/dashboard/sales?dimension=today', operator.authHeaders)
      assert.strictEqual(res.status, 200)
      const body = await res.json()
      assert.strictEqual(body.metrics.sales, paid.actualPaidCents)
      assert.strictEqual(body.metrics.orders, 1)
      assert.strictEqual(body.metrics.avgOrder, paid.actualPaidCents) // 客单价 = 销售额 ÷ 订单量
      assert.strictEqual(body.metrics.discount, paid.discountCents) // 让利单列
      assert.strictEqual(body.coupon.discountCents, paid.discountCents)
      assert.strictEqual(body.coupon.couponOrders, 1)
      assert.strictEqual(body.coupon.ratio, 100)
      assert.strictEqual(body.trend.length, 1) // 今日 1 桶
      assert.strictEqual(body.trend[0].salesCents, paid.actualPaidCents)
      assert.strictEqual(body.range.dimension, 'today')
    } finally {
      close()
    }
  })

  it('老板角色：看板 200，但用户管理列表/状态变更均 403（R-DASH-006 老板只读）', async () => {
    const { base, close } = await startServer()
    try {
      const boss = await setupUser(base, '13600001002', '老板王总', '老板')
      const dashRes = await get(base, '/api/admin/dashboard/sales', boss.authHeaders)
      assert.strictEqual(dashRes.status, 200)
      assert.ok((await dashRes.json()).metrics)

      const usersRes = await get(base, '/api/admin/users', boss.authHeaders)
      assert.strictEqual(usersRes.status, 403)
      const patch = await fetch(`${base}/api/admin/users/user_1001/status`, {
        method: 'PATCH',
        headers: boss.authHeaders,
        body: JSON.stringify({ status: '禁用' })
      })
      assert.strictEqual(patch.status, 403)
      assert.strictEqual((await patch.json()).code, 'FORBIDDEN')
    } finally {
      close()
    }
  })

  it('客服角色：看板 403 且响应不含任何销售数据', async () => {
    const { base, close } = await startServer()
    try {
      const service = await setupUser(base, '13600001003', '客服小李', '客服')
      const res = await get(base, '/api/admin/dashboard/sales', service.authHeaders)
      assert.strictEqual(res.status, 403)
      const raw = await res.text()
      assert.strictEqual(JSON.parse(raw).code, 'FORBIDDEN')
      assert.ok(!raw.includes('metrics'), '响应不得包含销售指标')
      assert.ok(!raw.includes('trend'), '响应不得包含趋势数据')
      assert.ok(!raw.includes('actualPaidCents'))
    } finally {
      close()
    }
  })

  it('未登录访问看板 403（不区分未登录与越权，防探测）', async () => {
    const { base, close } = await startServer()
    try {
      const res = await get(base, '/api/admin/dashboard/sales')
      assert.strictEqual(res.status, 403)
      assert.strictEqual((await res.json()).code, 'FORBIDDEN')
    } finally {
      close()
    }
  })

  it('空数据区间返回零指标（200 不报错）', async () => {
    const { base, close } = await startServer()
    try {
      const operator = await setupUser(base, '13600001004', '空区间运营', '运营')
      const res = await get(
        base,
        `/api/admin/dashboard/sales?from=${encodeURIComponent('2020-01-01T00:00:00.000Z')}&to=${encodeURIComponent('2020-01-02T00:00:00.000Z')}`,
        operator.authHeaders
      )
      assert.strictEqual(res.status, 200)
      const body = await res.json()
      assert.strictEqual(body.metrics.sales, 0)
      assert.strictEqual(body.metrics.orders, 0)
      assert.strictEqual(body.metrics.avgOrder, 0)
      assert.strictEqual(body.metrics.discount, 0)
      assert.strictEqual(body.coupon.couponOrders, 0)
      assert.strictEqual(body.coupon.ratio, 0)
      assert.strictEqual(body.trend.reduce((n, t) => n + t.salesCents, 0), 0)
    } finally {
      close()
    }
  })

  it('维度换算：today/week/month 与默认近7日返回对应区间与趋势桶数（R-DASH-008）', async () => {
    const { base, close } = await startServer()
    try {
      const operator = await setupUser(base, '13600001005', '维度运营', '运营')
      const defaults = await (await get(base, '/api/admin/dashboard/sales', operator.authHeaders)).json()
      assert.strictEqual(defaults.range.dimension, 'week') // 默认近7日

      const today = await (await get(base, '/api/admin/dashboard/sales?dimension=today', operator.authHeaders)).json()
      assert.strictEqual(today.range.dimension, 'today')
      assert.strictEqual(today.trend.length, 1)

      const week = await (await get(base, '/api/admin/dashboard/sales?dimension=week', operator.authHeaders)).json()
      assert.strictEqual(week.range.dimension, 'week')
      assert.strictEqual(week.trend.length, 7)

      const month = await (await get(base, '/api/admin/dashboard/sales?dimension=month', operator.authHeaders)).json()
      assert.strictEqual(month.range.dimension, 'month')
      assert.strictEqual(month.trend.length, 30)

      // 区间左闭右开：from < to
      const fromMs = new Date(week.range.from).getTime()
      const toMs = new Date(week.range.to).getTime()
      assert.ok(fromMs < toMs)
    } finally {
      close()
    }
  })

  it('多订单聚合：运营角色看板近7日 = 两笔实付之和，coupon 占比正确', async () => {
    const { base, close } = await startServer()
    try {
      const a = await createPaidOrder(base, '13800001002', '看板买家乙', '1') // 商品 1（PERCENT9 最优）
      const b = await createPaidOrder(base, '13800001003', '看板买家丙', '2') // 商品 2（PERCENT9 已核销 → FLAT10）
      const expectedSales = a.actualPaidCents + b.actualPaidCents
      const expectedDiscount = a.discountCents + b.discountCents

      const operator = await setupUser(base, '13600001006', '聚合运营', '运营')
      const res = await get(base, '/api/admin/dashboard/sales?dimension=week', operator.authHeaders)
      assert.strictEqual(res.status, 200)
      const body = await res.json()
      assert.strictEqual(body.metrics.sales, expectedSales)
      assert.strictEqual(body.metrics.orders, 2)
      assert.strictEqual(body.metrics.avgOrder, Math.round(expectedSales / 2))
      assert.strictEqual(body.metrics.discount, expectedDiscount)
      assert.strictEqual(body.coupon.couponOrders, 2)
      assert.strictEqual(body.coupon.ratio, 100)
      const trendSum = body.trend.reduce((n, t) => n + t.salesCents, 0)
      assert.strictEqual(trendSum, body.metrics.sales)
    } finally {
      close()
    }
  })
})
