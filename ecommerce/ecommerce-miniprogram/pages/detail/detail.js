const { request } = require('../../utils/request')
const { demoLogin, demoBind } = require('../../utils/auth')
const { formatMoney, stockLevel } = require('../../utils/format')
const app = getApp()

Page({
  data: { p: null, loggedIn: false },
  onLoad(query) {
    this.id = query.id
    this.setData({ loggedIn: !!(app.globalData.sessionToken || wx.getStorageSync('sessionToken')) })
    this.loadDetail()
  },
  onShow() {
    this.setData({ loggedIn: !!(app.globalData.sessionToken || wx.getStorageSync('sessionToken')) })
  },
  async loadDetail() {
    try {
      const p = await request(`/api/products/${this.id}`)
      const lv = stockLevel(p.stock)
      this.setData({
        p: Object.assign({}, p, {
          logo: p.logo || p.name.slice(0, 1),
          priceText: formatMoney(p.priceCents),
          stockText: lv.text,
          stockLevel: lv.level === 'accent' ? 'text-accent' : lv.level === 'warning' ? 'text-warning' : 'text-success'
        })
      })
    } catch (e) {
      wx.showToast({ title: '商品加载失败', icon: 'none' })
    }
  },
  /** 登录门禁（未登录先体验登录再继续） */
  async ensureLogin() {
    if (this.data.loggedIn) return true
    const r = await demoLogin('code_demo_001')
    if (r.ok) { this.setData({ loggedIn: true }); return true }
    if (r.needBind) {
      const b = await demoBind()
      if (b.ok) { this.setData({ loggedIn: true }); return true }
    }
    wx.showToast({ title: '请先登录', icon: 'none' })
    return false
  },
  async addToCart() {
    if (!(await this.ensureLogin())) return
    try {
      await request('/api/cart/items', { method: 'POST', data: { productId: String(this.id), quantity: 1 } })
      wx.showToast({ title: '已加入购物车', icon: 'success' })
    } catch (e) {
      wx.showToast({ title: e.message || '加购失败', icon: 'none' })
    }
  },
  async buyNow() {
    if (!(await this.ensureLogin())) return
    try {
      await request('/api/cart/items', { method: 'POST', data: { productId: String(this.id), quantity: 1 } })
      wx.switchTab({ url: '/pages/cart/cart' })
    } catch (e) {
      wx.showToast({ title: e.message || '加购失败', icon: 'none' })
    }
  }
})
