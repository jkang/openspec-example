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
})
