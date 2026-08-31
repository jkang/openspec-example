import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import {
  OrderRepo,
  ProductRepo,
  CartRepo,
  CouponRepo,
  StockConfigRepo
} from '../src/repo/memoryRepo.js'
import { StockConfigFileRepo } from '../src/repo/fileRepo.js'
import { OrderService } from '../src/services/order.js'
import { CouponService } from '../src/services/coupon.js'
import { StockInsightService } from '../src/services/stockInsight.js'
import { createServer } from '../src/http/server.js'
import {
  resolveEffectiveThreshold,
  isStockWarning,
  daysToSellout,
  isOversellRisk,
  sortStockWarning,
  suggestReplenish,
  assertThresholdValue
} from '../src/domain/stock.js'

// 测试后门（reset / user-role）仅在 NODE_ENV=test 下启用
process.env.NODE_ENV = 'test'

// ==================== 领域纯函数（@unit，src/domain/stock.js，R-STOCK-001~010） ====================

describe('库存洞察领域纯函数（@unit）', () => {
  it('有效阈值：覆盖优先于全局默认（R-STOCK-005）', () => {
    assert.strictEqual(resolveEffectiveThreshold('5', { '5': 15 }, 10), 15)
    assert.strictEqual(resolveEffectiveThreshold('6', { '5': 15 }, 10), 10)
    assert.strictEqual(resolveEffectiveThreshold('6', {}, 10), 10)
    assert.strictEqual(resolveEffectiveThreshold(5, { 5: 12 }, 10), 12) // 数字键归一
  })

  it('入列判定：stock ≤ 有效阈值 入列；stock=0 恒入列（R-STOCK-001/002）', () => {
    assert.strictEqual(isStockWarning(8, 10), true)
    assert.strictEqual(isStockWarning(10, 10), true)
    assert.strictEqual(isStockWarning(15, 10), false)
    assert.strictEqual(isStockWarning(0, 10), true)
    assert.strictEqual(isStockWarning(0, 0), true) // 已售罄恒入列
    assert.strictEqual(isStockWarning(5, 0), false)
  })

  it('预计售罄天数：stock/dailyAvg；无销量 null；已售罄 0（R-STOCK-003 底座）', () => {
    assert.strictEqual(daysToSellout(3, 1.2), 2.5)
    assert.strictEqual(daysToSellout(8, 2.0), 4)
    assert.strictEqual(daysToSellout(5, 0.3), 16.666666666666668)
    assert.strictEqual(daysToSellout(15, 0), null) // 无销量
    assert.strictEqual(daysToSellout(0, 4.0), 0) // 已售罄
  })

  it('超卖风险判定：预计售罄天数 < 7 天 → risk；≥7 无风险；stock=0 无风险（R-STOCK-003）', () => {
    assert.strictEqual(isOversellRisk(3, 1.2), true) // 2.5 天 < 7
    assert.strictEqual(isOversellRisk(8, 2.0), true) // 4 天 < 7
    assert.strictEqual(isOversellRisk(5, 0.3), false) // 16.7 天 ≥ 7
    assert.strictEqual(isOversellRisk(0, 4.0), false) // 已售罄不置风险
    assert.strictEqual(isOversellRisk(3, 0), false) // 无销量无风险
    assert.strictEqual(isOversellRisk(15, 1), false) // 15 天 ≥ 7
  })

  it('建议补货量：max(0, ⌈dailyAvg×7⌉ − stock) 逐项吻合（R-STOCK-104）', () => {
    assert.strictEqual(suggestReplenish(3, 1.2), 6) // ⌈1.2×7⌉−3 = 9−3（键盘）
    assert.strictEqual(suggestReplenish(8, 2.0), 6) // 14−8（鼠标）
    assert.strictEqual(suggestReplenish(0, 4.0), 28) // 28−0（收纳架已售罄）
    assert.strictEqual(suggestReplenish(5, 0.3), 0) // ⌈0.3×7⌉−5 = max(0,−2)（显示器）
    assert.strictEqual(suggestReplenish(5, 0), 0) // 无销量天然落 0（R-STOCK-105）
    assert.strictEqual(suggestReplenish(0, 0), 0) // 无销量 + 售罄 → 0（不特判）
    assert.strictEqual(suggestReplenish(100, 5), 0) // 库存充足 → 0
  })

  it('排序：已售罄置顶 → 天数升序 → 无销量（null）置底（R-STOCK-010）', () => {
    const rows = [
      { productId: '3', stock: 5, daysToSellout: 16.7 },
      { productId: '7', stock: 6, daysToSellout: null }, // 无销量置底
      { productId: '1', stock: 3, daysToSellout: 2.5 },
      { productId: '4', stock: 0, daysToSellout: 0 }, // 已售罄置顶
      { productId: '2', stock: 8, daysToSellout: 4 }
    ]
    const sorted = sortStockWarning(rows)
    assert.deepStrictEqual(sorted.map(r => r.productId), ['4', '1', '2', '3', '7'])
    // 不修改入参
    assert.strictEqual(rows[0].productId, '3')
  })

  it('排序：同序（同售罄天数）按 productId 字典序确定性兜底', () => {
    const sorted = sortStockWarning([
      { productId: 'b', stock: 5, daysToSellout: 3 },
      { productId: 'a', stock: 5, daysToSellout: 3 }
    ])
    assert.deepStrictEqual(sorted.map(r => r.productId), ['a', 'b'])
  })

  it('阈值校验：负数 / 非数字 / 非整数 → INVALID_THRESHOLD（R-STOCK-006/007）', () => {
    assert.doesNotThrow(() => assertThresholdValue(0))
    assert.doesNotThrow(() => assertThresholdValue(10))
    assert.throws(() => assertThresholdValue(-1), /INVALID_THRESHOLD/)
    assert.throws(() => assertThresholdValue(1.5), /INVALID_THRESHOLD/)
    assert.throws(() => assertThresholdValue('10'), /INVALID_THRESHOLD/)
    assert.throws(() => assertThresholdValue(null), /INVALID_THRESHOLD/)
    assert.throws(() => assertThresholdValue(undefined), /INVALID_THRESHOLD/)
  })
})

// ==================== stockConfigRepo（@unit，双实现读写与默认值） ====================

describe('stockConfigRepo 配置结构读写（@unit）', () => {
  it('memory 实现：默认全局阈值 10 + 空覆盖表（R-STOCK-004）', () => {
    const repo = new StockConfigRepo()
    assert.deepStrictEqual(repo.getConfig(), { globalThreshold: 10, overrides: {} })
  })

  it('memory 实现：setGlobalThreshold / setOverride 返回更新后配置且结构符合规范', () => {
    const repo = new StockConfigRepo()
    repo.setGlobalThreshold(20)
    repo.setOverride('5', 15)
    assert.deepStrictEqual(repo.getConfig(), {
      globalThreshold: 20,
      overrides: { '5': 15 }
    })
  })

  it('file 实现：写入落盘 stock-config.json，新实例可读回（R-STOCK-007 长期有效）', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stock-config-unit-'))
    try {
      const repo = new StockConfigFileRepo({ dataDir: tmp })
      assert.deepStrictEqual(repo.getConfig(), { globalThreshold: 10, overrides: {} })
      repo.setGlobalThreshold(20)
      repo.setOverride('5', 15)

      // 磁盘文件结构校验
      const onDisk = JSON.parse(fs.readFileSync(path.join(tmp, 'stock-config.json'), 'utf-8'))
      assert.deepStrictEqual(onDisk, { globalThreshold: 20, overrides: { '5': 15 } })

      // 新实例（模拟重启）读回持久化值：长期有效、无过期概念
      const reopened = new StockConfigFileRepo({ dataDir: tmp })
      assert.strictEqual(reopened.getConfig().globalThreshold, 20)
      assert.strictEqual(reopened.getConfig().overrides['5'], 15)
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true })
    }
  })
})

// ==================== StockInsightService.aggregate 只读聚合（@unit，R-STOCK-001~010 组合） ====================

describe('StockInsightService 预警聚合（@unit）', () => {
  let orderRepo
  let productRepo
  let stockConfigRepo
  let service

  beforeEach(() => {
    orderRepo = new OrderRepo()
    productRepo = new ProductRepo()
    stockConfigRepo = new StockConfigRepo()
    const cartRepo = new CartRepo()
    const couponService = new CouponService(new CouponRepo())
    const orderService = new OrderService(cartRepo, orderRepo, productRepo, couponService)
    service = new StockInsightService(orderService, productRepo, stockConfigRepo)
  })

  /** 保存在售商品（缺省 status=active） */
  const saveProduct = (id, name, stock, status = 'active') =>
    productRepo.save({ id, name, priceCents: 100, stock, status })

  /** 保存近7日成交订单（paidAt=now 落入近7日窗口） */
  const saveOrder = (productId, quantity) =>
    orderRepo.save({
      id: `o_${Math.random().toString(36).slice(2, 8)}`,
      userId: 'user_1001',
      status: 'PAID',
      totalCents: 100,
      discountCents: 0,
      actualPaidCents: 100,
      couponId: null,
      paidAt: new Date().toISOString(),
      items: [{ productId: String(productId), name: 'p', priceCents: 100, quantity }]
    })

  it('入列判定与有效阈值标注：覆盖优先（R-STOCK-001/004/005）', () => {
    saveProduct('1', '商品A', 8) // 无覆盖：按全局 10 入列
    saveProduct('2', '商品B', 15) // 覆盖 15：入列
    saveProduct('3', '商品C', 40) // 40 > 10：不入列
    stockConfigRepo.setOverride('2', 15)

    const agg = service.aggregate()
    const byId = Object.fromEntries(agg.items.map(i => [i.productId, i]))

    assert.strictEqual(byId['1'].listed, true)
    assert.strictEqual(byId['1'].effectiveThreshold, 10)
    assert.strictEqual(byId['1'].thresholdSource, 'global')
    assert.strictEqual(byId['2'].listed, true)
    assert.strictEqual(byId['2'].effectiveThreshold, 15)
    assert.strictEqual(byId['2'].thresholdSource, 'override')
    assert.strictEqual(byId['3'].listed, false)
    assert.strictEqual(byId['3'].status, 'healthy')
  })

  it('已售罄恒入列并置顶（R-STOCK-002），且不置超卖风险标识', () => {
    saveProduct('1', '在售商品', 3)
    saveProduct('2', '售罄商品', 0)
    saveOrder('2', 5)

    const agg = service.aggregate()
    const byId = Object.fromEntries(agg.items.map(i => [i.productId, i]))
    assert.strictEqual(byId['2'].listed, true)
    assert.strictEqual(byId['2'].status, 'sold_out')
    assert.strictEqual(byId['2'].risk, false)
    assert.strictEqual(byId['2'].daysToSellout, 0)
    // 置顶：售罄商品恒排第一
    assert.strictEqual(agg.items[0].productId, '2')
  })

  it('超卖风险判定：2.5/4 天 < 7 风险；16.7 天无风险；stock=0 无风险（R-STOCK-003）', () => {
    saveProduct('1', '极简机械键盘', 3)
    saveProduct('2', '无线办公鼠标', 8)
    saveProduct('3', '高清显示器', 5)
    saveProduct('4', '桌面收纳架', 0)
    saveOrder('1', 8) // dailyAvg=ceil(8/7×10)/10=1.2 → 2.5 天 < 7 → risk
    saveOrder('2', 14) // dailyAvg=2.0 → 4 天 < 7 → risk
    saveOrder('3', 2) // dailyAvg=0.3 → 16.7 天 ≥ 7 → 无 risk
    saveOrder('4', 28) // stock=0 → 无 risk

    const agg = service.aggregate()
    const byId = Object.fromEntries(agg.items.map(i => [i.productId, i]))
    assert.strictEqual(byId['1'].risk, true)
    assert.strictEqual(byId['2'].risk, true)
    assert.strictEqual(byId['3'].risk, false)
    assert.strictEqual(byId['4'].risk, false)
    // 数值口径回归（design 决策 1：dailyAvg 向上取整 0.1 → 售罄天数基于取整值）
    assert.strictEqual(byId['1'].dailyAvg, 1.2) // 8/7=1.1429 → ceil0.1 → 1.2（Story 1 断言 ≈1.143 同步更新）
    assert.strictEqual(byId['1'].daysToSellout, 2.5) // 3/1.2（Story 1 断言 ≈2.625 同步更新）
    assert.strictEqual(byId['2'].sales7d, 14)
  })

  it('排序：已售罄置顶 → 天数升序 → 无销量置底（R-STOCK-010）', () => {
    saveProduct('4', '桌面收纳架', 0)
    saveProduct('1', '极简机械键盘', 3)
    saveProduct('2', '无线办公鼠标', 8)
    saveProduct('3', '高清显示器', 5)
    saveProduct('5', '铝合金笔记本支架', 15)
    saveProduct('6', '无销量低库存', 5) // 有覆盖 10 → 入列但无销量 → 置底
    stockConfigRepo.setOverride('5', 15)
    stockConfigRepo.setOverride('6', 10)
    saveOrder('4', 28) // sold_out
    saveOrder('1', 8) // 1.2 件/日 → 2.5 天
    saveOrder('2', 14) // 2.0 件/日 → 4 天
    saveOrder('3', 2) // 0.3 件/日 → 16.7 天
    saveOrder('5', 1) // 0.2 件/日 → 75 天

    const agg = service.aggregate()
    const ordered = agg.items.filter(i => i.listed).map(i => i.productId)
    assert.deepStrictEqual(ordered, ['4', '1', '2', '3', '5', '6'])
  })

  it('软删除商品过滤：覆盖配置保留但不参与聚合（R-STOCK-008）', () => {
    saveProduct('5', '铝合金笔记本支架', 15, 'deleted')
    stockConfigRepo.setOverride('5', 15)

    const agg = service.aggregate()
    // 覆盖配置保留在响应中
    assert.strictEqual(agg.overrides['5'], 15)
    // 软删除商品不参与聚合
    assert.ok(!agg.items.some(i => i.productId === '5'))
  })

  it('默认阈值 10：无任何配置时按 10 入列（R-STOCK-004）', () => {
    saveProduct('1', '库存8', 8)
    saveProduct('2', '库存12', 12)
    const agg = service.aggregate()
    const byId = Object.fromEntries(agg.items.map(i => [i.productId, i]))
    assert.strictEqual(agg.globalThreshold, 10)
    assert.strictEqual(byId['1'].listed, true) // 8 ≤ 10
    assert.strictEqual(byId['2'].listed, false) // 12 > 10
  })

  it('补货量公式逐项吻合：键盘 6 / 鼠标 6 / 收纳架 28 / 显示器 0（R-STOCK-104 数值链）', () => {
    saveProduct('1', '极简机械键盘', 3)
    saveProduct('2', '无线办公鼠标', 8)
    saveProduct('3', '高清显示器', 5)
    saveProduct('4', '桌面收纳架', 0)
    saveOrder('1', 8) // dailyAvg=1.2 → daysToSellout=2.5 → replenish=⌈1.2×7⌉−3=6
    saveOrder('2', 14) // dailyAvg=2.0 → daysToSellout=4 → replenish=14−8=6
    saveOrder('3', 2) // dailyAvg=0.3 → daysToSellout=16.7 → replenish=max(0,⌈0.3×7⌉−5)=0
    saveOrder('4', 28) // dailyAvg=4.0 → daysToSellout=0 → replenish=28−0=28

    const agg = service.aggregate()
    const byId = Object.fromEntries(agg.items.map(i => [i.productId, i]))
    assert.strictEqual(byId['1'].dailyAvg, 1.2)
    assert.strictEqual(byId['1'].daysToSellout, 2.5)
    assert.strictEqual(byId['1'].replenish, 6)
    assert.strictEqual(byId['2'].dailyAvg, 2.0)
    assert.strictEqual(byId['2'].daysToSellout, 4)
    assert.strictEqual(byId['2'].replenish, 6)
    assert.strictEqual(byId['4'].dailyAvg, 4.0)
    assert.strictEqual(byId['4'].daysToSellout, 0)
    assert.strictEqual(byId['4'].replenish, 28)
    assert.strictEqual(byId['3'].dailyAvg, 0.3)
    assert.strictEqual(byId['3'].daysToSellout, 16.7)
    assert.strictEqual(byId['3'].replenish, 0)
  })

  it('无销量商品：dailyAvg=0、daysToSellout=null、replenish=0 且仍按水位入列（R-STOCK-105）', () => {
    saveProduct('6', '无销量低库存', 5)
    saveProduct('7', '无销量高库存', 40)
    const agg = service.aggregate()
    const byId = Object.fromEntries(agg.items.map(i => [i.productId, i]))
    assert.strictEqual(byId['6'].dailyAvg, 0)
    assert.strictEqual(byId['6'].daysToSellout, null)
    assert.strictEqual(byId['6'].risk, false)
    assert.strictEqual(byId['6'].replenish, 0) // ⌈0×7⌉−5 → max(0,−5)=0
    assert.strictEqual(byId['6'].listed, true) // 5 ≤ 10 仍按水位入列
    assert.strictEqual(byId['7'].listed, false) // 40 > 10 不入列
    assert.strictEqual(byId['7'].replenish, 0)
  })

  it('已售罄：daysToSellout=0 且 replenish 按公式给出建议量（R-STOCK-103/104）', () => {
    saveProduct('4', '桌面收纳架', 0)
    saveOrder('4', 28)
    const agg = service.aggregate()
    const rack = agg.items.find(i => i.productId === '4')
    assert.strictEqual(rack.stock, 0)
    assert.strictEqual(rack.daysToSellout, 0)
    assert.strictEqual(rack.replenish, 28)
  })

  it('healthOverview：对入列预警项统计 4/1/2（预警4 含售罄1 风险2，R-STOCK-107）', () => {
    saveProduct('1', '极简机械键盘', 3)
    saveProduct('2', '无线办公鼠标', 8)
    saveProduct('3', '高清显示器', 5)
    saveProduct('4', '桌面收纳架', 0)
    saveProduct('6', '桌面拾音氛围灯', 40)
    saveOrder('1', 8) // risk
    saveOrder('2', 14) // risk
    saveOrder('3', 2) // 无风险
    saveOrder('4', 28) // sold_out

    const agg = service.aggregate()
    assert.deepStrictEqual(agg.healthOverview, { warningCount: 4, soldOutCount: 1, riskCount: 2 })
    // 与列表同源同口径：对入列预警项统计
    const listed = agg.items.filter(i => i.listed)
    assert.strictEqual(agg.healthOverview.warningCount, listed.length)
    assert.strictEqual(agg.healthOverview.soldOutCount, listed.filter(i => i.stock === 0).length)
    assert.strictEqual(agg.healthOverview.riskCount, listed.filter(i => i.risk).length)
  })
})

// ==================== 库存预警 API（@api，stock-insight spec） ====================

/** 启动独立 server 实例，返回 base + close */
async function startServer() {
  const { server } = createServer()
  await new Promise(resolve => server.listen(0, () => resolve(undefined)))
  const address = server.address()
  const port = address && typeof address === 'object' ? address.port : 0
  return { base: `http://127.0.0.1:${port}`, close: () => server.close() }
}

describe('库存预警 API GET /api/admin/dashboard/stock（@api）', () => {
  const post = (base, path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })

  const put = (base, path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
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

  it('运营角色：预警列表 200 返回字段完整且只读聚合无写操作（R-STOCK-001~004/010）', async () => {
    const { base, close } = await startServer()
    try {
      const operator = await setupUser(base, '13600002001', '库存运营', '运营')
      // 构造预警场景：库存 3（无销量）≤ 全局 10 → 入列；覆盖阈值 15 → 入列
      await put(base, '/api/products/1', { stock: 3 })
      await put(base, '/api/products/2', { stock: 8 })
      await put(base, '/api/products/3', { stock: 40 })
      await put(base, '/api/products/5', { stock: 15 })
      await put(base, '/api/admin/products/5/stock-config', { threshold: 15 }, operator.authHeaders)

      const before = {
        products: await (await get(base, '/api/products')).json(),
        orders: await (await get(base, '/api/admin/orders')).json()
      }

      const res = await get(base, '/api/admin/dashboard/stock', operator.authHeaders)
      assert.strictEqual(res.status, 200)
      const body = await res.json()
      assert.strictEqual(body.globalThreshold, 10)
      assert.ok(Array.isArray(body.items))
      const byId = Object.fromEntries(body.items.map(i => [i.productId, i]))
      assert.strictEqual(byId['1'].listed, true)
      assert.strictEqual(byId['1'].status, 'low_stock')
      assert.strictEqual(byId['1'].thresholdSource, 'global')
      assert.strictEqual(byId['1'].dailyAvg, 0) // 无销量
      assert.strictEqual(byId['1'].daysToSellout, null)
      assert.strictEqual(byId['5'].listed, true)
      assert.strictEqual(byId['5'].thresholdSource, 'override')
      assert.strictEqual(byId['5'].effectiveThreshold, 15)
      assert.strictEqual(byId['3'].listed, false)
      assert.strictEqual(byId['3'].status, 'healthy')
      // 必含字段契约（任务 1.4/1.6：replenish 增量字段）
      for (const field of ['productId', 'name', 'stock', 'effectiveThreshold', 'thresholdSource', 'dailyAvg', 'sales7d', 'daysToSellout', 'risk', 'replenish', 'status', 'listed']) {
        assert.ok(field in byId['1'], `缺少字段 ${field}`)
      }
      // 无销量商品 replenish=0（R-STOCK-105）+ 顶层 healthOverview 与列表统计一致（R-STOCK-107）
      assert.strictEqual(byId['1'].replenish, 0)
      assert.ok(body.healthOverview && typeof body.healthOverview === 'object')
      assert.strictEqual(body.healthOverview.warningCount, body.items.filter(i => i.listed).length)
      assert.strictEqual(body.healthOverview.soldOutCount, body.items.filter(i => i.stock === 0).length)
      assert.strictEqual(body.healthOverview.riskCount, body.items.filter(i => i.risk).length)
      // 只读聚合：本次请求后商品库存、订单、配置均无任何变更
      const afterProducts = await (await get(base, '/api/products')).json()
      assert.deepStrictEqual(afterProducts, before.products)
      const afterOrders = await (await get(base, '/api/admin/orders')).json()
      assert.deepStrictEqual(afterOrders, before.orders)
    } finally {
      close()
    }
  })

  it('老板角色：预警列表 200（只读白名单 R-STOCK-009）', async () => {
    const { base, close } = await startServer()
    try {
      const boss = await setupUser(base, '13600002002', '看板老板', '老板')
      const res = await get(base, '/api/admin/dashboard/stock', boss.authHeaders)
      assert.strictEqual(res.status, 200)
      const body = await res.json()
      assert.ok(Array.isArray(body.items))
      assert.ok('globalThreshold' in body)
    } finally {
      close()
    }
  })

  it('客服/客户角色：403 且响应不含任何库存/预警数据（R-STOCK-009）', async () => {
    const { base, close } = await startServer()
    try {
      for (const role of ['客服', '客户']) {
        const user = await setupUser(base, `1360000200${role === '客服' ? '3' : '4'}`, `${role}用户`, role)
        const res = await get(base, '/api/admin/dashboard/stock', user.authHeaders)
        assert.strictEqual(res.status, 403)
        const raw = await res.text()
        assert.strictEqual(JSON.parse(raw).code, 'FORBIDDEN')
        assert.ok(!raw.includes('items'), '响应不得包含预警列表')
        assert.ok(!raw.includes('dailyAvg'))
        assert.ok(!raw.includes('daysToSellout'))
        assert.ok(!raw.includes('globalThreshold'))
      }
    } finally {
      close()
    }
  })

  it('未登录访问：401（错误码 UNAUTHORIZED，R-STOCK-009 区别于 sales-dashboard 403）', async () => {
    const { base, close } = await startServer()
    try {
      const res = await get(base, '/api/admin/dashboard/stock')
      assert.strictEqual(res.status, 401)
      const body = await res.json()
      assert.strictEqual(body.code, 'UNAUTHORIZED')
      assert.strictEqual(body.message, '请先登录')
    } finally {
      close()
    }
  })
})

// ==================== 补货建议 API 响应扩展（@api，R-STOCK-104/107） ====================

describe('补货建议 API 响应扩展 replenish + healthOverview（@api）', () => {
  const post = (base, path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const put = (base, path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const get = (base, path, headers = {}) => fetch(`${base}${path}`, { headers })

  async function startServer() {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    return { base: `http://127.0.0.1:${port}`, close: () => server.close() }
  }

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

  /** 构造一笔近7日已支付订单（quantity 件），payment 自动扣减库存 */
  async function createPaidOrder(base, phone, productId, quantity) {
    const customer = await setupUser(base, phone, `补货买家${phone.slice(-4)}`, '客户')
    await post(base, '/api/cart/items', { productId: String(productId), quantity }, customer.authHeaders)
    const orderRes = await post(base, '/api/orders', {}, customer.authHeaders)
    assert.strictEqual(orderRes.status, 201)
    const order = await orderRes.json()
    const payRes = await post(base, `/api/payments/${order.id}`)
    assert.strictEqual(payRes.status, 200)
  }

  it('运营：响应 items 含 replenish（无销量=0）且顶层 healthOverview 与列表统计一致（R-STOCK-104/105/107）', async () => {
    const { base, close } = await startServer()
    try {
      // 近7日销量：键盘 8 / 鼠标 14 / 收纳架 28 / 显示器 2；无销量商品：氛围灯（不建订单）
      await createPaidOrder(base, '13600002011', '1', 8)
      await createPaidOrder(base, '13600002012', '2', 14)
      await createPaidOrder(base, '13600002013', '4', 28)
      await createPaidOrder(base, '13600002014', '3', 2)
      // 支付扣库存后，后门回写目标库存（E2E 同款口径：销量场景库存基线）
      await put(base, '/api/products/1', { stock: 3 })
      await put(base, '/api/products/2', { stock: 8 })
      await put(base, '/api/products/3', { stock: 5 })
      await put(base, '/api/products/4', { stock: 0 })
      await put(base, '/api/products/6', { stock: 5 }) // 无销量 + stock=5 ≤ 10 → 入列

      const operator = await setupUser(base, '13600002015', '补货运营', '运营')
      const before = await (await get(base, '/api/products')).json()

      const res = await get(base, '/api/admin/dashboard/stock', operator.authHeaders)
      assert.strictEqual(res.status, 200)
      const body = await res.json()
      const byId = Object.fromEntries(body.items.map(i => [i.productId, i]))

      // replenish 公式逐项吻合（R-STOCK-104）
      assert.strictEqual(byId['1'].replenish, 6) // ⌈1.2×7⌉−3
      assert.strictEqual(byId['2'].replenish, 6) // 14−8
      assert.strictEqual(byId['4'].replenish, 28) // 28−0（已售罄仍按公式）
      assert.strictEqual(byId['3'].replenish, 0) // ⌈0.3×7⌉−5 → max(0,−2)
      assert.strictEqual(byId['6'].replenish, 0) // 无销量 → 0
      assert.strictEqual(byId['3'].dailyAvg, 0.3)
      assert.strictEqual(byId['3'].daysToSellout, 16.7)

      // healthOverview：与列表（入列预警项）统计一致
      const listed = body.items.filter(i => i.listed)
      assert.deepStrictEqual(body.healthOverview, {
        warningCount: listed.length,
        soldOutCount: listed.filter(i => i.stock === 0).length,
        riskCount: listed.filter(i => i.risk).length
      })
      assert.strictEqual(body.healthOverview.warningCount, 5) // 键盘/鼠标/显示器/收纳架/氛围灯
      assert.strictEqual(body.healthOverview.soldOutCount, 1) // 收纳架
      assert.strictEqual(body.healthOverview.riskCount, 2) // 键盘/鼠标

      // 只读聚合：本次请求后商品库存无任何变更
      const after = await (await get(base, '/api/products')).json()
      assert.deepStrictEqual(after, before)
    } finally {
      close()
    }
  })

  it('老板：只读访问 healthOverview（200）且写阈值配置被拒（403 FORBIDDEN，配置无变更）', async () => {
    const { base, close } = await startServer()
    try {
      const boss = await setupUser(base, '13600002016', '健康度老板', '老板')
      // 只读访问：可获取 healthOverview（R-STOCK-107 运营/老板均可只读）
      const stockRes = await get(base, '/api/admin/dashboard/stock', boss.authHeaders)
      assert.strictEqual(stockRes.status, 200)
      const stock = await stockRes.json()
      assert.ok(stock.healthOverview && typeof stock.healthOverview === 'object')
      assert.deepStrictEqual(stock.healthOverview, { warningCount: 0, soldOutCount: 0, riskCount: 0 })

      // 写阈值配置：全局 + 商品级均 403（R-STOCK-107 决策口径② 老板只读最小权限）
      const globalRes = await put(base, '/api/admin/stock-config', { threshold: 20 }, boss.authHeaders)
      assert.strictEqual(globalRes.status, 403)
      assert.strictEqual((await globalRes.json()).code, 'FORBIDDEN')
      const overrideRes = await put(base, '/api/admin/products/2/stock-config', { threshold: 5 }, boss.authHeaders)
      assert.strictEqual(overrideRes.status, 403)

      // 配置文件无任何变更
      const after = await (await get(base, '/api/admin/dashboard/stock', boss.authHeaders)).json()
      assert.strictEqual(after.globalThreshold, 10)
      assert.deepStrictEqual(after.overrides, {})
    } finally {
      close()
    }
  })
})

// ==================== 阈值配置 API（@api，R-STOCK-006/007） ====================

describe('阈值配置 API PUT /api/admin/stock-config（@api）', () => {
  const post = (base, path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const put = (base, path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const get = (base, path, headers = {}) => fetch(`${base}${path}`, { headers })

  async function startServer() {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    return { base: `http://127.0.0.1:${port}`, close: () => server.close() }
  }

  async function setupUser(base, phone, nickname, role) {
    await post(base, '/api/auth/register', { phone, nickname, password: '123456' })
    await post(base, '/api/__test/user-role', { phone, role })
    const login = await post(base, '/api/auth/login', { phone, password: '123456' })
    const body = await login.json()
    return { authHeaders: { 'Content-Type': 'application/json', Authorization: `Bearer ${body.sessionToken}` } }
  }

  it('运营设置全局默认阈值 20：200 落盘 + 下一次查询按新阈值重新入列（即时生效）', async () => {
    const { base, close } = await startServer()
    try {
      const operator = await setupUser(base, '13600002101', '配置运营', '运营')
      // 库存 12 的商品：阈值 10 不入列 → 20 入列
      await put(base, '/api/products/2', { stock: 12 })

      const before = await (await get(base, '/api/admin/dashboard/stock', operator.authHeaders)).json()
      const beforeById = Object.fromEntries(before.items.map(i => [i.productId, i]))
      assert.strictEqual(beforeById['2'].listed, false) // 12 > 10

      const res = await put(base, '/api/admin/stock-config', { threshold: 20 }, operator.authHeaders)
      assert.strictEqual(res.status, 200)
      const config = await res.json()
      assert.strictEqual(config.globalThreshold, 20)

      const after = await (await get(base, '/api/admin/dashboard/stock', operator.authHeaders)).json()
      const afterById = Object.fromEntries(after.items.map(i => [i.productId, i]))
      assert.strictEqual(after.globalThreshold, 20)
      assert.strictEqual(afterById['2'].listed, true) // 12 ≤ 20 → 立即入列
      assert.strictEqual(afterById['2'].effectiveThreshold, 20)
    } finally {
      close()
    }
  })

  it('运营设置商品级覆盖阈值：覆盖 5 → 移出预警；改回 10 → 重新入列（双向调整即时生效）', async () => {
    const { base, close } = await startServer()
    try {
      const operator = await setupUser(base, '13600002102', '覆盖运营', '运营')
      await put(base, '/api/products/2', { stock: 8 }) // 无线办公鼠标 stock=8

      // 初始：按全局 10 入列
      let body = await (await get(base, '/api/admin/dashboard/stock', operator.authHeaders)).json()
      let byId = Object.fromEntries(body.items.map(i => [i.productId, i]))
      assert.strictEqual(byId['2'].listed, true)
      assert.strictEqual(byId['2'].thresholdSource, 'global')

      // 覆盖阈值 5：8 > 5 → 移出预警
      const res1 = await put(base, '/api/admin/products/2/stock-config', { threshold: 5 }, operator.authHeaders)
      assert.strictEqual(res1.status, 200)
      body = await (await get(base, '/api/admin/dashboard/stock', operator.authHeaders)).json()
      byId = Object.fromEntries(body.items.map(i => [i.productId, i]))
      assert.strictEqual(byId['2'].listed, false)
      assert.strictEqual(byId['2'].thresholdSource, 'override')

      // 改回 10：8 ≤ 10 → 重新入列
      const res2 = await put(base, '/api/admin/products/2/stock-config', { threshold: 10 }, operator.authHeaders)
      assert.strictEqual(res2.status, 200)
      body = await (await get(base, '/api/admin/dashboard/stock', operator.authHeaders)).json()
      byId = Object.fromEntries(body.items.map(i => [i.productId, i]))
      assert.strictEqual(byId['2'].listed, true)
      assert.strictEqual(byId['2'].thresholdSource, 'override')
    } finally {
      close()
    }
  })

  it('无效阈值（负数/非数字/小数）：400 且配置不变', async () => {
    const { base, close } = await startServer()
    try {
      const operator = await setupUser(base, '13600002103', '校验运营', '运营')
      for (const bad of [-1, -5, 'abc', null, undefined, 1.5]) {
        const res = await put(base, '/api/admin/stock-config', { threshold: bad }, operator.authHeaders)
        assert.strictEqual(res.status, 400)
        assert.strictEqual((await res.json()).code, 'INVALID_THRESHOLD')
      }
      // 全局阈值保持默认 10（未发生变更）
      const body = await (await get(base, '/api/admin/dashboard/stock', operator.authHeaders)).json()
      assert.strictEqual(body.globalThreshold, 10)
    } finally {
      close()
    }
  })

  it('老板/客服写配置：403 且配置文件不发生任何变更', async () => {
    const { base, close } = await startServer()
    try {
      const boss = await setupUser(base, '13600002104', '写配置老板', '老板')
      const service = await setupUser(base, '13600002105', '写配置客服', '客服')

      for (const headers of [boss.authHeaders, service.authHeaders]) {
        const globalRes = await put(base, '/api/admin/stock-config', { threshold: 20 }, headers)
        assert.strictEqual(globalRes.status, 403)
        assert.strictEqual((await globalRes.json()).code, 'FORBIDDEN')
        const overrideRes = await put(base, '/api/admin/products/2/stock-config', { threshold: 5 }, headers)
        assert.strictEqual(overrideRes.status, 403)
      }
      // 配置无变化
      const body = await (await get(base, '/api/admin/dashboard/stock', boss.authHeaders)).json()
      assert.strictEqual(body.globalThreshold, 10)
      assert.deepStrictEqual(body.overrides, {})
    } finally {
      close()
    }
  })
})

// ==================== user_1003 老板种子账号（@api，user-admin delta spec） ====================

describe('user_1003 老板种子账号门禁（@api）', () => {
  const post = (base, path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const put = (base, path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const get = (base, path, headers = {}) => fetch(`${base}${path}`, { headers })
  const patch = (base, path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })

  async function startServer() {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    return { base: `http://127.0.0.1:${port}`, close: () => server.close() }
  }

  it('种子账号可登录（201，role=老板 昵称 李老板）且只读访问 stock/sales 看板 200', async () => {
    const { base, close } = await startServer()
    try {
      const login = await post(base, '/api/auth/login', { phone: '13612345678', password: 'boss123' })
      assert.strictEqual(login.status, 201)
      const body = await login.json()
      assert.strictEqual(body.user.id, 'user_1003')
      assert.strictEqual(body.user.nickname, '李老板')
      assert.strictEqual(body.user.role, '老板')
      const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${body.sessionToken}` }

      const stockRes = await get(base, '/api/admin/dashboard/stock', authHeaders)
      assert.strictEqual(stockRes.status, 200)
      const salesRes = await get(base, '/api/admin/dashboard/sales', authHeaders)
      assert.strictEqual(salesRes.status, 200)
    } finally {
      close()
    }
  })

  it('种子账号无管理写权限：stock-config / user status / product 级配置写全部 403', async () => {
    const { base, close } = await startServer()
    try {
      const login = await post(base, '/api/auth/login', { phone: '13612345678', password: 'boss123' })
      assert.strictEqual(login.status, 201)
      const body = await login.json()
      assert.strictEqual(body.user.role, '老板')
      const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${body.sessionToken}` }

      // 全局阈值配置写 → 403
      const configRes = await put(base, '/api/admin/stock-config', { threshold: 20 }, authHeaders)
      assert.strictEqual(configRes.status, 403)
      assert.strictEqual((await configRes.json()).code, 'FORBIDDEN')

      // 用户状态管理写 → 403
      const userStatusRes = await patch(base, '/api/admin/users/user_1002/status', { status: '禁用' }, authHeaders)
      assert.strictEqual(userStatusRes.status, 403)

      // 商品级覆盖阈值配置写（本 change 引入的 product 级写操作）→ 403
      const productConfigRes = await put(base, '/api/admin/products/2/stock-config', { threshold: 5 }, authHeaders)
      assert.strictEqual(productConfigRes.status, 403)

      // 所有写请求后配置不发生任何变更
      const stock = await (await get(base, '/api/admin/dashboard/stock', authHeaders)).json()
      assert.strictEqual(stock.globalThreshold, 10)
      assert.deepStrictEqual(stock.overrides, {})
    } finally {
      close()
    }
  })
})
