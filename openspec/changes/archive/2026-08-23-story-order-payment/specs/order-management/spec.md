## MODIFIED Requirements

### Requirement: 订单创建
系统 SHALL 支持从用户购物车结算生成订单，过程中校验库存充足、计算金额与折扣，**但不扣减库存、不核销优惠券**（扣减与核销在支付成功时执行）。为了提高结算的可靠性，系统 SHALL 验证结算请求中的价格一致性。
- **Priority**: P0 (Critical)
- **Rationale**: 按用户确认的语义，库存与券的占用时机为"支付成功"；下单仅校验与生成订单，避免未支付订单长期占着库存（R-ORD-001/002）。

#### Scenario: 成功创建订单
- @e2e
- **GIVEN** 用户购物车中有商品（库存充足）
- **AND** 用户持有可用优惠券
- **WHEN** 发送 POST /api/orders 携带 { userId } 或通过结算接口触发
- **THEN** 返回状态码 201
- **AND** 返回新创建的订单 Order，状态为 PENDING_PAYMENT
- **AND** 订单含正确金额（totalCents / discountCents / actualPaidCents）与优惠券绑定
- **AND** 购物车被清空
- **AND** 商品库存 SHALL NOT 变化（未扣减）
- **AND** 优惠券 SHALL NOT 被核销（仍为未使用）

#### Scenario: 创建订单时购物车为空
- @api
- **GIVEN** 用户购物车为空
- **WHEN** 发送 POST /api/orders 携带 { userId }
- **THEN** 返回状态码 400
- **AND** 返回错误码 CART_EMPTY

#### Scenario: 创建订单时库存不足
- @api
- **GIVEN** 用户购物车中有商品
- **AND** 商品库存不足
- **WHEN** 发送 POST /api/orders 携带 { userId }
- **THEN** 返回状态码 409
- **AND** 返回错误码 OUT_OF_STOCK

#### Scenario: 幂等性创建订单
- @api
- **GIVEN** 用户携带 Idempotency-Key 请求头
- **WHEN** 重复发送相同的 POST /api/orders 请求
- **THEN** 返回相同的订单信息
- **AND** 不重复创建订单

## ADDED Requirements

### Requirement: 订单取消
系统 SHALL 支持取消订单，但仅限 `PENDING_PAYMENT` 状态。取消后订单进入 `CANCELLED` 终态；因下单未扣库存/未核销券，取消时 SHALL 无库存与券的变化。已支付（PAID）及之后状态的订单 SHALL NOT 可取消。
- **Priority**: P1
- **Rationale**: 取消是订单生命周期闭环的必要动作；语义与"下单不扣、支付才扣"一致（R-ORD-006）。

#### Scenario: 取消待支付订单
- @api
- **GIVEN** 订单状态为 PENDING_PAYMENT
- **WHEN** 执行取消操作
- **THEN** 订单状态变为 CANCELLED（终态）
- **AND** 库存与优惠券均无变化（未扣/未核销）

#### Scenario: 已支付订单不可取消
- @api
- **GIVEN** 订单状态为 PAID（或更后续状态）
- **WHEN** 尝试取消
- **THEN** 拒绝，返回错误码 `ORDER_NOT_CANCELLABLE`
- **AND** 订单状态不变

## Governance Mapping

- **Bounded Context**: Order Context（`domain_model.html` BC → Capability 映射表：`bc-order → cap-order`）
- **Capability Taxonomy**: `order-management`（复用既有映射，无新增 taxonomy）
- **Process Alignment**: `L1-04` 下单结算（创建 PENDING_PAYMENT，不扣库存）；`L2-05` 提交订单；`L3-04` 订单绑定与占用（时机修正）
- **Service Blueprint**: `SB-STAGE-04`（提交订单）、`SB-CUSTOMER-04`、`SB-BACKSTAGE-04`
- **实现版本**: Node.js（后端 API）
