## MODIFIED Requirements

### Requirement: 订单实体定义
系统 SHALL 定义订单实体，包含唯一标识、用户关联、状态、总价、折扣金额、实付金额、已应用的优惠券 ID 和订单条目。
- **Priority**: P0
- **Rationale**: 订单是交易的核心单据，必须完整记录财务信息。

#### Scenario: 创建有效订单
- @unit
- **GIVEN** 需要创建订单
- **WHEN** 提供订单信息 { id, userId, status, totalCents, discountCents, actualPaidCents, couponId, items }
- **THEN** 订单实体创建成功
- **AND** id 格式为 order_xxxx
- **AND** status 为 PENDING_PAYMENT 或 PAID
- **AND** totalCents >= 0
- **AND** actualPaidCents = totalCents - discountCents
- **AND** actualPaidCents >= 0

## ADDED Requirements

### Requirement: 优惠券实体定义
系统 SHALL 定义优惠券实体，包含唯一标识、名称、类型、数值、使用门槛和状态。
- **Priority**: P0
- **Rationale**: 为营销结算提供数据基础。

#### Scenario: 创建有效折扣券
- @unit
- **GIVEN** 需要创建 PERCENTAGE 类型的优惠券
- **WHEN** 提供信息 { id, name, type: 'PERCENTAGE', value: 9, minSpendCents: 10000, status: 'UNUSED' }
- **THEN** 实体创建成功
- **AND** value 表示折扣比例 (如 9 表示 9 折)
- **AND** minSpendCents 表示使用门槛 (分)
