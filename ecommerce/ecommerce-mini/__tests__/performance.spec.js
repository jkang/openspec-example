import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { createServer } from '../src/http/server.js'

process.env.NODE_ENV = 'test'

describe('性能基线测试', () => {
  let base = ''
  let stop = () => {}

  before(async () => {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    base = `http://127.0.0.1:${port}`
    stop = () => server.close()
  })
  after(() => stop())

  it('下单接口 P99 < 100ms', async () => {
    // Setup data: 上架商品 + 注册并登录（下单需会话凭证，R-SES-007）
    const res = await fetch(`${base}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Perf Item', priceCents: 100, stock: 1000 })
    })
    const product = await res.json()

    const regRes = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: '13888880000', nickname: '性能用户', password: '123456' })
    })
    const { sessionToken } = await regRes.json()
    const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` }

    const latencies = []
    const REQUESTS = 50

    for (let i = 0; i < REQUESTS; i++) {
        // Add to cart first (会话归属，下单后购物车清空，需重新加购)
        await fetch(`${base}/api/cart/items`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ productId: product.id, quantity: 1 })
        })

        const start = performance.now()
        await fetch(`${base}/api/orders`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({})
        })
        latencies.push(performance.now() - start)
    }

    latencies.sort((a, b) => a - b)
    const p99Index = Math.floor(latencies.length * 0.99)
    const p99 = latencies[p99Index]

    console.log(`P99 Latency: ${p99.toFixed(2)}ms`)
    assert.ok(p99 < 100, `P99 latency ${p99}ms exceeds SLO 100ms`)
  })
})
