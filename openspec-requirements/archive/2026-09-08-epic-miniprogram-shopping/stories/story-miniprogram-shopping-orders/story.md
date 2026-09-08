# Story: 小程序我的订单（列表 + 状态轨迹）

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-miniprogram-shopping-orders` | 优先级: P1 | 依赖: story-miniprogram-shopping-checkout（产生订单）
> 关联 Storymap: `epics/epic-miniprogram-shopping/storymap.md`
> 关联 Idea: `epics/epic-miniprogram-shopping/idea.md`
> 关联原型（Epic 整体）: `epics/epic-miniprogram-shopping/prototypes/miniprogram-shopping.html`（已 HITL 确认）

## 用户场景 (User Scenario)

- **目标用户（C 端）**：小程序买家（已完成下单支付，需在微信内追踪订单）。
- **使用动机**：付完款想马上看到订单到哪一步——待发货、已发货，能追踪就踏实；复购时也能翻历史。
- **关键目标**：小程序「我的订单」列表（订单号 / 状态 / 金额 / 商品摘要）+ 展开详情（**状态轨迹**：待支付 → 已支付 → 已发货 → 已完成 / 已取消）；订单按登录会话用户归属（Web 下单与小程序下单同列表，同源账户）。
- **B 端视角**：无新增承诺——订单处理（发货/取消）6.1 已交付，本 Story 纯 C 端追踪视图。
- **C 端约束**：渠道启用才可达；不展示渠道概念（channel 是 B 端语义）；未登录不可见我的订单（引导登录，对齐既有会话语义）。

## 范围 (Scope)

### In Scope
- 小程序「我的订单」列表（移动端）：订单号（mono）/ 状态徽标 / 金额（primary）/ 商品摘要（首件名 + 件数）。
- 订单展开详情：金额明细（总额/优惠券/折扣/实付）+ **状态轨迹**（待支付→已支付→已发货→已完成 步骤条；已取消特殊标注）。
- 订单按会话 userId 归属查询（`GET /api/orders`），Web 下单与小程序的订单同列表（同库同账）。
- 空订单态、真实数据 + ZAPP 暗黑视觉 + 全中文。

### Out of Scope
- 浏览/加购（browse）与购物车/结算/支付（checkout）Story。
- B 端订单处理（6.1 已交付：渠道标识列/发货/取消）。
- C 端展示渠道概念；微信分享/转发（Q4）；收货地址（Q5）；订单取消/售后动作（C 端 MVP 不提供，处理在 B 端）。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-miniprogram-shopping/prototypes/miniprogram-shopping.html`
- 关键交互点：
  - 底部 tabBar「我的」→「我的订单」列表。
  - 订单卡片：`#订单号`（mono 小字）+ 状态徽标 + 商品摘要 + `font-mono font-bold text-primary` 金额。
  - 展开详情：金额明细（商品总额/优惠/应付）+ 状态轨迹步骤条（待支付→已支付→已发货→已完成，当前步骤 primary 高亮；已取消独立标注）。
  - 空订单：「暂无订单」占位。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-MO-001 | 我的订单按会话 userId 归属 | 进入我的订单 | 仅展示当前登录用户订单（Web + 小程序同库） | 复用 GET /api/orders 会话归属 |
| R-MO-002 | 订单列表展示订单号/状态/金额/商品摘要 | 列表加载 | 卡片化展示；按时间倒序 | 对齐 Web 我的订单语义 |
| R-MO-003 | 订单状态轨迹 | 展开订单详情 | 展示 待支付→已支付→已发货→已完成 步骤（当前高亮）；已取消独立标注 | 对齐既有订单状态机 |
| R-MO-004 | 展开金额明细 | 展开详情 | 展示 商品总额/优惠券/折扣/实付（与下单一致） | 复用订单快照字段 |
| R-MO-005 | 未登录访问引导登录 | 未登录进入我的订单 | 引导微信登录（6.1）| 对齐会话语义 |
| R-MO-006 | C 端不展示渠道概念 | 任意订单渲染 | 列表/详情不显示 channel（B 端 6.1 才展示来源） | 决策 Q3 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：小程序订单追踪 (Ref: L1-06 | SB-STAGE-06, SB-CUSTOMER-06)
#### 场景：正常主流程——支付后查看订单状态轨迹
- @e2e
- **GIVEN** 买家王倩经微信授权登录，已在小程序完成一笔订单（checkout Story）并模拟支付成功（PAID）
- **WHEN** 王倩进入小程序「我的订单」
- **THEN** 列表展示该订单（订单号 / 「已支付」徽标 / ¥金额 / 商品摘要）
- **WHEN** 王倩展开订单详情
- **THEN** 展示金额明细（总额/优惠/实付）与状态轨迹，当前步骤「已支付」高亮（下一步「已发货」）

#### 场景：B 端发货后状态推进
- @e2e
- **GIVEN** 王倩的小程序订单处于 PAID
- **WHEN** B 端运营对该订单执行发货（既有 ship API）
- **THEN** 王倩在小程序刷新我的订单 → 状态变为「已发货」，轨迹当前步骤推进

#### 场景：Web 下单订单在小程序可见（同库同账）
- @api
- **GIVEN** 林晓明在 Web 端下单（channel=WEB），随后在小程序微信登录（同一账户）
- **WHEN** 林晓明在小程序查看我的订单
- **THEN** Web 下单的订单在小程序列表可见（同源账户，同库实时一致）

#### 场景：未登录不可见我的订单
- @api
- **GIVEN** 未登录（无有效会话）请求我的订单 API
- **THEN** 返回 401（引导登录，对齐既有会话语义）

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: `Shared / Cross`（frontend-ui：小程序我的订单 UI）；`Order Context`（只读消费订单列表/详情 API）；`User Context`（会话归属）
- Capability Taxonomy: `frontend-ui`（**修改**：小程序我的订单列表/详情/状态轨迹 UI）；`order-management`（只读消费）
- Related Process Nodes: L1-06 履约与完成（C 端订单状态可见）
- Related Service Blueprint Nodes: SB-STAGE-06（成功回流：我的订单入口）、SB-CUSTOMER-06（小程序我的订单/状态轨迹 UI）、SB-BACKSTAGE-04/06（订单列表/详情 API 消费）
- Sync Assessment: Yes（轻量）——frontend-ui C 端小程序我的订单 UI 语义扩展（Epic 收尾轻量标注；无新 BC/capability/字段）

## 分析制品索引 (Analysis Artifacts)

- 故事详述: `epics/epic-miniprogram-shopping/analysis/narrative/story-miniprogram-shopping-orders/narrative.md` — ❌ 未生成（业务规则与 E2E 验收已完整）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff)
- [x] 已交接 (changeName: `story-miniprogram-shopping-orders` 记录于 openspec/epic-miniprogram-shopping.story-list.json)
