# Idea: C 端订单状态展示 (story-order-customer)

> 来源：Epic `order-lifecycle`（`openspec/epic-order-lifecycle.story-list.json`）的 Story 3（Epic 收官）。
> 依赖：Story 1（状态机+支付）、Story 2（B 端订单管理）已归档。Story 1 已实现结算成功弹窗的「待支付→已支付」状态展示与模拟支付按钮。

## 1. 澄清业务意图 (Clarify Business Intent)

**问题**：买家支付后无法持续查看订单状态 —— B 端发货（PAID→SHIPPED）或订单完成，C 端无从感知；下单后只能看到一次性弹窗，之后订单"消失"。缺少「我的订单」视图。

**目标用户**：C 端买家。

**核心价值**：让买家拥有订单可见性 —— 通过「我的订单」查看全部订单与实时状态（待支付/已支付/已发货/已完成/已取消），补全"下单→支付→(商家发货)→买家可见"的闭环，是 Phase 3「订单可处理工作流」的 C 端收口。

**硬性限制**：
- 极简 UI（无圆角/阴影/slate 色系/1px 边框/全中文/真实数据）。
- 沿用 `currentUserId`（当前 `user_dev`）与既有订单契约。
- 复用 Story 1/2 的状态机与接口，不重复实现。

## 2. Roadmap Alignment

- **状态**：对齐 Phase 3「订单生命周期与履约闭环」In Scope（C 端订单状态展示）。
- **说明**：本 Story 是 Epic 收官项，完成后 `epic-order-lifecycle` 3 个 Story 全部落地。

## 3. 业务设计思路 (Business Design Approach)

**C 端「我的订单」视图**：
```
店铺首页 (viewMode=store)
   │ header「我的订单」入口
   ▼
我的订单 (viewMode=orders)
   ├─ 订单列表：订单号 / 状态 / 实付 / 商品数（仅当前用户）
   └─ 订单详情：商品快照 / 金额明细 / 优惠券 / 状态轨迹
```

- **我的订单列表**：`GET /api/orders?userId=`（新增按用户查询）返回当前用户的全部订单（按创建倒序）。
- **订单详情**：复用 `GET /api/orders/:id`（详情展开）。
- **状态展示**：中文映射（待支付/已支付/已发货/已完成/已取消）+ 状态轨迹（待支付→已支付→已发货→已完成）。
- **弹窗联动**：结算成功弹窗（Story 1）增加「查看订单」按钮 → 跳转我的订单视图。
- **切换入口**：header 增加「我的订单」按钮（购物车旁）；`viewMode` 增加 `'orders'`。

## 4. 任务类型与后续策略 (Task Type & Workflow Strategy)

- **任务类型**：**功能（Feature，Story）**，含 UI 变更 → 走 Prototype + Story。
- **策略**：
  - 修改 `order-management` 规格（新增按用户查询订单接口）。
  - 修改 `frontend-ui` 规格（我的订单视图）。
  - Node.js + Frontend 实现；Python 观察。

## 5. 需求拆分建议 (Requirement Splitting)

单变更闭环：
- **C 端订单列表接口**：`GET /api/orders?userId=`（仅返回该用户订单，倒序）。
- **我的订单视图（前端）**：viewMode `'orders'` + header 入口 + 订单列表 + 详情展开 + 状态轨迹。
- **弹窗联动**：结算成功弹窗「查看订单」按钮。

## 6. 治理映射对齐 (Governance Mapping)

- **Impacted Bounded Contexts**: `bc-order`（Order Context）
- **Candidate Capabilities**: `order-management`（扩展：按用户查询）、`frontend-ui`（我的订单视图）
- **Process Nodes**: `L1-06` 履约与完成（C 端查看订单状态）；`L2-05` 提交订单（C 端订单列表）
- **Service Blueprint Nodes**: `SB-STAGE-06`（成功回流/订单可见）、`SB-CUSTOMER-06`（查看订单状态）、`SB-BACKSTAGE-04`（订单查询接口）
- **Potential Domain Model Sync Triggers**: 无新聚合/状态变化 → 预估 No-op，sync 阶段显式判定
- **Potential Service Blueprint Sync Triggers**: `SB-CUSTOMER-06` C 端订单状态查看能力落地 → **Needs Sync: Yes**

## 7. 架构影响分析 (Architectural Impact & Ideas)

- **Node.js**：
  - `src/services/order.js`：新增 `listByUser(userId)`（按用户过滤，创建倒序）。
  - `src/http/server.js`：新增 `GET /api/orders?userId=`（注意与 `GET /api/orders/:id` 路由共存）。
- **前端 (Vue)**：`App.vue`：
  - `viewMode` 增加 `'orders'`（订单视图）：header「我的订单」按钮 + 订单列表 + 详情展开 + 状态轨迹。
  - 结算成功弹窗「查看订单」按钮 → 切到 orders 视图。
- **Python**：观察（不实现）。
- **风险点**：`GET /api/orders?userId=` 与 `GET /api/orders/:id` 路由冲突（需在路由中优先判断查询参数）；空订单态展示。

## 8. 确认结论 (User Confirmation)

用户已确认继续 Story 3（Epic 收官，Epic 拆解已确认）。本变更采用以下推荐决策（记录于此）：

- [x] **C 端订单列表**：新增 `GET /api/orders?userId=`（仅当前用户订单，倒序）。
- [x] **我的订单视图**：`viewMode='orders'` + header「我的订单」入口 + 列表 + 详情 + 状态轨迹。
- [x] **弹窗联动**：结算成功弹窗「查看订单」按钮跳转。
- [x] **实现版本**：Node.js + Frontend；Python 观察。

**结论**：按功能（Story）流程创建变更并推进（Prototype → Story → Spec-Design → Apply → Verify → Sync → Archive）。
