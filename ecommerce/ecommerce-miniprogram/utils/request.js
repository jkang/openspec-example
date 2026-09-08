/**
 * wx.request 封装（小程序 → 仓库 Node 后端，localhost:3000）
 * 注入 Bearer 会话凭证；统一错误处理（401 清会话引导登录；业务错误码透传）。
 */
const app = getApp()

function request(path, options = {}) {
  const method = options.method || 'GET'
  const token = app.globalData.sessionToken || wx.getStorageSync('sessionToken') || ''
  const header = Object.assign({ 'Content-Type': 'application/json' }, options.header || {})
  if (token) header.Authorization = `Bearer ${token}`

  return new Promise((resolve, reject) => {
    wx.request({
      url: `${app.globalData.baseUrl}${path}`,
      method,
      data: options.data || {},
      header,
      success(res) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
          return
        }
        // 401 未登录：清除会话，引导重新登录
        if (res.statusCode === 401) {
          app.clearSession()
        }
        const body = res.data || {}
        const err = new Error(body.error?.message || body.message || '请求失败')
        err.statusCode = res.statusCode
        err.code = body.error?.code || body.code
        reject(err)
      },
      fail(err) {
        reject(new Error(`网络请求失败: ${err.errMsg || ''}`))
      }
    })
  })
}

module.exports = { request }
