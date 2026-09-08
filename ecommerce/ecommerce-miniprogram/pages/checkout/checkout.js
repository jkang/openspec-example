const { request } = require('../../utils/request')
const { formatMoney } = require('../../utils/format')

Page({
  data: {
    items: [], loading: true, totalText: '¥0.00', couponText: '自动匹配',
    discountText: '¥0.00', payText: '¥0.00', paid: false, lastPaid: false,
    orderId: '', submitting: false, payCents: 0
  },
  onLoad() { this.loadPreview() },
  /** 读取购物车合计（qty=0 探测语义）并展示预估（优惠以实际下单为准） */
  async loadPreview() {
    try {
      const cart = await request('/api/cart/items', { method: 'POST', data: { productId: '1', quantity: 0 } })
      const items = cart.items || []
      const totalCents = items.reduce((n, it) => n + (it.priceCents || 0) * it.quantity, 0)
      this.setData({
        items: items.map(it => ({ productId: it.productId })),
        totalText: formatMoney(totalCents),
        loading: false,
        totalCents
      })
    } catch (e) {
      this.setData({ loading: false })
      wx.showToast({ title: '结算加载失败', icon: 'none' })
    }
  },
  /** 提交订单：后端自动最优券 + channel 会话继承（服务端判定 MINIPROGRAM，UI 不传渠道，Q7/R-MC-006） */
  async submitOrder() {
    this.setData({ submitting: true })
    try {
      const order = await request('/api/orders', { method: 'POST', data: {} })
      this.setData({
        paid: true, lastPaid: false, orderId: order.id, payCents: order.actualPaidCents,
        payText: formatMoney(order.actualPaidCents), discountText: formatMoney(order.discountCents),
        couponText: order.couponId || '无', submitting: false
      })
    } catch (e) {
      this.setData({ submitting: false })
      wx.showToast({ title: e.message || '下单失败', icon: 'none' })
    }
  },
  async pay() {
    try {
      const order = await request(`/api/payments/${this.data.orderId}`, { method: 'POST' })
      this.setData({ lastPaid: true })
    } catch (e) {
      wx.showToast({ title: e.message || '支付失败', icon: 'none' })
    }
  },
  goOrders() { wx.switchTab({ url: '/pages/orders/orders' }) },
  goHome() { wx.switchTab({ url: '/pages/index/index' }) }
})
