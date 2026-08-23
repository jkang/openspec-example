## Why

B 端运营后台缺少订单管理。订单已具备完整状态机（Story 1 落地），但运营无法查看订单、无法推进履约（发货）或取消。左侧导航「订单列表」长期为占位。本变更补齐 B 端订单管理闭环，让运营能真实处理订单（列表/详情/发货/取消），兑现 Phase 3「订单可处理工作流」的 B 端侧。

## What Changes

- **B 端订单列表**：`GET /api/admin/orders` —— 支持 `status` 过滤（全部 + 各状态）、关键词搜索（订单号/用户）；返回订单摘要（订单号/用户/状态/实付/商品数）。
- **B 端订单详情**：admin 视图内复用 `GET /api/orders/:id` 展示完整订单（商品快照、金额明细、优惠券、状态轨迹）。
- **发货操作**：`POST /api/admin/orders/:id/ship` —— `PAID → SHIPPED`（复用 `OrderService.markShipped`）。
- **取消操作**：`POST /api/admin/orders/:id/cancel` —— `PENDING_PAYMENT → CANCELLED`（复用 `OrderService.cancelOrder`）。
- **前端**：admin `adminTab` 增加 `'order'`；左侧导航「订单列表」激活；订单列表表格 + 详情展开 + 发货/取消按钮（带确认）。
- **范围说明**：
  - C 端订单状态页由 Story 3 承接。
  - 不做订单分页（数据量小）、导出、批量操作。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `order-management`：新增 **B 端订单列表查询** 与 **发货/取消管理操作** 需求。位置沿用 `openspec/specs/order-management`。

## Impacted Bounded Contexts

- **Order Context**（主影响）：治理 `order-management`。新增 admin 视角的查询与履约操作（list/ship/cancel），均复用既有 Order 聚合方法与状态机，边界内扩展。
- 说明：不新增 BC 映射；`payment` 能力不变。

无新增 taxonomy：`order-management`（`bc-order → cap-order`）复用既有映射。

## Process Alignment

- `L1-06` 履约与完成（发货 PAID→SHIPPED；完成语义由状态机支撑）。
- `L2-05` 提交订单（B 端订单列表/详情查看）。
- `L3-04` 订单绑定与占用（取消释放语义：仅待支付可取消，未扣库存无需释放）。

## Service Blueprint Alignment

- **主要阶段**：`SB-STAGE-04`（提交订单）、`SB-STAGE-06`（履约与完成）。
- **影响节点**：
  - `SB-OPS-04`（**修改**）：运营活动补充「查看订单列表/详情」。
  - `SB-OPS-06`（**修改**）：运营活动补充「发货（PAID→SHIPPED）」与「取消（仅待支付）」。
  - `SB-BACKSTAGE-04`（**修改**）：后台活动补充 `/api/admin/orders` 列表与 ship/cancel 接口。
- **布局口径**：复用既有 capability 布局，不新增 stage/lane；无新增 taxonomy。因运营泳道订单管理能力落地，`/opsx:sync` 预计需回流蓝图（详见 design 的 Sync Assessment）。

## Impact

- **后端（Node.js）**：`order.js` 新增 `listAdmin(filters)`；`server.js` 新增 `/api/admin/orders` GET、`/api/admin/orders/:id/ship`、`/api/admin/orders/:id/cancel` POST；错误码复用（ORDER_NOT_FOUND/ORDER_STATUS_INVALID/ORDER_NOT_CANCELLABLE）。
- **前端（Vue）**：`App.vue` admin 新增「订单列表」tab（导航高亮 + 列表 + 详情展开 + 发货/取消操作与确认）。
- **后端（Python）**：观察（不实现）。
- **基线同步**：`/opsx/sync` 预计需回流 `service_blueprint.html`（SB-OPS-04/06、SB-BACKSTAGE-04 订单管理能力）；`domain_model.html` 预估 No-op（状态机已在 Story 1 落地），sync 阶段显式判定。
- **后续流程**：含 UI 变更，下一步 `/opsx:prototype` → `/opsx:Story` → `/opsx:spec-design`。
