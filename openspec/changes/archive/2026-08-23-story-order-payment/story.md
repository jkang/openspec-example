# Story: 订单状态机与模拟支付 (story-order-payment)

## 用户场景

- **目标用户**: C 端买家（下单后支付）与系统（订单状态流转）。
- **使用动机**: 买家下单后能完成模拟支付，看到订单从「待支付」推进到「已支付」；系统在支付成功后才扣减库存与核销优惠券，避免"下单即扣"导致未支付订单占着库存。
- **关键目标**: 打通 `下单 → 支付 → 完成/取消` 状态机，修正库存/券扣减时机，让订单成为可流转的工作流（为 Story 2 的 B 端订单管理与 Story 3 的 C 端订单页提供状态基础）。

## 范围

### In Scope

- **订单状态机**：`PENDING_PAYMENT → PAID → SHIPPED → COMPLETED` / `CANCELLED`；非法流转被拒绝。
- **模拟支付**：`POST /api/payments/:orderId` —— 成功则扣库存 + 核销券 + 订单→PAID；幂等。
- **下单语义修正**：`createOrder` 仅校验库存、生成 PENDING_PAYMENT 订单（含快照/金额/券绑定），**不扣库存、不核销券**。
- **取消语义**：领域方法 `cancelOrder`（PENDING_PAYMENT → CANCELLED）。
- **C 端支付交互**：结算成功弹窗「模拟支付」按钮 → 支付成功反馈。

### Out of Scope

- B 端订单管理 UI（Story 2）、C 端订单状态页（Story 3）。
- 发货/完成的具体 B 端操作入口（Story 2 承接；本变更实现状态机约束与迁移方法）。
- 真实支付渠道、退款/售后、支付超时自动取消。

## 原型参考 (Prototype Reference)

- **原型链接**: [order-payment.html](file:///Users/superkkk/MyCoding/OpenSpec-practice/openspec/changes/story-order-payment/prototypes/order-payment.html)（已通过 HITL 确认）
- **关键交互点**: 结算成功弹窗展示订单号/实付金额/状态；「模拟支付」按钮 → 支付中 → 已支付（库存已扣减反馈）；状态流转轨迹（待支付→已支付→已发货→已完成）。

## 业务规则

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-ORD-001 | 下单不扣库存 | 创建订单 | 订单 PENDING_PAYMENT；库存不变；券不核销 | 修正既有"下单即扣"行为 |
| R-ORD-002 | 下单校验库存 | 创建订单 | 库存不足则拒绝（OUT_OF_STOCK） | 预检 |
| R-ORD-003 | 支付成功扣库存 | 支付订单 | 库存扣减、券核销、订单→PAID | 二次校验库存 |
| R-ORD-004 | 支付幂等 | 已 PAID 订单再支付 | 提示已支付，不重复扣减/核销 | — |
| R-ORD-005 | 支付库存不足拒绝 | 支付时库存不足 | 返回 OUT_OF_STOCK，订单保持 PENDING_PAYMENT | — |
| R-ORD-006 | 取消仅待支付 | 取消订单 | 仅 PENDING_PAYMENT → CANCELLED；无库存/券变化 | 终态 |
| R-ORD-007 | 状态机约束 | 任意状态迁移 | 非法迁移拒绝（如 SHIPPED 不能直接 COMPLETED 之外的路径、CANCELLED 不可再迁移） | — |

## 验收标准 (E2E 用户旅程)

### 旅程 1：下单（不扣库存）

- **流程映射**: `L1-04` 下单结算、`L2-05` 提交订单；`SB-STAGE-04`、`SB-CUSTOMER-04`、`SB-BACKSTAGE-04`

#### 场景：下单生成待支付订单且不扣库存

- **GIVEN** 买家购物车含「极简机械键盘」×1（库存 99），并持有「满 50 减 10」券
- **WHEN** 买家结算下单
- **THEN** 返回状态码 201
- **AND** 订单状态为 `PENDING_PAYMENT`，actualPaidCents 正确（已应用券）
- **AND** 「极简机械键盘」库存仍为 99（**未扣减**）
- **AND** 优惠券状态仍为未使用（**未核销**）
- **AND** 购物车被清空

#### 场景：下单库存不足被拒绝

- **GIVEN** 商品库存为 1，买家加购 2
- **WHEN** 买家结算下单
- **THEN** 返回状态码 409 + `OUT_OF_STOCK`，不生成订单

### 旅程 2：模拟支付（支付成功扣库存/核销券）

- **流程映射**: `L1-05` 支付确认、`L2-06` 发起支付、`L3-05` 支付成功后核销；`SB-STAGE-05`、`SB-CUSTOMER-05`、`SB-BACKSTAGE-05`

#### 场景：支付成功推进状态并扣减库存

- **GIVEN** 订单状态为 `PENDING_PAYMENT`（含「满 50 减 10」券）
- **WHEN** 买家请求 POST /api/payments/:orderId
- **THEN** 返回状态码 200
- **AND** 订单状态变为 `PAID`
- **AND** 对应商品库存被扣减（99 → 98）
- **AND** 优惠券被核销（变为已使用）
- **AND** C 端弹窗展示「已支付成功，库存已扣减，等待商家发货」

### 旅程 3：支付幂等与异常

- **流程映射**: `L1-05`；`SB-BACKSTAGE-05`

#### 场景：重复支付已支付订单

- **GIVEN** 订单状态已为 `PAID`
- **WHEN** 再次请求 POST /api/payments/:orderId
- **THEN** 返回提示已支付（幂等成功）
- **AND** 不重复扣减库存、不重复核销券

#### 场景：支付时库存不足

- **GIVEN** 订单 PENDING_PAYMENT，但商品库存已不足（被其他订单扣光）
- **WHEN** 请求 POST /api/payments/:orderId
- **THEN** 返回状态码 409 + `OUT_OF_STOCK`
- **AND** 订单保持 `PENDING_PAYMENT`，券不核销

### 旅程 4：取消订单

- **流程映射**: `L1-05`；`SB-STAGE-05`、`SB-BACKSTAGE-05`

#### 场景：取消待支付订单

- **GIVEN** 订单状态为 `PENDING_PAYMENT`
- **WHEN** 执行取消（领域方法，Story 2 暴露入口）
- **THEN** 订单状态变为 `CANCELLED`（终态）
- **AND** 库存与券均无变化（未扣/未核销）

#### 场景：已支付订单不可取消

- **GIVEN** 订单状态为 `PAID`
- **WHEN** 尝试取消
- **THEN** 拒绝（`ORDER_NOT_CANCELLABLE`），状态不变

## 关联规格入口

- [ ] [proposal.md](file:///Users/superkkk/MyCoding/OpenSpec-practice/openspec/changes/story-order-payment/proposal.md)
- [ ] specs/payment/spec.md
- [ ] specs/order-management/spec.md
