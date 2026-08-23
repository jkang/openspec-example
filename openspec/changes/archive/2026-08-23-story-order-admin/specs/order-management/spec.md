## ADDED Requirements

### Requirement: B 端订单列表查询
系统 SHALL 提供 B 端订单列表接口 `GET /api/admin/orders`：支持可选 `status` 参数按状态过滤（缺省返回全部状态），支持可选 `keyword` 参数按订单号或用户 ID 模糊搜索。返回订单摘要列表（订单号、用户 ID、状态、实付金额、商品条目）。
- **Priority**: P0
- **Rationale**: 运营需要在一个后台查看全部订单并按状态处理，是订单管理闭环的入口（R-ADM-001）。

#### Scenario: 获取全部订单
- @api
- **GIVEN** 系统存在多个不同状态的订单
- **WHEN** 运营人员请求 GET /api/admin/orders
- **THEN** 返回状态码 200
- **AND** 返回全部订单摘要（订单号/用户/状态/实付金额/商品条目）

#### Scenario: 按状态过滤订单
- @api
- **GIVEN** 系统存在 PENDING_PAYMENT 与 PAID 等状态订单
- **WHEN** 运营人员请求 GET /api/admin/orders?status=PAID
- **THEN** 仅返回状态为 PAID 的订单

#### Scenario: 按关键词搜索订单
- @api
- **WHEN** 运营人员请求 GET /api/admin/orders?keyword=<订单号片段或用户ID>
- **THEN** 仅返回订单号或用户 ID 匹配该关键词的订单

### Requirement: B 端订单发货
系统 SHALL 支持运营人员对订单执行发货：`POST /api/admin/orders/:id/ship`。仅 `PAID` 状态的订单 SHALL 可发货，发货后状态变为 `SHIPPED`；其他状态发货 SHALL 被拒绝。
- **Priority**: P0
- **Rationale**: 发货是履约闭环的关键动作，状态机约束防止误操作（R-ADM-002）。

#### Scenario: 发货已支付订单
- @api
- **GIVEN** 订单状态为 PAID
- **WHEN** 运营人员请求 POST /api/admin/orders/:id/ship
- **THEN** 返回状态码 200
- **AND** 订单状态变为 SHIPPED

#### Scenario: 非 PAID 订单发货被拒绝
- @api
- **GIVEN** 订单状态为 PENDING_PAYMENT（或 SHIPPED/COMPLETED）
- **WHEN** 运营人员请求 POST /api/admin/orders/:id/ship
- **THEN** 返回状态码 400
- **AND** 返回错误码 `ORDER_STATUS_INVALID`
- **AND** 订单状态不变

#### Scenario: 发货不存在的订单
- @api
- **WHEN** 运营人员请求 POST /api/admin/orders/<不存在的id>/ship
- **THEN** 返回状态码 404
- **AND** 返回错误码 `ORDER_NOT_FOUND`

### Requirement: B 端订单取消
系统 SHALL 支持运营人员取消订单：`POST /api/admin/orders/:id/cancel`。仅 `PENDING_PAYMENT` 状态的订单 SHALL 可取消，取消后进入 `CANCELLED` 终态（未扣库存/未核销券，无释放动作）；其他状态 SHALL 被拒绝。
- **Priority**: P0
- **Rationale**: 取消是生命周期闭环的必要动作；语义与"支付才扣库存"一致（R-ADM-003/004）。

#### Scenario: 取消待支付订单
- @api
- **GIVEN** 订单状态为 PENDING_PAYMENT
- **WHEN** 运营人员请求 POST /api/admin/orders/:id/cancel
- **THEN** 返回状态码 200
- **AND** 订单状态变为 CANCELLED（终态）

#### Scenario: 已支付订单不可取消
- @api
- **GIVEN** 订单状态为 PAID（或更后续状态）
- **WHEN** 运营人员请求 POST /api/admin/orders/:id/cancel
- **THEN** 返回状态码 400
- **AND** 返回错误码 `ORDER_NOT_CANCELLABLE`
- **AND** 订单状态不变

## Governance Mapping

- **Bounded Context**: Order Context（`domain_model.html` BC → Capability 映射表：`bc-order → cap-order`）
- **Capability Taxonomy**: `order-management`（复用既有映射，无新增 taxonomy）
- **Process Alignment**: `L1-06` 履约与完成（发货）；`L2-05` 提交订单（B 端查看）；`L3-04` 订单绑定与占用（取消释放语义）
- **Service Blueprint**: `SB-STAGE-04`（提交订单）、`SB-STAGE-06`（履约与完成）、`SB-OPS-04/06`（运营查看/发货/取消）、`SB-BACKSTAGE-04`（admin 订单接口）
- **实现版本**: Node.js（后端 API）＋ Frontend（B 端订单管理界面）
