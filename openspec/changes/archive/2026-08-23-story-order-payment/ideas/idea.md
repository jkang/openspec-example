# Idea: 订单状态机与模拟支付 (story-order-payment)

> 来源：Epic `order-lifecycle`（`openspec/epic-order-lifecycle.story-list.json`）的 Story 1。
> 阶段决策已与用户确认：库存改为「支付成功后才扣减」（下单仅校验）；取消释放关联资源。

## 1. 澄清业务意图 (Clarify Business Intent)

**问题**：订单目前是无生命周期的"模拟死数据"——下单即 `PENDING_PAYMENT` 且永不流转；`payment` 规格已定义但**代码未实现**；库存在下单时即扣减（与 `domain_model` 的「PaymentConfirmed 后才扣」Policy 矛盾）；无取消/发货/完成语义。

**目标用户**：
- **C 端买家**：下单后能支付（模拟），看到订单从"待支付"推进到"已支付"。
- **B 端运营（后续 Story 2 承接）**：订单有完整状态可被管理。

**核心价值**：打通 `下单 → 支付 → 发货 → 完成 / 取消` 状态机，让订单可流转、可追踪；修正库存扣减时机，形成"订单驱动库存实时变更"的正确闭环。

**硬性限制**：
- 沿用既有契约：`priceCents`、`PENDING_PAYMENT/PAID` 枚举、`actualPaidCents` 锁定。
- 模拟支付（本地实现，非真实渠道）。

## 2. Roadmap Alignment

- **状态**：对齐 Phase 3「订单生命周期与履约闭环」In Scope（订单状态机 + 模拟支付）。
- **说明**：本 Story 承载状态机扩展与支付实现；B 端订单管理与 C 端展示由 Story 2/3 承接（本变更不实现 B 端 UI 与 C 端订单页）。

## 3. 业务设计思路 (Business Design Approach)

**订单状态机**：
```
PENDING_PAYMENT ──支付成功──▶ PAID ──发货──▶ SHIPPED ──完成──▶ COMPLETED
       │
       └────取消────▶ CANCELLED
```

- **下单（createOrder）**：校验购物车非空、库存充足、计算金额与折扣；生成 `PENDING_PAYMENT` 订单（含商品快照、totalCents/discountCents/actualPaidCents、couponId）；**不扣减库存、不核销优惠券**；清空购物车。
- **支付（POST /api/payments/:orderId）**：校验订单存在且 `PENDING_PAYMENT`；**重新校验库存**（防止下单后被他人扣光）；扣减库存、核销优惠券；订单 → `PAID`。已 `PAID` 再支付 → 幂等提示（不重复扣）。
- **取消（cancelOrder，供 Story 2 的 B 端操作）**：仅 `PENDING_PAYMENT` 可取消 → `CANCELLED`；不涉及库存/券（因未扣/未核销）。
- **发货/完成**：状态流转入口由 Story 2（B 端操作）触发，本变更实现状态机支持与领域方法（`markShipped`/`markCompleted` 可被 Story 2 调用，或 Story 2 承接）。**本变更聚焦支付链路 + 状态机约束**；发货/完成的方法实现划入 Story 2，避免重复。→ 修正：状态机约束（防非法流转）在本变更实现；具体 SHIPPED/COMPLETED 操作方法在 Story 2 提供。

## 4. 任务类型与后续策略 (Task Type & Workflow Strategy)

- **任务类型**：**功能（Feature，Story）**。涉及 C 端支付交互（结算后支付按钮），**含 UI 变更**（C 端支付按钮/状态反馈）→ 走 Prototype + Story。
- **策略**：
  - 修改 `payment` 规格（扩展状态机、幂等、库存/券核销时机）。
  - 修改 `order-management` 规格（下单不再扣库存/核销券 → MODIFIED；新增取消语义）。
  - Node.js 实现；Python 观察。

## 5. 需求拆分建议 (Requirement Splitting)

单变更闭环（Story 1 范围）：
- **订单状态机**：完整状态迁移约束（PENDING_PAYMENT→PAID→SHIPPED→COMPLETED / CANCELLED）。
- **模拟支付**：`POST /api/payments/:orderId` 实现（成功扣库存/核销券；幂等；库存不足拒绝）。
- **下单语义修正**：`createOrder` 不再扣库存/核销券（MODIFIED 既有行为）。
- **取消语义**：`PENDING_PAYMENT → CANCELLED`（领域方法，供 Story 2 调用）。
- **C 端支付交互**：结算成功后提供「模拟支付」按钮，支付成功反馈状态（Prototype 对齐）。

> Story 2/3 分别承接：B 端订单管理 UI、C 端订单状态页（均依赖本变更的状态机与支付能力）。

## 6. 治理映射对齐 (Governance Mapping)

- **Impacted Bounded Contexts**: `bc-order`（Order Context）
- **Candidate Capabilities**: `order-management`（修改：下单语义、状态机）、`payment`（修改：扩展支付与核销）
- **Process Nodes**: `L1-04` 下单结算、`L1-05` 支付确认（状态推进）；`L2-05` 提交订单、`L2-06` 发起支付；`L3-04` 订单绑定与占用、`L3-05` 支付成功后核销（券核销/库存扣减时机对齐）
- **Service Blueprint Nodes**: `SB-STAGE-04`（提交订单）、`SB-STAGE-05`（模拟支付）、`SB-STAGE-06`（成功回流）；`SB-CUSTOMER-04/05`、`SB-BACKSTAGE-04/05`
- **Potential Domain Model Sync Triggers**: Order 状态机扩展（SHIPPED/COMPLETED/CANCELLED）、库存扣减时机 Policy 修正（下单不扣 → 支付后扣）、优惠券核销时机 → **Needs Sync: Yes**
- **Potential Service Blueprint Sync Triggers**: SB-STAGE-05/06 支付与成功回流能力落地 → **Needs Sync: Yes**

## 7. 架构影响分析 (Architectural Impact & Ideas)

- **Node.js**：
  - `src/services/order.js`：`createOrder` 移除库存扣减与券核销；新增 `markShipped`/`markCompleted`/`cancelOrder`（状态机校验，防非法流转）；支付成功后由支付服务调用扣库存/核销。
  - `src/services/payment.js`（新增）：`pay(orderId)` —— 校验状态、重新校验库存、扣减库存、核销券、订单→PAID；幂等处理。
  - `src/domain/logic.js`：状态机迁移校验（`ORDER_STATUS_INVALID`、`ORDER_ALREADY_PAID`、`ORDER_NOT_CANCELLABLE` 等错误码）。
  - `src/http/server.js`：`POST /api/payments/:orderId` 路由；`POST /api/orders` 不再扣库存（逻辑变更）。
  - `data/orders.json`：持久化扩展（文件存储透传）。
- **前端 (Vue)**：结算成功弹窗增加「模拟支付」按钮与支付状态反馈（对齐 Prototype）。
- **Python**：观察（不实现）。
- **风险点**：下单不扣库存 → 支付时可能库存不足（需支付时二次校验）；购物车已清空但订单未支付（取消后购物车不回填，简化处理）。

## 8. 确认结论 (User Confirmation)

用户已确认（HITL）：

- [x] **库存扣减时机**：改为「只有 PaymentConfirmed 后才扣减库存」；下单仅校验库存充足。
- [x] **Epic 拆解**：3 个 Story（本变更为 Story 1）。
- [x] **取消语义**：仅 `PENDING_PAYMENT` 可取消 → `CANCELLED`；未扣库存/未核销券，无需释放。
- [x] **模拟支付**：`POST /api/payments/:orderId`，成功扣库存/核销券 → PAID；幂等（已 PAID 再支付提示不重复扣）。

**结论**：按功能（Story）流程创建变更并推进（Prototype → Story → Spec-Design → Apply → Verify → Sync → Archive）。
