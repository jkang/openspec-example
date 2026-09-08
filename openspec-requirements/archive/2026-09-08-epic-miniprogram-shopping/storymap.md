# Storymap: 小程序 C 端交易链路 需求拆分

> Epic Key: `epic-miniprogram-shopping`
> 关联调研: `epics/epic-miniprogram-shopping/research.md`
> 关联 Idea: `epics/epic-miniprogram-shopping/idea.md`
> 关联原型: `epics/epic-miniprogram-shopping/prototypes/miniprogram-shopping.html`（Epic 整体，UI 唯一事实来源）
> 产出后需用户确认（HITL）※ 用户已授权全程自主，决策口径仍标注供确认

## 需求背景 (Background)

6.1 交付了小程序渠道配置 / 微信授权登录 / channel 标识底座，但 C 端买家尚无法在小程序内完成完整购物旅程。本 Epic 补齐 **小程序 C 端交易链路**（浏览→搜索/分类→详情→加购→购物车→结算（自动最优券）→模拟支付→我的订单追踪），**后端 100% 复用**（既有 C 端通用 API + 6.1 会话/channel 底座），Web 与小程序同库实时一致，兑现"把生意搬进微信"买家侧闭环。技术形态：**决策 B——独立小程序原生工程**（用户已裁定；仓库无微信开发者工具/E2E 基建，验证以降级策略 + 后端契约 E2E 覆盖）。

## 拆分粒度原则 (Granularity)

- Story = 一个**完整端到端功能**的粒度，按旅程阶段切分，避免破坏上下文：
  - `shopping-browse`（发现）：小程序首页（真实 6 商品卡片）→ 关键词搜索 / 价格排序 / 分类筛选 → 商品详情（价格/库存/描述）→ 加入购物车 整条链路。
  - `shopping-checkout`（成交）：购物车（数量/移除/合计）→ 结算（自动最优券 → 应付金额）→ 下单（会话 channel 继承 MINIPROGRAM）→ 模拟支付 → 成功态 整条链路。
  - `shopping-orders`（追踪）：我的订单（列表：状态/金额/摘要）→ 详情/状态轨迹（待支付→已支付→已发货→已完成/已取消）整条链路。
- 不拆到行为/UI 细节级（价格格式化、分类 Tabs 样式、状态徽标等归入对应 Story 内实现），避免破坏上下文。
- 每个 Story 必须可独立交付、可独立验收。
- 三要素：角色 (Role) / 价值 (Value) / 目标 (Goal)。
- **口径贯穿（三 Story 共用，来自 idea.md 第 5 章）**：真实 6 商品数据、C 端不展示渠道概念（channel 由会话自动继承）、模拟支付、无地址模拟订单、同源账户（购物车/订单跟会话 userId）。

## Story 拆分明细

| Story ID | 标题 | 角色 (Role) | 价值 (Value) | 目标 (Goal) | 依赖 | 优先级 | 状态(注1) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| story-miniprogram-shopping-browse | 小程序商品发现（首页/搜索/分类/详情） | C 端买家（微信内浏览选品） | 微信内快捷找货（搜索/分类/详情，真实数据与价格） | 小程序首页（真实 6 商品卡片网格）+ 关键词搜索 + 价格排序 + 分类筛选 + 商品详情页（价格/库存/描述）+ 「加入购物车」；复用 GET /api/products（搜索/排序/分类语义）/ GET /api/products/{id} / GET /api/categories | 无（微信登录会话底座 6.1 已交付） | P0 | ready |
| story-miniprogram-shopping-checkout | 小程序购物车 + 结算 + 模拟支付 | C 端买家（微信内成交） | 购物车管理 + 自动最优券结算 + 模拟支付一气呵成，价格优惠清晰 | 购物车（行内数量 +/−、移除、合计，会话归属）→ 结算页（自动最优券 → 应付金额）→ 提交订单（会话 channel 继承 MINIPROGRAM，服务端已落地）→ 模拟支付 → 成功态（库存扣减）；复用购物车/优惠券/下单/支付 API | story-miniprogram-shopping-browse（浏览/加购入口） | P0 | ready |
| story-miniprogram-shopping-orders | 小程序我的订单（列表 + 状态轨迹） | C 端买家（微信内追踪订单） | 支付后立即看到订单与状态轨迹，安心复购 | 我的订单列表（订单号/状态/金额/商品摘要）+ 展开详情（状态轨迹：待支付→已支付→已发货→已完成/已取消）；复用 GET /api/orders 会话归属 | story-miniprogram-shopping-checkout（产生订单） | P1 | ready |

## 覆盖对账 (Coverage Reconciliation)

⚠️ 拆分前承诺项（来自 idea/research 的 In Scope + ROADMAP Guardrails + 候选 Capability + 决策口径）：

| Epic 承诺项（来自 idea/research） | 承接 Story | 覆盖状态 |
| --- | --- | --- |
| In Scope: 商品浏览 / 关键词搜索 / 分类筛选 | story-miniprogram-shopping-browse | ✅ 覆盖 |
| In Scope: 商品详情（价格/库存/描述） | story-miniprogram-shopping-browse | ✅ 覆盖 |
| In Scope: 购物车 | story-miniprogram-shopping-checkout | ✅ 覆盖 |
| In Scope: 结算（优惠券最优核销） | story-miniprogram-shopping-checkout | ✅ 覆盖 |
| In Scope: 模拟支付 | story-miniprogram-shopping-checkout | ✅ 覆盖 |
| In Scope: 我的订单（列表 + 状态轨迹） | story-miniprogram-shopping-orders | ✅ 覆盖 |
| ROADMAP Guardrails: 完全复用现有 Catalog/Cart/Coupon/Order 后端 API 与数据源，Web 与小程序同库实时一致 | 三 Story 全部（只读消费既有 API，无后端改动） | ✅ 覆盖 |
| ROADMAP Guardrails: 同源账户（购物车/订单跟会话 userId，无独立小程序用户池） | story-miniprogram-shopping-browse（会话归属）+ story-miniprogram-shopping-checkout（购物车归属/下单）+ story-miniprogram-shopping-orders（订单归属） | ✅ 覆盖 |
| ROADMAP Guardrails: 模拟支付（MVP 与 Web 一致） | story-miniprogram-shopping-checkout | ✅ 覆盖 |
| ROADMAP Guardrails: 真实数据 + 极简 UI | 三 Story 全部（真实 6 商品 + ZAPP 暗黑移动端视觉） | ✅ 覆盖 |
| Candidate Capability: `frontend-ui`（修改：小程序 C 端旅程 UI） | 三 Story 全部 | ✅ 覆盖 |
| 决策 Q1: 技术形态 B（独立小程序原生工程） | 三 Story 全部（同一小程序工程实现） | ✅ 覆盖 |
| 决策 Q3: C 端不展示渠道概念（channel 会话继承，B 端订单列表 6.1 已展示） | 三 Story 全部（UI 不暴露 channel；下单自动继承） | ✅ 覆盖 |
| 决策 Q4: MVP 不含微信分享/转发 | 无需 Story 承接（显式降级：Out of Scope） | ✅ 显式降级 |
| 决策 Q5: 无地址模拟订单（复用现状） | 三 Story 全部（结算不引入地址） | ✅ 覆盖 |

**闭环校验**：全部承诺项（In Scope 6 项 / ROADMAP Guardrails 4 项 / 候选 Capability 1 项 / 决策口径 5 项）均有 ≥1 个 Story 承接或显式降级（Q4 分享），**无 ❌ 未覆盖项**。

## 分析制品索引 (Analysis Artifacts)

- 用户故事地图（4 层）: `epics/epic-miniprogram-shopping/analysis/storymap/` — ❌ 未生成（本 Epic 3 个 Story 依赖链清晰，storymap.md 已完整表达；对齐既有 Epic 先例）

## 治理映射对齐

- Impacted Bounded Contexts: `Shared / Cross`（`frontend-ui` 横切支撑修改：小程序 C 端旅程 UI——首页/详情/购物车/结算/支付/我的订单的移动端视图）；其余 BC（Catalog/Cart/Coupon/Order/User/Channel）**后端语义零改动**（只读消费既有 API 与 6.1 底座）
- Impacted Process Nodes: L1-01 触达与发现（小程序移动触点：浏览/搜索/分类/详情）；L1-02~L1-06 复用既有交易主流程（小程序端同源 API 消费）；不新增交易语义节点
- Impacted Service Blueprint Nodes: SB-STAGE-01（小程序触点，6.1 已标注）；SB-CUSTOMER-01~06（小程序 C 端旅程 UI 复用既有阶段能力——frontend-ui 增量）；SB-STAGE-04/05/06（下单/支付/我的订单小程序端渲染）；B 端泳道无变化
- Sync Assessment: **Yes（轻量）** — 本 Epic 无领域结构变化（无新 BC/capability/aggregate/字段）；Epic 收尾 Baseline Sync 时在 blueprint/domain 对 `frontend-ui` 的 C 端小程序旅程 UI 语义做轻量标注（非结构性变更）

## 关联 Stories

- `epics/epic-miniprogram-shopping/stories/story-miniprogram-shopping-browse/story.md`
- `epics/epic-miniprogram-shopping/stories/story-miniprogram-shopping-checkout/story.md`
- `epics/epic-miniprogram-shopping/stories/story-miniprogram-shopping-orders/story.md`

> 注1：Story 状态由需求侧 STATUS.md 维护（ready/handoff/dev-in-progress/done）；storymap 中仅记录初始状态 ready，in_progress/done 由开发侧归档后 lead 回填。
