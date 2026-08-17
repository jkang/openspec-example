## Why

在结算环节集成优惠券功能，旨在通过灵活的营销手段提升用户的转化率和复购率。目前系统尚无优惠券抵扣逻辑，无法满足常见的促销场景。

## What Changes

- **核心抵扣能力**：支持在结算时根据用户选择的优惠券自动计算并扣减订单金额。
- **优惠券类型支持**：
    - 固定金额减免（如满 100 减 20）。
    - 百分比折扣（如全场 9 折）。
- **校验逻辑**：增加优惠券有效期（默认1个月）、使用门槛（满减券）以及每单仅限一张的排他性校验。
- **交互升级**：在购物车界面增加优惠券选择入口，实时展示折扣后的总价。

## Capabilities

### New Capabilities
- `coupon-management`: 负责优惠券的领取、列表查询、有效性校验以及折扣金额计算。

### Modified Capabilities
- `order`: 结算逻辑（checkout）需要支持优惠券 ID 输入，并记录最终的折扣金额。

## Impact

- **API**: 
    - `POST /api/checkout` 增加 `couponId` 参数。
    - 新增 `GET /api/coupons` 用于获取用户可用的优惠券列表。
- **Services**:
    - Python: `OrderService` 注入 `CouponService`。
    - Node.js: `OrderService` 注入 `CouponService`。
- **Frontend**: `App.vue` 增加优惠券选择状态管理及 UI 组件。
- **Domain**: 新增 `Coupon` 实体，更新 `Order` 实体字段。
