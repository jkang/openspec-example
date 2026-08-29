import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createServer, resolveStorage } from '../src/http/server.js'

// 测试后门（reset / user-status / user-role）仅在 NODE_ENV=test 下启用；本文件显式指定
// storage 与 dataDir，不依赖全局 NODE_ENV，与其他测试文件（独立进程）互不干扰。
process.env.NODE_ENV = 'test'

const DATA_FILES = [
  'products.json', 'categories.json', 'coupons.json', 'issuances.json',
  'orders.json', 'carts.json', 'users.json', 'sessions.json'
]

/** 启动 server（随机端口），返回 base URL 与 close */
async function startServer({ storage, dataDir }) {
  const { server } = createServer({ storage, dataDir })
  await new Promise(resolve => server.listen(0, () => resolve(undefined)))
  const address = server.address()
  const port = address && typeof address === 'object' ? address.port : 0
  return {
    base: `http://127.0.0.1:${port}`,
    close: () => new Promise(resolve => server.close(() => resolve(undefined)))
  }
}

async function request(base, method, p, body, headers = {}) {
  const res = await fetch(`${base}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined
  })
  return { status: res.status, body: await res.json() }
}

const readJson = (dir, file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'))

describe('fileStore/fileRepo 单元测试（@unit）', () => {
  let tmp
  before(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'persist-unit-')) })
  after(() => { fs.rmSync(tmp, { recursive: true, force: true }) })

  it('首次启动自动初始化缺失数据文件（8 类，含 users/sessions/issuances）', async () => {
    const fresh = path.join(tmp, 'fresh')
    const s = await startServer({ storage: 'file', dataDir: fresh })
    await s.close()
    for (const f of DATA_FILES) {
      assert.ok(fs.existsSync(path.join(fresh, f)), `首次启动应自动创建 ${f}`)
    }
    // 种子对齐：users 注入演示用户 user_1001；carts/orders/issuances/sessions 空数据集
    const users = readJson(fresh, 'users.json')
    assert.ok(users.some(u => u.id === 'user_1001'), 'users.json 应含演示用户 user_1001')
    assert.deepStrictEqual(readJson(fresh, 'sessions.json'), [])
    assert.deepStrictEqual(readJson(fresh, 'issuances.json'), [])
    assert.deepStrictEqual(readJson(fresh, 'carts.json'), [])
    assert.deepStrictEqual(readJson(fresh, 'orders.json'), [])
  })

  it('已有数据文件保留，不注入种子（products/categories/coupons）', async () => {
    const dir = path.join(tmp, 'existing')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'products.json'), JSON.stringify([
      { id: 'x1', name: '自定义商品', priceCents: 100, stock: 1, categoryId: null, status: 'active' }
    ], null, 2))
    const s = await startServer({ storage: 'file', dataDir: dir })
    await s.close()
    const products = readJson(dir, 'products.json')
    assert.strictEqual(products.length, 1, '已有数据应原样保留，不注入种子')
    assert.strictEqual(products[0].id, 'x1')
  })

  it('写后一致性：新增商品后再次启动读取 products.json 含新记录', async () => {
    const dir = path.join(tmp, 'consistency')
    const s1 = await startServer({ storage: 'file', dataDir: dir })
    const res = await request(s1.base, 'POST', '/api/products', { name: '新增持久化商品', priceCents: 9900, stock: 5 })
    assert.strictEqual(res.status, 201)
    const productId = res.body.id
    await s1.close()

    const s2 = await startServer({ storage: 'file', dataDir: dir })
    const list = await request(s2.base, 'GET', '/api/products')
    assert.ok(list.body.some(p => p.id === productId), '重启后 products.json 应包含新商品')
    await s2.close()
  })

  it('损坏 JSON 文件安全降级：备份 .corrupt-* 保留现场，空数据集启动，不覆盖原数据', async () => {
    const { FileRepoAdapter } = await import('../src/repo/fileRepo.js')
    const dir = path.join(tmp, 'corrupt')
    fs.mkdirSync(dir, { recursive: true })
    const corruptContent = '{{{broken json'
    fs.writeFileSync(path.join(dir, 'products.json'), corruptContent)
    const repo = new FileRepoAdapter({ filename: 'products.json', dataDir: dir })
    assert.deepStrictEqual(repo.findAll(), [], '损坏文件应降级为空数据集')
    // 降级为「备份 + 空数据集」，而非原地覆盖销毁：
    const backups = fs.readdirSync(dir).filter(f => f.startsWith('products.json.corrupt-'))
    assert.strictEqual(backups.length, 1, `应恰好生成 1 个 .corrupt-* 备份，实际 ${backups.length}`)
    assert.strictEqual(
      fs.readFileSync(path.join(dir, backups[0]), 'utf-8'),
      corruptContent,
      '备份应保留原始损坏内容（现场不丢）'
    )
    assert.ok(!fs.existsSync(path.join(dir, 'products.json')),
      '损坏原文件应被重命名备份，原路径不应被空数组覆盖')
  })

  it('损坏备份后首次写操作原子重建有效文件（.corrupt-* 备份仍在）', async () => {
    const { FileRepoAdapter } = await import('../src/repo/fileRepo.js')
    const dir = path.join(tmp, 'corrupt-rebuild')
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, 'products.json'), '{{{broken json')
    const repo = new FileRepoAdapter({ filename: 'products.json', dataDir: dir })
    repo.save({ id: 'r1', name: '重建商品', priceCents: 100, stock: 1 })
    assert.ok(fs.existsSync(path.join(dir, 'products.json')), '写操作应重建目标文件')
    const products = readJson(dir, 'products.json')
    assert.strictEqual(products.length, 1)
    assert.strictEqual(products[0].id, 'r1')
    assert.strictEqual(
      fs.readdirSync(dir).filter(f => f.startsWith('products.json.corrupt-')).length,
      1,
      '备份文件应持续保留现场'
    )
  })

  it('原子写：写操作后目标文件有效且无 .tmp 残留', async () => {
    const { FileRepoAdapter } = await import('../src/repo/fileRepo.js')
    const dir = path.join(tmp, 'atomic')
    const repo = new FileRepoAdapter({ filename: 'products.json', dataDir: dir })
    repo.save({ id: 'a1', name: '原子写入商品', priceCents: 100, stock: 1 })
    repo.save({ id: 'a2', name: '原子写入商品二', priceCents: 200, stock: 2 })
    const tmps = fs.readdirSync(dir).filter(f => f.endsWith('.tmp'))
    assert.deepStrictEqual(tmps, [], '写操作后不应残留 .tmp 临时文件')
    const products = readJson(dir, 'products.json')
    assert.strictEqual(products.length, 2)
    assert.strictEqual(products[0].id, 'a1')
    assert.strictEqual(products[1].id, 'a2')
  })
})

describe('存储后端解析（resolveStorage，@unit）：缺省 file / test→memory / STORAGE 优先', () => {
  let tmp
  before(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'persist-storage-')) })
  after(() => { fs.rmSync(tmp, { recursive: true, force: true }) })

  const savedEnv = { NODE_ENV: process.env.NODE_ENV, STORAGE: process.env.STORAGE }
  after(() => {
    for (const [k, v] of Object.entries(savedEnv)) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  })

  /** 临时设置环境变量（undefined 表示删除），测试后恢复 */
  function withEnv(envPatch, fn) {
    const prev = {}
    for (const [k, v] of Object.entries(envPatch)) {
      prev[k] = process.env[k]
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
    try {
      return fn()
    } finally {
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) delete process.env[k]
        else process.env[k] = v
      }
    }
  }

  it('无任何环境变量（非 test）→ file（运行链路默认落盘）', () => {
    withEnv({ NODE_ENV: undefined, STORAGE: undefined }, () => {
      assert.strictEqual(resolveStorage(), 'file')
    })
  })

  it('NODE_ENV=test → memory（测试隔离）', () => {
    withEnv({ NODE_ENV: 'test', STORAGE: undefined }, () => {
      assert.strictEqual(resolveStorage(), 'memory')
    })
  })

  it('显式 STORAGE 优先于 NODE_ENV（STORAGE=file + NODE_ENV=test → file）', () => {
    withEnv({ NODE_ENV: 'test', STORAGE: 'file' }, () => {
      assert.strictEqual(resolveStorage(), 'file')
    })
  })

  it('显式 STORAGE 优先于 NODE_ENV（STORAGE=memory + 非 test → memory）', () => {
    withEnv({ NODE_ENV: undefined, STORAGE: 'memory' }, () => {
      assert.strictEqual(resolveStorage(), 'memory')
    })
  })

  it('显式 storage 参数优先于环境变量', () => {
    withEnv({ NODE_ENV: 'test', STORAGE: 'file' }, () => {
      assert.strictEqual(resolveStorage('memory'), 'memory')
      assert.strictEqual(resolveStorage('file'), 'file')
    })
  })

  it('createServer() 缺省（不传 storage/dataDir，DATA_DIR 指向临时目录）→ 默认 file 模式落盘 + 纯净种子', async () => {
    const dir = path.join(tmp, 'default-file')
    const prev = { DATA_DIR: process.env.DATA_DIR, NODE_ENV: process.env.NODE_ENV, STORAGE: process.env.STORAGE }
    process.env.DATA_DIR = dir
    delete process.env.NODE_ENV // 模拟非 test 运行链路
    delete process.env.STORAGE
    let s
    try {
      // 不传 storage 与 dataDir：resolveStorage() 缺省解析 → file；DATA_DIR 环境变量指定落盘目录
      s = await startServer({})
      const reg = await request(s.base, 'POST', '/api/auth/register', { phone: '13800008888', nickname: '缺省模式用户', password: '123456' })
      assert.strictEqual(reg.status, 201)
      for (const f of DATA_FILES) {
        assert.ok(fs.existsSync(path.join(dir, f)), `缺省 file 模式应落盘 ${f}`)
      }
      // 纯净种子基线（代码 seed 为唯一事实来源，data/ 为空时首启重建）
      const products = readJson(dir, 'products.json')
      assert.ok(products.some(p => p.id === '1' && p.stock === 99), '种子商品 stock 应为 99（纯净基线，非运行态污染值）')
      const coupons = readJson(dir, 'coupons.json')
      assert.ok(coupons.some(c => c.id === 'PERCENT9' && c.status === 'UNUSED'), '种子券 PERCENT9 应为 UNUSED（纯净基线）')
      const users = readJson(dir, 'users.json')
      assert.ok(users.some(u => u.id === 'user_1001'), 'users.json 应含演示用户 user_1001')
      assert.deepStrictEqual(readJson(dir, 'carts.json'), [])
      assert.deepStrictEqual(readJson(dir, 'orders.json'), [])
    } finally {
      if (s) await s.close()
      for (const [k, v] of Object.entries(prev)) {
        if (v === undefined) delete process.env[k]
        else process.env[k] = v
      }
    }
  })
})

describe('持久化集成测试（@api）：写操作落盘 + 进程重启恢复', () => {
  let tmp
  before(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'persist-api-')) })
  after(() => { fs.rmSync(tmp, { recursive: true, force: true }) })

  const phone = '13800001234'
  const password = '123456'

  it('注册/加购/下单/支付全部落盘 users/sessions/orders/carts', async () => {
    const s1 = await startServer({ storage: 'file', dataDir: tmp })
    try {
      // 1. 注册（自动登录）
      const reg = await request(s1.base, 'POST', '/api/auth/register', { phone, nickname: '持久化买家', password })
      assert.strictEqual(reg.status, 201)
      const { user, sessionToken } = reg.body
      assert.ok(user.id.startsWith('user_'), `用户 ID 应为 user_ 前缀，实际 ${user.id}`)
      const authHeaders = { Authorization: `Bearer ${sessionToken}` }

      // 2. 加购（购物车归属会话用户）
      await request(s1.base, 'POST', '/api/cart/items', { productId: '1', quantity: 2 }, authHeaders)
      const cartsBeforeOrder = readJson(tmp, 'carts.json')
      const cartRec = cartsBeforeOrder.find(c => c.userId === user.id)
      assert.ok(cartRec && cartRec.items.length === 1 && cartRec.items[0].quantity === 2,
        'carts.json 应按 userId 键控且含加购条目')

      // 3. 下单
      const order = await request(s1.base, 'POST', '/api/orders', {}, authHeaders)
      assert.strictEqual(order.status, 201)
      assert.strictEqual(order.body.userId, user.id)

      // 4. 支付
      const pay = await request(s1.base, 'POST', `/api/payments/${order.body.id}`)
      assert.strictEqual(pay.body.status, 'PAID')

      // 5. 落盘断言
      const users = readJson(tmp, 'users.json')
      assert.ok(users.some(u => u.phone === phone), 'users.json 应含注册用户')
      const sessions = readJson(tmp, 'sessions.json')
      assert.ok(sessions.some(s => s.token === sessionToken), 'sessions.json 应含会话凭证')
      const orders = readJson(tmp, 'orders.json')
      const stored = orders.find(o => o.id === order.body.id)
      assert.ok(stored, 'orders.json 应含订单')
      assert.strictEqual(stored.status, 'PAID', '订单状态应与内存一致')
    } finally {
      await s1.close()
    }
  })

  it('进程重启（第二次 createServer）后会话/订单/购物车/登录可恢复', async () => {
    const dir = path.join(tmp, 'restart')
    // 第一次启动（模拟进程 A）
    const s1 = await startServer({ storage: 'file', dataDir: dir })
    const reg = await request(s1.base, 'POST', '/api/auth/register', { phone, nickname: '重启买家', password })
    assert.strictEqual(reg.status, 201)
    const { user, sessionToken } = reg.body
    const authHeaders = { Authorization: `Bearer ${sessionToken}` }
    await request(s1.base, 'POST', '/api/cart/items', { productId: '1', quantity: 1 }, authHeaders)
    const order = await request(s1.base, 'POST', '/api/orders', {}, authHeaders)
    await request(s1.base, 'POST', `/api/payments/${order.body.id}`)
    await s1.close()

    // 第二次启动（模拟进程 B，同一 data 目录）
    const s2 = await startServer({ storage: 'file', dataDir: dir })
    try {
      // 原会话凭证访问我的订单：登录态保持 + 历史订单可见 + 状态一致
      const mine = await request(s2.base, 'GET', '/api/orders', undefined, authHeaders)
      assert.strictEqual(mine.status, 200)
      const mineOrder = mine.body.find(o => o.id === order.body.id)
      assert.ok(mineOrder, '重启后历史订单应可见')
      assert.strictEqual(mineOrder.status, 'PAID', '订单状态应与重启前一致')

      // 购物车存储链路恢复：原会话加购后下单成功
      await request(s2.base, 'POST', '/api/cart/items', { productId: '2', quantity: 1 }, authHeaders)
      const order2 = await request(s2.base, 'POST', '/api/orders', {}, authHeaders)
      assert.strictEqual(order2.status, 201, '重启后购物车链路应可继续下单')
      assert.strictEqual(order2.body.userId, user.id)

      // 原手机号可重新登录（返回新会话凭证）
      const login = await request(s2.base, 'POST', '/api/auth/login', { phone, password })
      assert.strictEqual(login.status, 201)
      assert.ok(login.body.sessionToken, '重启后登录应返回新会话凭证')
      assert.strictEqual(login.body.user.id, user.id, '登录应恢复同一用户主体')
    } finally {
      await s2.close()
    }
  })

  it('NODE_ENV=test 内存模式：data 目录零写入', async () => {
    const noWriteDir = path.join(tmp, 'no-write')
    const s = await startServer({ storage: 'memory', dataDir: noWriteDir })
    try {
      const reg = await request(s.base, 'POST', '/api/auth/register', { phone: '13800009999', nickname: '内存用户', password })
      assert.strictEqual(reg.status, 201)
      // 内存模式绝不触碰文件系统
      assert.ok(!fs.existsSync(noWriteDir), 'memory 模式不应创建任何数据文件')
    } finally {
      await s.close()
    }
  })

  it('file 模式测试后门一律 404（reset/user-status/user-role）', async () => {
    const s = await startServer({ storage: 'file', dataDir: path.join(tmp, 'no-backdoor') })
    try {
      const reset = await request(s.base, 'POST', '/api/__test/reset', {})
      assert.strictEqual(reset.status, 404)
      const status = await request(s.base, 'POST', '/api/__test/user-status', { phone: '13800001234', status: '禁用' })
      assert.strictEqual(status.status, 404)
      const role = await request(s.base, 'POST', '/api/__test/user-role', { phone: '13800001234', role: '运营' })
      assert.strictEqual(role.status, 404)
    } finally {
      await s.close()
    }
  })
})
