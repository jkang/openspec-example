import {
  assertPhoneFormat,
  assertPasswordRule,
  assertNicknameRule,
  defaultNickname,
  hashPassword,
  verifyPassword,
  assertUserEnabled
} from '../domain/logic.js'

/**
 * 认证服务：注册/登录用例编排（HTTP → Service → Domain → Repo 单向依赖）
 */
export class AuthService {
  /**
   * @param {import('../repo/memoryRepo.js').UserRepo} userRepo
   * @param {import('../repo/memoryRepo.js').SessionRepo} sessionRepo
   */
  constructor(userRepo, sessionRepo) {
    this.userRepo = userRepo
    this.sessionRepo = sessionRepo
  }

  /**
   * 注册并自动登录
   * @param {{ phone: string, nickname?: string, password: string }} input
   * @returns {{ user: import('../domain/types.js').User, sessionToken: string }}
   * @throws {Error} INVALID_PHONE 手机号格式非法
   * @throws {Error} PHONE_ALREADY_REGISTERED 手机号已注册
   * @throws {Error} PASSWORD_TOO_SHORT / PASSWORD_TOO_LONG 密码长度不合法
   * @throws {Error} NICKNAME_REQUIRED / NICKNAME_TOO_LONG 昵称不合法
   */
  register({ phone, nickname, password }) {
    // 输入归一：HTTP JSON 可能携带数字型手机号，统一转为字符串，保证唯一性校验与存储口径一致
    const normalizedPhone = String(phone ?? '').trim()

    // 1. 格式校验（手机号 / 密码 / 昵称）
    const normalizedPassword = String(password ?? '')
    assertPhoneFormat(normalizedPhone)
    assertPasswordRule(normalizedPassword)
    if (nickname !== undefined && nickname !== null && String(nickname).trim() !== '') {
      assertNicknameRule(nickname)
    }

    // 2. 手机号全局唯一校验
    if (this.userRepo.findByPhone(normalizedPhone)) {
      throw new Error('PHONE_ALREADY_REGISTERED')
    }

    // 3. 创建用户（昵称缺省时默认"手机尾号用户"，status=正常，role=客户）
    const user = {
      id: this.userRepo.nextId(),
      phone: normalizedPhone,
      passwordHash: hashPassword(normalizedPassword),
      nickname: (nickname && String(nickname).trim()) ? String(nickname).trim() : defaultNickname(normalizedPhone),
      status: '正常',
      role: '客户',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    }
    this.userRepo.save(user)

    // 4. 注册成功即自动登录（创建会话）
    const session = this.sessionRepo.create(user.id)

    return { user: this.toPublicUser(user), sessionToken: session.token }
  }

  /**
   * 登录并创建持久会话
   * @param {{ phone: string, password: string }} input
   * @returns {{ user: Omit<import('../domain/types.js').User, 'passwordHash'>, sessionToken: string }}
   * @throws {Error} INVALID_PHONE 手机号格式非法
   * @throws {Error} INVALID_CREDENTIALS 账号不存在或密码错误（统一提示，防枚举）
   * @throws {Error} USER_DISABLED 用户已被禁用
   */
  login({ phone, password }) {
    // 输入归一：HTTP JSON 可能携带数字型手机号，统一转为字符串（对齐 ISSUE-011 修复口径）
    const normalizedPhone = String(phone ?? '').trim()
    const normalizedPassword = String(password ?? '')

    // 1. 格式校验（手机号）
    assertPhoneFormat(normalizedPhone)

    // 2. 查找用户：账号不存在与密码错误统一 INVALID_CREDENTIALS（R-LOG-002 防枚举）
    const user = this.userRepo.findByPhone(normalizedPhone)
    if (!user) {
      throw new Error('INVALID_CREDENTIALS')
    }

    // 3. 账户级门禁：禁用用户禁止登录（R-LOG-003，先于密码比对）
    assertUserEnabled(user)

    // 4. 凭证比对：密码哈希不匹配统一 INVALID_CREDENTIALS
    if (!verifyPassword(normalizedPassword, user.passwordHash)) {
      throw new Error('INVALID_CREDENTIALS')
    }

    // 5. 创建持久会话（user-session capability：会话创建）
    const session = this.sessionRepo.create(user.id)

    return { user: this.toPublicUser(user), sessionToken: session.token }
  }

  /**
   * 脱敏用户 DTO：响应体不包含密码明文或哈希字段
   * @param {import('../domain/types.js').User} user
   * @returns {Omit<import('../domain/types.js').User, 'passwordHash'>}
   */
  toPublicUser(user) {
    const { passwordHash, ...publicUser } = user
    return publicUser
  }

  /**
   * 会话校验：解析会话凭证归属用户（供 HTTP 层中间件消费）
   * @param {string} sessionToken 会话凭证
   * @returns {Omit<import('../domain/types.js').User, 'passwordHash'>} 脱敏用户 DTO
   * @throws {Error} UNAUTHORIZED 会话不存在/用户不存在
   * @throws {Error} USER_DISABLED 归属用户已被禁用（R-SES-006 禁用即失效）
   */
  getSessionUser(sessionToken) {
    if (!sessionToken) throw new Error('UNAUTHORIZED')
    const session = this.sessionRepo.findByToken(sessionToken)
    if (!session) throw new Error('UNAUTHORIZED')
    const user = this.userRepo.findById(session.userId)
    if (!user) throw new Error('UNAUTHORIZED')
    // 禁用用户会话立即失效（R-SES-006，复用 Story 2 领域门禁）
    assertUserEnabled(user)
    return this.toPublicUser(user)
  }

  /**
   * 退出登录：销毁服务端会话凭证（幂等）
   * @param {string} sessionToken 会话凭证
   */
  logout(sessionToken) {
    if (sessionToken) {
      this.sessionRepo.delete(sessionToken)
    }
  }
}
