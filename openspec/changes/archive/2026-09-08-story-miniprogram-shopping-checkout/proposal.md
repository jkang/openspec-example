# Proposal: 小程序购物车 + 结算 + 模拟支付（story-miniprogram-shopping-checkout）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-miniprogram-shopping/stories/story-miniprogram-shopping-checkout/story.md`（已 HITL 确认，用户授权全程自主，技术形态 B 已裁定）。
> Epic：`epic-miniprogram-shopping`（Phase 6 Epic 6.2 · P0，依赖 browse Story）；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

买家在小程序浏览加购后，需在微信内完成成交——购物车管理、自动最优券结算、提交订单（channel=MINIPROGRAM 自动继承）、模拟支付一气呵成。本变更在 browse Story（小程序工程 + 后端复用）之上补齐 **购物车 → 结算 → 下单 → 模拟支付** 链路，后端零改动。

## What Changes (变更内容)

- **小程序工程新增页面**（决策 B，接续 browse Story 的 `ecommerce/ecommerce-miniprogram/`）：
  - 购物车 `pages/cart`：商品行（缩略占位/名称/单价）+ 数量 +/−（下限 1）+ 移除 + 合计（件数/金额）+ 「去结算」。
  - 结算 `pages/checkout`：商品总额 / **自动最优券**（优惠让利）/ 应付金额 + 「提交订单」。
  - 支付 `pages/pay`（或结算成功态）：待支付 →「模拟支付」→ 成功态（订单号/金额 + 「查看我的订单」入口）。
  - `wx.request` 复用购物车 / 优惠券 / 下单 / 支付 API（localhost:3000）。
- **channel 自动继承（关键口径，服务端已落地）**：小程序会话（6.1 wechat-auth，channel=MINIPROGRAM）下单 → `Order.channel=MINIPROGRAM`；**小程序 UI 不传渠道、不暴露渠道概念**（Q7 服务端判定防伪造）。
- **模拟支付**：复用既有支付 API（PAID + 库存扣减 + 幂等）。
- **后端契约 E2E（验证降级层）**：既有 Playwright 栈覆盖「微信登录会话 → 加购 → 下单 → 断言 Order.channel=MINIPROGRAM → 模拟支付」链路，保证 checkout 消费的契约可复现。

### Out of Scope（本 change 不实现）

- 浏览/加购入口（browse Story）；我的订单追踪 UI（orders Story）。
- 真实微信支付（+X）；收货地址（Q5）；微信分享（Q4）；B 端改动。

## Capabilities (系统能力)

### New Capabilities

- 无新增 taxonomy（本 Epic 后端零改动、纯前端旅程）。

### Modified Capabilities

- **`frontend-ui`（修改，横切支撑）**：`bc-shared → cap-ui`——小程序购物车 / 结算 / 模拟支付 UI（独立小程序原生工程）。更新 `specs/frontend-ui/spec.md`。

### 只读消费（不修改语义）

- `cart-management`（购物车归属）、`coupon-management`（最优券）、`order-management` / `checkout-management`（下单）、`payment`（模拟支付）、`user-session`（会话/channel 继承，6.1）。

## Impacted Bounded Contexts

- **`Shared / Cross`（修改）**：`frontend-ui` 小程序结算/支付 UI。
- **`Cart Context` / `Coupon Context` / `Order Context` / `User Context`（只读消费）**：API 与底座语义零改动（channel 继承由服务端在 6.1 order-channel 已落地）。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-03 加购与准备` | 购物车管理 |
| `L1-04 下单结算` | 结算（最优券）→ 提交订单（channel=MINIPROGRAM 自动继承） |
| `L1-05 支付确认` | 模拟支付 |

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-03/04/05` | REUSE | 结算确认/提交订单/支付流转（后端复用） |
| `SB-CUSTOMER-03/04/05` | MOD | 小程序购物车/结算/支付 UI（frontend-ui 增量） |
| `SB-BACKSTAGE-04/05` | REUSE | 下单/支付 API 消费（零改动） |

## Impact (影响面)

- **后端（Node.js / Python）**：**零改动**。
- **前端 UI（小程序原生工程，决策 B）**：`ecommerce/ecommerce-miniprogram/` 新增 cart/checkout/pay 页面；`wx.request` → localhost:3000；ZAPP WXSS 变量；真实中文数据。
- **数据模型**：无变化（channel 继承服务端 6.1 已落地）。
- **测试影响**：后端契约 E2E（channel=MINIPROGRAM 继承链路 + 最优券结算）；小程序 UI 人工/真机验证（决策 B 降级）。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-miniprogram-shopping/stories/story-miniprogram-shopping-checkout/story.md`
