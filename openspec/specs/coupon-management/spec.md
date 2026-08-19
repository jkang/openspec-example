# Coupon Management Specification

## Purpose

负责优惠券的生命周期管理，包括优惠券的定义、发放给用户、有效性校验（有效期、使用门槛）以及折扣金额的计算。

## Requirements

### Requirement: 优惠券类型支持
系统 SHALL 支持 **固定金额减免** (FLAT) 和 **折扣比例** (PERCENTAGE) 类型的优惠券。
- **Priority**: P0
- **Rationale**: 满足基本的营销场景，支持更灵活的折扣策略。

#### Scenario: 固定金额减免计算
- @unit
- **WHEN** 用户选择一张“满 100 减 20” (FLAT, 2000分) 的优惠券，且订单金额为 ¥120.00 (12000分)
- **THEN** 系统计算折扣金额为 ¥20.00 (2000分)

#### Scenario: 折扣比例减免计算
- @unit
- **WHEN** 用户选择一张“9折” (PERCENTAGE, 9) 的优惠券，且订单金额为 ¥10.00 (10000分)
- **THEN** 系统计算折扣金额为 ¥10.00 (1000分)
- **AND** 折扣后的实付金额为 ¥90.00 (9000分)

#### Scenario: 折扣计算向下取整至 cent
- @unit
- **WHEN** 用户使用“9.5折” (PERCENTAGE, 9.5) 优惠券，订单总额为 ¥15.55 (1555分)
- **THEN** 计算出的折扣金额为 1555 * (1 - 0.95) = 77.75 分
- **THEN** 系统 SHALL 将折扣金额向下取整为 77 分
- **AND** 实付金额为 1555 - 77 = 1478 分

### Requirement: 最优券自动推荐
结算引擎 SHALL 自动从用户持有的可用优惠券中，推荐减免金额最高的一张券。
- **Priority**: P0
- **Rationale**: 提升用户体验，确保用户获得最大优惠。

#### Scenario: 自动推荐减免额最高的券
- @e2e
- **GIVEN** 用户购物车总额为 ¥1000.00 (100000分)
- **AND** 用户持有一张“满 100 减 50” (FLAT, 5000分) 券 and 一张“9折” (PERCENTAGE, 9) 券
- **WHEN** 系统执行最优券推荐逻辑
- **THEN** 系统计算满减券减免 5000 分，折扣券减免 10000 分
- **THEN** 系统 SHALL 自动推荐并选中“9折”券
- **AND** 提示“已自动选择最优方案” (基于 prototype.html 交互)

### Requirement: 使用门槛校验
对于有门槛限制的优惠券，系统 SHALL 在应用前校验订单总额是否达到门槛。
- **Priority**: P0
- **Rationale**: 确保优惠券按照业务规则发放。

#### Scenario: 未达门槛不可用
- **WHEN** 用户订单金额为 ¥80.00，尝试应用“满 100 减 20”优惠券
- **THEN** 系统 SHALL 拒绝应用该券并返回错误信息“未达使用门槛”

### Requirement: 核销状态管理
系统 SHALL 在订单创建成功后，将已使用的优惠券标记为 `USED` 状态。
- **Priority**: P0
- **Rationale**: 防止优惠券被重复使用。

#### Scenario: 结算成功后核销
- **GIVEN** 订单结算成功且订单已持久化
- **WHEN** 处理后续流程
- **THEN** 对应的 `couponId` 状态 SHALL 更新为 `USED`

### Requirement: 有效期校验
系统 SHALL 校验优惠券是否在有效期内。默认有效期为领取后 1 个月。
- **Priority**: P1
- **Rationale**: 防止过期优惠券被误用。

#### Scenario: 优惠券已过期
- **WHEN** 当前日期晚于优惠券的 `expiryDate`
- **THEN** 系统 SHALL 标记该券为“已过期”且不可被应用
