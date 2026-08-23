import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { createServer } from '../src/http/server.js'

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
    // 1. 上架商品: 100元
    const res1 = await fetch(`${base}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Integration Item', priceCents: 10000, stock: 10 }),
    })
    assert.strictEqual(res1.status, 201)
    const product = await res1.json()

    // 2. 加购
    await fetch(`${base}/api/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: product.id, quantity: 1 }),
    })

    // 3. 检查可用优惠券 (应该是之前注入的 PERCENT9 和 FLAT10)
    const resCoupons = await fetch(`${base}/api/coupons`)
    assert.strictEqual(resCoupons.status, 200)
    // 找到 PERCENT9 (9折 -> 减10元) 和 FLAT10 (减10元)
    // 根据 getBestCoupon 的逻辑，金额相同时按 ID 升序，FLAT10 会被选中 (F < P)
    
    // 4. 下单 (不传 couponId，触发自动推荐)
    const res3 = await fetch(`${base}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user_dev' }),
    })
    assert.strictEqual(res3.status, 201)
    const order = await res3.json()
    
    assert.strictEqual(order.totalCents, 10000)
    // 最优券应该是 FLAT10 (减1000) 或 PERCENT9 (减1000)
    // 金额相同时按 ID 排序: FLAT10 < PERCENT9
    assert.strictEqual(order.couponId, 'FLAT10')
    assert.strictEqual(order.discountCents, 1000)
    assert.strictEqual(order.actualPaidCents, 9000)
  })

  it('多用户购物车隔离性', async () => {
    const userA = 'user_a'
    const userB = 'user_b'
    const productId = '1'

    // User A 加购 2 个
    await fetch(`${base}/api/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userA, productId, quantity: 2 }),
    })

    // User B 加购 5 个
    await fetch(`${base}/api/cart/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userB, productId, quantity: 5 }),
    })

    // 验证 User A 的结算预览 (触发 checkout 但不下单)
    const resA = await fetch(`${base}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userA }),
    })
    const previewA = await resA.json()
    // 键盘 29900 * 2 = 59800
    assert.strictEqual(previewA.totalCents, 59800)

    // 验证 User B 的结算预览
    const resB = await fetch(`${base}/api/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userB }),
    })
    const previewB = await resB.json()
    // 键盘 29900 * 5 = 149500
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

    // 他人下单: 不命中该实例 (FLAT10 与 PERCENT9 各减 1000, 按 ID 升序取 FLAT10)
    await post('/api/cart/items', { userId: 'user_1004', productId: product.id, quantity: 1 })
    const otherOrderRes = await post('/api/orders', { userId: 'user_1004' })
    const otherOrder = await otherOrderRes.json()
    assert.strictEqual(otherOrder.couponId, 'FLAT10')
    assert.strictEqual(otherOrder.discountCents, 1000)

    // 持有人下单: 命中 8 折实例 (减 2000)
    await post('/api/cart/items', { userId: 'user_1003', productId: product.id, quantity: 1 })
    const holderOrderRes = await post('/api/orders', { userId: 'user_1003' })
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
    // 加购商品 1 (键盘, 库存 99)
    await post('/api/cart/items', { userId: 'user_pay', productId: '1', quantity: 1 })
    // 下单
    const orderRes = await post('/api/orders', { userId: 'user_pay' })
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
    await post('/api/cart/items', { userId: 'user_pay2', productId: '2', quantity: 1 })
    const order = await (await post('/api/orders', { userId: 'user_pay2' })).json()
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
