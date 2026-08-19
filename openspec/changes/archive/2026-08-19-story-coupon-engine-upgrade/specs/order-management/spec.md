## MODIFIED Requirements

### Requirement: 订单总价计算
订单总价 MUST 等于所有条目 priceCents * quantity 之和，并扣除所选优惠券的折扣金额（discountCents）。系统 SHALL 持久化实付金额（actualPaidCents）。
- **Priority**: P0
- **Rationale**: 正确的价格计算是交易的基础，持久化实付金额为财务对账和后续退款提供依据。

#### Scenario: 计算单个商品订单总价
- @unit
- **GIVEN** 订单包含 1 个条目
- **AND** 条目单价为 100 分，数量为 2
- **WHEN** 计算订单总价
- **THEN** 总价为 200 分

#### Scenario: 计算多个商品订单总价
- @unit
- **GIVEN** 订单包含 2 个条目
- **AND** 条目 1 单价 100 分，数量 2
- **AND** 条目 2 单价 50 分，数量 1
- **WHEN** 计算订单总价
- **THEN** 总价为 250 分

#### Scenario: 成功应用优惠券后的总价计算
- @unit
- **GIVEN** 订单总价（未打折）为 10000 分
- **AND** 用户应用了一张“9折”的优惠券
- **WHEN** 计算最终支付总价
- **THEN** 订单总价（totalCents）应为 10000 分
- **AND** 折扣金额（discountCents）应为 1000 分
- **AND** 实付金额（actualPaidCents）应为 9000 分

### Requirement: 结算时支持优惠券 ID
`checkout` 接口 SHALL 接收可选的 `couponId` 参数。如果未提供，系统 SHALL 尝试自动应用最优券。
- **Priority**: P0
- **Rationale**: 确保结算时的优惠计算是经过后端权威验证的，并支持自动推荐。

#### Scenario: 结算时携带有效优惠券 ID
- @api
- **GIVEN** 用户购物车中有商品
- **AND** 优惠券 ID 有效且满足门槛
- **WHEN** 发送 POST /api/checkout 携带 { userId, couponId }
- **THEN** 结算成功并返回应用折扣后的订单，且订单记录该 `couponId`

#### Scenario: 结算时不携带优惠券 ID 但有可用券
- @api
- **GIVEN** 用户购物车中有商品
- **AND** 用户持有可用的“9折”优惠券
- **WHEN** 发送 POST /api/checkout 仅携带 { userId }
- **THEN** 系统自动应用“9折”券并完成结算
- **AND** 返回的订单中包含已应用的 `couponId` 和计算后的 `actualPaidCents`
