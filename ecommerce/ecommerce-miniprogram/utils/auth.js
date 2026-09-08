/**
 * 微信登录 / 会话辅助（6.1 wechat-auth capability 消费）
 *
 * 真实链路：wx.login() 取 code → 服务端以 appid+appsecret 调 code2session 换 openid →
 * 命中直连 / 未命中引导绑定（6.1 已实现 /api/auth/wechat/login|bind）。
 *
 * 仓库演示（决策 B 验证降级）：后端以 NODE_ENV=test 启动时 mock 微信网关可用，
 * 固定 code（code_demo_001 → openid_demo_001 老客户 / code_demo_002 → 新客户 openid）。
 * 「体验登录」以 dev code 走通链路；真实微信登录（企业资质）为交付后 +X。
 */
const { request } = require('./request')
const app = getApp()

/** 体验登录（演示）：以 mock code 完成微信授权登录（后端 NODE_ENV=test） */
async function demoLogin(devCode = 'code_demo_001') {
  try {
    const data = await request('/api/auth/wechat/login', {
      method: 'POST',
      data: { code: devCode }
    })
    app.setSession(data.sessionToken, data.user)
    return { ok: true, user: data.user }
  } catch (e) {
    if (e.code === 'WECHAT_BIND_REQUIRED') {
      // openid 未命中 → 绑定路径（体验：code_demo_002 需绑定手机号，走 demo bind）
      return { ok: false, needBind: true, code: e.code, message: e.message }
    }
    if (e.code === 'CHANNEL_DISABLED') {
      return { ok: false, channelDisabled: true, message: e.message }
    }
    return { ok: false, message: e.message }
  }
}

/** 体验绑定（openid 未命中的新客户，mock 手机号组件取号） */
async function demoBind() {
  try {
    const data = await request('/api/auth/wechat/bind', {
      method: 'POST',
      data: { code: 'code_demo_002', phoneCode: 'phone_demo_001' }
    })
    app.setSession(data.sessionToken, data.user)
    return { ok: true, user: data.user }
  } catch (e) {
    return { ok: false, code: e.code, message: e.message }
  }
}

/** 退出登录（销毁服务端会话） */
async function logout() {
  const token = app.globalData.sessionToken
  if (token) {
    try {
      await request('/api/auth/logout', { method: 'POST' })
    } catch (e) { /* 幂等 */ }
  }
  app.clearSession()
}

module.exports = { demoLogin, demoBind, logout }
