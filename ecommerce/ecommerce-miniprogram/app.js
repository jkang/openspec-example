/**
 * Minimal Store 微信小程序（Epic 6.2 / story browse + checkout + orders）
 *
 * 决策 B：独立小程序原生工程（微信开发者工具可打开）。
 * 后端 100% 复用仓库 Node 服务（开发环境 http://localhost:3000）；
 * 演示登录走 6.1 mock 微信网关（后端 NODE_ENV=test，code_demo_* → openid_demo_*）。
 * 真实微信登录/支付能力（企业资质 + 合法域名）为交付后 +X 项。
 */
App({
  globalData: {
    baseUrl: 'http://localhost:3000',
    sessionToken: '',
    user: null,
    cartCount: 0
  },
  onLaunch() {
    const token = wx.getStorageSync('sessionToken') || ''
    const user = wx.getStorageSync('ecommerce_user') || null
    this.globalData.sessionToken = token
    this.globalData.user = user
  },
  /** 登录态写入（登录成功后调用） */
  setSession(token, user) {
    this.globalData.sessionToken = token
    this.globalData.user = user
    wx.setStorageSync('sessionToken', token)
    wx.setStorageSync('ecommerce_user', user)
  },
  /** 清除登录态 */
  clearSession() {
    this.globalData.sessionToken = ''
    this.globalData.user = null
    wx.removeStorageSync('sessionToken')
    wx.removeStorageSync('ecommerce_user')
  }
})
