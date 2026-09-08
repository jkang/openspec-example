const { request } = require('../../utils/request')
const { demoLogin, demoBind } = require('../../utils/auth')
const { formatMoney, orderStatusLabel, orderStep } = require('../../utils/format')
const app = getApp()

Page({
  data: { orders: [], loggedIn: false },
  onShow() {
    const loggedIn = !!(app.globalData.sessionToken || wx.getStorageSync('sessionToken'))
    this.setData({ loggedIn })
    if (loggedIn) this.loadOrders()
  },
  /** 我的订单：会话归属（R-MO-001，Web/小程序同库）；列表 + 展开状态轨迹 */
  async loadOrders() {
    try {
      const list = await request('/api/orders')
      const orders = (list || []).map(o => {
        const qty = (o.items || []).reduce((n, i) => n + (i.quantity || 0), 0)
        const first = (o.items && o.items[0]) || {}
        return {
          id: o.id,
          status: o.status,
          statusText: orderStatusLabel(o.status),
          summary: `${first.name || ''}${qty > 1 ? ` 等 ${qty} 件` : ''}`,
          amountText: formatMoney(o.actualPaidCents || 0),
          totalText: formatMoney(o.totalCents || 0),
          couponText: o.couponId || '无',
          discountText: formatMoney(o.discountCents || 0),
          step: orderStep(o.status),
          expanded: false
        }
      })
      this.setData({ orders })
    } catch (e) {
      wx.showToast({ title: '订单加载失败', icon: 'none' })
    }
  },
  toggle(e) {
    const id = e.currentTarget.dataset.id
    const orders = this.data.orders.map(o => (o.id === id ? { ...o, expanded: !o.expanded } : o))
    this.setData({ orders })
  },
  async goLogin() {
    const r = await demoLogin('code_demo_001')
    if (r.ok) { this.setData({ loggedIn: true }); this.loadOrders(); return }
    if (r.needBind) {
      const b = await demoBind()
      if (b.ok) { this.setData({ loggedIn: true }); this.loadOrders(); return }
    }
    wx.showToast({ title: '请先登录', icon: 'none' })
  }
})
