# Proposal: 商品/分类销售排行（story-sales-dashboard-ranking）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-sales-dashboard/stories/story-sales-dashboard-ranking/story.md`（已 HITL 确认）。
> Epic：`epic-sales-dashboard`（Phase 5 销售报表看板）；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

运营无法定位爆款与疲软商品/分类：选品、清库存与补货决策全靠经验。本变更新增 **商品销售 TOP10 与分类销售排行**（纯只读，挂在销售总览看板内）：按销售额/销量识别热点与疲软，分类占比评估类目健康度，数据口径与总览一致（`actualPaidCents`、不含 CANCELLED、按 `paidAt` 时间归属）。

## What Changes (变更内容)

- **排行 API（后端只读聚合）**：新增 `GET /api/admin/dashboard/ranking?from=&to=&dimension=`（或并入 sales 聚合接口返回 `ranking` 区块，实现以开发侧 design 定）：
  - 商品 TOP10：按销售额降序（订单快照 `priceCents × quantity` 汇总），含销量列。
  - 分类 TOP10：按销售额降序（按 `categoryId` 聚合），含销售额、占比、订单数。
  - 软删除商品（status=deleted）历史订单仍计入（按订单快照）。
  - 未分类商品（categoryId=null）归入「未分类」聚合行。
  - 排行随时间维度（今日/近7日/近30日）联动刷新。
- **看板前端（Vue）**：App.vue 销售看板视图新增「商品销售 TOP10」与「分类销售排行」两个区块（对齐已确认原型），随时间切换联动刷新；零第三方图表库、slate 极简约束。

### Out of Scope（本 Story 不实现）

- 排行导出、自定义排序字段、分页（TOP10 固定）。
- 排行与商品/分类详情页联动下钻。
- 分类下的二级商品明细（全局商品 TOP10 + 全局分类 TOP10 两级即可）。

## Capabilities (系统能力)

### New Capabilities

- **`sales-dashboard`（新增 taxonomy）**：扩展排行聚合查询（商品 TOP10 / 分类 TOP10）。生成 `specs/sales-dashboard/spec.md`（与 `story-sales-dashboard-overview` 同 capability，本变更在既有 spec 基础上追加排行 Requirement 场景）。
  - **理由（新增标注）**：归属新增 `data-insights` Bounded Context；排行与总览指标同源（同一订单聚合语义）。

### Modified Capabilities

- **`order-management`（修改·只读扩展）**：Order Context 新增按商品/分类聚合的只读查询（订单明细快照聚合）。更新 `specs/order-management/spec.md`。

## Impacted Bounded Contexts

- **`data-insights`（新增 BC，需标注）**：承载 `sales-dashboard`（排行）capability，与 `story-sales-dashboard-overview` 共用。
- **Order Context（只读消费）**：订单明细快照聚合数据源，不改订单行为。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-05 支付确认` | 数据来源：PAID 订单（时间归属基于支付时间） |
| `L1-06 履约与完成` | 数据来源：SHIPPED/COMPLETED 订单（商品/分类聚合） |

> 说明：与 overview 同属 **L1-06 之后经营分析支流**（只读），不修改交易节点语义。

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-06 成功回流` | 只读消费 | 排行数据来源（订单聚合回查） |
| `SB-BACKSTAGE-06` | 新增后台活动 | 「销售数据聚合」能力节点（排行）；`SB-CUSTOMER-*` 无变化 |

## Impact (影响面)

- **后端服务（Node.js）**：新增排行只读聚合查询（商品/分类维度）；`order-management` service 增加聚合方法；复用现有 repo。
- **前端 UI（Vue）**：销售看板视图新增排行区块，复用 overview 的看板框架与权限门禁（同一 API 域）。
- **数据模型**：无实体表新增，仅新增只读聚合查询。
- **测试影响**：新增 E2E 旅程（排行主流程 + 时间切换 + 软删除商品历史订单计入）。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-sales-dashboard/stories/story-sales-dashboard-ranking/story.md`
- idea.md：`openspec-requirements/epics/epic-sales-dashboard/idea.md`
- 原型：`openspec-requirements/epics/epic-sales-dashboard/prototypes/sales-dashboard.html`（已 HITL 确认）
