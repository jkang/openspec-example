/**
 * 微信网关对接（story-miniprogram-wechat-login / wechat-auth capability / mock Q6）
 *
 * 职责边界（四层架构 Service 层适配）：对外提供两个能力——
 * - `exchangeCodeForOpenid(code)`：小程序 wx.login() 的 code → 服务端以 appid+appsecret 调 code2session 换 openid
 * - `fetchPhoneByCode(code)`：微信官方手机号快速验证组件 code → 服务端解密换取手机号
 *
 * mock 策略（Q6）：`NODE_ENV=test` 下以固定映射表模拟（不访问真实微信服务器），对齐既有
 * `/api/__test/*` 测试后门模式，保证 E2E 可复现；生产/运行环境真实微信网关未接入（资质后置 +X），
 * 显式抛错提示，避免静默错误行为。appid/appsecret 由调用方从渠道配置（ChannelConfigRepo）读取注入，
 * 严禁本模块持有/下发前端。
 */

/**
 * mock 网关固定映射表（Q6）：code → openid；code 与 openid 均以 _demo_ 命名便于 E2E 断言可读。
 * 映射关系对应需求侧验收场景：openid_demo_001=老客户（林晓明 user_1002 绑定）、
 * openid_demo_002=新客户首次、openid_demo_003=撞号场景。
 */
const MOCK_CODE_TO_OPENID = {
  code_demo_001: 'openid_demo_001',
  code_demo_002: 'openid_demo_002',
  code_demo_003: 'openid_demo_003'
}

/** mock 手机号组件映射：code → 手机号（对齐需求侧验收：手机号快速验证组件取号） */
const MOCK_PHONE_CODE_TO_PHONE = {
  phone_demo_001: '13700005678',
  phone_demo_002: '13888217536' // 撞号场景：= 林晓明（user_1002）已注册手机号
}

/**
 * code2session：code → openid。
 * - `NODE_ENV=test`：查 mock 固定映射表；未知 code 抛 WECHAT_CODE_INVALID。
 * - 其他环境：真实微信网关未接入（资质后置 +X），显式抛错。
 * @param {string} code wx.login() 返回的临时凭证
 * @param {{ appid: string, appsecret: string }} config 渠道配置（appid/appsecret，服务端持有）
 * @returns {string} openid
 * @throws {Error} WECHAT_CODE_INVALID code 无效/过期
 * @throws {Error} WECHAT_GATEWAY_NOT_CONFIGURED 生产环境真实网关未接入
 */
export function exchangeCodeForOpenid(code, config) {
  if (process.env.NODE_ENV === 'test') {
    const openid = MOCK_CODE_TO_OPENID[String(code)]
    if (!openid) throw new Error('WECHAT_CODE_INVALID')
    return openid
  }
  // 真实 code2session 需企业资质 + 服务端调用微信服务器；MVP 未接入（ROADMAP：真实微信能力后置 +X）
  throw new Error('WECHAT_GATEWAY_NOT_CONFIGURED')
}

/**
 * 微信官方手机号快速验证组件：code → 手机号。
 * - `NODE_ENV=test`：查 mock 固定映射表。
 * - 其他环境：真实能力未接入，显式抛错。
 * @param {string} code 手机号组件返回的临时凭证
 * @returns {string} 用户授权手机号
 * @throws {Error} WECHAT_CODE_INVALID code 无效
 * @throws {Error} WECHAT_GATEWAY_NOT_CONFIGURED 真实网关未接入
 */
export function fetchPhoneByCode(code) {
  if (process.env.NODE_ENV === 'test') {
    const phone = MOCK_PHONE_CODE_TO_PHONE[String(code)]
    if (!phone) throw new Error('WECHAT_CODE_INVALID')
    return phone
  }
  throw new Error('WECHAT_GATEWAY_NOT_CONFIGURED')
}
