import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert'
import { UserRepo, SessionRepo } from '../src/repo/memoryRepo.js'
import { AuthService } from '../src/services/auth.js'
import {
  assertPhoneFormat,
  assertPasswordRule,
  assertNicknameRule,
  defaultNickname,
  hashPassword,
  verifyPassword,
  assertUserEnabled
} from '../src/domain/logic.js'

describe('用户注册 - 领域规则（@unit）', () => {
  it('手机号格式：非 11 位手机号被拒绝', () => {
    assert.throws(() => assertPhoneFormat('123'), /INVALID_PHONE/)
    assert.throws(() => assertPhoneFormat('1388821753'), /INVALID_PHONE/)  // 10 位
    assert.throws(() => assertPhoneFormat('23888217536'), /INVALID_PHONE/) // 非 1 开头
    assert.throws(() => assertPhoneFormat(''), /INVALID_PHONE/)
  })

  it('手机号格式：合法 11 位手机号通过', () => {
    assert.doesNotThrow(() => assertPhoneFormat('13888217536'))
  })

  it('密码强度：不足 6 位被拒绝', () => {
    assert.throws(() => assertPasswordRule('123'), /PASSWORD_TOO_SHORT/)
    assert.throws(() => assertPasswordRule(''), /PASSWORD_TOO_SHORT/)
  })

  it('密码强度：超过 32 位被拒绝', () => {
    assert.throws(() => assertPasswordRule('a'.repeat(33)), /PASSWORD_TOO_LONG/)
  })

  it('密码强度：6 至 32 位通过', () => {
    assert.doesNotThrow(() => assertPasswordRule('123456'))
    assert.doesNotThrow(() => assertPasswordRule('a'.repeat(32)))
  })

  it('昵称规则：空昵称被拒绝', () => {
    assert.throws(() => assertNicknameRule(''), /NICKNAME_REQUIRED/)
    assert.throws(() => assertNicknameRule('   '), /NICKNAME_REQUIRED/)
  })

  it('昵称规则：超过 20 字被拒绝', () => {
    assert.throws(() => assertNicknameRule('林'.repeat(21)), /NICKNAME_TOO_LONG/)
    assert.doesNotThrow(() => assertNicknameRule('林'.repeat(20)))
  })

  it('默认昵称：由手机尾号生成', () => {
    assert.strictEqual(defaultNickname('13888217536'), '7536用户')
  })

  it('密码哈希：不可逆且可校验，不存明文', () => {
    const stored = hashPassword('123456')
    // 存储格式为 scrypt:<salt>:<hash>，且不等于明文
    assert.ok(stored.startsWith('scrypt:'))
    assert.notStrictEqual(stored, '123456')
    assert.ok(!stored.includes('123456'))
    // 相同密码不同盐 → 哈希不同
    const stored2 = hashPassword('123456')
    assert.notStrictEqual(stored, stored2)
    // 校验
    assert.strictEqual(verifyPassword('123456', stored), true)
    assert.strictEqual(verifyPassword('wrong-password', stored), false)
    assert.strictEqual(verifyPassword('123456', 'not-a-valid-format'), false)
  })
})

describe('用户注册 - 仓储层（@unit）', () => {
  let userRepo
  let sessionRepo

  beforeEach(() => {
    userRepo = new UserRepo()
    sessionRepo = new SessionRepo()
  })

  it('UserRepo：ID 序列自增（user_1001 起）', () => {
    assert.strictEqual(userRepo.nextId(), 'user_1001')
    assert.strictEqual(userRepo.nextId(), 'user_1002')
  })

  it('UserRepo：按手机号查找唯一用户', () => {
    userRepo.save({ id: 'user_1001', phone: '13912345678', nickname: '陈晓芸' })
    assert.strictEqual(userRepo.findByPhone('13912345678').id, 'user_1001')
    assert.strictEqual(userRepo.findByPhone('13800000000'), undefined)
  })

  it('SessionRepo：创建会话并按 token 解析 userId', () => {
    const s = sessionRepo.create('user_1001')
    assert.ok(s.token)
    assert.strictEqual(s.userId, 'user_1001')
    assert.strictEqual(sessionRepo.findByToken(s.token).userId, 'user_1001')
    assert.strictEqual(sessionRepo.findByToken('nonexistent'), undefined)
  })

  it('SessionRepo：delete 销毁会话后无法再解析 userId', () => {
    const s = sessionRepo.create('user_1001')
    const deleted = sessionRepo.delete(s.token)
    assert.strictEqual(deleted, true)
    assert.strictEqual(sessionRepo.findByToken(s.token), undefined)
    // 会话销毁后不残留映射
    assert.strictEqual(sessionRepo.sessions.size, 0)
  })

  it('SessionRepo：delete 不存在的 token 幂等不抛错', () => {
    assert.strictEqual(sessionRepo.delete('nonexistent-token'), false)
    assert.strictEqual(sessionRepo.delete(undefined), false)
  })
})

describe('用户注册 - AuthService 用例编排（@unit）', () => {
  let userRepo
  let sessionRepo
  let auth

  beforeEach(() => {
    userRepo = new UserRepo()
    sessionRepo = new SessionRepo()
    auth = new AuthService(userRepo, sessionRepo)
  })

  it('注册成功：返回用户（status=正常）与会话凭证', () => {
    const { user, sessionToken } = auth.register({ phone: '13888217536', nickname: '林晓明', password: '123456' })
    assert.strictEqual(user.id, 'user_1001')
    assert.strictEqual(user.phone, '13888217536')
    assert.strictEqual(user.nickname, '林晓明')
    assert.strictEqual(user.status, '正常')
    assert.ok(user.createdAt)
    assert.ok(sessionToken)
    // 会话映射可被消费
    assert.strictEqual(sessionRepo.findByToken(sessionToken).userId, user.id)
  })

  it('注册成功：未填昵称时采用默认昵称', () => {
    const { user } = auth.register({ phone: '13888217536', password: '123456' })
    assert.strictEqual(user.nickname, '7536用户')
  })

  it('注册成功：持久化记录为哈希而非明文', () => {
    auth.register({ phone: '13888217536', nickname: '林晓明', password: '123456' })
    const stored = userRepo.findById('user_1001')
    assert.ok(stored.passwordHash.startsWith('scrypt:'))
    assert.notStrictEqual(stored.passwordHash, '123456')
    assert.ok(!Object.keys(stored).some(k => k === 'password'))
  })

  it('手机号唯一：重复注册抛 PHONE_ALREADY_REGISTERED', () => {
    auth.register({ phone: '13912345678', nickname: '陈晓芸', password: '123456' })
    // 不同昵称/密码仍判定重复
    assert.throws(
      () => auth.register({ phone: '13912345678', nickname: '林晓明', password: 'abcdef' }),
      /PHONE_ALREADY_REGISTERED/
    )
    assert.strictEqual(userRepo.findAll().length, 1)
  })

  it('健壮性：数字型手机号输入归一为字符串，唯一性校验不受类型漂移影响', () => {
    // 客户端可能以 JSON 数字提交手机号（E2E 发现的真实缺陷）
    auth.register({ phone: 13912345678, nickname: '陈晓芸', password: '123456' })
    const stored = userRepo.findById('user_1001')
    assert.strictEqual(stored.phone, '13912345678')
    // 字符串形式重复注册仍被拒绝
    assert.throws(
      () => auth.register({ phone: '13912345678', password: '123456' }),
      /PHONE_ALREADY_REGISTERED/
    )
  })

  it('非法输入：手机号/密码/昵称校验失败不创建用户', () => {
    assert.throws(() => auth.register({ phone: '123', password: '123456' }), /INVALID_PHONE/)
    assert.throws(() => auth.register({ phone: '13888217536', password: '123' }), /PASSWORD_TOO_SHORT/)
    assert.throws(() => auth.register({ phone: '13888217536', password: '123456', nickname: '林'.repeat(21) }), /NICKNAME_TOO_LONG/)
    assert.strictEqual(userRepo.findAll().length, 0)
    assert.strictEqual(sessionRepo.sessions.size, 0)
  })
})

describe('用户登录 - 领域规则（@unit）', () => {
  it('禁用状态门禁：status=禁用 抛 USER_DISABLED', () => {
    assert.throws(() => assertUserEnabled({ id: 'user_1001', status: '禁用' }), /USER_DISABLED/)
  })

  it('禁用状态门禁：正常用户通过', () => {
    assert.doesNotThrow(() => assertUserEnabled({ id: 'user_1001', status: '正常' }))
    // 未找到用户（undefined）不触发禁用门禁（由登录用例统一 INVALID_CREDENTIALS 处理）
    assert.doesNotThrow(() => assertUserEnabled(undefined))
  })

  it('密码校验：正确密码通过、错误密码拒绝、非法存储格式容错', () => {
    const stored = hashPassword('123456')
    assert.strictEqual(verifyPassword('123456', stored), true)
    assert.strictEqual(verifyPassword('654321', stored), false)
    assert.strictEqual(verifyPassword('123456', ''), false)
    assert.strictEqual(verifyPassword('123456', 'plain-text'), false)
  })
})

describe('用户登录 - AuthService 用例编排（@unit）', () => {
  let userRepo
  let sessionRepo
  let auth

  beforeEach(() => {
    userRepo = new UserRepo()
    sessionRepo = new SessionRepo()
    auth = new AuthService(userRepo, sessionRepo)
    // 预置已注册用户（复用 register 用例，保证哈希格式与生产一致）
    auth.register({ phone: '13888217536', nickname: '林晓明', password: '123456' })
  })

  it('登录成功：返回脱敏用户与新会话凭证', () => {
    const { user, sessionToken } = auth.login({ phone: '13888217536', password: '123456' })
    assert.strictEqual(user.id, 'user_1001')
    assert.strictEqual(user.phone, '13888217536')
    assert.strictEqual(user.nickname, '林晓明')
    assert.strictEqual(user.status, '正常')
    assert.ok(!Object.keys(user).includes('passwordHash'))
    assert.ok(sessionToken)
    // 会话映射可被会话校验消费
    assert.strictEqual(sessionRepo.findByToken(sessionToken).userId, 'user_1001')
  })

  it('登录成功：创建全新会话而非复用既有会话', () => {
    const before = sessionRepo.sessions.size
    auth.login({ phone: '13888217536', password: '123456' })
    assert.strictEqual(sessionRepo.sessions.size, before + 1)
  })

  it('密码错误：抛 INVALID_CREDENTIALS，不创建会话', () => {
    const before = sessionRepo.sessions.size
    assert.throws(() => auth.login({ phone: '13888217536', password: '654321' }), /INVALID_CREDENTIALS/)
    assert.strictEqual(sessionRepo.sessions.size, before)
  })

  it('账号不存在：抛 INVALID_CREDENTIALS（与密码错误提示一致）', () => {
    const before = sessionRepo.sessions.size
    assert.throws(() => auth.login({ phone: '13100000000', password: '123456' }), /INVALID_CREDENTIALS/)
    assert.strictEqual(sessionRepo.sessions.size, before)
  })

  it('禁用用户：抛 USER_DISABLED（含密码错误时也优先拦截）', () => {
    auth.register({ phone: '15876543210', nickname: '王强', password: '123456' })
    userRepo.findById('user_1002').status = '禁用'
    const before = sessionRepo.sessions.size
    // 正确凭证
    assert.throws(() => auth.login({ phone: '15876543210', password: '123456' }), /USER_DISABLED/)
    // 密码错误同样拦截为禁用（账户级门禁先于凭证比对）
    assert.throws(() => auth.login({ phone: '15876543210', password: 'wrong' }), /USER_DISABLED/)
    assert.strictEqual(sessionRepo.sessions.size, before)
  })

  it('健壮性：数字型手机号归一为字符串后仍可登录（ISSUE-011 回归）', () => {
    const { user } = auth.login({ phone: 13888217536, password: '123456' })
    assert.strictEqual(user.id, 'user_1001')
  })

  it('非法输入：手机号格式非法抛 INVALID_PHONE，不创建会话', () => {
    const before = sessionRepo.sessions.size
    assert.throws(() => auth.login({ phone: '123', password: '123456' }), /INVALID_PHONE/)
    assert.strictEqual(sessionRepo.sessions.size, before)
  })

  it('响应 DTO：登录返回的用户对象不包含密码字段', () => {
    const { user } = auth.login({ phone: '13888217536', password: '123456' })
    assert.ok(!Object.keys(user).includes('password'))
    assert.ok(!Object.keys(user).includes('passwordHash'))
  })
})

describe('会话生命周期 - AuthService 会话校验与退出（@unit）', () => {
  let userRepo
  let sessionRepo
  let auth

  beforeEach(() => {
    userRepo = new UserRepo()
    sessionRepo = new SessionRepo()
    auth = new AuthService(userRepo, sessionRepo)
    auth.register({ phone: '13888217536', nickname: '林晓明', password: '123456' })
  })

  it('会话校验：有效会话解析出脱敏用户 DTO', () => {
    const { sessionToken } = auth.login({ phone: '13888217536', password: '123456' })
    const user = auth.getSessionUser(sessionToken)
    assert.strictEqual(user.id, 'user_1001')
    assert.strictEqual(user.phone, '13888217536')
    assert.strictEqual(user.nickname, '林晓明')
    assert.ok(!Object.keys(user).includes('passwordHash'))
  })

  it('会话校验：无效/伪造 token 抛 UNAUTHORIZED', () => {
    assert.throws(() => auth.getSessionUser('forged-token'), /UNAUTHORIZED/)
    assert.throws(() => auth.getSessionUser(''), /UNAUTHORIZED/)
    assert.throws(() => auth.getSessionUser(undefined), /UNAUTHORIZED/)
  })

  it('会话校验：会话归属用户已被删除（用户不存在）抛 UNAUTHORIZED', () => {
    const { sessionToken } = auth.login({ phone: '13888217536', password: '123456' })
    userRepo.users.delete('user_1001')
    assert.throws(() => auth.getSessionUser(sessionToken), /UNAUTHORIZED/)
  })

  it('会话校验：禁用用户会话立即失效抛 USER_DISABLED（R-SES-006）', () => {
    const { sessionToken } = auth.login({ phone: '13888217536', password: '123456' })
    userRepo.findById('user_1001').status = '禁用'
    assert.throws(() => auth.getSessionUser(sessionToken), /USER_DISABLED/)
  })

  it('退出登录：销毁会话后原凭证无法再解析用户（R-SES-005）', () => {
    const { sessionToken } = auth.login({ phone: '13888217536', password: '123456' })
    const before = sessionRepo.sessions.size
    auth.logout(sessionToken)
    assert.throws(() => auth.getSessionUser(sessionToken), /UNAUTHORIZED/)
    // 仅销毁目标会话（beforeEach register 自动登录会话 + 本次登录会话，销毁后减 1）
    assert.strictEqual(sessionRepo.sessions.size, before - 1)
  })

  it('退出登录：销毁不存在的 token 幂等不抛错', () => {
    assert.doesNotThrow(() => auth.logout('nonexistent-token'))
    assert.doesNotThrow(() => auth.logout(undefined))
    assert.doesNotThrow(() => auth.logout(null))
  })

  it('退出登录：仅销毁指定会话，其他用户会话不受影响', () => {
    const s1 = auth.login({ phone: '13888217536', password: '123456' }).sessionToken
    auth.register({ phone: '13912345678', nickname: '陈晓芸', password: '123456' })
    const s2 = auth.login({ phone: '13912345678', password: '123456' }).sessionToken
    auth.logout(s1)
    assert.throws(() => auth.getSessionUser(s1), /UNAUTHORIZED/)
    // 陈晓芸的会话仍有效
    assert.strictEqual(auth.getSessionUser(s2).id, 'user_1002')
  })
})
