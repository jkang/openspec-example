## ADDED Requirements

### Requirement: 按用户查询订单列表
系统 SHALL 提供按用户查询订单列表的接口 `GET /api/orders?userId=<userId>`：返回该用户的全部订单（按创建时间倒序）。其他用户的订单 SHALL NOT 出现在结果中。
- **Priority**: P0
- **Rationale**: C 端买家需要查看自己的全部订单与状态，订单归属隔离是基本约束（R-CUS-001/002）。

#### Scenario: 查询当前用户订单
- @api
- **GIVEN** 用户 user_1001 存在 2 个订单，user_1002 存在 1 个订单
- **WHEN** 请求 GET /api/orders?userId=user_1001
- **THEN** 返回状态码 200
- **AND** 仅返回 user_1001 的 2 个订单，按创建时间倒序

#### Scenario: 无订单用户返回空数组
- @api
- **WHEN** 请求 GET /api/orders?userId=<无订单用户>
- **THEN** 返回状态码 200
- **AND** 返回空数组

#### Scenario: 订单归属隔离
- @api
- **GIVEN** user_1001 的订单存在
- **WHEN** 请求 GET /api/orders?userId=user_1002
- **THEN** 返回结果中 SHALL NOT 包含 user_1001 的订单

## Governance Mapping

- **Bounded Context**: Order Context（`domain_model.html` BC → Capability 映射表：`bc-order → cap-order`）
- **Capability Taxonomy**: `order-management`（复用既有映射，无新增 taxonomy）
- **Process Alignment**: `L1-06` 履约与完成（C 端查看订单状态）；`L2-05` 提交订单（C 端订单列表）
- **Service Blueprint**: `SB-STAGE-06`（成功回流）、`SB-CUSTOMER-06`、`SB-BACKSTAGE-04`（按用户查询接口）
- **实现版本**: Node.js（后端 API）＋ Frontend（我的订单视图）
