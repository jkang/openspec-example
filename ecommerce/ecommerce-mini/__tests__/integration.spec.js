import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { createServer } from '../src/http/server.js'

// 测试后门（reset / user-status）仅在 NODE_ENV=test 下启用；集成测试进程内开启以支持数据预置
process.env.NODE_ENV = 'test'

/**
 * 注册并登录辅助：R-SES-007 落地后下单/我的订单需携带会话凭证。
 * 返回含 Authorization Bearer 头的请求头组，供需登录接口使用。
 */
async function registerSession(base, phone, nickname, password = '123456') {
  const res = await fetch(`${base}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, nickname, password })
  })
  const body = await res.json()
  return {
    user: body.user,
    sessionToken: body.sessionToken,
    authHeaders: { 'Content-Type': 'application/json', Authorization: `Bearer ${body.sessionToken}` }
  }
}

let base = ''
let stop = () => {}

describe('集成测试 (E2E)', () => {
  before(async () => {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    base = `http://127.0.0.1:${port}`
    stop = () => server.close()
  })
  after(() => stop())

  it('完整购物流程 (带最优优惠券)', async () => {
    // 注册并登录：下单需携带会话凭证（R-SES-007 归属会话用户）
    const auth = await registerSession(base, '13888217536', '林晓明')

    // 1. 上架商品: 100元
    const res1 = await fetch(`${base}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Integration Item', priceCents: 10000, stock: 10 }),
    })
    assert.strictEqual(res1.status, 201)
    const product = await res1.json()

    // 2. 加购（携带会话 → 购物车归属会话用户）
    await fetch(`${base}/api/cart/items`, {
      method: 'POST',
      headers: auth.authHeaders,
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    })

    // 3. 检查可用优惠券 (应该是之前注入的 PERCENT9 和 FLAT10)
    const resCoupons = await fetch(`${base}/api/coupons`)
    assert.strictEqual(resCoupons.status, 200)
    // 找到 PERCENT9 (9折 -> 减10元) 和 FLAT10 (减10元)
    // 根据 getBestCoupon 的逻辑，金额相同时按 ID 升序，FLAT10 会被选中 (F < P)
    
    // 4. 下单 (不传 couponId，触发自动推荐；归属 = 会话用户 user_1001)
    const res3 = await fetch(`${base}/api/orders`, {
      method: 'POST',
      headers: auth.authHeaders,
      body: JSON.stringify({}),
    })
    assert.strictEqual(res3.status, 201)
    const order = await res3.json()
    
    assert.strictEqual(order.userId, 'user_1001') // R-SES-007 绑定会话用户
    assert.strictEqual(order.totalCents, 10000)
    // 最优券应该是 FLAT10 (减1000) 或 PERCENT9 (减1000)
    // 金额相同时按 ID 排序: FLAT10 < PERCENT9
    assert.strictEqual(order.couponId, 'FLAT10')
    assert.strictEqual(order.discountCents, 1000)
    assert.strictEqual(order.actualPaidCents, 9000)
  })

  it('多用户购物车隔离性', async () => {
    const authA = await registerSession(base, '13900000001', '甲用户')
    const authB = await registerSession(base, '13900000002', '乙用户')
    const productId = '1'

    // User A 加购 2 个（会话归属）
    await fetch(`${base}/api/cart/items`, {
      method: 'POST',
      headers: authA.authHeaders,
      body: JSON.stringify({ productId, quantity: 2 }),
    })

    // User B 加购 5 个（会话归属）
    await fetch(`${base}/api/cart/items`, {
      method: 'POST',
      headers: authB.authHeaders,
      body: JSON.stringify({ productId, quantity: 5 }),
    })

    // 验证 User A 的结算 (携带会话 → 归属 A 的购物车)
    const resA = await fetch(`${base}/api/checkout`, {
      method: 'POST',
      headers: authA.authHeaders,
      body: JSON.stringify({}),
    })
    const previewA = await resA.json()
    // 键盘 29900 * 2 = 59800
    assert.strictEqual(previewA.userId, authA.user.id)
    assert.strictEqual(previewA.totalCents, 59800)

    // 验证 User B 的结算 (携带会话 → 归属 B 的购物车)
    const resB = await fetch(`${base}/api/checkout`, {
      method: 'POST',
      headers: authB.authHeaders,
      body: JSON.stringify({}),
    })
    const previewB = await resB.json()
    // 键盘 29900 * 5 = 149500
    assert.strictEqual(previewB.userId, authB.user.id)
    assert.strictEqual(previewB.totalCents, 149500)
  })
})

describe('优惠券运营后台 API (@api)', () => {
  let adminBase = ''
  let adminStop = () => {}

  before(async () => {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    adminBase = `http://127.0.0.1:${port}`
    adminStop = () => server.close()
  })
  after(() => adminStop())

  const post = (path, body) => fetch(`${adminBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const postWithAuth = (path, body, authHeaders) => fetch(`${adminBase}${path}`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify(body),
  })

  it('创建折扣券成功生效 (ACTIVE, issuedCount=0)', async () => {
    const res = await post('/api/admin/coupons', {
      name: '中秋特惠 8 折券', type: 'PERCENTAGE', value: 8, minSpendCents: 30000, expiryDate: '2026-10-15'
    })
    assert.strictEqual(res.status, 201)
    const coupon = await res.json()
    assert.strictEqual(coupon.status, 'ACTIVE')
    assert.strictEqual(coupon.userId, null)
    assert.ok(coupon.id)

    const listRes = await fetch(`${adminBase}/api/admin/coupons`)
    const list = await listRes.json()
    const created = list.find(c => c.id === coupon.id)
    assert.ok(created)
    assert.strictEqual(created.issuedCount, 0)
  })

  it('折扣比例非法被拒绝 (INVALID_DISCOUNT_RATE)', async () => {
    const res = await post('/api/admin/coupons', {
      name: '非法券', type: 'PERCENTAGE', value: 10, minSpendCents: 0
    })
    assert.strictEqual(res.status, 400)
    assert.strictEqual((await res.json()).code, 'INVALID_DISCOUNT_RATE')
  })

  it('满减金额超过门槛被拒绝 (COUPON_VALUE_EXCEEDS_THRESHOLD)', async () => {
    const res = await post('/api/admin/coupons', {
      name: '超额满减券', type: 'FLAT', value: 12000, minSpendCents: 10000
    })
    assert.strictEqual(res.status, 400)
    assert.strictEqual((await res.json()).code, 'COUPON_VALUE_EXCEEDS_THRESHOLD')
  })

  it('单人发放全流程: 成功 / 重复拒绝 / 非法 userId / 记录回流', async () => {
    // 创建 8 折无门槛券
    const createRes = await post('/api/admin/coupons', {
      name: '全员 8 折券', type: 'PERCENTAGE', value: 8, minSpendCents: 0, expiryDate: '2026-11-30'
    })
    const template = await createRes.json()

    // 发放成功
    const issueRes = await post(`/api/admin/coupons/${template.id}/issue`, { userId: 'user_1003' })
    assert.strictEqual(issueRes.status, 201)
    const { instance, issuance } = await issueRes.json()
    assert.strictEqual(instance.status, 'UNUSED')
    assert.strictEqual(instance.userId, 'user_1003')
    assert.strictEqual(instance.templateId, template.id)
    assert.strictEqual(issuance.userId, 'user_1003')

    // issuedCount 聚合 +1
    const list = await (await fetch(`${adminBase}/api/admin/coupons`)).json()
    assert.strictEqual(list.find(c => c.id === template.id).issuedCount, 1)

    // 重复发放拒绝 (409)
    const dupRes = await post(`/api/admin/coupons/${template.id}/issue`, { userId: 'user_1003' })
    assert.strictEqual(dupRes.status, 409)
    assert.strictEqual((await dupRes.json()).code, 'COUPON_ALREADY_ISSUED')

    // 非法 userId (400)
    const badRes = await post(`/api/admin/coupons/${template.id}/issue`, { userId: 'unknown123' })
    assert.strictEqual(badRes.status, 400)
    assert.strictEqual((await badRes.json()).code, 'INVALID_USER_ID')

    // 发放记录回流 (最新在前)
    const logs = await (await fetch(`${adminBase}/api/admin/issuances`)).json()
    assert.strictEqual(logs[0].couponId, template.id)
    assert.strictEqual(logs[0].userId, 'user_1003')
    assert.ok(logs[0].time)
    assert.ok(logs[0].operator)

    // C 端可见性: 持有人可见，他人不可见
    const holderCoupons = await (await fetch(`${adminBase}/api/coupons?userId=user_1003`)).json()
    assert.ok(holderCoupons.some(c => c.id === instance.id))
    const otherCoupons = await (await fetch(`${adminBase}/api/coupons?userId=user_1004`)).json()
    assert.ok(!otherCoupons.some(c => c.id === instance.id))

    // 最优推荐: 上架 100 元商品
    const product = await (await post('/api/products', { name: '推荐测试商品', priceCents: 10000, stock: 10 })).json()

    // 下单需会话凭证：注册用户至 user_1003（持券人）与 user_1004（他人）以持有会话（R-SES-007）
    await post('/api/auth/register', { phone: '13800000001', nickname: '甲', password: '123456' }) // user_1001
    await post('/api/auth/register', { phone: '13800000002', nickname: '乙', password: '123456' }) // user_1002
    const holder = await registerSession(adminBase, '13800000003', '持券人') // user_1003
    const other = await registerSession(adminBase, '13800000004', '路人') // user_1004

    // 他人下单: 不命中该实例 (FLAT10 与 PERCENT9 各减 1000, 按 ID 升序取 FLAT10)
    await post('/api/cart/items', { userId: 'user_1004', productId: product.id, quantity: 1 })
    const otherOrderRes = await postWithAuth('/api/orders', {}, other.authHeaders)
    const otherOrder = await otherOrderRes.json()
    assert.strictEqual(otherOrder.couponId, 'FLAT10')
    assert.strictEqual(otherOrder.discountCents, 1000)

    // 持有人下单: 命中 8 折实例 (减 2000)
    await post('/api/cart/items', { userId: 'user_1003', productId: product.id, quantity: 1 })
    const holderOrderRes = await postWithAuth('/api/orders', {}, holder.authHeaders)
    const holderOrder = await holderOrderRes.json()
    assert.strictEqual(holderOrder.couponId, instance.id)
    assert.strictEqual(holderOrder.discountCents, 2000)
    assert.strictEqual(holderOrder.actualPaidCents, 8000)
  })
})

describe('商品管理 API (@api)', () => {
  let apiBase = ''
  let apiStop = () => {}

  before(async () => {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    apiBase = `http://127.0.0.1:${port}`
    apiStop = () => server.close()
  })
  after(() => apiStop())

  const send = (path, method, body) => fetch(`${apiBase}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  it('PUT 修改商品成功且列表更新', async () => {
    const res = await send('/api/products/1', 'PUT', { priceCents: 27900, stock: 50 })
    assert.strictEqual(res.status, 200)
    const updated = await res.json()
    assert.strictEqual(updated.priceCents, 27900)
    assert.strictEqual(updated.stock, 50)
    // 未提供字段保留
    assert.strictEqual(updated.name, '极简机械键盘')

    const list = await (await fetch(`${apiBase}/api/products`)).json()
    const item = list.find(p => p.id === '1')
    assert.strictEqual(item.priceCents, 27900)
  })

  it('PUT 非法价格返回 400 INVALID_PRICE', async () => {
    const res = await send('/api/products/1', 'PUT', { priceCents: 0 })
    assert.strictEqual(res.status, 400)
    assert.strictEqual((await res.json()).code, 'INVALID_PRICE')
  })

  it('PUT 负库存返回 400 INVALID_STOCK', async () => {
    const res = await send('/api/products/1', 'PUT', { stock: -1 })
    assert.strictEqual(res.status, 400)
    assert.strictEqual((await res.json()).code, 'INVALID_STOCK')
  })

  it('PUT 不存在商品返回 404 PRODUCT_NOT_FOUND', async () => {
    const res = await send('/api/products/nope', 'PUT', { priceCents: 100 })
    assert.strictEqual(res.status, 404)
    assert.strictEqual((await res.json()).code, 'PRODUCT_NOT_FOUND')
  })

  it('DELETE 软删除后从列表移除且不可查', async () => {
    const res = await send('/api/products/4', 'DELETE')
    assert.strictEqual(res.status, 200)
    const removed = await res.json()
    assert.strictEqual(removed.status, 'deleted')

    // 列表不再包含
    const list = await (await fetch(`${apiBase}/api/products`)).json()
    assert.ok(!list.some(p => p.id === '4'))
    // 按 ID 查询为 404
    const getRes = await fetch(`${apiBase}/api/products/4`)
    assert.strictEqual(getRes.status, 404)
  })

  it('DELETE 不存在或已删除返回 404 PRODUCT_NOT_FOUND', async () => {
    const never = await send('/api/products/nope', 'DELETE')
    assert.strictEqual(never.status, 404)
    assert.strictEqual((await never.json()).code, 'PRODUCT_NOT_FOUND')

    // 已删除的商品再次删除
    const again = await send('/api/products/4', 'DELETE')
    assert.strictEqual(again.status, 404)
    assert.strictEqual((await again.json()).code, 'PRODUCT_NOT_FOUND')
  })
})

describe('分类管理 API (@api)', () => {
  let apiBase = ''
  let apiStop = () => {}

  before(async () => {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    apiBase = `http://127.0.0.1:${port}`
    apiStop = () => server.close()
  })
  after(() => apiStop())

  const send = (path, method, body) => fetch(`${apiBase}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  it('分类 CRUD 全流程: 新增/列表/编辑/删除', async () => {
    // 种子分类存在
    const list0 = await (await fetch(`${apiBase}/api/categories`)).json()
    assert.ok(list0.length >= 4)

    // 新增
    const createRes = await send('/api/categories', 'POST', { name: '数码配件', sortOrder: 5 })
    assert.strictEqual(createRes.status, 201)
    const created = await createRes.json()
    assert.strictEqual(created.status, 'active')
    assert.strictEqual(created.name, '数码配件')

    // 编辑
    const putRes = await send(`/api/categories/${created.id}`, 'PUT', { name: '数码周边', sortOrder: 1 })
    assert.strictEqual(putRes.status, 200)
    assert.strictEqual((await putRes.json()).name, '数码周边')

    // 删除
    const delRes = await send(`/api/categories/${created.id}`, 'DELETE')
    assert.strictEqual(delRes.status, 200)
    const list = await (await fetch(`${apiBase}/api/categories`)).json()
    assert.ok(!list.some(c => c.id === created.id))
  })

  it('同名分类被拒绝 (409 CATEGORY_NAME_EXISTS)', async () => {
    const res = await send('/api/categories', 'POST', { name: '键鼠外设' })
    assert.strictEqual(res.status, 409)
    assert.strictEqual((await res.json()).code, 'CATEGORY_NAME_EXISTS')
  })

  it('删除分类后商品 categoryId 置空且仍可查询', async () => {
    // 种子商品 6 (桌面拾音氛围灯) 属于 cat-audio
    await send('/api/categories/cat-audio', 'DELETE')
    // 列表不再含 cat-audio
    const list = await (await fetch(`${apiBase}/api/categories`)).json()
    assert.ok(!list.some(c => c.id === 'cat-audio'))
    // 商品 6 categoryId 置空
    const product = await (await fetch(`${apiBase}/api/products/6`)).json()
    assert.strictEqual(product.categoryId, null)
  })

  it('商品列表按分类过滤 (GET /api/products?categoryId=)', async () => {
    const res = await fetch(`${apiBase}/api/products?categoryId=cat-keyboard`)
    assert.strictEqual(res.status, 200)
    const list = await res.json()
    assert.strictEqual(list.length, 2)
    assert.ok(list.every(p => p.categoryId === 'cat-keyboard'))
    assert.deepStrictEqual(list.map(p => p.id).sort(), ['1', '2'])
  })

  it('分类与名称组合过滤', async () => {
    const res = await fetch(`${apiBase}/api/products?categoryId=cat-desk&name=支架`)
    const list = await res.json()
    assert.strictEqual(list.length, 1)
    assert.strictEqual(list[0].name, '铝合金笔记本支架')
  })

  it('商品挂不存在分类被拒绝 (400 CATEGORY_NOT_FOUND)', async () => {
    const res = await send('/api/products/1', 'PUT', { categoryId: 'cat-nope' })
    assert.strictEqual(res.status, 404)
    assert.strictEqual((await res.json()).code, 'CATEGORY_NOT_FOUND')
  })
})

describe('模拟支付 API (@api)', () => {
  let apiBase = ''
  let apiStop = () => {}

  before(async () => {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    apiBase = `http://127.0.0.1:${port}`
    apiStop = () => server.close()
  })
  after(() => apiStop())

  const post = (path, body) => fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  it('下单不扣库存，支付成功后扣减并推进状态', async () => {
    const auth = await registerSession(apiBase, '13800000005', '支付用户')
    // 加购商品 1 (键盘, 库存 99)
    await fetch(`${apiBase}/api/cart/items`, {
      method: 'POST',
      headers: auth.authHeaders,
      body: JSON.stringify({ productId: '1', quantity: 1 })
    })
    // 下单（会话归属）
    const orderRes = await fetch(`${apiBase}/api/orders`, {
      method: 'POST',
      headers: auth.authHeaders,
      body: JSON.stringify({})
    })
    assert.strictEqual(orderRes.status, 201)
    const order = await orderRes.json()
    assert.strictEqual(order.status, 'PENDING_PAYMENT')
    // 库存未扣
    const p1 = await (await fetch(`${apiBase}/api/products/1`)).json()
    assert.strictEqual(p1.stock, 99)
    // 支付
    const payRes = await post(`/api/payments/${order.id}`)
    assert.strictEqual(payRes.status, 200)
    const paid = await payRes.json()
    assert.strictEqual(paid.status, 'PAID')
    // 库存已扣
    const p2 = await (await fetch(`${apiBase}/api/products/1`)).json()
    assert.strictEqual(p2.stock, 98)
  })

  it('重复支付返回幂等提示 (200 ORDER_ALREADY_PAID)', async () => {
    const auth = await registerSession(apiBase, '13800000006', '重复支付用户')
    await fetch(`${apiBase}/api/cart/items`, {
      method: 'POST',
      headers: auth.authHeaders,
      body: JSON.stringify({ productId: '2', quantity: 1 })
    })
    const order = await (await fetch(`${apiBase}/api/orders`, {
      method: 'POST',
      headers: auth.authHeaders,
      body: JSON.stringify({})
    })).json()
    await post(`/api/payments/${order.id}`)
    const dup = await post(`/api/payments/${order.id}`)
    assert.strictEqual(dup.status, 200)
    assert.strictEqual((await dup.json()).code, 'ORDER_ALREADY_PAID')
  })

  it('支付不存在订单返回 404', async () => {
    const res = await post('/api/payments/order_nope')
    assert.strictEqual(res.status, 404)
    assert.strictEqual((await res.json()).code, 'ORDER_NOT_FOUND')
  })
})

describe('B 端订单管理 API (@api)', () => {
  let apiBase = ''
  let apiStop = () => {}

  before(async () => {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    apiBase = `http://127.0.0.1:${port}`
    apiStop = () => server.close()
  })
  after(() => apiStop())

  const post = (path, body) => fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  async function createAndPay(phone, nickname, productId) {
    const auth = await registerSession(apiBase, phone, nickname)
    await fetch(`${apiBase}/api/cart/items`, {
      method: 'POST',
      headers: auth.authHeaders,
      body: JSON.stringify({ productId, quantity: 1 })
    })
    const order = await (await fetch(`${apiBase}/api/orders`, {
      method: 'POST',
      headers: auth.authHeaders,
      body: JSON.stringify({})
    })).json()
    return order
  }

  it('订单列表: 全量 + 状态过滤 + 关键词搜索', async () => {
    const pending = await createAndPay('13800000007', '管理甲', '1')
    const paidOrder = await createAndPay('13800000008', '管理乙', '2')
    await post(`/api/payments/${paidOrder.id}`)

    // 全量（含种子与新建）
    const all = await (await fetch(`${apiBase}/api/admin/orders`)).json()
    assert.ok(all.length >= 2)

    // 状态过滤 PAID
    const paid = await (await fetch(`${apiBase}/api/admin/orders?status=PAID`)).json()
    assert.ok(paid.length >= 1)
    assert.ok(paid.every(o => o.status === 'PAID'))

    // 关键词搜索订单号
    const byKeyword = await (await fetch(`${apiBase}/api/admin/orders?keyword=${pending.id}`)).json()
    assert.strictEqual(byKeyword.length, 1)
    assert.strictEqual(byKeyword[0].id, pending.id)
    assert.strictEqual(pending.status, 'PENDING_PAYMENT')
  })

  it('发货: PAID → SHIPPED；非 PAID 被拒绝', async () => {
    const pending = await createAndPay('13800000009', '发货用户', '1')
    // 非 PAID 发货被拒
    const badShip = await post(`/api/admin/orders/${pending.id}/ship`)
    assert.strictEqual(badShip.status, 400)
    assert.strictEqual((await badShip.json()).code, 'ORDER_STATUS_INVALID')

    // 支付后发货成功
    await post(`/api/payments/${pending.id}`)
    const shipRes = await post(`/api/admin/orders/${pending.id}/ship`)
    assert.strictEqual(shipRes.status, 200)
    assert.strictEqual((await shipRes.json()).status, 'SHIPPED')
  })

  it('取消: 待支付可取消；已支付被拒绝', async () => {
    const pending = await createAndPay('13800000010', '取消甲', '1')
    const cancelRes = await post(`/api/admin/orders/${pending.id}/cancel`)
    assert.strictEqual(cancelRes.status, 200)
    assert.strictEqual((await cancelRes.json()).status, 'CANCELLED')

    // 已支付不可取消
    const paidOrder = await createAndPay('13800000011', '取消乙', '2')
    await post(`/api/payments/${paidOrder.id}`)
    const badCancel = await post(`/api/admin/orders/${paidOrder.id}/cancel`)
    assert.strictEqual(badCancel.status, 400)
    assert.strictEqual((await badCancel.json()).code, 'ORDER_NOT_CANCELLABLE')
  })

  it('操作不存在订单返回 404', async () => {
    const shipRes = await post('/api/admin/orders/order_nope/ship')
    assert.strictEqual(shipRes.status, 404)
    assert.strictEqual((await shipRes.json()).code, 'ORDER_NOT_FOUND')
  })
})

describe('C 端我的订单 API (@api)', () => {
  let apiBase = ''
  let apiStop = () => {}

  before(async () => {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    apiBase = `http://127.0.0.1:${port}`
    apiStop = () => server.close()
  })
  after(() => apiStop())

  const post = (path, body) => fetch(`${apiBase}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })

  it('按用户查询订单（归属隔离 + 倒序，会话解析 userId）', async () => {
    const p1 = await (await post('/api/products', { name: '测试商品甲', priceCents: 1000, stock: 99 })).json()
    const p2 = await (await post('/api/products', { name: '测试商品乙', priceCents: 2000, stock: 99 })).json()

    // user_my 会话下两单（R-SES-007 归属会话用户）
    const myAuth = await registerSession(apiBase, '13800000012', '我的用户')
    await fetch(`${apiBase}/api/cart/items`, {
      method: 'POST', headers: myAuth.authHeaders, body: JSON.stringify({ productId: p1.id, quantity: 1 })
    })
    const o1 = await (await fetch(`${apiBase}/api/orders`, {
      method: 'POST', headers: myAuth.authHeaders, body: JSON.stringify({})
    })).json()
    await fetch(`${apiBase}/api/cart/items`, {
      method: 'POST', headers: myAuth.authHeaders, body: JSON.stringify({ productId: p2.id, quantity: 1 })
    })
    const o2 = await (await fetch(`${apiBase}/api/orders`, {
      method: 'POST', headers: myAuth.authHeaders, body: JSON.stringify({})
    })).json()
    // 其他用户下一单
    const otherAuth = await registerSession(apiBase, '13800000013', '他人用户')
    await fetch(`${apiBase}/api/cart/items`, {
      method: 'POST', headers: otherAuth.authHeaders, body: JSON.stringify({ productId: p1.id, quantity: 1 })
    })
    const o3 = await (await fetch(`${apiBase}/api/orders`, {
      method: 'POST', headers: otherAuth.authHeaders, body: JSON.stringify({})
    })).json()

    // 我的订单：GET /api/orders（携带会话，userId 由会话解析；即使附带 ?userId= 也不越权）
    const mine = await (await fetch(`${apiBase}/api/orders?userId=user_other`, { headers: myAuth.authHeaders })).json()
    assert.strictEqual(mine.length, 2)
    // 倒序（后创建在前）
    assert.strictEqual(mine[0].id, o2.id)
    assert.strictEqual(mine[1].id, o1.id)
    // 归属隔离: 不含 o3
    assert.ok(!mine.some(o => o.id === o3.id))
    // 订单含 createdAt
    assert.ok(mine[0].createdAt)
  })

  it('未登录访问我的订单返回 401 UNAUTHORIZED', async () => {
    const res = await fetch(`${apiBase}/api/orders`)
    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.strictEqual(body.code, 'UNAUTHORIZED')
    assert.match(body.message, /请先登录/)
  })

  it('无订单用户返回空数组', async () => {
    const auth = await registerSession(apiBase, '13800000014', '无订单用户')
    const res = await (await fetch(`${apiBase}/api/orders`, { headers: auth.authHeaders })).json()
    assert.deepStrictEqual(res, [])
  })

  describe('注册 API（@api）', () => {
    const postJson = (path, body) =>
      fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

    it('合法注册返回 201，含用户与会话凭证，响应无密码泄露', async () => {
      const res = await postJson('/api/auth/register', { phone: '13888217536', nickname: '林晓明', password: '123456' })
      assert.strictEqual(res.status, 201)
      const body = await res.json()
      assert.ok(body.user.id.startsWith('user_')) // ID 由服务端序列分配（非固定首值）
      assert.strictEqual(body.user.phone, '13888217536')
      assert.strictEqual(body.user.nickname, '林晓明')
      assert.strictEqual(body.user.status, '正常')
      assert.ok(body.sessionToken)
      // 响应体不含密码字段
      const raw = JSON.stringify(body)
      assert.ok(!raw.includes('123456'))
      assert.ok(!raw.includes('passwordHash'))
    })

    it('重复手机号返回 409 PHONE_ALREADY_REGISTERED，不创建重复用户', async () => {
      await postJson('/api/auth/register', { phone: '13912345678', nickname: '陈晓芸', password: '123456' })
      const res = await postJson('/api/auth/register', { phone: '13912345678', nickname: '另一个用户', password: 'abcdef' })
      assert.strictEqual(res.status, 409)
      const body = await res.json()
      assert.strictEqual(body.code, 'PHONE_ALREADY_REGISTERED')
      assert.match(body.message, /该手机号已注册，请直接登录/)
    })

    it('非法手机号返回 400 INVALID_PHONE', async () => {
      const res = await postJson('/api/auth/register', { phone: '123', password: '123456' })
      assert.strictEqual(res.status, 400)
      const body = await res.json()
      assert.strictEqual(body.code, 'INVALID_PHONE')
      assert.match(body.message, /请输入 11 位有效手机号/)
    })

    it('密码不足 6 位返回 400 PASSWORD_TOO_SHORT', async () => {
      const res = await postJson('/api/auth/register', { phone: '13888217536', password: '123' })
      assert.strictEqual(res.status, 400)
      const body = await res.json()
      assert.strictEqual(body.code, 'PASSWORD_TOO_SHORT')
      assert.match(body.message, /密码至少 6 位/)
    })

    it('注册成功即可用会话凭证解析登录态', async () => {
      const res = await postJson('/api/auth/register', { phone: '13888217777', password: '123456' })
      assert.strictEqual(res.status, 201)
      const { user, sessionToken } = await res.json()
      assert.strictEqual(user.nickname, '7777用户') // 默认昵称
      assert.ok(sessionToken.length > 0)
    })
  })

  describe('登录 API（@api）', () => {
    const postJson = (path, body) =>
      fetch(`${apiBase}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

    it('正确凭证登录返回 201，含会话凭证与脱敏用户，无密码泄露', async () => {
      // 预置已注册用户（若同手机号已注册（409）则直接走登录）
      await postJson('/api/auth/register', { phone: '13888217536', nickname: '林晓明', password: '123456' })
      const res = await postJson('/api/auth/login', { phone: '13888217536', password: '123456' })
      assert.strictEqual(res.status, 201)
      const body = await res.json()
      assert.ok(body.user.id.startsWith('user_')) // 登录恢复同一用户主体
      assert.strictEqual(body.user.phone, '13888217536')
      assert.strictEqual(body.user.nickname, '林晓明')
      assert.strictEqual(body.user.status, '正常')
      assert.ok(body.sessionToken)
      const raw = JSON.stringify(body)
      assert.ok(!raw.includes('passwordHash'))
      assert.ok(!raw.includes('123456'))
    })

    it('密码错误返回 401 INVALID_CREDENTIALS，不创建会话', async () => {
      await postJson('/api/auth/register', { phone: '13888217536', nickname: '林晓明', password: '123456' })
      const res = await postJson('/api/auth/login', { phone: '13888217536', password: '654321' })
      assert.strictEqual(res.status, 401)
      const body = await res.json()
      assert.strictEqual(body.code, 'INVALID_CREDENTIALS')
      assert.match(body.message, /手机号或密码不正确，请重试/)
    })

    it('账号不存在返回 401 INVALID_CREDENTIALS（与密码错误提示一致）', async () => {
      const res = await postJson('/api/auth/login', { phone: '13100000000', password: '123456' })
      assert.strictEqual(res.status, 401)
      const body = await res.json()
      assert.strictEqual(body.code, 'INVALID_CREDENTIALS')
      assert.strictEqual(body.message, (await (async () => {
        await postJson('/api/auth/register', { phone: '13888217536', password: '123456' })
        const wrong = await postJson('/api/auth/login', { phone: '13888217536', password: '654321' })
        return (await wrong.json()).message
      })()))
      // 防枚举：两条失败路径提示完全一致
    })

    it('禁用用户返回 403 USER_DISABLED，不创建会话', async () => {
      await postJson('/api/auth/register', { phone: '15876543210', nickname: '王强', password: '123456' })
      // 测试后门置为禁用（NODE_ENV=test 时可用，对齐 E2E 数据准备）
      const disableRes = await postJson('/api/__test/user-status', { phone: '15876543210', status: '禁用' })
      assert.strictEqual(disableRes.status, 200)
      const res = await postJson('/api/auth/login', { phone: '15876543210', password: '123456' })
      assert.strictEqual(res.status, 403)
      const body = await res.json()
      assert.strictEqual(body.code, 'USER_DISABLED')
      assert.match(body.message, /该账户已被禁用，如有疑问请联系平台客服/)
    })

    it('非法手机号返回 400 INVALID_PHONE，不发起凭证校验', async () => {
      const res = await postJson('/api/auth/login', { phone: '123', password: '123456' })
      assert.strictEqual(res.status, 400)
      const body = await res.json()
      assert.strictEqual(body.code, 'INVALID_PHONE')
      assert.match(body.message, /请输入 11 位有效手机号/)
    })
  })
})

describe('会话生命周期 API（@api）', () => {
  let apiBase = ''
  let apiStop = () => {}

  before(async () => {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    apiBase = `http://127.0.0.1:${port}`
    apiStop = () => server.close()
  })
  after(() => apiStop())

  const postJson = (path, body) =>
    fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

  it('未登录下单返回 401 UNAUTHORIZED（R-SES-002）', async () => {
    const res = await postJson('/api/orders', {})
    assert.strictEqual(res.status, 401)
    const body = await res.json()
    assert.strictEqual(body.code, 'UNAUTHORIZED')
    assert.match(body.message, /请先登录/)
  })

  it('未登录结算返回 401 UNAUTHORIZED（R-SES-002）', async () => {
    const res = await postJson('/api/checkout', {})
    assert.strictEqual(res.status, 401)
    assert.strictEqual((await res.json()).code, 'UNAUTHORIZED')
  })

  it('伪造会话凭证访问我的订单返回 401，不泄露业务数据', async () => {
    const res = await fetch(`${apiBase}/api/orders`, {
      headers: { Authorization: 'Bearer forged-token' }
    })
    assert.strictEqual(res.status, 401)
    const raw = await res.text()
    assert.ok(!raw.includes('order_'))
  })

  it('下单绑定当前会话 userId（R-SES-007，替代 body.userId 自报）', async () => {
    // 自报 user_other，但会话归属 user_1001 → 订单归属会话用户
    const auth = await registerSession(apiBase, '13800000015', '会话归属用户')
    await fetch(`${apiBase}/api/cart/items`, {
      method: 'POST', headers: auth.authHeaders, body: JSON.stringify({ productId: '1', quantity: 1 })
    })
    const res = await fetch(`${apiBase}/api/orders`, {
      method: 'POST',
      headers: auth.authHeaders,
      body: JSON.stringify({ userId: 'user_other' }) // 自报被忽略
    })
    assert.strictEqual(res.status, 201)
    const order = await res.json()
    assert.strictEqual(order.userId, auth.user.id)
  })

  it('退出登录销毁会话：原凭证访问我的订单返回 401（R-SES-005）', async () => {
    const auth = await registerSession(apiBase, '13800000016', '退出用户')
    // 退出前可访问
    const before = await fetch(`${apiBase}/api/orders`, { headers: auth.authHeaders })
    assert.strictEqual(before.status, 200)
    // 退出登录（携带会话凭证 → 服务端销毁）
    const logout = await fetch(`${apiBase}/api/auth/logout`, { method: 'POST', headers: auth.authHeaders })
    assert.strictEqual(logout.status, 200)
    // 原凭证失效
    const after = await fetch(`${apiBase}/api/orders`, { headers: auth.authHeaders })
    assert.strictEqual(after.status, 401)
    assert.strictEqual((await after.json()).code, 'UNAUTHORIZED')
  })

  it('退出登录不携带凭证幂等成功', async () => {
    const res = await postJson('/api/auth/logout', {})
    assert.strictEqual(res.status, 200)
    assert.deepStrictEqual(await res.json(), { ok: true })
  })

  it('禁用用户持会话访问需登录接口返回 403 USER_DISABLED（R-SES-006）', async () => {
    const auth = await registerSession(apiBase, '15876543210', '王强')
    // 测试后门置为禁用
    const disableRes = await postJson('/api/__test/user-status', { phone: '15876543210', status: '禁用' })
    assert.strictEqual(disableRes.status, 200)
    // 禁用后既有会话访问我的订单被拒
    const res = await fetch(`${apiBase}/api/orders`, { headers: auth.authHeaders })
    assert.strictEqual(res.status, 403)
    const raw = await res.text()
    const body = JSON.parse(raw)
    assert.strictEqual(body.code, 'USER_DISABLED')
    assert.match(body.message, /该账户已被禁用，如有疑问请联系平台客服/)
    // 不返回任何订单数据
    assert.ok(!raw.includes('order_'))
  })

  it('禁用用户持会话下单也被拒绝（R-SES-006）', async () => {
    const auth = await registerSession(apiBase, '15876543211', '禁用下单用户')
    await postJson('/api/__test/user-status', { phone: '15876543211', status: '禁用' })
    const res = await fetch(`${apiBase}/api/orders`, {
      method: 'POST',
      headers: auth.authHeaders,
      body: JSON.stringify({})
    })
    assert.strictEqual(res.status, 403)
    assert.strictEqual((await res.json()).code, 'USER_DISABLED')
  })
})

describe('B 端用户管理 API（@api）', () => {
  let apiBase = ''
  let apiStop = () => {}

  before(async () => {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    apiBase = `http://127.0.0.1:${port}`
    apiStop = () => server.close()
  })
  after(() => apiStop())

  const postJson = (path, body, headers = {}) =>
    fetch(`${apiBase}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    })

  const get = (path, headers = {}) => fetch(`${apiBase}${path}`, { headers })
  const patchJson = (path, body, headers = {}) =>
    fetch(`${apiBase}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body)
    })

  // 创建并提升角色的辅助：注册 → 测试后门置角色 → 登录返回会话凭证（复用 ISSUE-012 模式）
  async function setupUser(phone, nickname, role) {
    await postJson('/api/auth/register', { phone, nickname, password: '123456' })
    const roleRes = await postJson('/api/__test/user-role', { phone, role })
    assert.strictEqual(roleRes.status, 200)
    const login = await postJson('/api/auth/login', { phone, password: '123456' })
    assert.strictEqual(login.status, 201)
    const body = await login.json()
    return {
      user: body.user,
      authHeaders: { 'Content-Type': 'application/json', Authorization: `Bearer ${body.sessionToken}` }
    }
  }

  it('运营角色：列表返回全部用户与订单数聚合（R-ADM-002）', async () => {
    const operator = await setupUser('13600000001', '陈晓芸', '运营')
    // 预置买家与订单
    const buyer = await setupUser('13888217536', '林晓明', '客户')
    await fetch(`${apiBase}/api/cart/items`, {
      method: 'POST', headers: buyer.authHeaders, body: JSON.stringify({ productId: '1', quantity: 1 })
    })
    await fetch(`${apiBase}/api/orders`, { method: 'POST', headers: buyer.authHeaders, body: JSON.stringify({}) })

    const res = await get('/api/admin/users', operator.authHeaders)
    assert.strictEqual(res.status, 200)
    const list = await res.json()
    const lin = list.find(u => u.phone === '13888217536')
    assert.ok(lin, '列表中应包含林晓明')
    assert.strictEqual(lin.nickname, '林晓明')
    assert.strictEqual(lin.orderCount, 1)
    // 响应脱敏：无密码字段
    assert.ok(!('passwordHash' in lin))
  })

  it('运营角色：按手机号/昵称关键词检索（R-ADM-003）', async () => {
    const operator = await setupUser('13600000002', '王琳', '运营')
    await setupUser('13888217536', '林晓明', '客户')
    const byPhone = await get('/api/admin/users?keyword=1388821', operator.authHeaders)
    const phoneList = await byPhone.json()
    assert.strictEqual(phoneList.length, 1)
    assert.strictEqual(phoneList[0].nickname, '林晓明')
    const byNick = await get(`/api/admin/users?keyword=${encodeURIComponent('林晓')}`, operator.authHeaders)
    const nickList = await byNick.json()
    assert.strictEqual(nickList.length, 1)
    assert.strictEqual(nickList[0].phone, '13888217536')
  })

  it('运营角色：详情返回基础信息 + 该用户订单聚合（R-ADM-004）', async () => {
    const operator = await setupUser('13600000003', '陈运营', '运营')
    const buyer = await setupUser('13777777770', '详情买家', '客户')
    await fetch(`${apiBase}/api/cart/items`, {
      method: 'POST', headers: buyer.authHeaders, body: JSON.stringify({ productId: '1', quantity: 1 })
    })
    const order = await (await fetch(`${apiBase}/api/orders`, { method: 'POST', headers: buyer.authHeaders, body: JSON.stringify({}) })).json()

    const res = await get(`/api/admin/users/${buyer.user.id}`, operator.authHeaders)
    assert.strictEqual(res.status, 200)
    const detail = await res.json()
    assert.strictEqual(detail.nickname, '详情买家')
    assert.strictEqual(detail.orders.length, 1)
    assert.strictEqual(detail.orders[0].id, order.id)
  })

  it('详情：用户不存在返回 404 USER_NOT_FOUND', async () => {
    const operator = await setupUser('13600000004', '运营丁', '运营')
    const res = await get('/api/admin/users/user_9999', operator.authHeaders)
    assert.strictEqual(res.status, 404)
    assert.strictEqual((await res.json()).code, 'USER_NOT_FOUND')
  })

  it('禁用用户：状态变更 + 该用户既有会话立即失效（R-ADM-005 联动 R-SES-006）', async () => {
    const operator = await setupUser('13600000005', '运营戊', '运营')
    const wang = await setupUser('15876543210', '王强', '客户')
    // 王强下单成功（会话有效）
    await fetch(`${apiBase}/api/cart/items`, {
      method: 'POST', headers: wang.authHeaders, body: JSON.stringify({ productId: '1', quantity: 1 })
    })
    const orderRes = await fetch(`${apiBase}/api/orders`, { method: 'POST', headers: wang.authHeaders, body: JSON.stringify({}) })
    assert.strictEqual(orderRes.status, 201)

    // 运营通过 B 端接口禁用王强
    const disableRes = await patchJson(`/api/admin/users/${wang.user.id}/status`, { status: '禁用' }, operator.authHeaders)
    assert.strictEqual(disableRes.status, 200)
    assert.strictEqual((await disableRes.json()).status, '禁用')

    // 王强既有会话访问我的订单 → 403 USER_DISABLED，无订单数据
    const access = await get('/api/orders', wang.authHeaders)
    assert.strictEqual(access.status, 403)
    const raw = await access.text()
    assert.ok(!raw.includes('order_'))
    assert.strictEqual(JSON.parse(raw).code, 'USER_DISABLED')

    // 王强登录 → 403 USER_DISABLED
    const login = await postJson('/api/auth/login', { phone: '15876543210', password: '123456' })
    assert.strictEqual(login.status, 403)
    assert.strictEqual((await login.json()).code, 'USER_DISABLED')
  })

  it('启用用户：状态恢复 + 可重新登录（R-ADM-006）', async () => {
    const operator = await setupUser('13600000006', '运营己', '运营')
    const wang = await setupUser('13777777771', '启用用户', '客户')
    await patchJson(`/api/admin/users/${wang.user.id}/status`, { status: '禁用' }, operator.authHeaders)
    // 启用
    const enableRes = await patchJson(`/api/admin/users/${wang.user.id}/status`, { status: '正常' }, operator.authHeaders)
    assert.strictEqual(enableRes.status, 200)
    assert.strictEqual((await enableRes.json()).status, '正常')
    // 重新登录成功
    const login = await postJson('/api/auth/login', { phone: '13777777771', password: '123456' })
    assert.strictEqual(login.status, 201)
  })

  it('非法状态值返回 400 INVALID_STATUS，状态不变', async () => {
    const operator = await setupUser('13600000007', '运营庚', '运营')
    const wang = await setupUser('13777777772', '非法状态用户', '客户')
    const res = await patchJson(`/api/admin/users/${wang.user.id}/status`, { status: '冻结' }, operator.authHeaders)
    assert.strictEqual(res.status, 400)
    assert.strictEqual((await res.json()).code, 'INVALID_STATUS')
    const detail = await get(`/api/admin/users/${wang.user.id}`, operator.authHeaders)
    assert.strictEqual((await detail.json()).status, '正常')
  })

  it('客服角色访问用户列表返回 403，不泄露敏感信息（R-ADM-001/007）', async () => {
    const service = await setupUser('13600000008', '客服小赵', '客服')
    await setupUser('13888217536', '林晓明', '客户')
    const res = await get('/api/admin/users', service.authHeaders)
    assert.strictEqual(res.status, 403)
    const raw = await res.text()
    assert.ok(!raw.includes('13888217536'), '响应不包含任何用户手机号')
    assert.strictEqual(JSON.parse(raw).code, 'FORBIDDEN')
  })

  it('未登录访问用户列表返回 403（无会话）', async () => {
    const res = await get('/api/admin/users')
    assert.strictEqual(res.status, 403)
    assert.strictEqual((await res.json()).code, 'FORBIDDEN')
  })

  it('普通客户角色访问用户管理返回 403（非运营）', async () => {
    const customer = await setupUser('13888217536', '林晓明', '客户')
    const res = await get('/api/admin/users', customer.authHeaders)
    assert.strictEqual(res.status, 403)
    assert.strictEqual((await res.json()).code, 'FORBIDDEN')
  })
})
