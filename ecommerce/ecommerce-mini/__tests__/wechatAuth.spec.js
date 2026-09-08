import { describe, it, before, after } from 'node:test'
import assert from 'node:assert'
import { UserRepo, SessionRepo, ChannelConfigRepo } from '../src/repo/memoryRepo.js'
import { WechatAuthService } from '../src/services/wechatAuth.js'
import { exchangeCodeForOpenid, fetchPhoneByCode } from '../src/services/wechatGateway.js'
import { createServer } from '../src/http/server.js'

// 测试后门（reset / user-role）仅在 NODE_ENV=test 下启用
process.env.NODE_ENV = 'test'

// ==================== mock 微信网关（@unit，Q6，src/services/wechatGateway.js） ====================

describe('mock 微信网关（@unit）', () => {
  it('code2session：固定映射 code → openid（Q6 可复现）', () => {
    assert.strictEqual(exchangeCodeForOpenid('code_demo_001', {}), 'openid_demo_001')
    assert.strictEqual(exchangeCodeForOpenid('code_demo_002', {}), 'openid_demo_002')
    assert.strictEqual(exchangeCodeForOpenid('code_demo_003', {}), 'openid_demo_003')
  })

  it('未知 code → WECHAT_CODE_INVALID', () => {
    assert.throws(() => exchangeCodeForOpenid('code_unknown', {}), /WECHAT_CODE_INVALID/)
  })

  it('手机号组件：固定映射 code → 手机号（含撞号场景 phone_demo_002=13888217536）', () => {
    assert.strictEqual(fetchPhoneByCode('phone_demo_001'), '13700005678')
    assert.strictEqual(fetchPhoneByCode('phone_demo_002'), '13888217536')
  })
})

// ==================== WechatAuthService（@unit，R-WX-001~011） ====================

describe('WechatAuthService 微信登录与绑定（@unit）', () => {
  function setup() {
    const userRepo = new UserRepo()
    const sessionRepo = new SessionRepo()
    const channelConfigRepo = new ChannelConfigRepo()
    const svc = new WechatAuthService(userRepo, sessionRepo)
    // 既有网页用户林晓明（user_1002 语义：先注册再绑定 openid_demo_001）
    const lin = {
      id: 'user_1002', phone: '13888217536',
      passwordHash: 'scrypt:stub', nickname: '林晓明',
      status: '正常', role: '客户', createdAt: '2026-08-29 08:00'
    }
    userRepo.save(lin)
    channelConfigRepo.save({ appid: 'wx-test', appsecret: 'secret', mchid: '', enabled: true })
    return { userRepo, sessionRepo, channelConfigRepo, svc, lin }
  }

  it('openid 命中既有用户 → 直连登录（会话 MINIPROGRAM，R-WX-003/008）', () => {
    const { userRepo, sessionRepo, channelConfigRepo, svc } = setup()
    userRepo.findByPhone('13888217536').openid = 'openid_demo_001'
    userRepo.save(userRepo.findByPhone('13888217536'))
    const res = svc.loginWithCode({ code: 'code_demo_001' }, channelConfigRepo)
    assert.strictEqual(res.user.id, 'user_1002')
    assert.strictEqual(res.sessionToken ? true : false, true)
    const session = sessionRepo.findByToken(res.sessionToken)
    assert.strictEqual(session.channel, 'MINIPROGRAM')
  })

  it('openid 未命中 → WECHAT_BIND_REQUIRED', () => {
    const { channelConfigRepo, svc } = setup()
    assert.throws(() => svc.loginWithCode({ code: 'code_demo_002' }, channelConfigRepo), /WECHAT_BIND_REQUIRED/)
  })

  it('渠道停用 → CHANNEL_DISABLED（Q5，R-WX-009）', () => {
    const { channelConfigRepo, svc } = setup()
    channelConfigRepo.save({ appid: 'wx-test', appsecret: 's', mchid: '', enabled: false })
    assert.throws(() => svc.loginWithCode({ code: 'code_demo_001' }, channelConfigRepo), /CHANNEL_DISABLED/)
  })

  it('新手机号绑定 → 建号（phone+openid）自动登录（R-WX-005）', () => {
    const { userRepo, sessionRepo, channelConfigRepo, svc } = setup()
    // code_demo_002 → openid_demo_002；phone_demo_001 → 13700005678（未注册）
    const res = svc.bindByPhone({ code: 'code_demo_002', phoneCode: 'phone_demo_001' }, channelConfigRepo)
    assert.strictEqual(res.user.phone, '13700005678')
    assert.strictEqual(res.bound, true)
    const user = userRepo.findByOpenid('openid_demo_002')
    assert.ok(user)
    assert.strictEqual(user.phone, '13700005678')
    const session = sessionRepo.findByToken(res.sessionToken)
    assert.strictEqual(session.channel, 'MINIPROGRAM')
  })

  it('撞号 → PHONE_EXISTS_NEED_LOGIN（Q2，不合并；R-WX-006）', () => {
    const { userRepo, channelConfigRepo, svc } = setup()
    // code_demo_003 → openid_demo_003；phone_demo_002 → 13888217536 已被林晓明注册
    assert.throws(() => svc.bindByPhone({ code: 'code_demo_003', phoneCode: 'phone_demo_002' }, channelConfigRepo), /PHONE_EXISTS_NEED_LOGIN/)
    assert.strictEqual(userRepo.findAll().length, 1) // 未创建重复用户
  })

  it('撞号完成绑定：既有账号 bindOpenidToExisting 写入 openid（R-WX-006）', () => {
    const { userRepo, sessionRepo, svc } = setup()
    const pubLin = { id: 'user_1002', phone: '13888217536', nickname: '林晓明', status: '正常', role: '客户' }
    const res = svc.bindOpenidToExisting({ openid: 'openid_demo_003' }, pubLin)
    assert.strictEqual(res.bound, true)
    assert.strictEqual(userRepo.findById('user_1002').openid, 'openid_demo_003')
    const session = sessionRepo.findByToken(res.sessionToken)
    assert.strictEqual(session.channel, 'MINIPROGRAM')
  })

  it('防越权：openid 已被他人绑定 → WECHAT_OPENID_TAKEN', () => {
    const { userRepo, svc } = setup()
    const other = { id: 'user_1010', phone: '13900001111', passwordHash: '', nickname: '他人', status: '正常', role: '客户', openid: 'openid_demo_007' }
    userRepo.save(other)
    const pubLin = { id: 'user_1002', phone: '13888217536', nickname: '林晓明', status: '正常', role: '客户' }
    assert.throws(() => svc.bindOpenidToExisting({ openid: 'openid_demo_007' }, pubLin), /WECHAT_OPENID_TAKEN/)
  })

  it('禁用用户 openid 命中 → USER_DISABLED（R-WX-010）', () => {
    const { userRepo, channelConfigRepo, svc } = setup()
    userRepo.findByPhone('13888217536').status = '禁用'
    userRepo.findByPhone('13888217536').openid = 'openid_demo_001'
    userRepo.save(userRepo.findByPhone('13888217536'))
    assert.throws(() => svc.loginWithCode({ code: 'code_demo_001' }, channelConfigRepo), /USER_DISABLED/)
  })
})

// ==================== API（@api，/api/auth/wechat/*） ====================

describe('微信授权登录 API（@api）', () => {
  const post = (base, path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const put = (base, path, body, headers = {}) => fetch(`${base}${path}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })

  async function startServer() {
    const { server } = createServer()
    await new Promise(resolve => server.listen(0, () => resolve(undefined)))
    const address = server.address()
    const port = address && typeof address === 'object' ? address.port : 0
    return { base: `http://127.0.0.1:${port}`, close: () => server.close() }
  }

  async function enableChannel(base) {
    // 运营启用渠道（复用渠道配置 API）
    const reg = await post(base, '/api/auth/register', { phone: '13600050001', nickname: '渠道运营', password: '123456' })
    assert.strictEqual(reg.status, 201)
    const roleRes = await post(base, '/api/__test/user-role', { phone: '13600050001', role: '运营' })
    assert.strictEqual(roleRes.status, 200)
    const login = await post(base, '/api/auth/login', { phone: '13600050001', password: '123456' })
    const { sessionToken } = await login.json()
    await put(base, '/api/admin/channel/miniprogram', {
      appid: 'wx4a2b8c9d0e1f2345', appsecret: 'a1b2c3d4e5f60718293a4b5c6d7e8f90', enabled: true
    }, { Authorization: `Bearer ${sessionToken}` })
    return sessionToken
  }

  it('老客户 openid 命中 → 直连登录 201（会话 MINIPROGRAM）', async () => {
    const { base, close } = await startServer()
    try {
      await enableChannel(base)
      // 网页注册林晓明 → 绑定 openid_demo_001（bind-openid 语义，用其网页会话）
      const reg = await post(base, '/api/auth/register', { phone: '13888217536', nickname: '林晓明', password: '123456' })
      const { sessionToken } = await reg.json()
      const bindRes = await post(base, '/api/auth/wechat/bind-openid', { openid: 'openid_demo_001' },
        { Authorization: `Bearer ${sessionToken}` })
      assert.strictEqual(bindRes.status, 200)
      // 微信登录（mock code_demo_001）
      const loginRes = await post(base, '/api/auth/wechat/login', { code: 'code_demo_001' })
      assert.strictEqual(loginRes.status, 201)
      const body = await loginRes.json()
      assert.strictEqual(body.user.phone, '13888217536')
      assert.strictEqual(body.bound, true)
    } finally {
      close()
    }
  })

  it('openid 未命中 → 400 WECHAT_BIND_REQUIRED', async () => {
    const { base, close } = await startServer()
    try {
      await enableChannel(base)
      const res = await post(base, '/api/auth/wechat/login', { code: 'code_demo_002' })
      assert.strictEqual(res.status, 400)
      const body = await res.json()
      assert.strictEqual(body.error?.code || body.code, 'WECHAT_BIND_REQUIRED')
    } finally {
      close()
    }
  })

  it('渠道停用 → 403 CHANNEL_DISABLED（Q5）', async () => {
    const { base, close } = await startServer()
    try {
      // 默认未配置 → 默认停用
      const res = await post(base, '/api/auth/wechat/login', { code: 'code_demo_001' })
      assert.strictEqual(res.status, 403)
      const body = await res.json()
      assert.strictEqual(body.error?.code || body.code, 'CHANNEL_DISABLED')
    } finally {
      close()
    }
  })

  it('撞号 → 409 PHONE_EXISTS_NEED_LOGIN（Q2）', async () => {
    const { base, close } = await startServer()
    try {
      await enableChannel(base)
      // 林晓明网页已注册（13888217536）
      await post(base, '/api/auth/register', { phone: '13888217536', nickname: '林晓明', password: '123456' })
      // 新微信用户 code_demo_003（openid_demo_003）绑定 phoneCode=phone_demo_002(=13888217536) → 撞号
      const res = await post(base, '/api/auth/wechat/bind', { code: 'code_demo_003', phoneCode: 'phone_demo_002' })
      assert.strictEqual(res.status, 409)
      const body = await res.json()
      assert.strictEqual(body.error?.code || body.code, 'PHONE_EXISTS_NEED_LOGIN')
    } finally {
      close()
    }
  })

  it('bind-openid 防越权：openid 已被绑定他人 → 409', async () => {
    const { base, close } = await startServer()
    try {
      await enableChannel(base)
      // 用户A 注册并绑定 openid_demo_009
      const regA = await post(base, '/api/auth/register', { phone: '13911112222', nickname: '用户A', password: '123456' })
      const tokenA = (await regA.json()).sessionToken
      await post(base, '/api/auth/wechat/bind-openid', { openid: 'openid_demo_009' },
        { Authorization: `Bearer ${tokenA}` })
      // 用户B 尝试绑定同一 openid → 409
      const regB = await post(base, '/api/auth/register', { phone: '13933334444', nickname: '用户B', password: '123456' })
      const tokenB = (await regB.json()).sessionToken
      const res = await post(base, '/api/auth/wechat/bind-openid', { openid: 'openid_demo_009' },
        { Authorization: `Bearer ${tokenB}` })
      assert.strictEqual(res.status, 409)
    } finally {
      close()
    }
  })
})
