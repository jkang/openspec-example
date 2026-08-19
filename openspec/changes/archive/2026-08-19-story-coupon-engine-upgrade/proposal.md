## Why

目前的优惠券结算系统仅支持单一的满减（FLAT）类型，无法满足业务运营中常见的折扣（PERCENTAGE）营销需求。此外，手动选择优惠券对买家不够友好，需要引入“自动推荐最优券”的智能化逻辑来提升转化率。

## What Changes

- **新增优惠券类型**: 在 `Coupon` 模型中增加 `PERCENTAGE` 类型支持，比例由运营后台配置。
- **智能结算逻辑**: 
  - 实现结算引擎，自动扫描用户持有的所有全场通用券。
  - **最优推荐**: 自动锁定减免金额最高的一张券，**严禁叠加使用**。
- **财务数据持久化**: 
  - 在订单模型中增加 `actualPaidCents`（实付金额）和 `couponId` 字段的持久化。
  - 确保结算时的金额计算使用 `priceCents` 格式以保证财务精确性。
- **范围说明**: 
  - 本次变更仅关注下单结算链路。
  - **退款逻辑**（实付退款、优惠券回滚）已移入 Roadmap 下一阶段，不在本次 Story 范围内。

## Capabilities

### New Capabilities
- 无

### Modified Capabilities
- `coupon-management`: 增加折扣券算法支持及最优券推荐逻辑。
- `order-management`: 在下单流程中集成结算引擎，持久化实付金额与优惠券 ID。
- `domain-model`: 扩展 `Coupon` 和 `Order` 实体字段。

## Impact

- **领域逻辑**: `ecommerce/ecommerce-mini/src/domain/logic.js` 需要增加折扣计算函数。
- **服务层**: `CouponService` 增加可用券筛选与最优匹配逻辑；`OrderService` 集成新的结算逻辑。
- **实现版本**: Node.js / Python / Frontend (C端结算页展示优化)。
- **后续流程**: 本 Story 涉及 UI 变更（结算页优惠展示），后续需执行 `/opsx:prototype` -> `/opsx:story`。
