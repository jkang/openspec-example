import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { UserRepo, OrderRepo, ProductRepo, CartRepo, CouponRepo, ReceivableRepo, ReceiptRepo } from '../src/repo/memoryRepo.js'
import { OrderService } from '../src/services/order.js'
import { CouponService } from '../src/services/coupon.js'
import { AccountsReceivableService, addDaysYMD, assertCreditDays } from '../src/services/accountsReceivable.js'
import { createServer } from '../src/http/server.js'

process.env.NODE_ENV = 'test'

// ==================== 应收生成领域（@unit，R-AR-001~005） ====================

describe('应收账款服务（@unit）', () => {
  function setup() {
    const userRepo = new UserRepo()
    const orderRepo = new OrderRepo()
    const productRepo = new ProductRepo()
    const cartRepo = new CartRepo()
    const couponRepo = new CouponRepo()
    const receivableRepo = new ReceivableRepo()
    productRepo.save({ id: '1', name: '极简机械键盘', priceCents: 29900, stock: 99 })
    productRepo.save({ id: '2', name: '无线办公鼠标', priceCents: 8900, stock: 99 })
    const couponService = new CouponService(couponRepo)
    const orderService = new OrderService(cartRepo, orderRepo, productRepo, couponService)
    const ar = new AccountsReceivableService(receivableRepo, userRepo)
    return { userRepo, orderRepo, cartRepo, receivableRepo, orderService, ar }
  }

  function saveCustomer(repo, id, phone, creditDays) {
    repo.save({ id, phone, nickname: `客户${phone.slice(-4)}`, passwordHash: '', status: '正常', role: '客户', creditDays, createdAt: '2026-09-01 08:00' })
  }

  it('账期客户订单发货 → 生成应收（金额/到期日/未回款，R-AR-003）', () => {
    const { userRepo, cartRepo, orderRepo, receivableRepo, orderService, ar } = setup()
    saveCustomer(userRepo, 'user_ar1', '13900001111', 45)
    cartRepo.save({ userId: 'user_ar1', items: [{ productId: '1', quantity: 1 }] })
    const order = orderService.createOrder('user_ar1')
    order.status = 'PAID' // 单元层模拟账期信用放行（HTTP 层已处理）
    orderRepo.save(order)
    orderService.markShipped(order.id)
    const r = ar.onOrderShipped(orderRepo.findById(order.id))
    assert.ok(r)
    assert.strictEqual(r.userId, 'user_ar1')
    assert.strictEqual(r.orderId, order.id)
    assert.strictEqual(r.amountCents, 29900) // = actualPaidCents
    assert.strictEqual(r.receivedCents, 0)
    // dueDate = shippedAt + 45 天
    const shipped = orderRepo.findById(order.id).shippedAt
    assert.strictEqual(r.dueDate, addDaysYMD(shipped, 45))
  })

  it('现结客户（creditDays=0）发货 → 不生成应收（R-AR-004）', () => {
    const { userRepo, cartRepo, orderRepo, receivableRepo, orderService, ar } = setup()
    saveCustomer(userRepo, 'user_now1', '13900002222', 0)
    cartRepo.save({ userId: 'user_now1', items: [{ productId: '2', quantity: 1 }] })
    const order = orderService.createOrder('user_now1')
    order.status = 'PAID' // 模拟支付
    orderRepo.save(order)
    orderService.markShipped(order.id)
    const r = ar.onOrderShipped(orderRepo.findById(order.id))
    assert.strictEqual(r, null)
    assert.strictEqual(receivableRepo.findAll().length, 0)
  })

  it('幂等：同一订单重复发货钩子不重复生成（一单一应收）', () => {
    const { userRepo, cartRepo, orderRepo, orderService, ar } = setup()
    saveCustomer(userRepo, 'user_ar2', '13900003333', 30)
    cartRepo.save({ userId: 'user_ar2', items: [{ productId: '1', quantity: 1 }] })
    const order = orderService.createOrder('user_ar2')
    order.status = 'PAID'
    orderRepo.save(order)
    orderService.markShipped(order.id)
    const shippedOrder = orderRepo.findById(order.id)
    ar.onOrderShipped(shippedOrder)
    ar.onOrderShipped(shippedOrder) // 第二次
    const list = ar.listByUserId('user_ar2')
    assert.strictEqual(list.length, 1)
  })

  it('assertCreditDays 校验（0~365 整数）', () => {
    assert.strictEqual(assertCreditDays(0), 0)
    assert.strictEqual(assertCreditDays(45), 45)
    assert.throws(() => assertCreditDays(-1), /INVALID_CREDIT_DAYS/)
    assert.throws(() => assertCreditDays(366), /INVALID_CREDIT_DAYS/)
    assert.throws(() => assertCreditDays(1.5), /INVALID_CREDIT_DAYS/)
  })

  it('应收视图派生：剩余/结清/逾期', () => {
    const { userRepo, receivableRepo, ar } = setup()
    receivableRepo.save({ id: 'ar_x', userId: 'u1', orderId: 'o1', amountCents: 10000, receivedCents: 0, dueDate: '2020-01-01', createdAt: '' })
    const v = ar.toView(receivableRepo.findById('ar_x'), 0)
    assert.strictEqual(v.balance, 10000)
    assert.strictEqual(v.settled, false)
    assert.strictEqual(v.overdue, true) // dueDate 2020-01-01 < today
  })
})

// ==================== API（@api，发货转应收 + 账期配置权限） ====================

describe('账期客户应收生成 API（@api）', () => {
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
    const body = await login.json()
    return { token: body.sessionToken, user: body.user }
  }

  async function registerCustomerOrder(base, phone, nickname) {
    const c = await setupUser(base, phone, nickname, '客户')
    return c
  }

  it('账期客户发货 → 生成应收（R-AR-003），GET 用户详情可见 creditDays', async () => {
    const { base, close } = await startServer()
    try {
      const op = await setupUser(base, '13600090001', 'AR运营', '运营')
      const opAuth = { 'Content-Type': 'application/json', Authorization: `Bearer ${op.token}` }
      const c = await registerCustomerOrder(base, '13900001111', '账期客户甲')
      const cAuth = { 'Content-Type': 'application/json', Authorization: `Bearer ${c.token}` }
      // 运营配置账期 45 天
      const cdRes = await put(base, `/api/admin/users/${c.user.id}/credit-days`, { creditDays: 45 }, opAuth)
      assert.strictEqual(cdRes.status, 200)
      // 客户下单（无需模拟支付 → 免现结语义：订单可被运营直接发货）
      await post(base, '/api/cart/items', { productId: '1', quantity: 1 }, cAuth)
      const orderRes = await post(base, '/api/orders', {}, cAuth)
      assert.strictEqual(orderRes.status, 201)
      const order = await orderRes.json()
      // 运营发货 → 应收生成（ship 响应含 receivable）
      const shipRes = await post(base, `/api/admin/orders/${order.id}/ship`, {}, opAuth)
      assert.strictEqual(shipRes.status, 200)
      const ship = await shipRes.json()
      assert.ok(ship.receivable)
      assert.strictEqual(ship.receivable.amountCents, order.actualPaidCents)
      assert.strictEqual(ship.receivable.receivedCents, 0)
      // 用户详情返回 creditDays
      const detail = await (await get(base, `/api/admin/users/${c.user.id}`, opAuth)).json()
      assert.strictEqual(detail.creditDays, 45)
    } finally {
      close()
    }
  })

  it('现结客户发货 → 不生成应收（R-AR-004）', async () => {
    const { base, close } = await startServer()
    try {
      const op = await setupUser(base, '13600090002', 'AR运营2', '运营')
      const opAuth = { 'Content-Type': 'application/json', Authorization: `Bearer ${op.token}` }
      const c = await registerCustomerOrder(base, '13888217536', '现结客户')
      const cAuth = { 'Content-Type': 'application/json', Authorization: `Bearer ${c.token}` }
      await post(base, '/api/cart/items', { productId: '2', quantity: 1 }, cAuth)
      const order = await (await post(base, '/api/orders', {}, cAuth)).json()
      // 现结客户需先支付才可发货
      await post(base, `/api/payments/${order.id}`)
      const shipRes = await post(base, `/api/admin/orders/${order.id}/ship`, {}, opAuth)
      const ship = await shipRes.json()
      assert.ok(!ship.receivable) // 无应收
    } finally {
      close()
    }
  })

  it('账期配置权限：运营成功，老板/客服/未登录 403', async () => {
    const { base, close } = await startServer()
    try {
      const op = await setupUser(base, '13600090003', 'AR运营3', '运营')
      const boss = await setupUser(base, '13612345678', '李老板', '老板')
      const svc = await setupUser(base, '13600090004', '客服', '客服')
      const c = await registerCustomerOrder(base, '13900004444', '权限客户')
      const opAuth = { 'Content-Type': 'application/json', Authorization: `Bearer ${op.token}` }
      const bossAuth = { 'Content-Type': 'application/json', Authorization: `Bearer ${boss.token}` }
      const svcAuth = { 'Content-Type': 'application/json', Authorization: `Bearer ${svc.token}` }
      const r1 = await put(base, `/api/admin/users/${c.user.id}/credit-days`, { creditDays: 30 }, opAuth)
      assert.strictEqual(r1.status, 200)
      const r2 = await put(base, `/api/admin/users/${c.user.id}/credit-days`, { creditDays: 30 }, bossAuth)
      assert.strictEqual(r2.status, 403)
      const r3 = await put(base, `/api/admin/users/${c.user.id}/credit-days`, { creditDays: 30 }, svcAuth)
      assert.strictEqual(r3.status, 403)
      const r4 = await put(base, `/api/admin/users/${c.user.id}/credit-days`, { creditDays: 30 })
      assert.strictEqual(r4.status, 403)
    } finally {
      close()
    }
  })

  it('非法账期值拒绝（INVALID_CREDIT_DAYS）', async () => {
    const { base, close } = await startServer()
    try {
      const op = await setupUser(base, '13600090005', 'AR运营4', '运营')
      const c = await registerCustomerOrder(base, '13900005555', '非法客户')
      const opAuth = { 'Content-Type': 'application/json', Authorization: `Bearer ${op.token}` }
      const r = await put(base, `/api/admin/users/${c.user.id}/credit-days`, { creditDays: 500 }, opAuth)
      assert.strictEqual(r.status, 400)
      const body = await r.json()
      assert.strictEqual(body.error?.code || body.code, 'INVALID_CREDIT_DAYS')
    } finally {
      close()
    }
  })
})

// ==================== 回款登记（@unit，R-AR-101~106） ====================

describe('回款登记（@unit）', () => {
  function setup() {
    const userRepo = new UserRepo()
    const orderRepo = new OrderRepo()
    const productRepo = new ProductRepo()
    const cartRepo = new CartRepo()
    const couponRepo = new CouponRepo()
    const receivableRepo = new ReceivableRepo()
    const receiptRepo = new ReceiptRepo()
    const couponService = new CouponService(couponRepo)
    const orderService = new OrderService(cartRepo, orderRepo, productRepo, couponService)
    const ar = new AccountsReceivableService(receivableRepo, userRepo, receiptRepo)
    return { userRepo, receivableRepo, receiptRepo, ar }
  }

  it('部分回款 + 结清（R-AR-102/103）', () => {
    const { receivableRepo, receiptRepo, ar } = setup()
    receivableRepo.save({ id: 'ar_hd', userId: 'u1', orderId: 'o1', amountCents: 35600, receivedCents: 0, dueDate: '2099-01-01', createdAt: '' })
    const r1 = ar.recordReceipt('ar_hd', 20000, 'op1')
    assert.strictEqual(r1.receivedCents, 20000)
    assert.strictEqual(r1.balance, 15600)
    assert.strictEqual(r1.settled, false)
    assert.strictEqual(receiptRepo.findAll().length, 1)
    const r2 = ar.recordReceipt('ar_hd', 15600, 'op1')
    assert.strictEqual(r2.balance, 0)
    assert.strictEqual(r2.settled, true)
    assert.strictEqual(receiptRepo.findAll().length, 2)
  })

  it('超剩余/非正数/已结清拒绝（R-AR-102/103）', () => {
    const { receivableRepo, ar } = setup()
    receivableRepo.save({ id: 'ar_x2', userId: 'u1', orderId: 'o2', amountCents: 10000, receivedCents: 0, dueDate: '2099-01-01', createdAt: '' })
    assert.throws(() => ar.recordReceipt('ar_x2', 15000, 'op'), /INVALID_RECEIPT_AMOUNT/)
    assert.throws(() => ar.recordReceipt('ar_x2', 0, 'op'), /INVALID_RECEIPT_AMOUNT/)
    assert.throws(() => ar.recordReceipt('ar_missing', 100, 'op'), /RECEIVABLE_NOT_FOUND/)
    ar.recordReceipt('ar_x2', 10000, 'op')
    assert.throws(() => ar.recordReceipt('ar_x2', 1, 'op'), /RECEIVABLE_SETTLED/)
  })

  it('逾期推导 + 状态过滤（listAll，R-AR-104）', () => {
    const { receivableRepo, ar } = setup()
    receivableRepo.save({ id: 'ar_od', userId: 'u1', orderId: 'o3', amountCents: 5000, receivedCents: 0, dueDate: '2020-01-01', createdAt: '' })
    receivableRepo.save({ id: 'ar_st', userId: 'u1', orderId: 'o4', amountCents: 5000, receivedCents: 5000, dueDate: '2099-01-01', createdAt: '' })
    const all = ar.listAll('ALL')
    assert.strictEqual(all.length, 2)
    const od = ar.listAll('OVERDUE')
    assert.strictEqual(od.length, 1)
    assert.strictEqual(od[0].overdue, true)
    const st = ar.listAll('SETTLED')
    assert.strictEqual(st.length, 1)
  })
})

// ==================== 回款登记 API（@api） ====================

describe('回款登记 API（@api）', () => {
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

  async function setupUser(base, phone, nickname, role) {
    await post(base, '/api/auth/register', { phone, nickname, password: '123456' })
    await post(base, '/api/__test/user-role', { phone, role })
    const login = await post(base, '/api/auth/login', { phone, password: '123456' })
    return (await login.json()).sessionToken
  }

  async function makeReceivable(base) {
    const op = await setupUser(base, '13600120001', '运营A', '运营')
    const opAuth = { 'Content-Type': 'application/json', Authorization: `Bearer ${op}` }
    // 注册/登录账期客户
    await post(base, '/api/auth/register', { phone: '13900009999', nickname: '账期乙', password: '123456' }).catch(() => {})
    const loginRes = await post(base, '/api/auth/login', { phone: '13900009999', password: '123456' })
    const loginBody = await loginRes.json()
    const cu = loginBody.user
    await fetch(`${base}/api/admin/users/${cu.id}/credit-days`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${op}` }, body: JSON.stringify({ creditDays: 45 }) })
    const cToken = loginBody.sessionToken
    await post(base, '/api/cart/items', { productId: '1', quantity: 1 }, { 'Content-Type': 'application/json', Authorization: `Bearer ${cToken}` })
    const order = await (await post(base, '/api/orders', {}, { 'Content-Type': 'application/json', Authorization: `Bearer ${cToken}` })).json()
    const ship = await (await post(base, `/api/admin/orders/${order.id}/ship`, {}, opAuth)).json()
    return { opAuth, receivableId: ship.receivable.id, receivable: ship.receivable }
  }

  it('应收列表 + 部分/结清登记（运营）', async () => {
    const { base, close } = await startServer()
    try {
      const { opAuth, receivableId, receivable } = await makeReceivable(base)
      const amount = receivable.amountCents // 订单实付（含最优券后）
      // 部分回款 100 元
      const r1 = await (await post(base, `/api/admin/receivables/${receivableId}/receipt`, { amountCents: 10000 }, opAuth)).json()
      assert.strictEqual(r1.receivedCents, 10000)
      assert.strictEqual(r1.balance, amount - 10000)
      const list = await (await get(base, '/api/admin/receivables?status=OPEN', opAuth)).json()
      assert.ok(list.some(r => r.id === receivableId && r.balance === amount - 10000))
      // 结清剩余
      const r2 = await (await post(base, `/api/admin/receivables/${receivableId}/receipt`, { amountCents: amount - 10000 }, opAuth)).json()
      assert.strictEqual(r2.settled, true)
      assert.strictEqual(r2.balance, 0)
    } finally {
      close()
    }
  })

  it('登记金额校验 + 权限（客服/老板/未登录 403）', async () => {
    const { base, close } = await startServer()
    try {
      const { opAuth, receivableId } = await makeReceivable(base)
      const bad = await post(base, `/api/admin/receivables/${receivableId}/receipt`, { amountCents: 999999 }, opAuth)
      assert.strictEqual(bad.status, 400)
      // 客服/老板/未登录
      const svc = await setupUser(base, '13600120002', '客服', '客服')
      const boss = await setupUser(base, '13612345678', '李老板', '老板')
      const r1 = await post(base, `/api/admin/receivables/${receivableId}/receipt`, { amountCents: 100 }, { 'Content-Type': 'application/json', Authorization: `Bearer ${svc}` })
      assert.strictEqual(r1.status, 403)
      const r2 = await post(base, `/api/admin/receivables/${receivableId}/receipt`, { amountCents: 100 }, { 'Content-Type': 'application/json', Authorization: `Bearer ${boss}` })
      assert.strictEqual(r2.status, 403)
      const r3 = await post(base, `/api/admin/receivables/${receivableId}/receipt`, { amountCents: 100 })
      assert.strictEqual(r3.status, 403)
      // 老板只读列表 200
      const list = await get(base, '/api/admin/receivables', { Authorization: `Bearer ${boss}` })
      assert.strictEqual(list.status, 200)
    } finally {
      close()
    }
  })
})

// ==================== 应收只读聚合（@unit，R-AR-201~203） ====================

describe('应收只读聚合（@unit）', () => {
  function setup() {
    const userRepo = new UserRepo()
    const receivableRepo = new ReceivableRepo()
    const receiptRepo = new ReceiptRepo()
    const ar = new AccountsReceivableService(receivableRepo, userRepo, receiptRepo)
    userRepo.save({ id: 'u_a', nickname: '甲客户', creditDays: 45, phone: '13911110001' })
    userRepo.save({ id: 'u_b', nickname: '乙客户', creditDays: 30, phone: '13911110002' })
    return { receivableRepo, ar }
  }

  it('总应收/已回/未回/逾期 + 客户集中度', () => {
    const { receivableRepo, ar } = setup()
    receivableRepo.save({ id: 'r1', userId: 'u_a', orderId: 'o1', amountCents: 100000, receivedCents: 0, dueDate: '2020-01-01', createdAt: '' }) // 逾期全未回
    receivableRepo.save({ id: 'r2', userId: 'u_a', orderId: 'o2', amountCents: 50000, receivedCents: 20000, dueDate: '2099-01-01', createdAt: '' }) // 部分
    receivableRepo.save({ id: 'r3', userId: 'u_b', orderId: 'o3', amountCents: 30000, receivedCents: 30000, dueDate: '2099-01-01', createdAt: '' }) // 结清
    const s = ar.summary()
    assert.strictEqual(s.totalCents, 180000)
    assert.strictEqual(s.receivedCents, 50000)
    assert.strictEqual(s.balanceCents, 130000)
    assert.strictEqual(s.overdueCents, 100000) // r1 逾期全额
    const a = s.byCustomer.find(c => c.userId === 'u_a')
    assert.strictEqual(a.count, 2)
    assert.strictEqual(a.balanceCents, 130000)
    assert.strictEqual(a.overdueCents, 100000)
    assert.strictEqual(a.creditDays, 45)
    const b = s.byCustomer.find(c => c.userId === 'u_b')
    assert.strictEqual(b.balanceCents, 0)
  })
})

// ==================== 应收聚合 API（@api） ====================

describe('应收聚合 API（@api）', () => {
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

  async function setupUser(base, phone, nickname, role) {
    await post(base, '/api/auth/register', { phone, nickname, password: '123456' }).catch(() => {})
    await fetch(`${base}/api/__test/user-role`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, role }) })
    const login = await post(base, '/api/auth/login', { phone, password: '123456' })
    return (await login.json()).sessionToken
  }

  async function makeTwoReceivables(base) {
    const op = await setupUser(base, '13600130001', '运营S', '运营')
    const opAuth = { 'Content-Type': 'application/json', Authorization: `Bearer ${op}` }
    // 客户甲两单
    for (const phone of ['13900001001', '13900001002']) {
      await post(base, '/api/auth/register', { phone, nickname: '看板客户', password: '123456' }).catch(() => {})
      const login = await post(base, '/api/auth/login', { phone, password: '123456' })
      const cu = (await login.json()).user
      await fetch(`${base}/api/admin/users/${cu.id}/credit-days`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${op}` }, body: JSON.stringify({ creditDays: 45 }) })
    }
    // 客户甲订单×1 发货
    const login = await post(base, '/api/auth/login', { phone: '13900001001', password: '123456' })
    const cToken = (await login.json()).sessionToken
    await post(base, '/api/cart/items', { productId: '2', quantity: 2 }, { 'Content-Type': 'application/json', Authorization: `Bearer ${cToken}` })
    const order = await (await post(base, '/api/orders', {}, { 'Content-Type': 'application/json', Authorization: `Bearer ${cToken}` })).json()
    const ship = await (await post(base, `/api/admin/orders/${order.id}/ship`, {}, opAuth)).json()
    return { opAuth, receivableId: ship.receivable.id }
  }

  it('老板只读聚合（数值与应收单一致）', async () => {
    const { base, close } = await startServer()
    try {
      const { opAuth, receivableId } = await makeTwoReceivables(base)
      const boss = await setupUser(base, '13612345678', '李老板', '老板')
      const bossAuth = { 'Content-Type': 'application/json', Authorization: `Bearer ${boss}` }
      const list = await (await get(base, '/api/admin/receivables', bossAuth)).json()
      const sum = await (await get(base, '/api/admin/receivables/summary', bossAuth)).json()
      const expTotal = list.reduce((n, r) => n + r.amountCents, 0)
      const expRecv = list.reduce((n, r) => n + r.receivedCents, 0)
      assert.strictEqual(sum.totalCents, expTotal)
      assert.strictEqual(sum.receivedCents, expRecv)
      assert.ok(Array.isArray(sum.byCustomer))
      // 登记后联动
      await post(base, `/api/admin/receivables/${receivableId}/receipt`, { amountCents: 1000 }, opAuth)
      const sum2 = await (await get(base, '/api/admin/receivables/summary', bossAuth)).json()
      assert.strictEqual(sum2.receivedCents, expRecv + 1000)
      // 权限：客服 403、未登录 401
      const svc = await setupUser(base, '13600130002', '客服S', '客服')
      const r403 = await get(base, '/api/admin/receivables/summary', { Authorization: `Bearer ${svc}` })
      assert.strictEqual(r403.status, 403)
      const rAnon = await get(base, '/api/admin/receivables/summary')
      assert.strictEqual(rAnon.status, 403)
    } finally {
      close()
    }
  })
})
