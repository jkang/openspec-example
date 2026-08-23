# Idea: B 端订单管理 (story-order-admin)

> 来源：Epic `order-lifecycle`（`openspec/epic-order-lifecycle.story-list.json`）的 Story 2。
> 依赖：Story 1（`story-order-payment`）已归档，`OrderService.cancelOrder/markShipped/markCompleted` 状态机方法已就绪。

## 1. 澄清业务意图 (Clarify Business Intent)

**问题**：B 端运营后台缺少订单管理。订单由 C 端产生（`PENDING_PAYMENT/PAID/...`），但运营无法查看、无法推进履约（发货）、无法取消。左侧导航「订单列表」长期为占位。

**目标用户**：B 端运营人员（处理订单：查看、发货、取消）。

**核心价值**：让运营能真实处理订单 —— 列表可见全量订单与状态、详情可追溯（商品快照/金额/券）、可执行发货与取消操作，兑现 Phase 3「订单可处理工作流」的 B 端侧。

**硬性限制**：
- 极简 UI（无圆角/阴影/slate 色系/1px 边框/全中文/真实数据）。
- 沿用 Story 1 状态机与错误码（`ORDER_STATUS_INVALID`/`ORDER_NOT_CANCELLABLE` 等）。
- 发货/取消复用既有 `OrderService` 方法（Story 1 已实现）。

## 2. Roadmap Alignment

- **状态**：对齐 Phase 3「订单生命周期与履约闭环」In Scope（B 端订单管理）。
- **说明**：本 Story 只做 B 端管理 UI 与 admin 接口；C 端订单状态页由 Story 3 承接。

## 3. 业务设计思路 (Business Design Approach)

**B 端订单管理 = 列表 + 详情 + 操作**：
```
订单列表（状态过滤 + 关键词搜索）
   │ 点击行 → 订单详情（商品快照 / 金额明细 / 优惠券 / 状态轨迹）
   ├─ 发货（仅 PAID → SHIPPED）
   └─ 取消（仅 PENDING_PAYMENT → CANCELLED）
```

- **订单列表**：`GET /api/admin/orders` —— 支持 `status` 过滤（全部分组 + 各状态）、关键词搜索（订单号/用户）。返回订单摘要（订单号/用户/状态/实付/时间）。
- **订单详情**：`GET /api/orders/:id`（复用既有接口）返回完整订单（含 items 快照、totalCents/discountCents/actualPaidCents、couponId、status）。
- **发货**：`POST /api/admin/orders/:id/ship` —— `PAID → SHIPPED`（复用 `markShipped`）。
- **取消**：`POST /api/admin/orders/:id/cancel` —— `PENDING_PAYMENT → CANCELLED`（复用 `cancelOrder`）。
- **状态展示**：状态中文映射（待支付/已支付/已发货/已完成/已取消）；订单金额用 `priceCents` 格式。

## 4. 任务类型与后续策略 (Task Type & Workflow Strategy)

- **任务类型**：**功能（Feature，Story）**，含 UI 变更 → 走 Prototype + Story。
- **策略**：
  - 修改 `order-management` 规格（新增 admin 列表/发货/取消接口）。
  - Node.js + Frontend 实现；Python 观察。

## 5. 需求拆分建议 (Requirement Splitting)

单变更闭环：
- **B 端订单列表**：`GET /api/admin/orders`（status 过滤 + 搜索）。
- **B 端订单详情**：复用 `GET /api/orders/:id`（admin 视图内展示）。
- **发货操作**：`POST /api/admin/orders/:id/ship`。
- **取消操作**：`POST /api/admin/orders/:id/cancel`。
- **前端**：admin「订单列表」tab（导航激活 + 列表 + 详情展开 + 操作按钮）。

> Story 3 承接 C 端订单状态展示（不重复）。

## 6. 治理映射对齐 (Governance Mapping)

- **Impacted Bounded Contexts**: `bc-order`（Order Context）
- **Candidate Capabilities**: `order-management`（扩展：admin 列表/发货/取消接口）
- **Process Nodes**: `L1-06` 履约与完成（发货/完成）；`L2-05` 提交订单（B 端查看）；`L3-04` 订单绑定与占用（取消释放语义）
- **Service Blueprint Nodes**: `SB-STAGE-06`（履约与完成）；`SB-OPS-06`（运营履约操作：发货/取消）、`SB-OPS-04`（订单确认/查看）；`SB-BACKSTAGE-04`（admin 订单接口）
- **Potential Domain Model Sync Triggers**: 无新聚合/状态变化（状态机已在 Story 1 落地）→ 预估 No-op，sync 阶段显式判定
- **Potential Service Blueprint Sync Triggers**: 运营泳道 `SB-OPS-04/06` 订单管理能力落地 → **Needs Sync: Yes**

## 7. 架构影响分析 (Architectural Impact & Ideas)

- **Node.js**：
  - `src/services/order.js`：新增 `listAdmin(filters)`（按 status 过滤 + 关键词搜索订单号/用户）。
  - `src/http/server.js`：新增 `GET /api/admin/orders`、`POST /api/admin/orders/:id/ship`、`POST /api/admin/orders/:id/cancel` 路由。
  - 复用既有 `markShipped`/`cancelOrder`（Story 1）。
- **前端 (Vue)**：`App.vue` admin `adminTab` 增加 `'order'`；左侧导航「订单列表」激活；实现订单列表表格 + 详情展开 + 发货/取消按钮（确认）。
- **Python**：观察（不实现）。
- **风险点**：订单为空态展示；状态过滤默认"全部"；取消/发货按钮按状态显隐。

## 8. 确认结论 (User Confirmation)

用户已确认继续 Story 2（Epic 拆解已确认）。本变更采用以下推荐决策（记录于此）：

- [x] **B 端订单列表**：`GET /api/admin/orders`，支持 status 过滤 + 关键词搜索（订单号/用户）。
- [x] **订单详情**：复用 `GET /api/orders/:id`，admin 内展示（商品快照/金额/券/状态轨迹）。
- [x] **发货**：`POST /api/admin/orders/:id/ship`（仅 PAID）；**取消**：`POST /api/admin/orders/:id/cancel`（仅 PENDING_PAYMENT）。
- [x] **前端**：admin「订单列表」tab（导航高亮 + 列表 + 详情 + 操作按钮 + 确认交互）。
- [x] **实现版本**：Node.js + Frontend；Python 观察。

**结论**：按功能（Story）流程创建变更并推进（Prototype → Story → Spec-Design → Apply → Verify → Sync → Archive）。
