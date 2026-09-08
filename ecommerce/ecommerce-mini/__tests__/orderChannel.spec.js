import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { CartRepo, OrderRepo, ProductRepo, CouponRepo, SessionRepo, UserRepo, ChannelConfigRepo } from '../src/repo/memoryRepo.js'
import { OrderService } from '../src/services/order.js'
import { CouponService } from '../src/services/coupon.js'
import { createServer } from '../src/http/server.js'

// 测试后门（reset / user-role）仅在 NODE_ENV=test 下启用
process.env.NODE_ENV = 'test'

// ==================== OrderService channel（@unit，R-ORDCH-001~005） ====================

describe('OrderService 订单渠道来源（@unit）', () => {
  function setup() {
    const cartRepo = new CartRepo()
    const orderRepo = new OrderRepo()
    const productRepo = new ProductRepo()
    const couponRepo = new CouponRepo()
    productRepo.save({ id: '1', name: '极简机械键盘', priceCents: 29900, stock: 99 })
    productRepo.save({ id: '2', name: '无线办公鼠标', priceCents: 8900, stock: 99 })
    const couponService = new CouponService(couponRepo)
    const svc = new OrderService(cartRepo, orderRepo, productRepo, couponService)
    return { cartRepo, orderRepo, svc }
  }

  it('默认 channel=WEB（不传 channel，存量兼容 R-ORDCH-001）', () => {
    const { cartRepo, orderRepo, svc } = setup()
    cartRepo.save({ userId: 'user_x', items: [{ productId: '1', quantity: 1 }] })
    const order = svc.createOrder('user_x')
    assert.strictEqual(order.channel, 'WEB')
    assert.strictEqual(orderRepo.findById(order.id).channel, 'WEB')
  })

  it('显式 channel=MINIPROGRAM → 订单写入 MINIPROGRAM（R-ORDCH-002）', () => {
    const { cartRepo, orderRepo, svc } = setup()
    cartRepo.save({ userId: 'user_mp', items: [{ productId: '2', quantity: 2 }] })
    const order = svc.createOrder('user_mp', null, 'MINIPROGRAM')
    assert.strictEqual(order.channel, 'MINIPROGRAM')
    assert.strictEqual(orderRepo.findById(order.id).channel, 'MINIPROGRAM')
  })

  it('非法 channel 值归一为 WEB', () => {
    const { cartRepo, svc } = setup()
    cartRepo.save({ userId: 'user_web', items: [{ productId: '1', quantity: 1 }] })
    const order = svc.createOrder('user_web', null, 'HACKED')
    assert.strictEqual(order.channel, 'WEB')
  })

  it('渠道不可变：状态流转不改 channel（R-ORDCH-005）', () => {
    const { cartRepo, orderRepo, svc } = setup()
    cartRepo.save({ userId: 'user_mp2', items: [{ productId: '1', quantity: 1 }] })
    const order = svc.createOrder('user_mp2', null, 'MINIPROGRAM')
    // 支付后（状态流转由 paymentService 负责），channel 保持
    order.status = 'PAID'
    orderRepo.save(order)
    assert.strictEqual(orderRepo.findById(order.id).channel, 'MINIPROGRAM')
    assert.strictEqual(orderRepo.findById(order.id).status, 'PAID')
  })

  it('checkout 透传 channel（R-ORDCH-002）', () => {
    const { cartRepo, svc } = setup()
    cartRepo.save({ userId: 'user_chk', items: [{ productId: '1', quantity: 1 }] })
    const order = svc.checkout('user_chk', null, 'MINIPROGRAM')
    assert.strictEqual(order.channel, 'MINIPROGRAM')
  })
})

// ==================== API（@api，channel 会话来源继承 + 防伪造） ====================

describe('订单渠道来源 API（@api）', () => {
  const post = (base, path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
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

  async function enableChannel(base) {
    const reg = await post(base, '/api/auth/register', { phone: '13600060001', nickname: '渠道运营', password: '123456' })
    await post(base, '/api/__test/user-role', { phone: '13600060001', role: '运营' })
    const login = await post(base, '/api/auth/login', { phone: '13600060001', password: '123456' })
    const { sessionToken } = await login.json()
    await fetch(`${base}/api/admin/channel/miniprogram`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` },
      body: JSON.stringify({ appid: 'wx-a', appsecret: 'secret', enabled: true })
    })
  }

  /** 网页注册用户并加购下单，返回订单 + 会话 */
  async function webUserOrder(base, phone, nickname, productId = '1', qty = 1) {
    const reg = await post(base, '/api/auth/register', { phone, nickname, password: '123456' })
    const { sessionToken } = await reg.json()
    const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` }
    await post(base, '/api/cart/items', { productId, quantity: qty }, auth)
    const orderRes = await post(base, '/api/orders', {}, auth)
    const order = await orderRes.json()
    return { sessionToken, order, auth }
  }

  it('WEB 会话下单 → channel=WEB（默认，R-ORDCH-001）', async () => {
    const { base, close } = await startServer()
    try {
      const { order } = await webUserOrder(base, '13888217536', '林晓明')
      assert.strictEqual(order.channel, 'WEB')
    } finally {
      close()
    }
  })

  it('MINIPROGRAM 会话（微信登录）下单 → channel=MINIPROGRAM（R-ORDCH-002）', async () => {
    const { base, close } = await startServer()
    try {
      await enableChannel(base)
      // 王倩经微信 bind 建号（会话 MINIPROGRAM）
      const bind = await post(base, '/api/auth/wechat/bind', { code: 'code_demo_002', phoneCode: 'phone_demo_001' })
      assert.strictEqual(bind.status, 201)
      const { sessionToken } = await bind.json()
      const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` }
      await post(base, '/api/cart/items', { productId: '2', quantity: 1 }, auth)
      const orderRes = await post(base, '/api/orders', {}, auth)
      assert.strictEqual(orderRes.status, 201)
      const order = await orderRes.json()
      assert.strictEqual(order.channel, 'MINIPROGRAM')
    } finally {
      close()
    }
  })

  it('防伪造：WEB 会话 + body.channel=MINIPROGRAM → 仍 WEB（Q7，R-ORDCH-002）', async () => {
    const { base, close } = await startServer()
    try {
      const reg = await post(base, '/api/auth/register', { phone: '13977778888', nickname: '伪造者', password: '123456' })
      const { sessionToken } = await reg.json()
      const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` }
      await post(base, '/api/cart/items', { productId: '1', quantity: 1 }, auth)
      const orderRes = await post(base, '/api/orders', { channel: 'MINIPROGRAM' }, auth) // 恶意传参
      const order = await orderRes.json()
      assert.strictEqual(order.channel, 'WEB') // 服务端按会话判定，忽略客户端
    } finally {
      close()
    }
  })

  it('B 端订单列表含 channel（存量缺省视为 WEB）', async () => {
    const { base, close } = await startServer()
    try {
      const { order: webOrder } = await webUserOrder(base, '13888217536', '林晓明')
      assert.strictEqual(webOrder.channel, 'WEB')
      // 运营查列表
      const reg = await post(base, '/api/auth/register', { phone: '13600060002', nickname: '订单运营', password: '123456' })
      await post(base, '/api/__test/user-role', { phone: '13600060002', role: '运营' })
      const login = await post(base, '/api/auth/login', { phone: '13600060002', password: '123456' })
      const { sessionToken } = await login.json()
      const list = await (await get(base, '/api/admin/orders', { Authorization: `Bearer ${sessionToken}` })).json()
      const found = list.find(o => o.id === webOrder.id)
      assert.ok(found)
      assert.strictEqual(found.channel, 'WEB')
    } finally {
      close()
    }
  })

  it('MINIPROGRAM 订单发货与网页单一致（R-ORDCH-004）', async () => {
    const { base, close } = await startServer()
    try {
      await enableChannel(base)
      const bind = await post(base, '/api/auth/wechat/bind', { code: 'code_demo_002', phoneCode: 'phone_demo_001' })
      const { sessionToken } = await bind.json()
      const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${sessionToken}` }
      await post(base, '/api/cart/items', { productId: '2', quantity: 1 }, auth)
      const order = await (await post(base, '/api/orders', {}, auth)).json()
      assert.strictEqual(order.channel, 'MINIPROGRAM')
      // 支付 → PAID → 发货 SHIPPED
      const pay = await post(base, `/api/payments/${order.id}`)
      assert.strictEqual(pay.status, 200)
      const paidOrder = await pay.json()
      assert.strictEqual(paidOrder.status, 'PAID')
      assert.strictEqual(paidOrder.channel, 'MINIPROGRAM') // channel 不变
      // 运营发货
      const reg = await post(base, '/api/auth/register', { phone: '13600060003', nickname: '发货运营', password: '123456' })
      await post(base, '/api/__test/user-role', { phone: '13600060003', role: '运营' })
      const login = await post(base, '/api/auth/login', { phone: '13600060003', password: '123456' })
      const opToken = (await login.json()).sessionToken
      const ship = await post(base, `/api/admin/orders/${order.id}/ship`, {}, { Authorization: `Bearer ${opToken}` })
      const shipped = await ship.json()
      assert.strictEqual(shipped.status, 'SHIPPED')
      assert.strictEqual(shipped.channel, 'MINIPROGRAM')
    } finally {
      close()
    }
  })
})
