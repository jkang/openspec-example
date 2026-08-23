## MODIFIED Requirements

### Requirement: 订单支付
系统 SHALL 支持订单支付，验证订单存在且为 `PENDING_PAYMENT` 后更新订单状态。支付成功时 SHALL **扣减对应商品库存**并**核销绑定优惠券**，订单状态变为 `PAID`。支付时 SHALL 重新校验库存，不足则拒绝。已支付订单重复支付 SHALL 幂等返回（提示已支付），不产生重复扣减与核销。
- **Priority**: P0 (Critical)
- **Rationale**: 支付是完成交易的必要步骤；按用户确认的语义，库存扣减与优惠券核销时机为"支付成功时"，与 domain_model 的「PaymentConfirmed 后才扣」Policy 对齐（R-ORD-003/004/005）。

#### Scenario: 成功支付订单
- @e2e
- **GIVEN** 订单存在且状态为 PENDING_PAYMENT，绑定「满 50 减 10」券，商品库存 99
- **WHEN** 发送 POST /api/payments/:orderId
- **THEN** 返回状态码 200
- **AND** 订单状态变为 PAID
- **AND** 对应商品库存扣减（99 → 98）
- **AND** 绑定优惠券被核销（变为已使用）

#### Scenario: 支付不存在的订单
- @api
- **GIVEN** 订单 ID 不存在
- **WHEN** 发送 POST /api/payments/:orderId
- **THEN** 返回状态码 404
- **AND** 返回错误码 NOT_FOUND

#### Scenario: 支付时库存不足被拒绝
- @api
- **GIVEN** 订单为 PENDING_PAYMENT，但商品库存已不足（被其他订单扣光）
- **WHEN** 发送 POST /api/payments/:orderId
- **THEN** 返回状态码 409
- **AND** 返回错误码 OUT_OF_STOCK
- **AND** 订单保持 PENDING_PAYMENT，券不核销

### Requirement: 订单状态流转
订单状态 SHALL 遵循严格的生命周期：`PENDING_PAYMENT → PAID → SHIPPED → COMPLETED`，以及 `PENDING_PAYMENT → CANCELLED` 分支。任何非法状态迁移 SHALL 被拒绝。
- **Priority**: P0 (Critical)
- **Rationale**: 状态机约束保证订单流转的正确性，防止非法状态变更（R-ORD-007）。

#### Scenario: 有效状态转换
- @api
- **GIVEN** 订单状态为 PENDING_PAYMENT
- **WHEN** 执行支付操作
- **THEN** 订单状态变为 PAID
- **AND** 继续执行发货操作后变为 SHIPPED，再执行完成操作后变为 COMPLETED

#### Scenario: 重复支付已完成的订单
- @api
- **GIVEN** 订单状态已为 PAID
- **WHEN** 再次执行支付操作
- **THEN** 返回幂等提示（已支付）
- **AND** 不产生重复扣款、不重复扣减库存/核销券

#### Scenario: 取消状态转换
- @api
- **GIVEN** 订单状态为 PENDING_PAYMENT
- **WHEN** 执行取消操作
- **THEN** 订单状态变为 CANCELLED（终态）

#### Scenario: 非法状态迁移被拒绝
- @api
- **GIVEN** 订单状态为 PENDING_PAYMENT（未支付）
- **WHEN** 尝试直接执行发货（SHIPPED）
- **THEN** 迁移被拒绝，返回错误码 `ORDER_STATUS_INVALID`
- **AND** 订单状态不变

## Governance Mapping

- **Bounded Context**: Order Context（`domain_model.html` BC → Capability 映射表：`bc-order → cap-payment`）
- **Capability Taxonomy**: `payment`（复用既有映射，无新增 taxonomy）
- **Process Alignment**: `L1-05` 支付确认；`L2-06` 发起支付；`L3-05` 支付成功后核销（券核销/库存扣减时机对齐）
- **Service Blueprint**: `SB-STAGE-05`（模拟支付）、`SB-CUSTOMER-05`、`SB-BACKSTAGE-05`
- **实现版本**: Node.js（后端 API）
