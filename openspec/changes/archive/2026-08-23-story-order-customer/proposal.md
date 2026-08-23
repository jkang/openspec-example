## Why

买家支付后无法持续查看订单状态：B 端发货（PAID→SHIPPED）或订单完成，C 端无从感知；下单后只有一次性弹窗，之后订单"消失"。本变更新增 C 端「我的订单」视图，让买家可见全部订单与实时状态，补全「下单→支付→(商家发货)→买家可见」闭环，是 Phase 3 的 C 端收口（Epic `order-lifecycle` 收官）。

## What Changes

- **C 端订单列表接口**：新增 `GET /api/orders?userId=` —— 返回该用户的全部订单（按创建倒序）。
- **我的订单视图（前端）**：`viewMode` 增加 `'orders'`；header 增加「我的订单」入口；订单列表（订单号/状态/实付/商品数）+ 详情展开（商品快照/金额/券）+ 状态轨迹（待支付→已支付→已发货→已完成）。
- **弹窗联动**：结算成功弹窗（Story 1）增加「查看订单」按钮 → 跳转我的订单视图。
- **范围说明**：
  - 不做订单取消（C 端取消是增强，Phase 3 聚焦查看；取消由 B 端负责）。
  - 不做多用户切换（沿用 `currentUserId`）。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `order-management`：新增 **按用户查询订单列表** 需求（`GET /api/orders?userId=`）。位置沿用 `openspec/specs/order-management`。
- `frontend-ui`：新增 **C 端我的订单视图** 需求。位置沿用 `openspec/specs/frontend-ui`。

## Impacted Bounded Contexts

- **Order Context**（主影响）：治理 `order-management`。新增按用户维度的订单查询（只读），边界内扩展。
- **Shared / Cross**：`frontend-ui` 新增 C 端订单视图，无领域语义变化。
- 说明：不新增 BC 映射。

无新增 taxonomy：`order-management`（`bc-order → cap-order`）、`frontend-ui`（`bc-shared → cap-ui`）复用既有映射。

## Process Alignment

- `L1-06` 履约与完成（C 端查看订单状态，形成闭环）。
- `L2-05` 提交订单（C 端订单列表/详情查看）。
- 说明：不新增流程节点，履约环节的"买家可见性"补齐。

## Service Blueprint Alignment

- **主要阶段**：`SB-STAGE-06`（成功回流/订单可见）。
- **影响节点**：
  - `SB-CUSTOMER-06`（**修改**）：客户动作补充「查看我的订单列表与状态」。
  - `SB-BACKSTAGE-04`（**修改**）：后台活动补充 `GET /api/orders?userId=` 按用户查询接口。
- **布局口径**：复用既有 capability 布局，不新增 stage/lane；无新增 taxonomy。因 C 端订单可见能力落地，`/opsx:sync` 预计需回流蓝图（详见 design 的 Sync Assessment）。

## Impact

- **后端（Node.js）**：`order.js` 新增 `listByUser(userId)`；`server.js` 新增 `GET /api/orders?userId=`（与 `/api/orders/:id` 路由共存，优先匹配查询参数）。
- **前端（Vue）**：`App.vue` `viewMode` 增加 `'orders'`；header「我的订单」入口；订单列表 + 详情展开 + 状态轨迹；结算弹窗「查看订单」按钮。
- **后端（Python）**：观察（不实现）。
- **基线同步**：`/opsx/sync` 预计需回流 `service_blueprint.html`（SB-CUSTOMER-06、SB-BACKSTAGE-04）；`domain_model.html` 预估 No-op（无领域语义变化），sync 阶段显式判定。
- **后续流程**：含 UI 变更，下一步 `/opsx:prototype` → `/opsx:Story` → `/opsx:spec-design`。
