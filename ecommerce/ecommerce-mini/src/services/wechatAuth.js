import {
  assertPhoneFormat,
  assertPasswordRule,
  assertNicknameRule,
  defaultNickname,
  hashPassword,
  verifyPassword,
  assertUserEnabled
} from '../domain/logic.js'
import { exchangeCodeForOpenid, fetchPhoneByCode } from './wechatGateway.js'

/**
 * 微信授权登录与同源账户打通服务（story-miniprogram-wechat-login / wechat-auth capability / User Context）
 *
 * 职责边界（四层架构 Service 层）：
 * - `loginWithCode({ code, channelConfigRepo })`：渠道门禁（CHANNEL_DISABLED，Q5）→ code2session 换 openid
 *   → openid 命中既有 User（Q1：User.openid 一对一）→ 复用会话创建（channel=MINIPROGRAM）直连登录；
 *   未命中 → WECHAT_BIND_REQUIRED（引导绑定）。
 * - `bindByPhone({ code, phone, channelConfigRepo })`：openid 未命中的绑定路径——手机号未注册 → 建新 User
 *   （phone+openid，role=客户）→ 会话（MINIPROGRAM）；手机号已注册（撞号 Q2）→ PHONE_EXISTS_NEED_LOGIN
 *   （不自动合并/不静默拒绝，引导既有账号登录再绑定）。
 * - `bindOpenidToExisting({ openid, userId })`：撞号场景完成绑定——既有账号会话已校验（调用方门禁），
 *   将 openid 写入该 User（防越权：本服务不自行鉴权，由 HTTP 层 requireSession 门禁 + userId 归属保证）。
 * - 复用既有 AuthService 语义（登录/注册领域函数、脱敏 DTO、禁用门禁），不重复实现网页密码链路。
 */
export class WechatAuthService {
  /**
   * @param {any} userRepo 用户仓储（findByPhone / findByOpenid / nextId / save）
   * @param {any} sessionRepo 会话仓储（create(userId, channel)）
   */
  constructor(userRepo, sessionRepo) {
    this.userRepo = userRepo
    this.sessionRepo = sessionRepo
  }

  /**
   * 会话来源渠道：wechat-auth 登录/绑定创建的会话均为 MINIPROGRAM（Q7）
   */
  static get CHANNEL() {
    return 'MINIPROGRAM'
  }

  /**
   * 脱敏用户 DTO（与 AuthService.toPublicUser 同构：不泄露密码字段；openid 非敏感但保持最小暴露）
   * @param {import('../domain/types.js').User} user
   */
  toPublicUser(user) {
    const { passwordHash, ...publicUser } = user
    return publicUser
  }

  /**
   * 渠道门禁：小程序渠道停用/未配置 → CHANNEL_DISABLED（Q5，联动 Story 1 miniprogram-channel）
   * @param {any} channelConfigRepo 渠道配置仓储（getConfig().enabled）
   * @throws {Error} CHANNEL_DISABLED 渠道停用（未配置默认停用 R-CHN-009）
   */
  assertChannelEnabled(channelConfigRepo) {
    const cfg = channelConfigRepo ? channelConfigRepo.getConfig() : { enabled: false }
    if (!cfg || cfg.enabled !== true) {
      throw new Error('CHANNEL_DISABLED')
    }
  }

  /**
   * 微信授权登录：code → code2session 换 openid → 命中/未命中
   * @param {{ code: string }} input wx.login() 凭证
   * @param {any} channelConfigRepo 渠道配置（门禁 + appid/appsecret）
   * @returns {{ user: Omit<import('../domain/types.js').User, 'passwordHash'>, sessionToken: string, bound: boolean }}
   * @throws {Error} CHANNEL_DISABLED 渠道停用（Q5）
   * @throws {Error} WECHAT_BIND_REQUIRED openid 未命中，需手机号绑定
   * @throws {Error} WECHAT_CODE_INVALID code 无效
   * @throws {Error} USER_DISABLED 命中用户被禁用（R-WX-010 / R-SES-006）
   */
  loginWithCode({ code }, channelConfigRepo) {
    // 1. 渠道门禁（Q5）：停用拒绝新登录
    this.assertChannelEnabled(channelConfigRepo)
    // 2. code2session 换 openid（mock 网关 test / 真实未接入生产）
    const config = channelConfigRepo.getConfig()
    const openid = exchangeCodeForOpenid(code, { appid: config.appid, appsecret: config.appsecret })
    // 3. openid 命中 → 直连登录（Q1：User.openid 一对一；R-WX-003 同源直连）
    const user = this.userRepo.findByOpenid(openid)
    if (!user) {
      const err = new Error('WECHAT_BIND_REQUIRED')
      err.openid = openid
      throw err
    }
    // 4. 禁用门禁（R-WX-010 / R-SES-006 禁用即失效）
    assertUserEnabled(user)
    // 5. 会话（channel=MINIPROGRAM，Q7）
    const session = this.sessionRepo.create(user.id, WechatAuthService.CHANNEL)
    return { user: this.toPublicUser(user), sessionToken: session.token, bound: true }
  }

  /**
   * 手机号绑定（openid 未命中路径）：新手机号建号 / 撞号引导（Q2）
   * @param {{ code: string, phoneCode?: string, phone?: string, nickname?: string }} input
   *   code = wx.login() code（换 openid，必填）；phoneCode = 微信手机号组件 code（mock phone_demo_*，换手机号）
   *   或 phone = 手动输入手机号（二选一取号）
   * @param {any} channelConfigRepo 渠道配置（门禁）
   * @returns {{ user: Omit<import('../domain/types.js').User, 'passwordHash'>, sessionToken: string, bound: boolean, exists: boolean }}
   * @throws {Error} CHANNEL_DISABLED 渠道停用
   * @throws {Error} WECHAT_PHONE_REQUIRED 手机号缺失/非法
   * @throws {Error} PHONE_EXISTS_NEED_LOGIN 撞号（Q2）：手机号已注册，需登录既有账号再绑定（不合并）
   * @throws {Error} WECHAT_OPENID_TAKEN openid 已被其他用户绑定
   */
  bindByPhone({ code, phoneCode, phone, nickname }, channelConfigRepo) {
    // 1. 渠道门禁（Q5）
    this.assertChannelEnabled(channelConfigRepo)
    // 2. wx.login code → openid（换 openid 复用 code2session 网关）
    if (!code) throw new Error('WECHAT_CODE_INVALID')
    const config = channelConfigRepo.getConfig()
    const openid = exchangeCodeForOpenid(code, { appid: config.appid, appsecret: config.appsecret })
    // 3. 取手机号：phoneCode（微信组件）→ 手机号；否则手动 phone
    let phoneValue = phone
    if (phoneCode) {
      phoneValue = fetchPhoneByCode(phoneCode)
    }
    if (typeof phoneValue !== 'string' || !/^1\d{10}$/.test(String(phoneValue))) {
      throw new Error('WECHAT_PHONE_REQUIRED')
    }
    // 4. openid 防重复绑定：已被其他用户占用 → 拒绝（Q1 单小程序一对一）
    const openidUser = this.userRepo.findByOpenid(openid)
    if (openidUser) {
      // openid 已绑定该用户：视为重复登录（返回既有用户绑定态，不重复绑定）
      if (openidUser.phone === String(phoneValue)) {
        const session = this.sessionRepo.create(openidUser.id, WechatAuthService.CHANNEL)
        return { user: this.toPublicUser(openidUser), sessionToken: session.token, bound: true, exists: true }
      }
      throw new Error('WECHAT_OPENID_TAKEN')
    }
    // 5. 撞号判定（Q2）：手机号已注册 → 引导登录既有账号再绑定（不合并/不静默拒绝）
    const existing = this.userRepo.findByPhone(String(phoneValue))
    if (existing) {
      const err = new Error('PHONE_EXISTS_NEED_LOGIN')
      err.phone = String(phoneValue)
      throw err
    }
    // 6. 新手机号 → 建 User（phone + openid，role=客户，昵称默认规则沿用 R-WX-005）
    const user = {
      id: this.userRepo.nextId(),
      phone: String(phoneValue),
      passwordHash: '', // 微信渠道用户无密码（后续可在网页端补设；本期空哈希不可密码登录）
      nickname: (nickname && String(nickname).trim())
        ? String(nickname).slice(0, 20)
        : defaultNickname(String(phoneValue)),
      openid,
      status: '正常',
      role: '客户',
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' ')
    }
    this.userRepo.save(user)
    const session = this.sessionRepo.create(user.id, WechatAuthService.CHANNEL)
    return { user: this.toPublicUser(user), sessionToken: session.token, bound: true, exists: false }
  }

  /**
   * 撞号完成绑定：既有账号会话（HTTP 层已 requireSession 校验）将 openid 写入该 User。
   * 本服务不自行鉴权——归属校验由 HTTP 层保证（调用方传 sessionUser 即已登录账号），防越权。
   * @param {{ openid: string }} input 待绑定的微信 openid
   * @param {Omit<import('../domain/types.js').User, 'passwordHash'>} sessionUser 既有账号（已登录）
   * @returns {{ user: Omit<import('../domain/types.js').User, 'passwordHash'>, sessionToken: string, bound: boolean }}
   * @throws {Error} WECHAT_CODE_INVALID openid 缺失
   * @throws {Error} WECHAT_OPENID_TAKEN openid 已被其他用户绑定（防越权绑定他人微信）
   */
  bindOpenidToExisting({ openid }, sessionUser) {
    if (!openid) throw new Error('WECHAT_CODE_INVALID')
    const taken = this.userRepo.findByOpenid(openid)
    if (taken && taken.id !== sessionUser.id) {
      throw new Error('WECHAT_OPENID_TAKEN') // 该 openid 已绑定其他账户，拒绝（防越权）
    }
    const user = this.userRepo.findById(sessionUser.id)
    if (!user) throw new Error('UNAUTHORIZED')
    user.openid = openid
    this.userRepo.save(user)
    const session = this.sessionRepo.create(user.id, WechatAuthService.CHANNEL)
    return { user: this.toPublicUser(user), sessionToken: session.token, bound: true }
  }
}
