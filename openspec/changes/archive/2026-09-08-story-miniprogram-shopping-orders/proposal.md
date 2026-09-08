# Proposal: 小程序我的订单（story-miniprogram-shopping-orders）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-miniprogram-shopping/stories/story-miniprogram-shopping-orders/story.md`（已 HITL 确认，用户授权全程自主，技术形态 B 已裁定）。
> Epic：`epic-miniprogram-shopping`（Phase 6 Epic 6.2 · P1，依赖 checkout Story 产生订单）；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

买家在小程序完成下单支付后，需在微信内追踪订单——查看状态与轨迹（待支付→已支付→已发货→已完成/已取消），复购安心。本变更在 browse/checkout Story 的小程序工程之上补齐 **我的订单** 追踪视图，后端零改动（复用 `GET /api/orders` 会话归属；Web 下单与小程序下单同列表，同库同账）。

## What Changes (变更内容)

- **小程序工程新增订单页**（决策 B，`ecommerce/ecommerce-miniprogram/`）：
  - 我的订单 `pages/orders`：订单卡片列表（`#订单号` mono / 状态徽标 / 商品摘要 / `font-mono font-bold` primary 金额，按时间倒序）。
  - 订单详情展开：金额明细（总额/优惠券/折扣/实付）+ **状态轨迹步骤条**（待支付→已支付→已发货→已完成，当前步骤高亮；已取消独立标注）。
  - `wx.request` 复用 `GET /api/orders`（会话 userId 归属）。
- **C 端不展示渠道概念（Q3）**：列表/详情不显示 channel（B 端 6.1 才展示来源）。
- **后端契约 E2E（验证降级层）**：既有 Playwright 栈覆盖「小程序/Web 登录会话 → 我的订单列表 → 状态推进（B 端发货后 C 端可见）」链路。

### Out of Scope（本 change 不实现）

- 浏览/加购（browse）与购物车/结算/支付（checkout）Story。
- B 端订单处理（6.1 已交付）；C 端订单取消/售后动作（处理在 B 端）；收货地址（Q5）；微信分享（Q4）。

## Capabilities (系统能力)

### New Capabilities

- 无新增 taxonomy（本 Epic 后端零改动、纯前端旅程）。

### Modified Capabilities

- **`frontend-ui`（修改，横切支撑）**：`bc-shared → cap-ui`——小程序我的订单列表/详情/状态轨迹 UI（独立小程序原生工程）。更新 `specs/frontend-ui/spec.md`。

### 只读消费（不修改语义）

- `order-management`（我的订单列表/详情 API）、`user-session` / `wechat-auth`（会话归属，6.1）。

## Impacted Bounded Contexts

- **`Shared / Cross`（修改）**：`frontend-ui` 小程序我的订单 UI。
- **`Order Context` / `User Context`（只读消费）**：订单列表/会话归属 API，语义零改动。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-06 履约与完成` | C 端订单状态可见（小程序我的订单） |

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-06` | REUSE | 成功回流：我的订单入口 |
| `SB-CUSTOMER-06` | MOD | 小程序我的订单/状态轨迹 UI（frontend-ui 增量） |
| `SB-BACKSTAGE-04/06` | REUSE | 订单列表/详情 API 消费（零改动） |

## Impact (影响面)

- **后端（Node.js / Python）**：**零改动**。
- **前端 UI（小程序原生工程，决策 B）**：`ecommerce/ecommerce-miniprogram/` 新增 pages/orders；`wx.request` → localhost:3000；ZAPP WXSS 变量；真实中文数据。
- **数据模型**：无变化。
- **测试影响**：后端契约 E2E（我的订单归属 + 状态推进）；小程序 UI 人工/真机验证（决策 B 降级）。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-miniprogram-shopping/stories/story-miniprogram-shopping-orders/story.md`
