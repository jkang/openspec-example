# Design: story-miniprogram-shopping-checkout

> 关联 proposal：`openspec/changes/story-miniprogram-shopping-checkout/proposal.md`
> 关联需求侧：story.md（R-MC-001~008）/ 原型 `miniprogram-shopping.html`（Epic 整体，已确认）
> 关联 specs：`specs/frontend-ui/spec.md`（增量）
> 依赖底座：Story 1 `story-miniprogram-shopping-browse`（已归档 2026-09-08——小程序工程骨架 app/utils/pages index+detail + 后端契约 E2E `miniprogram_shopping.feature`）；6.1 会话/channel 底座

## Context (上下文)

本 change 在小程序工程（browse Story 已建）之上新增 **cart / checkout / pay 页面** 完成成交链路：购物车（数量/移除/合计）→ 结算（自动最优券）→ 下单（channel 会话继承）→ 模拟支付 → 成功态。后端零改动；复用 `miniprogram_shopping.feature` 追加 checkout 契约场景。

**关键口径（channel 自动继承，Q7）**：小程序会话（wechat-auth，channel=MINIPROGRAM）下单 → 服务端写 `Order.channel=MINIPROGRAM`；UI 不传渠道、不暴露渠道概念（决策 Q3）。

## Domain Boundary Impact (领域边界影响)

- **Shared / Cross（修改）**：`frontend-ui`——小程序购物车/结算/模拟支付 UI。
- **Cart / Coupon / Order / User Context（只读消费）**：购物车归属、最优券、下单、支付、会话/channel 底座——语义零改动。

## Process Delta (流程影响)

- L1-03 加购与准备 / L1-04 下单结算 / L1-05 支付确认在小程序端复用既有 API 渲染；交易语义零改动。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **Needs Sync: No**（本 change 级；Epic 级轻量标注 frontend-ui 小程序结算/支付 UI，非结构性变更）

## Domain Model Sync Assessment (领域模型同步评估)

- **Needs Sync: No**（无新 BC/capability/字段；Order.channel 6.1 已落位）

## 关键设计决策

1. **购物车页（cart）**：进入时 `GET /api/cart/items`？—— 后端无购物车查询 GET 语义（购物车在服务端存 userId→items）。查实现确认（browse Story 后补：若缺 GET 则以「上次会话本地缓存 + 下单校验」方式展示；优先对齐既有 Web 端 fetchCart 语义）。实际 Web 端用 `POST /api/cart/items {quantity:0}` 探测？—— 以服务端既有可查询方式为准（design 待 code 确认后补注）。
2. **结算页（checkout）**：展示购物车合计 + 调用最优券（下单 API 自动带券，响应含 discountCents/actualPaidCents）→ 展示优惠与应付。
3. **下单（orders POST）**：携带 Bearer 会话；channel 服务端继承；成功后清空本地购物车。
4. **支付（payments POST）**：模拟支付 → PAID 成功态。
5. **后端契约 E2E**：`miniprogram_shopping.feature` 追加 checkout 契约场景（最优券结算 channel=MINIPROGRAM / 模拟支付库存扣减 / 售罄下单被拒）。

## 目录结构变更

```
ecommerce/ecommerce-miniprogram/pages/cart/      # [NEW] 购物车页（替换 browse 占位）
ecommerce/ecommerce-miniprogram/pages/checkout/  # [NEW] 结算页（替换占位）
```
