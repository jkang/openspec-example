## Purpose

负责优惠券的生命周期管理，包括优惠券的定义、发放给用户、有效性校验（有效期、使用门槛）以及折扣金额的计算。

## ADDED Requirements

### Requirement: 优惠券类型支持
系统 SHALL 支持两种类型的优惠券：固定金额减免（FLAT）和百分比折扣（PERCENTAGE）。
- **Priority**: P0
- **Rationale**: 满足基本的营销场景。

#### Scenario: 固定金额减免计算
- **WHEN** 用户选择一张“满 100 减 20”的优惠券，且订单金额为 ¥120.00
- **THEN** 系统计算折扣金额为 ¥20.00

#### Scenario: 百分比折扣计算
- **WHEN** 用户选择一张“9 折”优惠券，且订单金额为 ¥100.00
- **THEN** 系统计算折扣金额为 ¥10.00

### Requirement: 使用门槛校验
对于有门槛限制的优惠券，系统 SHALL 在应用前校验订单总额（不含运费）是否达到门槛。
- **Priority**: P0
- **Rationale**: 确保优惠券按照业务规则发放。

#### Scenario: 未达门槛不可用
- **WHEN** 用户订单金额为 ¥80.00，尝试应用“满 100 减 20”优惠券
- **THEN** 系统 SHALL 拒绝应用该券并返回错误信息“未达使用门槛”

### Requirement: 有效期校验
系统 SHALL 校验优惠券是否在有效期内。默认有效期为领取后 1 个月。
- **Priority**: P1
- **Rationale**: 防止过期优惠券被误用。

#### Scenario: 优惠券已过期
- **WHEN** 当前日期晚于优惠券的 `expiryDate`
- **THEN** 系统 SHALL 标记该券为“已过期”且不可被应用

## 交互逻辑参考
<details>
<summary>点击查看原型交互逻辑</summary>

```javascript
// 从原型 coupon-integration.html 提取的计算逻辑
const discountCents = computed(() => {
    if (!selectedCouponId.value) return 0;
    const coupon = coupons.value.find(c => c.id === selectedCouponId.value);
    if (!coupon || isCouponDisabled(coupon)) return 0;

    if (coupon.type === 'FLAT') {
        return coupon.value;
    } else if (coupon.type === 'PERCENTAGE') {
        return Math.round(cartTotalPrice.value * (1 - coupon.value / 100));
    }
    return 0;
});
```
</details>
