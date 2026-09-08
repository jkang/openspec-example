const { request } = require('../../utils/request')
const { demoLogin, demoBind } = require('../../utils/auth')
const { formatMoney } = require('../../utils/format')
const app = getApp()

Page({
  data: {
    keyword: '',
    sortAsc: false,
    activeCat: 'all',
    catList: [],
    products: [],
    loggedIn: false,
    user: null
  },
  onShow() {
    const token = app.globalData.sessionToken || wx.getStorageSync('sessionToken') || ''
    this.setData({ loggedIn: !!token, user: app.globalData.user || wx.getStorageSync('ecommerce_user') || null })
    this.loadCats()
    this.loadProducts()
  },
  onKeyword(e) {
    this.setData({ keyword: e.detail.value })
    this.loadProducts()
  },
  toggleSort() {
    this.setData({ sortAsc: !this.data.sortAsc })
    this.loadProducts()
  },
  onCat(e) {
    this.setData({ activeCat: e.currentTarget.dataset.key })
    this.loadProducts()
  },
  reload() { this.loadProducts() },
  async loadCats() {
    try {
      const cats = await request('/api/categories')
      const catList = [{ key: 'all', name: '全部' }].concat((cats || []).map(c => ({ key: c.id, name: c.name })))
      this.setData({ catList })
    } catch (e) { /* 分类加载失败静默 */ }
  },
  async loadProducts() {
    try {
      const params = []
      if (this.data.keyword) params.push(`keyword=${encodeURIComponent(this.data.keyword)}`)
      if (this.data.sortAsc) params.push('sort=price_asc')
      const qs = params.length ? `?${params.join('&')}` : ''
      const list = await request(`/api/products${qs}`)
      const products = (list || []).filter(p => (p.status || 'active') !== 'deleted').map(p => ({
        id: p.id, name: p.name, description: p.description, logo: p.logo || p.name.slice(0, 1),
        priceText: formatMoney(p.priceCents)
      }))
      this.setData({ products })
    } catch (e) {
      wx.showToast({ title: '商品加载失败', icon: 'none' })
    }
  },
  openDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` })
  },
  /** 体验登录（演示）：老客户 dev code 直连；若需绑定则走 demoBind（新客户建号） */
  async goLogin() {
    const r = await demoLogin('code_demo_001')
    if (r.ok) {
      this.setData({ loggedIn: true, user: r.user })
      wx.showToast({ title: '登录成功', icon: 'success' })
      this.onShow()
      return
    }
    if (r.needBind) {
      const b = await demoBind()
      if (b.ok) {
        this.setData({ loggedIn: true, user: b.user })
        wx.showToast({ title: '绑定并登录成功', icon: 'success' })
        this.onShow()
        return
      }
      wx.showToast({ title: b.message || '登录失败', icon: 'none' })
      return
    }
    if (r.channelDisabled) {
      wx.showToast({ title: '渠道已停用，暂不可登录', icon: 'none' })
      return
    }
    wx.showToast({ title: r.message || '登录失败', icon: 'none' })
  }
})
