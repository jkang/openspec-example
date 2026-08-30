# Storymap: 销售报表看板 需求拆分

> Epic Key: `epic-sales-dashboard`
> 关联调研: `epics/epic-sales-dashboard/research.md`
> 关联 Idea: `epics/epic-sales-dashboard/idea.md`
> 关联原型: `epics/epic-sales-dashboard/prototypes/sales-dashboard.html`（Epic 整体，已确认）
> 产出后需用户确认（HITL）

## 需求背景 (Background)

老板与运营无法快速掌握销售全貌：销售额/订单量/客单价/优惠让利靠手动统计，商品与分类销售表现不可见，促销 ROI 无法评估。本 Epic 通过**纯 B 端只读销售看板**（时间维度 × 指标 × 排行）兑现"可视即价值"，数据实时聚合自订单明细（`actualPaidCents` 口径）。

## 拆分粒度原则 (Granularity)

- Story = 一个**完整端到端功能**的粒度。
  - `overview`：从 B 端导航进入看板 → 权限门禁 → 指标聚合（API）→ 4 指标卡 + 时间切换 + 趋势图 整条链路。
  - `ranking`：从看板框架进入排行区 → 商品/分类聚合（API）→ TOP10 排行表 整条链路。
- 不拆到行为/UI 细节级（趋势图的 SVG 绘制、表格样式等归入对应 Story 内实现），避免破坏上下文。
- 每个 Story 必须可独立交付、可独立验收。
- 三要素：角色 (Role) / 价值 (Value) / 目标 (Goal)。

## Story 拆分明细

| Story ID | 标题 | 角色 (Role) | 价值 (Value) | 目标 (Goal) | 依赖 | 优先级 | 状态(注1) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| story-sales-dashboard-overview | 销售总览（指标卡 + 时间切换 + 趋势） | 老板/运营 | 首屏即得经营全貌与趋势，无需手动统计 | 近7日默认总览：销售额/订单量/客单价/优惠让利 4 指标 + 今日/近7日/近30日切换 + 趋势图，数据与订单一致 | 无 | P0 | ready |
| story-sales-dashboard-ranking | 商品/分类销售排行 | 运营/老板 | 定位爆款与疲软商品/分类，支撑选品与补货决策 | 商品 TOP10（销量/销售额）+ 分类 TOP10（销售额/占比/订单数），口径与订单一致 | story-sales-dashboard-overview（看板框架与权限） | P1 | ready |

## 覆盖对账 (Coverage Reconciliation)

⚠️ 拆分前承诺项（来自 idea/research 的 In Scope + Exit Criteria + 候选 Capabilities）：

| Epic 承诺项（来自 idea/research） | 承接 Story | 覆盖状态 |
| --- | --- | --- |
| Exit Criteria ①：时间切换（今日/近7日/近30日）+ 4 指标（销售额/订单量/客单价/优惠让利）与订单数据一致 | story-sales-dashboard-overview | ✅ 覆盖 |
| Exit Criteria ②：商品 TOP10 与分类聚合排行与订单明细一致 | story-sales-dashboard-ranking | ✅ 覆盖 |
| Exit Criteria ④：权限门禁（客户/客服 403，运营/老板可访问） | story-sales-dashboard-overview（看板入口 + API 门禁） | ✅ 覆盖 |
| Exit Criteria ⑤：新增看板旅程映射 SB-STAGE-* | story-sales-dashboard-overview（页面）+ story-sales-dashboard-ranking（数据） | ✅ 覆盖 |
| Candidate Capability: `sales-dashboard`（新增 taxonomy，data-insights BC） | story-sales-dashboard-overview + story-sales-dashboard-ranking | ✅ 覆盖 |
| Candidate Capability: `user-admin` 扩展 `role=老板` + 看板门禁 | story-sales-dashboard-overview | ✅ 覆盖 |
| Candidate Capability: `order-management` 只读聚合查询 | story-sales-dashboard-overview + story-sales-dashboard-ranking（共用聚合服务） | ✅ 覆盖 |
| In Scope: B 端（仅运营/老板可见，老板只读看板） | story-sales-dashboard-overview | ✅ 覆盖 |
| In Scope: 优惠让利单列 + 用券订单数（财务口径） | story-sales-dashboard-overview（优惠让利指标卡 + 优惠券效果区） | ✅ 覆盖 |
| In Scope: 口径（销售额=actualPaidCents 汇总，不含 CANCELLED，按 paidAt 归属） | story-sales-dashboard-overview + story-sales-dashboard-ranking | ✅ 覆盖 |

**闭环校验**：全部承诺项均有 ≥1 个 Story 承接，无 ❌ 未覆盖项，无需补拆或降级。

## 分析制品索引 (Analysis Artifacts)

- 用户故事地图（4 层）: `epics/epic-sales-dashboard/analysis/storymap/` — ❌ 未生成（本 Epic 仅 2 个 Story，storymap.md 已完整表达，不额外生成可视化）

## 治理映射对齐

- Impacted Bounded Contexts: `data-insights`（**新增**，标注新增 taxonomy）、`Order Context`（只读消费）、`User Context`（`role=老板` 扩展）
- Impacted Process Nodes: L1-05 支付确认、L1-06 履约与完成（只读数据来源）；L1-06 后新增经营分析支流（不改交易节点）
- Impacted Service Blueprint Nodes: SB-STAGE-06、SB-BACKSTAGE-06（新增「销售数据聚合」后台活动）；SB-CUSTOMER-* 无变化
- Sync Assessment: **Yes** — 新增 `data-insights` BC + `sales-dashboard` capability taxonomy、`role=老板`、蓝图后台节点新增，Epic 归档后需 Baseline Sync

## 关联 Stories

- `epics/epic-sales-dashboard/stories/story-sales-dashboard-overview/story.md`
- `epics/epic-sales-dashboard/stories/story-sales-dashboard-ranking/story.md`

> 注1：Story 状态由需求侧 STATUS.md 维护（ready/handoff/dev-in-progress/done）；storymap 中仅记录初始状态 ready，in_progress/done 由开发侧归档后 lead 回填。
