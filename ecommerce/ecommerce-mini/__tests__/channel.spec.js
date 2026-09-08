import { describe, it, before, after, beforeEach } from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { ChannelConfigRepo } from '../src/repo/memoryRepo.js'
import { ChannelConfigFileRepo } from '../src/repo/fileRepo.js'
import {
  defaultChannelConfig,
  maskSecret,
  toPublicConfig,
  mergeConfigInput
} from '../src/domain/channel.js'
import { createServer } from '../src/http/server.js'

// 测试后门（reset / user-role）仅在 NODE_ENV=test 下启用
process.env.NODE_ENV = 'test'

// ==================== 领域纯函数（@unit，src/domain/channel.js，R-CHN-001~009） ====================

describe('渠道配置领域纯函数（@unit）', () => {
  it('默认配置：未配置 → 默认停用（R-CHN-009，防止未配置即开放）', () => {
    const d = defaultChannelConfig()
    assert.deepStrictEqual(d, { appid: '', appsecret: '', mchid: '', enabled: false })
  })

  it('AppSecret 脱敏掩码：前 4 + 掩码 + 后 4（R-CHN-004，Q4）', () => {
    assert.strictEqual(maskSecret('a1b2c3d4e5f60718293a4b5c6d7e8f90'), `a1b2${'•'.repeat(24)}8f90`)
    assert.strictEqual(maskSecret(''), '')
    assert.strictEqual(maskSecret('short'), '•••••') // 短密钥全掩码
  })

  it('toPublicConfig：永不返回明文 appsecret（R-CHN-004）', () => {
    const store = { appid: 'wx4a2b8c9d0e1f2345', appsecret: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', mchid: '1900001234', enabled: true }
    const pub = toPublicConfig(store)
    assert.strictEqual(pub.appsecretConfigured, true)
    assert.ok(!JSON.stringify(pub).includes('a1b2c3d4e5f60718293a4b5c6d7e8f90'))
    assert.ok(pub.appsecretMasked.includes('••••'))
    assert.strictEqual(pub.appid, 'wx4a2b8c9d0e1f2345')
    assert.strictEqual(pub.mchid, '1900001234')
    assert.strictEqual(pub.enabled, true)
  })

  it('未配置时 toPublicConfig：appsecretConfigured=false、掩码为空、enabled=false', () => {
    const pub = toPublicConfig(null)
    assert.strictEqual(pub.appsecretConfigured, false)
    assert.strictEqual(pub.appsecretMasked, '')
    assert.strictEqual(pub.enabled, false)
  })

  it('mergeConfigInput：appsecret 为空保留已存值；非空覆盖（重新配置，Q4）', () => {
    const prev = { appid: 'wx-old', appsecret: 'secret-old-value', mchid: '1900000000', enabled: true }
    // secret 未提供 → 保留已存值
    const m1 = mergeConfigInput(prev, { appid: 'wx-new', enabled: false })
    assert.strictEqual(m1.appsecret, 'secret-old-value')
    assert.strictEqual(m1.appid, 'wx-new')
    assert.strictEqual(m1.enabled, false)
    // secret 空串 → 保留已存值
    const m2 = mergeConfigInput(prev, { appsecret: '' })
    assert.strictEqual(m2.appsecret, 'secret-old-value')
    // secret 非空 → 覆盖
    const m3 = mergeConfigInput(prev, { appsecret: 'new-secret-value' })
    assert.strictEqual(m3.appsecret, 'new-secret-value')
    // enabled 非 boolean → 保留原值
    const m4 = mergeConfigInput(prev, { enabled: 'yes' })
    assert.strictEqual(m4.enabled, true)
  })

  it('商户号为纯配置预留：任意字符串可保存，不做资质校验（R-CHN-005，Q3）', () => {
    const merged = mergeConfigInput(defaultChannelConfig(), { mchid: '' })
    assert.strictEqual(merged.mchid, '')
    const merged2 = mergeConfigInput(defaultChannelConfig(), { mchid: '任意预留串' })
    assert.strictEqual(merged2.mchid, '任意预留串')
  })
})

// ==================== 仓储（@unit） ====================

describe('ChannelConfigRepo 内存仓储（@unit）', () => {
  it('默认配置 + get/save/clear', () => {
    const repo = new ChannelConfigRepo()
    assert.deepStrictEqual(repo.getConfig(), { appid: '', appsecret: '', mchid: '', enabled: false })
    repo.save({ appid: 'wx-a', appsecret: 's', mchid: 'm', enabled: true })
    assert.strictEqual(repo.getConfig().appid, 'wx-a')
    assert.strictEqual(repo.getConfig().enabled, true)
    repo.clear()
    assert.deepStrictEqual(repo.getConfig(), { appid: '', appsecret: '', mchid: '', enabled: false })
  })
})

describe('ChannelConfigFileRepo 文件仓储（@unit）', () => {
  let tmpDir
  before(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'channel-config-test-')) })
  after(() => { fs.rmSync(tmpDir, { recursive: true, force: true }) })

  it('文件缺失 → 自愈默认配置（R-CHN-009）', () => {
    const repo = new ChannelConfigFileRepo({ dataDir: tmpDir })
    assert.strictEqual(repo.getConfig().enabled, false)
    assert.ok(fs.existsSync(path.join(tmpDir, 'channel-config.json')))
  })

  it('save 落盘 + 重新加载恢复', () => {
    const repo = new ChannelConfigFileRepo({ dataDir: tmpDir })
    repo.save({ appid: 'wx-persist', appsecret: 'persist-secret', mchid: '1900008888', enabled: true })
    const repo2 = new ChannelConfigFileRepo({ dataDir: tmpDir })
    assert.strictEqual(repo2.getConfig().appid, 'wx-persist')
    assert.strictEqual(repo2.getConfig().appsecret, 'persist-secret')
    assert.strictEqual(repo2.getConfig().enabled, true)
  })

  it('损坏文件 → 备份后以默认配置启动（不崩溃）', () => {
    fs.writeFileSync(path.join(tmpDir, 'channel-config.json'), '{ broken json')
    const repo = new ChannelConfigFileRepo({ dataDir: tmpDir })
    assert.strictEqual(repo.getConfig().enabled, false)
  })
})

// ==================== API（@api，GET/PUT /api/admin/channel/miniprogram） ====================

describe('小程序渠道配置 API（@api）', () => {
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
    return {
      user: body.user,
      authHeaders: { 'Content-Type': 'application/json', Authorization: `Bearer ${body.sessionToken}` }
    }
  }

  it('运营：PUT 配置 → 脱敏回显 + 即时生效（R-CHN-001/004/006）', async () => {
    const { base, close } = await startServer()
    try {
      const operator = await setupUser(base, '13600010001', '渠道运营', '运营')
      const res = await put(base, '/api/admin/channel/miniprogram', {
        appid: 'wx4a2b8c9d0e1f2345',
        appsecret: 'a1b2c3d4e5f60718293a4b5c6d7e8f90',
        mchid: '1900001234',
        enabled: true
      }, operator.authHeaders)
      assert.strictEqual(res.status, 200)
      const body = await res.json()
      assert.strictEqual(body.appsecretConfigured, true)
      assert.strictEqual(body.enabled, true)
      assert.ok(body.appsecretMasked.includes('••••'))
      // 不泄露明文
      assert.ok(!JSON.stringify(body).includes('a1b2c3d4e5f60718293a4b5c6d7e8f90'))

      // GET 立即反映（即时生效 R-CHN-006）
      const getRes = await get(base, '/api/admin/channel/miniprogram', operator.authHeaders)
      const got = await getRes.json()
      assert.strictEqual(got.enabled, true)
      assert.strictEqual(got.appsecretConfigured, true)
    } finally {
      close()
    }
  })

  it('老板：只读 GET 200；写 PUT → 403（R-CHN-002）', async () => {
    const { base, close } = await startServer()
    try {
      const boss = await setupUser(base, '13600010002', '渠道老板', '老板')
      const getRes = await get(base, '/api/admin/channel/miniprogram', boss.authHeaders)
      assert.strictEqual(getRes.status, 200)
      const putRes = await put(base, '/api/admin/channel/miniprogram', { enabled: true }, boss.authHeaders)
      assert.strictEqual(putRes.status, 403)
    } finally {
      close()
    }
  })

  it('客户/客服：读写均被拒（401/403，R-CHN-003）', async () => {
    const { base, close } = await startServer()
    try {
      const customer = await setupUser(base, '13600010003', '渠道客户', '客户')
      const getRes = await get(base, '/api/admin/channel/miniprogram', customer.authHeaders)
      assert.ok([401, 403].includes(getRes.status))
      const putRes = await put(base, '/api/admin/channel/miniprogram', { enabled: true }, customer.authHeaders)
      assert.ok([401, 403].includes(putRes.status))
      // 未登录
      const anon = await get(base, '/api/admin/channel/miniprogram')
      assert.strictEqual(anon.status, 403)
    } finally {
      close()
    }
  })

  it('未配置默认停用：GET enabled=false（R-CHN-009）', async () => {
    const { base, close } = await startServer()
    try {
      const operator = await setupUser(base, '13600010004', '渠道运营2', '运营')
      const getRes = await get(base, '/api/admin/channel/miniprogram', operator.authHeaders)
      const got = await getRes.json()
      assert.strictEqual(got.enabled, false)
      assert.strictEqual(got.appsecretConfigured, false)
    } finally {
      close()
    }
  })

  it('重新配置覆盖：appsecret 为空保留已存值（Q4）', async () => {
    const { base, close } = await startServer()
    try {
      const operator = await setupUser(base, '13600010005', '渠道运营3', '运营')
      await put(base, '/api/admin/channel/miniprogram', {
        appid: 'wx-a', appsecret: 'secret-v1', enabled: true
      }, operator.authHeaders)
      // 仅改 enabled=false，不传 appsecret → 保留已存
      const res = await put(base, '/api/admin/channel/miniprogram', { enabled: false }, operator.authHeaders)
      const body = await res.json()
      assert.strictEqual(body.appsecretConfigured, true) // secret 保留
      assert.strictEqual(body.enabled, false)
    } finally {
      close()
    }
  })
})
