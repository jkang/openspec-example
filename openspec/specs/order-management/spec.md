# Order Management Specification

## Purpose

订单管理能力，涵盖订单的创建、查询与总价计算。订单是交易的核心单据，订单创建过程协调购物车、库存扣减与价格计算。

## Requirements

### Requirement: 订单创建

系统 SHALL 支持从用户购物车结算生成订单，过程中处理库存扣减与购物车清空。为了提高结算的可靠性，系统 SHALL 验证结算请求中的价格一致性。

**Priority**: P0 (Critical)

**Rationale**: 订单创建是交易的核心流程，涉及多模块协调（Cart -> Catalog -> Order）。

#### Scenario: 成功创建订单
- **GIVEN** 用户购物车中有商品
- **AND** 商品库存充足
- **WHEN** 发送 POST /api/orders 携带 { userId } 或通过结算接口触发
- **THEN** 返回状态码 201
- **AND** 返回新创建的订单 Order
- **AND** 订单状态为 PENDING_PAYMENT
- **AND** 购物车被清空
- **AND** 库存被扣减

#### Scenario: 创建订单时购物车为空

Given 用户购物车为空
When 发送 POST /api/orders 携带 { userId }
Then 返回状态码 400
And 返回错误码 CART_EMPTY

#### Scenario: 创建订单时库存不足

Given 用户购物车中有商品
And 商品库存不足
When 发送 POST /api/orders 携带 { userId }
Then 返回状态码 409
And 返回错误码 OUT_OF_STOCK

#### Scenario: 幂等性创建订单

Given 用户携带 Idempotency-Key 请求头
When 重复发送相同的 POST /api/orders 请求
Then 返回相同的订单信息
And 不重复创建订单

---

### Requirement: 订单查询

系统 SHALL 支持根据 ID 查询订单详情。

**Priority**: P1 (High)

**Rationale**: 用户需要能够查看已创建订单的状态和详细信息。

#### Scenario: 查询存在的订单

Given 订单 ID 存在
When 发送 GET /api/orders/:id
Then 返回状态码 200
And 返回订单详情 Order

#### Scenario: 查询不存在的订单

Given 订单 ID 不存在
When 发送 GET /api/orders/:id
Then 返回状态码 404
And 返回错误码 NOT_FOUND

---

### Requirement: 订单总价计算

订单总价 MUST 等于所有条目 priceCents * quantity 之和，并扣除所选优惠券的折扣金额（discountCents）。系统 SHALL 持久化实付金额（actualPaidCents）。

**Priority**: P0 (Critical)

**Rationale**: 正确的价格计算是交易的基础，持久化实付金额为财务对账和后续退款提供依据。

#### Scenario: 计算单个商品订单总价

Given 订单包含 1 个条目
And 条目单价为 100 分，数量为 2
When 计算订单总价
Then 总价为 200 分

#### Scenario: 计算多个商品订单总价

Given 订单包含 2 个条目
And 条目 1 单价 100 分，数量 2
And 条目 2 单价 50 分，数量 1
When 计算订单总价
Then 总价为 250 分

#### Scenario: 成功应用优惠券后的总价计算
- @unit
- **GIVEN** 订单总价（未打折）为 10000 分
- **AND** 用户应用了一张“9折”的优惠券
- **WHEN** 计算最终支付总价
- **THEN** 订单总价（totalCents）应为 10000 分
- **AND** 折扣金额（discountCents）应为 1000 分
- **AND** 实付金额（actualPaidCents）应为 9000 分

---

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
