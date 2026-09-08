/** 格式化辅助（全中文展示） */

/** 分 → ¥x.xx（等宽价格展示） */
function formatMoney(cents) {
  return `¥${((cents || 0) / 100).toFixed(2)}`
}

/** 订单状态中文标签 */
function orderStatusLabel(status) {
  const map = {
    PENDING_PAYMENT: '待支付',
    PAID: '已支付',
    SHIPPED: '已发货',
    COMPLETED: '已完成',
    CANCELLED: '已取消'
  }
  return map[status] || status
}

/** 订单状态轨迹步骤下标（对齐 Web 端状态机） */
function orderStep(status) {
  return { PENDING_PAYMENT: 0, PAID: 1, SHIPPED: 2, COMPLETED: 3, CANCELLED: 0 }[status]
}

/** 库存状态文案/级别 */
function stockLevel(stock) {
  if (stock <= 0) return { text: '已售罄', level: 'accent' }
  if (stock <= 10) return { text: `仅剩 ${stock} 件`, level: 'warning' }
  return { text: `库存 ${stock} 件`, level: 'success' }
}

module.exports = { formatMoney, orderStatusLabel, orderStep, stockLevel }
