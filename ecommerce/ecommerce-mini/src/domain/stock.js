/**
 * 库存洞察领域规则（story-stock-warning-list / stock-insight capability）
 *
 * 本模块为纯函数集合，零外部依赖（Domain 层约束）：入列判定 / 有效阈值解析 /
 * 预计售罄天数 / 超卖风险判定 / 预警排序 全部下沉至此，@unit 直接测试（测试金字塔底层）。
 *
 * 口径（R-STOCK-001~010，对齐 story.md 业务规则表）：
 * - R-STOCK-001 入列：stock ≤ 有效阈值；有效阈值 = 商品级覆盖优先，否则全局默认。
 * - R-STOCK-002 已售罄：stock = 0 恒入列并置顶。
 * - R-STOCK-003 超卖风险：有销量且 0 < stock < 日均销量 × 7（等价预计售罄天数 < 7 天）。
 * - R-STOCK-010 排序：已售罄置顶 → 其余按预计售罄天数升序 → 无销量商品（不计算天数）置底。
 * - R-STOCK-104 建议补货量：max(0, ⌈dailyAvg×7⌉ − stock)（story-stock-replenish-suggestion 增量）。
 */

/**
 * 有效阈值解析（R-STOCK-005 覆盖优先）：商品级覆盖阈值优先，否则全局默认阈值。
 * @param {string|number} productId 商品 ID
 * @param {Record<string, number>} [overrides] 商品级覆盖阈值表 `{ "<productId>": threshold }`
 * @param {number} globalThreshold 全局默认阈值
 * @returns {number} 有效阈值
 */
export function resolveEffectiveThreshold(productId, overrides, globalThreshold) {
  const key = String(productId)
  if (overrides && overrides[key] != null) return overrides[key]
  return globalThreshold
}

/**
 * 入列判定（R-STOCK-001/002）：stock ≤ 有效阈值 或 stock = 0（已售罄恒入列，不可静默消失）。
 * @param {number} stock 当前库存
 * @param {number} effectiveThreshold 有效阈值
 * @returns {boolean} 是否进入预警列表
 */
export function isStockWarning(stock, effectiveThreshold) {
  return stock <= effectiveThreshold || stock === 0
}

/**
 * 预计售罄天数（R-STOCK-003 底座）：stock ÷ dailyAvg。
 * 无销量（dailyAvg ≤ 0）不计算天数返回 null；已售罄（stock=0）返回 0（置顶且不参与天数排序）。
 * @param {number} stock 当前库存
 * @param {number} dailyAvg 日均销量（近7日销量 ÷ 7）
 * @returns {number|null} 预计售罄天数（天）；无销量返回 null
 */
export function daysToSellout(stock, dailyAvg) {
  if (!dailyAvg || dailyAvg <= 0) return null
  if (stock <= 0) return 0
  return stock / dailyAvg
}

/**
 * 超卖风险判定（R-STOCK-003）：有销量且 0 < stock < dailyAvg × 7
 * （等价预计售罄天数 < 7 天到货周期；不纳入 PENDING_PAYMENT 占用）。
 * @param {number} stock 当前库存
 * @param {number} dailyAvg 日均销量
 * @returns {boolean} 是否命中超卖风险
 */
export function isOversellRisk(stock, dailyAvg) {
  if (!dailyAvg || dailyAvg <= 0) return false
  if (stock <= 0) return false
  return stock / dailyAvg < 7
}

/**
 * 预警排序（R-STOCK-010）：已售罄（stock=0）置顶 → 其余按预计售罄天数升序（最紧迫在前）
 * → 无销量（daysToSellout=null）置底。同序商品按 productId 字典序确定性兜底。
 * @param {Array<{ productId: string, stock: number, daysToSellout: number|null }>} rows
 * @returns {Array} 排序后的新数组（不修改入参）
 */
export function sortStockWarning(rows) {
  return [...rows].sort((a, b) => {
    const aSoldOut = a.stock === 0
    const bSoldOut = b.stock === 0
    if (aSoldOut !== bSoldOut) return aSoldOut ? -1 : 1
    if (aSoldOut && bSoldOut) return 0
    const aDay = a.daysToSellout == null ? Infinity : a.daysToSellout
    const bDay = b.daysToSellout == null ? Infinity : b.daysToSellout
    if (aDay !== bDay) return aDay - bDay
    return String(a.productId).localeCompare(String(b.productId))
  })
}

/**
 * 建议补货量（R-STOCK-104，story-stock-replenish-suggestion 增量）：
 * max(0, ⌈dailyAvg × 7⌉ − stock)，到货周期 MVP 固定 7 天（不在后台暴露）。
 * 无销量（dailyAvg ≤ 0）天然落 0（⌈0×7⌉ − stock ≤ 0），不特判。
 * @param {number} stock 当前库存
 * @param {number} dailyAvg 日均销量（近7日销量 ÷ 7，聚合层已向上取整到 0.1）
 * @returns {number} 建议补货量（整数件，≥ 0）
 */
export function suggestReplenish(stock, dailyAvg) {
  return Math.max(0, Math.ceil((dailyAvg || 0) * 7) - stock)
}

/**
 * 阈值写入校验（R-STOCK-006/007 防越界）：必须为 ≥ 0 的整数。
 * @param {unknown} threshold 待校验阈值
 * @throws {Error} INVALID_THRESHOLD 负数 / 非数字 / 非整数
 */
export function assertThresholdValue(threshold) {
  if (typeof threshold !== 'number' || !Number.isInteger(threshold) || threshold < 0) {
    throw new Error('INVALID_THRESHOLD')
  }
}
