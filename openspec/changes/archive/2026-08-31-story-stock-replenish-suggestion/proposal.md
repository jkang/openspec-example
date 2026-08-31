# Proposal: 补货建议 + 老板健康度总览（story-stock-replenish-suggestion）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-stock-insight/stories/story-stock-replenish-suggestion/story.md`（已 HITL 确认，lead 授权全程自主）。
> Epic：`epic-stock-insight`（Phase 5 库存预警与补货建议 · P1，依赖 `story-stock-warning-list` 底座）；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

运营补货靠"拍脑袋/Excel"：断货靠买家提醒、压资金靠感觉。本变更在 Story 1（低库存预警列表）底座之上，将"库存数字 + 销量速度"转化为**有据可依的补货建议**（近7日日均销量 → 预计售罸天数 → 建议补货量），并为老板提供**只读全局库存健康度总览**，与销售看板形成经营决策闭环（"可视即价值"）。

## What Changes (变更内容)

- **预警列表 API 扩展（后端只读聚合，增量）**：`GET /api/admin/dashboard/stock` 响应扩展补货建议字段：
  - `dailyAvg`（近7日日均销量 = 成交订单 `Σ(items.quantity)` ÷ 7，状态集 `{PAID, SHIPPED, COMPLETED}` 按 `paidAt` 落入近7日）。
  - `daysToSellout`（预计售罸天数 = `stock ÷ 日均销量`，`stock=0` → 0；无销量 → null）。
  - `replenish`（建议补货量 = `max(0, ⌈日均销量 × 7⌉ − stock)`，到货周期 MVP 固定 7 天）。
  - `healthOverview`（老板只读健康度总览：预警商品数 / 已售罄数 / 超卖风险数）。
  - **口径铁律（R-STOCK-106）**：无超卖风险 ⇔ 补货量公式结果为 0 ⇔ UI 展示「无需补货」。
- **库存预警前端扩展（Vue）**：对齐原型 `stock-insight.html`：
  - 补货建议列由 Story 1 的「—」占位替换为真实计算值：`replenish > 0` → primary 色数量；`replenish = 0` → 「无需补货」；`stock=0` → accent 色建议量。
  - 「近7日日均销量」列：`x.x 件/日` + 小字「近7日 N 件」；无销量 → 「暂无销量」。
  - 「预计售罸天数」列：有销量显示 `N 天`（超卖风险 warning 色）；无销量 → 「—」。
  - 老板只读健康度总览 3 卡片完整实现（预警商品数 / 已售罄数 / 超卖风险数）。
  - 口径脚注：「到货周期固定 7 天（MVP）· 无销量商品不计算售罸天数」。
- **权限与配置**：复用 Story 1 的 `requireRoleStrict` 门禁与阈值配置底座，无新增配置项；老板无配置入口（只读最小权限）。

### Out of Scope（本 Story 不实现）

- 自动补货执行（触发采购/下单）。
- 安全库存、个性化到货周期（P2 候选）。
- 真实供应链/供应商集成、在途库存。
- C 端任何改动；PENDING_PAYMENT 占用纳入判定（P2 候选）。

## Capabilities (系统能力)

### New Capabilities

- **`stock-insight`（新增 taxonomy，Story 1 已建主 spec，本 change 增量扩展）**：补货建议——近7日日均销量、预计售罸天数、建议补货量、老板健康度总览。更新 `specs/stock-insight/spec.md`（追加 Requirements）。
  - **理由（新增标注）**：与 `story-stock-warning-list` 同属 `data-insights` BC 的 `stock-insight` capability；Story 1 已声明新增 taxonomy 并建立主 spec，本 change 在其上**追加补货建议相关 Requirement**（行为增量，非新 taxonomy）。

### Modified Capabilities

- **`frontend-ui`（修改，横切支撑）**：`bc-shared → cap-ui`——补货建议列（真实计算值 + 「无需补货」）、日均销量/售罸天数列渲染、老板健康度总览卡片。更新 `specs/frontend-ui/spec.md`。

### 只读消费（不修改语义）

- `catalog-management`（Product.stock 库存事实）、`order-management`（近7日销量聚合底座，Story 1 已复用 `buildProductRanking`）、`sales-dashboard`（同支流导航）。

## Impacted Bounded Contexts

- **`data-insights`（扩展）**：`stock-insight` capability 追加补货建议行为（Story 1 已建 `bc-data-insights → cap-stock-insight` Governs 边）。Epic 归档后由 `/opsx:baseline/sync` 统一回流（本阶段预判不执行）。
- **Shared / Cross（修改）**：`frontend-ui` 补货建议列 + 健康度总览视图。
- **Catalog Context / Order Context（只读消费）**：库存事实与销量聚合来源，不改语义。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-05 支付确认` | 数据来源：PAID 订单（时间归属基于支付时间） |
| `L1-06 履约与完成` | 数据来源：SHIPPED/COMPLETED 订单 + Product.stock |
| `L1-07 经营分析（只读支流）` | **扩展**：「库存洞察」支流内新增销量速度聚合（日均销量/售罸天数/补货量）+ 老板健康度总览，不作为交易节点修改 |

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-06 成功回流` | 只读消费 | 补货建议数据来源（库存与订单聚合回查） |
| `SB-BACKSTAGE-01` | 只读消费 | `Product.stock` 库存事实来源 |
| `SB-BACKSTAGE-06` | 新增后台活动 | 「库存数据聚合与补货建议」后台活动 + `stock-insight` 支撑节点（Story 1 已声明，本 change 补充补货建议语义）；`SB-CUSTOMER-*` 无变化 |

## Impact (影响面)

- **后端服务（Node.js）**：`GET /api/admin/dashboard/stock` 响应扩展（`replenish` / `healthOverview` 等字段）；`StockInsightService` 复用 Story 1 的三源聚合底座，追加补货量与健康度计算；无新增路由/中间件。
- **前端 UI（Vue）**：库存预警视图补货建议列/日均销量/售罸天数列真实渲染 + 老板健康度总览卡片；ZAPP 令牌、零第三方图表库、无圆角无阴影。
- **数据模型**：无实体/聚合变更（纯计算字段扩展）。
- **跨域/同步**：无新增跨域。
- **测试影响**：新增 E2E 旅程（补货建议公式一致性 + 无销量处理 + 老板健康度总览 + 老板写配置 403）；复用 Story 1 的 E2E 基础设施（`stock_warning.feature` / `steps/stock_warning.js` 命名空间）。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-stock-insight/stories/story-stock-replenish-suggestion/story.md`
- idea.md：`openspec-requirements/epics/epic-stock-insight/idea.md`
- 原型：`openspec-requirements/epics/epic-stock-insight/prototypes/stock-insight.html`（已确认）
- 依赖：`openspec/changes/archive/2026-08-31-story-stock-warning-list/`（Story 1 已归档）
