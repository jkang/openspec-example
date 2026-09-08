# Idea: 小程序 C 端交易链路 (Mini Program Shopping Journey)

> 关联 Epic: `epic-miniprogram-shopping`（来自 `docs/ROADMAP.md` Phase 6 Epic 6.2）
> 关联调研: `epics/epic-miniprogram-shopping/research.md`（已 HITL 确认，含技术栈形态 B 决策）
> 产出后需用户确认（HITL）

## 1. 澄清业务意图 (Clarify Business Intent)

- **目标用户**：
  - **C 端买家（小程序用户，如林采购）**：微信内一气呵成完成 浏览 → 搜索/分类 → 详情 → 加购 → 结算（自动最优券）→ 支付 → 我的订单追踪；移动端极简（少步骤、少输入、真实数据、价格清晰）。
  - **卖家企业主（王老板）**：小程序具备**完整下单能力**，让 6.1 渠道底座"活起来"；Web/小程序同库同账。
  - **B 端运营（陈运营）**：无新增承诺项——小程序订单沿用 6.1 渠道标识列 + 同流程发货/取消。
- **核心业务价值**：兑现"把生意搬进微信"买家侧闭环——在 6.1 已交付的渠道配置/微信登录/channel 标识底座之上，补齐 C 端完整交易旅程，复用既有 Catalog/Cart/Coupon/Order 后端，Web 与小程序同库实时一致。
- **硬性业务限制**：
  - **渠道门禁（Q5 联动）**：旅程依赖渠道启用；停用时登录被拒（6.1 CHANNEL_DISABLED）。
  - **同源账户**：购物车/订单归属复用会话 userId；微信用户与网页用户同池。
  - **channel 继承（Q7）**：小程序会话下单自动 `Order.channel=MINIPROGRAM`（服务端已落地，C 端不感知渠道概念）。
  - **模拟支付**：MVP 复用模拟支付（与 Web 一致）；真实微信支付 +X。
  - **数据/视觉**：真实 6 商品、全中文、ZAPP 暗黑令牌、无圆角阴影、移动端极简。
- **B 端视角**：无新增后台配置/权限/生命周期承诺（6.1 已交付渠道管理）；本 Epic 纯 C 端旅程 + 渠道化旅程验证。
- **C 端视角**：登录（6.1 微信授权）后即可浏览/加购/结算/支付/追踪；未登录浏览商品可开放（下单需登录——对齐既有 R-SES 语义）。

## 2. To-Be Process (目标流程)

复用既有交易主流程（L1-01 触达与发现 → L1-02 评估与决策 → L1-03 加购与准备 → L1-04 下单结算 → L1-05 支付确认 → L1-06 履约与完成），在小程序渠道内提供**同一套业务能力的移动端触点**：

```
小程序买家（channel=MINIPROGRAM 触点）
  → L1-01 触达与发现：小程序首页（商品列表/搜索框/分类 Tabs/详情页）
  → L1-02 评估与决策：关键词搜索 / 价格排序 / 分类筛选（复用 GET /api/products 查询语义）
  → L1-03 加购与准备：详情页「加入购物车」/ 购物车页（数量调整/移除，复用购物车 API）
  → L1-04 下单结算：购物车 → 结算（自动最优券，复用既有结算 API 语义）
  → L1-05 支付确认：模拟支付（复用 POST /api/payments/{id}）
  → L1-06 履约与完成：我的订单（列表/详情/状态轨迹），订单 channel=MINIPROGRAM
```

- **与现状差异**：Web 端已有等价旅程；本 Epic 在**小程序渠道**补齐同能力（复用后端与数据），不新增交易语义节点。
- **涉及角色**：C 端买家（小程序）；B 端运营/老板仅消费 6.1 已有订单渠道标识能力（无新增交互）。
- **流程节点引用**：L1-01 触达与发现（新增小程序移动触点）；L1-02~L1-06 复用既有交易主流程（小程序端同源 API 消费）。

## 3. To-Be Journey (目标旅程)

### 旅程 1：买家微信内完成首单
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 进入 | 微信打开小程序 | 小程序首页加载真实商品（6 商品） | 🙂 顺手 | 小程序首页 |
| 选品 | 搜索"键盘" / 点分类 / 看详情 | 返回匹配商品与详情（价格/库存/描述） | 🙂 快捷找货 | 列表/详情页 |
| 加购 | 详情页「加入购物车」 | 购物车角标 +1，购物车跟随登录会话 | 🙂 随手加 | 详情页 |
| 结算 | 进入购物车 → 结算 | 自动推荐最优券并展示实付金额 | 🙂 优惠清晰 | 结算页 |
| 支付 | 确认「模拟支付」 | 订单 PAID，库存扣减 | 🙂 支付完成 | 支付确认 |
| 追踪 | 进入「我的订单」 | 订单状态轨迹（待支付→已支付→已发货→已完成/已取消） | 🙂 心中有数 | 我的订单 |

### 旅程 2：老客户微信复购（同源账户）
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 登录 | 微信授权一键登录（openid 命中） | 直连同源账户（历史订单可见） | 🙂 无感 | 小程序登录 |
| 复购 | 浏览历史 / 直接加购结算 | 购物车与 Web 同库（同 userId 归属） | 🙂 数据延续 | 全旅程 |
| 追踪 | 查看我的订单 | Web 下单的小程序订单同列表可见 | 🙂 同账 | 我的订单 |

## 4. 产品设计思路 (Business Design Approach)

- **触发方式**：微信内打开小程序 → 渠道启用则可用（停用 → CHANNEL_DISABLED 拒绝）；微信授权登录建立会话（6.1）。
- **核心交互**（移动端极简）：
  - 首页：商品卡片网格 + 顶部搜索 + 分类 Tabs（复用 Web 视觉语言，移动单列/双列布局）。
  - 详情页：图片/名称/价格（font-mono primary）/库存/描述 + 「加入购物车」。
  - 购物车：行内数量 + / −、移除、合计；登录用户购物车跟随账户。
  - 结算：自动最优券（后端同源）、应付金额清晰、确认下单。
  - 支付：模拟支付按钮 → 成功态。
  - 我的订单：列表（状态 + 金额 + 商品摘要）+ 展开详情（状态轨迹）。
- **技术形态（决策 B）**：独立小程序原生工程（微信开发者工具可打开），复用仓库 Node 后端 API（http://localhost:3000）；UI 遵循 ZAPP 暗黑令牌（小程序 WXSS 等价映射）、真实中文数据。
- **验证降级策略（决策 B 关联）**：仓库无微信开发者工具/E2E 基建 → 小程序 UI 以**可交互 HTML 原型（HITL 确认）+ 小程序工程代码（微信开发者工具人工/真机验证）+ 后端契约 E2E（既有 Playwright 栈验证 channel 继承与全旅程 API）**三层交付；决策与差异在 design.md 记录。

## 5. 任务类型与后续策略 (Task Type & Workflow Strategy)

- [x] **Epic**（大块需求、跨多能力/需拆分）：走需求侧漏斗 → 原型(Epic整体) → storymap 拆分 → Story → `/req:handoff`。
- [ ] Feature
- [ ] Bug Fix
- [ ] Tech Debt

确认的类型：**Epic**
后续策略说明：走需求侧完整漏斗；涉及 UI（小程序全旅程）→ 先 `/req:prototype`（Epic 整体可交互 HTML 原型）→ storymap 拆 3 Story → Story → handoff → 开发侧（小程序原生工程按决策 B 落地 + 后端契约 E2E）。

**调研 5 项待澄清项 → 决策口径**：
1. **技术栈形态（Q1）** ✅ 已裁定（2026-09-08 用户确认）：**B — 引入独立小程序原生工程**（微信开发者工具可打开；仓库验证降级策略 + 后端契约 E2E 覆盖）。
2. **旅程拆分粒度（Q2）**：按"浏览发现 / 购物车结算支付 / 我的订单"拆 3 Story（storymap 定稿）：浏览端到端（首页/搜索/分类/详情/加购）、结算链路（购物车/结算/下单/支付）、订单追踪（我的订单列表/详情/状态轨迹）。
3. **C 端是否展示渠道（Q3）**：**不展示**——channel 是内部/B 端语义（B 端订单列表 6.1 已展示），C 端旅程不暴露渠道概念。
4. **微信分享/转发（Q4）**：MVP **不含**（ROADMAP 未承诺；可作为后续增强）。
5. **收货信息/地址（Q5）**：MVP **复用无地址模拟订单**现状（Web 端无地址模型；系统为模拟电商演练场，地址属后续真实履约阶段）。

## 6. 候选 Capabilities (Candidate Capabilities)

> 参考 `docs/baseline/domain_model.html` 的 BC→Capability 映射。本 Epic 后端零改动、纯前端旅程——**无新增后端 taxonomy**；capability 增量落在 frontend-ui（小程序 C 端旅程 UI）与验证契约。

- **修改 Capability**:
  - `frontend-ui`（Shared / Cross，`bc-shared → cap-ui` 行 970）— 小程序 C 端旅程 UI：首页（列表/搜索/分类）/ 详情页 / 购物车 / 结算 / 模拟支付 / 我的订单（列表 + 状态轨迹）；复用 ZAPP 视觉语言的移动端形态（小程序原生工程，独立于 Web App.vue）。
- **只读消费（不修改语义）**: `catalog-management`（商品/搜索/分类 API）、`cart-management`（购物车归属）、`coupon-management`（最优券）、`order-management`（下单/我的订单）、`payment`（模拟支付）、`user-session` + `wechat-auth`（会话/微信登录，6.1）。
- **Impacted Bounded Contexts**: `Shared / Cross`（frontend-ui 横切支撑——小程序 C 端旅程 UI）；其余 BC 后端语义零改动（只读消费既有 API）。

## 7. 分析制品索引 (Analysis Artifacts)

- OSM / To-Be Process / To-Be Journey 分析物 — ❌ 未生成（旅程能力与 Web 端等价复用，结构化表达已内嵌第 2/3 章；对齐既有 Epic 先例）

## 8. 治理映射对齐 (Governance Mapping)

- **Impacted Process Nodes**（`docs/baseline/business_process.html`）：L1-01 触达与发现（小程序移动触点：浏览/搜索/分类/详情）；L1-02~L1-06 复用既有交易主流程（小程序端同源 API 消费）；不新增交易语义节点
- **Impacted Service Blueprint Nodes**：SB-STAGE-01（小程序触点，6.1 已标注）；SB-CUSTOMER-01~06（小程序 C 端旅程 UI 复用既有阶段能力——frontend-ui 增量覆盖移动触点）；SB-STAGE-04/05/06（下单/支付/我的订单在小程序端渲染，复用既有后端）；B 端泳道无变化（订单渠道标识 6.1 已交付）
- **Potential Domain Model Sync Triggers**: 无新增 BC/taxonomy/aggregate/字段（前端旅程 + 只读消费）；frontend-ui capability 语义扩展（C 端小程序旅程 UI）→ **Domain Model 无需 Sync（语义内聚于既有 Shared/Cross frontend-ui）**
- **Potential Service Blueprint Sync Triggers**: SB-CUSTOMER-* capability 分布微调（frontend-ui 覆盖小程序触点，可选项）→ **Service Blueprint 可选小幅 Sync（Epic 收尾时评估）**
- **Preliminary Sync Assessment**: **Yes（轻量）** — 本 Epic 无领域结构变化（无新 BC/capability/字段）；主要 Sync 触发为 frontend-ui 的 C 端小程序旅程 UI 语义扩展（Epic 收尾 Baseline Sync 时在 blueprint/domain 轻量标注，非结构性变更）

## 9. 需求拆分建议 (Requirement Splitting)

- **Story 1 (P0)**: `story-miniprogram-shopping-browse` — 小程序商品发现旅程：
  - 首页（真实 6 商品卡片列表）、关键词搜索、价格排序、分类筛选、商品详情页（价格/库存/描述）。
  - 复用 `GET /api/products`（搜索/排序/分类语义）与 `GET /api/products/{id}`、`GET /api/categories`。
- **Story 2 (P0)**: `story-miniprogram-shopping-checkout` — 购物车 + 结算 + 模拟支付：
  - 详情页「加入购物车」→ 购物车（数量/移除）→ 结算（自动最优券）→ 下单（会话 channel 继承 MINIPROGRAM）→ 模拟支付 → 成功态。
  - 复用购物车/优惠券/下单/支付 API。
- **Story 3 (P1)**: `story-miniprogram-shopping-orders` — 我的订单（小程序）：
  - 订单列表（状态/金额/商品摘要）+ 详情展开（状态轨迹：待支付→已支付→已发货→已完成/已取消）。
  - 复用 `GET /api/orders` 会话归属。
- **依赖关系**：Story 1（浏览/加购入口）→ Story 2（购物车/结算/支付）→ Story 3（订单追踪消费 2 的订单）。三者均依赖 6.1 微信登录会话底座（已交付）。
- **覆盖对账**：Epic In Scope（浏览/搜索/分类/详情 ✅ / 购物车 ✅ / 结算最优券 ✅ / 模拟支付 ✅ / 我的订单 ✅）；ROADMAP Guardrails（B/C 双端 ✅ 本 Epic C 端纯旅程 + 复用 B 端 6.1 能力 / 同源账户 ✅ / 模拟支付 ✅ / 真实数据 ✅ / 极简 UI ✅）；候选 Capability `frontend-ui` ✅。

## 10. 架构影响分析 (Architectural Impact & Ideas)

- **后端服务（Node.js）**：**零改动**（100% 复用 C 端通用 API：products/categories/cart/orders/checkout/payments + 6.1 会话/channel 底座）。
- **Python 后端**：无影响（不对齐，无认证/小程序能力）。
- **前端 UI（小程序原生工程，决策 B）**：新建独立小程序工程目录（如 `ecommerce/ecommerce-miniprogram/`，微信开发者工具可打开）：首页/详情/购物车/结算/订单页面；`wx.request` 指向仓库 Node 后端（开发环境 localhost:3000）；ZAPP 令牌以 WXSS 变量映射（小程序无 Tailwind，等价 CSS 变量实现暗黑视觉）；真实中文数据。
- **数据模型**：无变化（复用既有全部数据）。
- **跨域/数据同步**：小程序与 Web 同库同源 API（后端单实例）；CORS 非问题（wx.request 服务端无跨域限制，后端已允许）；微信真机需配置合法域名（部署阶段，仓库本地演示用开发者工具"不校验合法域名"）。
- **验证**：后端契约（channel=MINIPROGRAM 继承/购物车归属/订单归属）由既有 E2E 栈扩展覆盖（决策 B 的验证降级层）；小程序 UI 以 HTML 原型 HITL + 工程代码人工/真机验证。

## 11. 确认结论 (User Confirmation)

- 调研 5 项待澄清项已收敛：**技术栈形态 B（独立小程序原生工程）已裁定（用户确认）**；Q2 拆 3 Story、Q3 C 端不展示渠道、Q4 不含分享、Q5 无地址模拟订单（按默认口径，如需调整请指出）。
- 方案：前端 `frontend-ui` 修改（小程序 C 端旅程 UI）；后端零改动；3 Story 拆分（P0 浏览 / P0 结算支付 / P1 订单追踪）。
- 涉及 UI → 下一步进入 **prototype（Epic 整体）**，产出小程序旅程可交互 HTML 原型待确认。
- [ ] 已与用户确认探索结论（候选 Capability、决策口径、Story 拆分建议），可进入 prototype
