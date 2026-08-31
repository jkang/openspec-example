import { SALES_STATUSES } from './order.js'
import {
  resolveEffectiveThreshold,
  isStockWarning,
  daysToSellout,
  isOversellRisk,
  sortStockWarning,
  suggestReplenish,
  assertThresholdValue
} from '../domain/stock.js'

/**
 * 库存洞察服务（story-stock-warning-list + story-stock-replenish-suggestion / stock-insight capability / data-insights BC）
 *
 * 职责边界（四层架构 Service 层）：
 * - `aggregate()`：只读聚合——组装 Product.stock + 近7日订单销量 + stock-config 三源，
 *   判定/排序/补货规则全部下沉 Domain 纯函数（src/domain/stock.js），本层仅编排数据源。
 *   近7日销量复用 order-management 既有 `aggregateSales`（groupBy='product'，与销售看板同源同口径）。
 *   数值口径（design 决策 1）：dailyAvg 向上取整到 0.1 件/日（ceil((sales7d/7)×10)/10），
 *   售罄天数/风险/补货量全部基于该取整后的 dailyAvg 计算，保证数值链与 story.md 冻结验收一致。
 * - `setGlobalThreshold() / setProductOverride()`：阈值配置写（本 Epic 唯一写操作，R-STOCK-007），
 *   先经 Domain `assertThresholdValue` 校验，再经 stockConfigRepo 落盘 + 内存即时生效。
 */
export class StockInsightService {
  /**
   * @param {import('./order.js').OrderService} orderService 订单服务（复用销量聚合底座）
   * @param {any} productRepo 商品仓储（Product.stock 只读消费）
   * @param {any} stockConfigRepo 库存阈值配置仓储（stock-config.json 落盘）
   */
  constructor(orderService, productRepo, stockConfigRepo) {
    this.orderService = orderService
    this.productRepo = productRepo
    this.stockConfigRepo = stockConfigRepo
  }

  /**
   * 预警只读聚合（R-STOCK-001~010 + R-STOCK-101~107 补货建议增量）：遍历在售商品（过滤 status=deleted，R-STOCK-008），
   * 计算入列 / 有效阈值标注 / 日均销量（ceil 0.1 口径）/ 预计售罄天数 / 超卖风险 / 建议补货量，
   * 按 R-STOCK-010 排序，并统计老板健康度总览（R-STOCK-107，对入列预警项统计）。
   * 纯只读：不产生任何写操作（本方法不写 productRepo / orderRepo / stockConfigRepo）。
   * @returns {{
   *   items: Array<{ productId: string, name: string, stock: number, effectiveThreshold: number,
   *     thresholdSource: 'global'|'override', override: number|null, dailyAvg: number, sales7d: number,
   *     daysToSellout: number|null, risk: boolean, replenish: number, status: 'sold_out'|'low_stock'|'healthy', listed: boolean }>,
   *   globalThreshold: number,
   *   overrides: Record<string, number>,
   *   healthOverview: { warningCount: number, soldOutCount: number, riskCount: number }
   * }}
   */
  aggregate() {
    const config = this.stockConfigRepo.getConfig()
    const globalThreshold = config.globalThreshold
    const overrides = config.overrides || {}

    // 近7日销量口径（对齐 sales-dashboard week 维度）：[今日本地 00:00 − 6 天, now]，
    // status ∈ {PAID, SHIPPED, COMPLETED} 且 paidAt 落入区间；商品销量 = 订单明细 quantity 求和。
    // 上界取 now + 1ms：aggregateSales 为 [from, to) 左闭右开（R-DASH-005），"近7日"须包含此刻刚支付订单。
    const DAY_MS = 24 * 60 * 60 * 1000
    const now = Date.now()
    const startOfDay = (ms) => {
      const d = new Date(ms)
      d.setHours(0, 0, 0, 0)
      return d.getTime()
    }
    const from = new Date(startOfDay(now - 6 * DAY_MS)).toISOString()
    const to = new Date(now + 1).toISOString()

    const agg = this.orderService.aggregateSales({
      from,
      to,
      statuses: SALES_STATUSES,
      granularity: 'day',
      groupBy: 'product'
    })
    /** @type {Map<string, number>} 近7日销量（按 productId） */
    const sales7dByProduct = new Map(
      (agg.productRanking || []).map(r => [String(r.productId), r.quantity])
    )

    const rows = this.productRepo
      .findAll()
      .filter(p => (p.status || 'active') !== 'deleted') // R-STOCK-008：软删除商品不参与聚合
      .map((product) => {
        const productId = String(product.id)
        const override = overrides[productId] != null ? overrides[productId] : null
        const effectiveThreshold = resolveEffectiveThreshold(productId, overrides, globalThreshold)
        const stock = product.stock
        const sales7d = sales7dByProduct.get(productId) || 0
        // design 决策 1（R-STOCK-101）：dailyAvg 向上取整到 0.1 件/日，售罄天数/风险/补货量基于该口径
        const dailyAvg = Math.ceil((sales7d / 7) * 10) / 10
        const dts = daysToSellout(stock, dailyAvg)
        const risk = isOversellRisk(stock, dailyAvg)
        const replenish = suggestReplenish(stock, dailyAvg)
        const listed = isStockWarning(stock, effectiveThreshold)
        const status = stock === 0 ? 'sold_out' : listed ? 'low_stock' : 'healthy'

        return {
          productId,
          name: product.name,
          stock,
          effectiveThreshold,
          thresholdSource: override != null ? 'override' : 'global',
          override,
          dailyAvg,
          sales7d,
          daysToSellout: dts == null ? null : Math.round(dts * 10) / 10,
          risk,
          replenish,
          status,
          listed
        }
      })

    // R-STOCK-010：已售罄置顶 → 天数升序 → 无销量置底（仅预警项排序；健康水位项保持其后）
    const warningRows = sortStockWarning(rows.filter(r => r.listed))
    const healthyRows = rows.filter(r => !r.listed)

    // R-STOCK-107：老板健康度总览（对入列预警项统计，与列表同源同口径）
    const listedRows = rows.filter(r => r.listed)
    const healthOverview = {
      warningCount: listedRows.length,
      soldOutCount: listedRows.filter(i => i.stock === 0).length,
      riskCount: listedRows.filter(i => i.risk).length
    }

    return {
      items: [...warningRows, ...healthyRows],
      globalThreshold,
      overrides,
      healthOverview
    }
  }

  /**
   * 设置全局默认阈值（R-STOCK-006/007，仅运营可写由 HTTP 层门禁保证）：
   * 校验 → 落盘 + 内存即时生效，下一次预警查询立即反映新阈值。
   * @param {number} threshold 全局默认阈值（≥0 整数）
   * @returns {{ globalThreshold: number, overrides: Record<string, number> }} 更新后配置
   * @throws {Error} INVALID_THRESHOLD 负数 / 非数字 / 非整数
   */
  setGlobalThreshold(threshold) {
    assertThresholdValue(threshold)
    return this.stockConfigRepo.setGlobalThreshold(threshold)
  }

  /**
   * 设置商品级覆盖阈值（R-STOCK-005/006/007，覆盖优先于全局默认，即时生效）。
   * 软删除商品覆盖配置保留但不参与聚合（R-STOCK-008：写入不删除历史覆盖）。
   * @param {string} productId 商品 ID
   * @param {number} threshold 覆盖阈值（≥0 整数）
   * @returns {{ globalThreshold: number, overrides: Record<string, number> }} 更新后配置
   * @throws {Error} INVALID_THRESHOLD 负数 / 非数字 / 非整数
   */
  setProductOverride(productId, threshold) {
    assertThresholdValue(threshold)
    return this.stockConfigRepo.setOverride(productId, threshold)
  }
}
