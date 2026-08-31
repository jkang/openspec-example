# Storymap: 库存预警与补货建议 需求拆分

> Epic Key: `epic-stock-insight`
> 关联调研: `epics/epic-stock-insight/research.md`
> 关联 Idea: `epics/epic-stock-insight/idea.md`
> 关联原型: `epics/epic-stock-insight/prototypes/stock-insight.html`（Epic 整体，UI 唯一事实来源）
> 产出后需用户确认（HITL）※ 本次由 lead 授权全程自主，跳过 HITL

## 需求背景 (Background)

库存断货靠买家提醒、补货靠 Excel/拍脑袋，运营无法在售罄前主动预警，老板看不到库存健康度。本 Epic 通过**纯 B 端库存洞察**（预警列表 + 阈值配置 + 补货建议）兑现"可视即价值"：只读消费 `Product.stock`（Catalog）与近7日成交订单销量（Order），扩展 L1-07 经营分析只读支流；**阈值配置是本 Epic 唯一写操作**。C 端零交互变更。

## 拆分粒度原则 (Granularity)

- Story = 一个**完整端到端功能**的粒度，按"库存水位维度 / 销量速度维度"切分，避免破坏上下文：
  - `warning-list`（水位）：B 端导航进入库存预警 → 角色门禁 → 预警列表聚合（`stock ≤ 阈值` 入列、`stock=0` 已售罄、超卖风险琥珀标识）→ 阈值两级配置（写）→ 落盘即时生效 整条链路。
  - `replenish-suggestion`（速度）：销量聚合（近7日日均销量）→ 预计售罄天数 → 建议补货量 → 无销量「暂无销量」→ 老板只读健康度总览 整条链路。
- 不拆到行为/UI 细节级（琥珀 Badge 样式、表格列渲染、保存成功反馈等归入对应 Story 内实现），避免破坏上下文。
- 每个 Story 必须可独立交付、可独立验收。
- 三要素：角色 (Role) / 价值 (Value) / 目标 (Goal)。
- **口径贯穿（两 Story 共用，来自 idea.md 第 9 章）**：`stock ≤ 阈值` 入列、近7日日均销量 = 近7日成交订单（`status ∈ {PAID, SHIPPED, COMPLETED}`）`Σ(items.quantity) ÷ 7`、预计售罄天数 = `stock ÷ 日均销量`、老板只读。原型裁决口径为铁律：**无超卖风险 ⇔ 补货量公式结果为 0 ⇔ UI 展示「无需补货」**（不以演示区分度为优先）。

## Story 拆分明细

| Story ID | 标题 | 角色 (Role) | 价值 (Value) | 目标 (Goal) | 依赖 | 优先级 | 状态(注1) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| story-stock-warning-list | 低库存预警列表 + 阈值配置 | 运营（配置 + 巡检）/ 老板（只读） | 售罄前主动预警，断货不再靠买家提醒；阈值按商品个性化，设一次长期有效 | 预警列表 API（`stock ≤ 阈值` 入列，`stock=0` 已售罄状态置顶，预计售罄天数 < 7 天 → 超卖风险琥珀 Badge）+ 阈值两级配置（全局默认 10 件 + 商品级覆盖，仅 `role=运营` 可写，落盘 `data/stock-config.json`、即时生效、长期有效，软删除商品配置保留不参与聚合）+ 权限门禁（仅 运营/老板 可访问，客户/客服 403）+ 补充 `user_1003`（role=老板）种子演示账号 | 无 | P0 | ready |
| story-stock-replenish-suggestion | 补货建议 + 老板健康度总览 | 运营（补货决策）/ 老板（全局速览） | 补货有量可依（不再拍脑袋）；老板一眼看库存健康度，与销售看板联动 | 近7日日均销量（复用 sales-dashboard 销量聚合底座）+ 预计售罄天数 = `stock ÷ 日均销量` + 建议补货量 = `max(0, ⌈日均销量×7⌉ − stock)`（到货周期 7 天，无超卖风险 ⇔ 公式为 0 ⇔ UI「无需补货」）+ 无销量商品展示「暂无销量」（不计算天数/风险，但 `stock ≤ 阈值` 仍按水位入列）+ 老板只读全局库存健康度总览（预警商品数/已售罄数/超卖风险数） | story-stock-warning-list（库存洞察聚合底座 + 权限门禁 + 列表框架） | P1 | ready |

## 覆盖对账 (Coverage Reconciliation)

⚠️ 拆分前承诺项（来自 idea/research 的 In Scope + Exit Criteria + 候选 Capabilities + B 端承诺 + 8 条产品决策口径）：

| Epic 承诺项（来自 idea/research） | 承接 Story | 覆盖状态 |
| --- | --- | --- |
| In Scope: 预警列表（`stock ≤ 阈值` 入列，`stock=0` 已售罄特殊状态） | story-stock-warning-list | ✅ 覆盖 |
| In Scope: 阈值配置（全局默认 10 件 + 商品级覆盖） | story-stock-warning-list | ✅ 覆盖 |
| In Scope: 补货建议（预计售罄天数 + 建议补货量） | story-stock-replenish-suggestion | ✅ 覆盖 |
| Exit Criteria ③（前半）：低库存预警 + 超卖风险标识 + 售罄状态，阈值配置即时生效 | story-stock-warning-list | ✅ 覆盖 |
| Exit Criteria ③（后半）：预计售罄天数口径（`stock ÷ 日均销量`） | story-stock-replenish-suggestion | ✅ 覆盖 |
| Exit Criteria ④：权限门禁（客户/客服 403，运营/老板可访问） | story-stock-warning-list（预警 API 门禁 + 配置写权限） + story-stock-replenish-suggestion（复用门禁） | ✅ 覆盖 |
| Exit Criteria ⑤：新增旅程映射 SB-STAGE-* | story-stock-warning-list（页面）+ story-stock-replenish-suggestion（数据聚合） | ✅ 覆盖 |
| Candidate Capability: `stock-insight`（新增 taxonomy，data-insights BC） | story-stock-warning-list + story-stock-replenish-suggestion | ✅ 覆盖 |
| Candidate Capability: `frontend-ui`（修改，bc-shared → cap-ui，「库存预警」视图 + 阈值配置表单） | story-stock-warning-list + story-stock-replenish-suggestion | ✅ 覆盖 |
| B 端承诺: 谁配置——商品管理运营承担阈值配置，低频、设一次长期有效，不引入新角色 | story-stock-warning-list | ✅ 覆盖 |
| B 端承诺: 生命周期——落盘 `data/stock-config.json`、即时生效、长期有效、软删除商品配置保留不参与聚合 | story-stock-warning-list | ✅ 覆盖 |
| B 端承诺: 权限——配置写仅运营；老板只读无配置入口；预警/建议 API 仅运营/老板（客户/客服 403） | story-stock-warning-list（写门禁 + 只读门禁）+ story-stock-replenish-suggestion（老板只读总览，无配置入口） | ✅ 覆盖 |
| 决策口径①: 阈值配置 = 全局默认 10 件 + 商品级覆盖（不做品类差异化默认） | story-stock-warning-list | ✅ 覆盖 |
| 决策口径②: 阈值配置权限 = 仅运营可写，老板只读 | story-stock-warning-list | ✅ 覆盖 |
| 决策口径③: 日均销量窗口 = 近7日；无销量商品展示「暂无销量」，不计算天数/风险，但 `stock ≤ 阈值` 仍按水位入列 | story-stock-replenish-suggestion（暂无销量/不计算）+ story-stock-warning-list（按水位入列） | ✅ 覆盖 |
| 决策口径④: 建议补货量 = `max(0, ⌈日均销量×7⌉ − stock)`（到货周期固定 7 天） | story-stock-replenish-suggestion | ✅ 覆盖 |
| 决策口径⑤: 超卖风险 = 预计售罄天数 < 7 天（不纳入 PENDING_PAYMENT 占用） | story-stock-warning-list（琥珀 Badge 展示） | ✅ 覆盖 |
| 决策口径⑥: 配置持久化 = `data/stock-config.json`，写操作即时生效，长期有效 | story-stock-warning-list | ✅ 覆盖 |
| 决策口径⑦: 补充 `user_1003`（role=老板）种子演示账号 | story-stock-warning-list | ✅ 覆盖 |
| 决策口径⑧: 售罄商品可见性 = `stock=0` 以「已售罄」状态入列，补货建议照常给出 | story-stock-warning-list（入列/状态）+ story-stock-replenish-suggestion（建议量照常计算） | ✅ 覆盖 |

**闭环校验**：全部承诺项（In Scope 3 项 / Exit Criteria 3/4/5 / 候选 Capability 2 项 / B 端承诺 3 项 / 决策口径 8 条）均有 ≥1 个 Story 承接，**无 ❌ 未覆盖项**，无需补拆或降级。

## 分析制品索引 (Analysis Artifacts)

- 用户故事地图（4 层）: `epics/epic-stock-insight/analysis/storymap/` — ❌ 未生成（本 Epic 仅 2 个 Story，storymap.md 已完整表达，不额外生成可视化，对齐 Epic 5.1 先例；覆盖对账以本 storymap.md 为唯一权威）

## 治理映射对齐

- Impacted Bounded Contexts: `data-insights`（**扩展**，新增 `stock-insight` capability taxonomy，`bc-data-insights → cap-stock-insight` Governs 边）、`Shared / Cross`（`frontend-ui` 横切支撑，「库存预警」视图）、`Catalog Context`（只读消费 `Product.stock` 库存事实）、`Order Context`（只读消费近7日订单 items.quantity 销量聚合）
- Impacted Process Nodes: 只读消费 L1-05 支付确认、L1-06 履约与完成（库存扣减与成交订单数据来源）；扩展 **L1-07 经营分析（只读支流）**——在既有"销售看板"旁新增"库存洞察"平行支流，不作为交易节点修改
- Impacted Service Blueprint Nodes: SB-STAGE-06（成功回流 / B 端聚合回查，数据来源）；SB-BACKSTAGE-06（新增「库存数据聚合与补货建议」后台活动 + `stock-insight` 支撑能力节点，参照 sales-dashboard 支撑节点先例行 1046-1049）；SB-BACKSTAGE-01（`Product.stock` 库存事实来源，只读消费）；SB-CUSTOMER-* 无变化（C 端旅程零变更）
- Sync Assessment: **Yes** — 新增 `stock-insight` capability taxonomy（Domain Model 节点 + Governs 边）与蓝图 SB-BACKSTAGE-06 后台活动/支撑节点（Epic 级变化，参照 Epic 5.1 sales-dashboard 先例）；按分层 Sync 机制，在 Epic 全部 Story 归档后统一执行 Baseline Sync

## 关联 Stories

- `epics/epic-stock-insight/stories/story-stock-warning-list/story.md`
- `epics/epic-stock-insight/stories/story-stock-replenish-suggestion/story.md`

> 注1：Story 状态由需求侧 STATUS.md 维护（ready/handoff/dev-in-progress/done）；storymap 中仅记录初始状态 ready，in_progress/done 由开发侧归档后 lead 回填。
