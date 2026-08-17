## Why

在结算环节集成优惠券功能，旨在通过灵活的营销手段提升用户的转化率和复购率。目前系统尚无优惠券抵扣逻辑，无法满足常见的促销场景。

## What Changes

- **核心抵扣能力**：支持在结算时根据用户选择的优惠券自动计算并扣减订单金额。
- **优惠券类型支持**：仅支持 **固定金额减免**（例如：满 100 减 20）。
- **校验逻辑**：增加使用门槛校验（订单总额需达到指定金额）、有效期校验（默认 1 个月）以及每单仅限一张的排他性校验。
- **核销时机**：优惠券在结算提交时锁定，并在订单成功创建后标记为“已使用”。若结算失败，优惠券应释放。
- **交互升级**：在购物车界面增加优惠券选择入口，实时展示折扣后的总价。

## Capabilities

### New Capabilities
- `coupon-management`: 负责优惠券的定义、领取、有效性校验以及折扣金额计算。

### Modified Capabilities
- `order-management`: 结算逻辑（checkout）需要支持优惠券 ID 输入，并根据优惠券结果计算 `discountCents` 和 `totalCents`。

## Impact

- **API**: 
    - `POST /api/checkout` 增加 `couponId` 可选参数。
    - 新增 `GET /api/coupons`（Mock）用于前端展示可用优惠券。
- **Services**:
    - Node.js & Python: `OrderService` 需集成优惠券校验逻辑。
- **Frontend**: `App.vue` 需更新结算请求，发送 `selectedCouponId`。
- **Domain**: 新增 `Coupon` 实体；`Order` 实体增加 `discountCents` 和 `couponId` 字段。
- **Affected Implementations**: 全部 (Node.js, Python, Frontend)。
