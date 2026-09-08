# Design: story-miniprogram-shopping-orders

> 关联 proposal：`openspec/changes/story-miniprogram-shopping-orders/proposal.md`
> 关联需求侧：story.md（R-MO-001~006）/ 原型 `miniprogram-shopping.html`（Epic 整体，已确认）
> 关联 specs：`specs/frontend-ui/spec.md`（增量）
> 依赖底座：browse/checkout Story（已归档——小程序工程 + 页面 + 后端契约 E2E `miniprogram_shopping.feature`）；6.1 会话底座

## Context (上下文)

本 change 在小程序工程新增 **pages/orders**（我的订单追踪）：列表（订单号/状态/金额/摘要）+ 展开详情（金额明细 + 状态轨迹）。后端零改动（复用 `GET /api/orders` 会话归属）；同源账户 Web/小程序同列表。

## Domain Boundary Impact (领域边界影响)

- **Shared / Cross（修改）**：`frontend-ui`——小程序我的订单 UI。
- **Order / User Context（只读消费）**：订单列表/会话归属 API，语义零改动。

## Process Delta (流程影响)

- L1-06 履约与完成（C 端订单状态可见）在小程序端复用既有 API 渲染；交易语义零改动。

## Sync Assessment

- **Service Blueprint / Domain Model：Needs Sync: No**（本 change 级；Epic 级轻量标注 frontend-ui 小程序我的订单 UI；无结构性变更）

## 关键设计决策

1. **我的订单列表**：`GET /api/orders`（Bearer 会话）→ 卡片渲染；商品摘要 = 首件名 + 总件数；金额 = actualPaidCents。
2. **状态轨迹**：状态步骤条（待支付/已支付/已发货/已完成，当前高亮）；CANCELLED 独立标注（对齐 Web 端 orderStep 语义）。
3. **C 端不展示渠道（Q3）**。
4. **后端契约 E2E**：`miniprogram_shopping.feature` 的 orders 契约场景已在 browse Story 落齐（我的订单归属 + B 端发货后状态推进——已 65 场景全绿）。

## 目录结构变更

```
ecommerce/ecommerce-miniprogram/pages/orders/    # [NEW] 我的订单页（替换 browse 占位）
```
