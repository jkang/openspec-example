const { request } = require('../../utils/request')
const { demoLogin, demoBind } = require('../../utils/auth')
const { formatMoney } = require('../../utils/format')
const app = getApp()

Page({
  data: { items: [], loggedIn: false, totalQty: 0, totalText: '¥0.00' },
  onShow() {
    const loggedIn = !!(app.globalData.sessionToken || wx.getStorageSync('sessionToken'))
    this.setData({ loggedIn })
    if (loggedIn) this.loadCart()
  },
  /** 购物车读取：复用 Web 端探测语义（qty=0 请求返回服务端购物车，无独立 GET /api/cart） */
  async loadCart() {
    try {
      const cart = await request('/api/cart/items', {
        method: 'POST',
        data: { productId: '1', quantity: 0 }
      })
      const items = (cart.items || []).map((it, i) => ({
        ...it,
        id: it.id || `i${i}`,
        logo: (it.name || '?').slice(0, 1),
        priceText: formatMoney(it.priceCents || 0)
      }))
      const totalQty = items.reduce((n, it) => n + (it.quantity || 0), 0)
      const totalCents = items.reduce((n, it) => n + (it.priceCents || 0) * it.quantity, 0)
      this.setData({ items, totalQty, totalText: formatMoney(totalCents) })
    } catch (e) {
      wx.showToast({ title: '购物车加载失败', icon: 'none' })
    }
  },
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
  async inc(e) {
    if (!(await this.ensureLogin())) return
    const it = this.data.items[e.currentTarget.dataset.index]
    await request('/api/cart/items', { method: 'POST', data: { productId: String(it.productId), quantity: 1 } })
    this.loadCart()
  },
  async dec(e) {
    if (!(await this.ensureLogin())) return
    const it = this.data.items[e.currentTarget.dataset.index]
    if (it.quantity <= 1) return // 下限 1（R-MC-002）：− 在 1 时不可再减
    await request('/api/cart/items', { method: 'POST', data: { productId: String(it.productId), quantity: -1 } })
    this.loadCart()
  },
  async remove(e) {
    const it = this.data.items[e.currentTarget.dataset.index]
    await request('/api/cart/remove', { method: 'POST', data: { productId: String(it.productId) } })
    this.loadCart()
  },
  goCheckout() {
    if (!this.data.items.length) return
    wx.navigateTo({ url: '/pages/checkout/checkout' })
  }
})
