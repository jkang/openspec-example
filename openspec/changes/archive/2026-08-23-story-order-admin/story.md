# Story: B 端订单管理 (story-order-admin)

## 用户场景

- **目标用户**: 电商运营人员（B 端）。
- **使用动机**: 订单由 C 端产生（已具备完整状态机），但运营无法查看、无法推进履约或取消。运营需要在一个后台里看到全部订单、追溯详情、执行发货与取消。
- **关键目标**: 补齐 B 端订单管理闭环 —— 订单列表（状态过滤/搜索）、订单详情（快照/金额/券）、发货操作（PAID→SHIPPED）、取消操作（PENDING_PAYMENT→CANCELLED）。

## 范围

### In Scope

- **B 端订单列表**：`GET /api/admin/orders` —— status 过滤（全部 + 各状态）、关键词搜索（订单号/用户）。
- **B 端订单详情**：admin 内复用 `GET /api/orders/:id` 展示（商品快照、金额明细、优惠券、状态）。
- **发货操作**：`POST /api/admin/orders/:id/ship`（PAID → SHIPPED）。
- **取消操作**：`POST /api/admin/orders/:id/cancel`（PENDING_PAYMENT → CANCELLED）。
- **前端**：admin「订单列表」tab（导航高亮、列表、详情展开、发货/取消按钮带确认）。

### Out of Scope

- C 端订单状态页（Story 3 承接）。
- 订单分页、导出、批量操作、退款/售后。

## 原型参考 (Prototype Reference)

- **原型链接**: [order-admin.html](file:///Users/superkkk/MyCoding/OpenSpec-practice/openspec/changes/story-order-admin/prototypes/order-admin.html)（已通过 HITL 确认）
- **关键交互点**: 状态过滤条（含各状态计数）；搜索框；行内「详情」展开订单详情（金额/券/商品明细）；「发货」仅 PAID 可见；「取消」仅 PENDING_PAYMENT 可见（带确认）。

## 业务规则

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-ADM-001 | 订单列表过滤 | 查看订单 | 按 status 过滤（ALL 默认）；关键词匹配订单号/用户 | — |
| R-ADM-002 | 发货前置状态 | 发货操作 | 仅 PAID → SHIPPED；否则 ORDER_STATUS_INVALID | 复用 Story 1 状态机 |
| R-ADM-003 | 取消前置状态 | 取消操作 | 仅 PENDING_PAYMENT → CANCELLED；否则 ORDER_NOT_CANCELLABLE | — |
| R-ADM-004 | 取消无副作用 | 取消订单 | 未扣库存/未核销券，无需释放 | 与"支付才扣"语义一致 |
| R-ADM-005 | 详情完整 | 查看详情 | 展示商品快照、金额明细、优惠券、状态 | — |
| R-ADM-006 | 操作按钮显隐 | 渲染列表 | 发货按钮仅 PAID 行；取消按钮仅 PENDING_PAYMENT 行 | 防误操作 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：运营查看订单列表

- **流程映射**: `L2-05` 提交订单（B 端查看）；`SB-OPS-04`、`SB-BACKSTAGE-04`

#### 场景：订单列表渲染与状态过滤

- **GIVEN** 系统存在多个不同状态的订单（待支付/已支付/已发货/已完成/已取消）
- **WHEN** 运营人员进入「交易管理 / 订单列表」
- **THEN** 导航项「订单列表」以左侧 3px 实线高亮
- **AND** 订单列表默认展示全部订单（订单号/用户/商品数/实付/状态/操作）
- **WHEN** 运营人员点击「待支付」过滤
- **THEN** 列表仅展示待支付订单，且过滤条显示各状态订单数

#### 场景：关键词搜索订单

- **WHEN** 运营人员在搜索框输入订单号片段或用户 ID
- **THEN** 列表仅展示订单号或用户 ID 匹配的订单

### 旅程 2：运营查看订单详情

- **流程映射**: `L2-05`；`SB-OPS-04`、`SB-BACKSTAGE-04`

#### 场景：展开订单详情

- **GIVEN** 订单列表存在订单（含优惠券）
- **WHEN** 运营人员点击「详情」
- **THEN** 展开订单详情：用户、状态、商品总额、优惠券、折扣、实付金额、商品明细（名称/单价/数量/小计）
- **AND** 点击「收起」关闭详情

### 旅程 3：运营发货

- **流程映射**: `L1-06` 履约与完成；`SB-OPS-06`、`SB-BACKSTAGE-04`

#### 场景：发货已支付订单

- **GIVEN** 订单状态为 PAID（已支付）
- **WHEN** 运营人员点击该行「发货」
- **THEN** 订单状态变为 SHIPPED（已发货）
- **AND** 发货按钮消失，列表状态列更新为「已发货」

#### 场景：非 PAID 订单不可发货

- **GIVEN** 订单状态为 PENDING_PAYMENT / SHIPPED / COMPLETED
- **THEN** 列表不展示「发货」按钮
- **AND** 即使直接调用接口也返回 `ORDER_STATUS_INVALID`

### 旅程 4：运营取消订单

- **流程映射**: `L3-04` 订单绑定与占用；`SB-OPS-06`、`SB-BACKSTAGE-04`

#### 场景：取消待支付订单

- **GIVEN** 订单状态为 PENDING_PAYMENT
- **WHEN** 运营人员点击「取消」并确认
- **THEN** 订单状态变为 CANCELLED（已取消，终态）
- **AND** 库存与优惠券均无变化（未扣/未核销）

#### 场景：已支付订单不可取消

- **GIVEN** 订单状态为 PAID 或更后续状态
- **WHEN** 运营人员尝试取消（直接调用接口）
- **THEN** 返回 `ORDER_NOT_CANCELLABLE`，订单状态不变

## 关联规格入口

- [ ] [proposal.md](file:///Users/superkkk/MyCoding/OpenSpec-practice/openspec/changes/story-order-admin/proposal.md)
- [ ] specs/order-management/spec.md
