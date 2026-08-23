## Why

订单目前是**无生命周期的模拟数据**：下单即 `PENDING_PAYMENT` 且永不流转；`payment` 规格已定义但代码未实现；库存在下单时即扣减，与 `domain_model` 的「PaymentConfirmed 后才扣」Policy 矛盾；无取消/发货/完成语义。本变更打通 `下单 → 支付 → 发货 → 完成 / 取消` 状态机，实现模拟支付，并将库存扣减与优惠券核销时机修正为**支付成功后执行**，兑现「订单驱动库存实时变更」的价值承诺。

## What Changes

- **订单状态机**：扩展为 `PENDING_PAYMENT → PAID → SHIPPED → COMPLETED` 与 `CANCELLED` 分支；实现状态迁移校验（防非法流转）。
- **模拟支付**：新增 `POST /api/payments/:orderId` —— 校验订单 `PENDING_PAYMENT`、重新校验库存、**扣减库存**、**核销优惠券**、订单 → `PAID`；已支付幂等（提示不重复扣款）。
- **下单语义修正（MODIFIED）**：`createOrder` 不再扣减库存、不再核销优惠券，仅校验库存充足并生成 `PENDING_PAYMENT` 订单（保留商品快照/金额/券绑定）。
- **取消语义**：领域方法 `cancelOrder`（仅 `PENDING_PAYMENT → CANCELLED`，未扣库存/未核销券无需释放），供 Story 2 的 B 端操作调用。
- **C 端支付交互**：结算成功弹窗新增「模拟支付」按钮，支付成功反馈状态（对齐 Prototype）。
- **范围说明**：
  - B 端订单管理 UI（Story 2）与 C 端订单状态页（Story 3）不在此变更内。
  - 发货/完成的状态入口由 Story 2 提供（本变更实现状态机约束与迁移校验）。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `payment`：扩展订单支付 —— 状态机完整约束、支付后扣库存/核销券、幂等、库存不足拒绝。位置沿用 `openspec/specs/payment`。
- `order-management`：修改下单行为（不扣库存/不核销券）、新增取消语义与状态机迁移校验。位置沿用 `openspec/specs/order-management`。

## Impacted Bounded Contexts

- **Order Context**（主影响）：治理 `order-management` 与 `payment`。订单聚合状态机扩展（SHIPPED/COMPLETED/CANCELLED），库存与券的扣减/核销时机从"下单"迁移到"支付成功"。Order 聚合边界内扩展，不跨 BC。
- 说明：库存扣减虽作用于 Catalog 的 Product.stock，但其触发时机由 Order 聚合的支付动作驱动，属跨聚合协作（Order→Catalog 命令），不新增 BC 映射。

无新增 taxonomy：`order-management`（`bc-order → cap-order`）、`payment`（`bc-order → cap-payment`）均复用既有映射。

## Process Alignment

- `L1-04` 下单结算（创建 PENDING_PAYMENT 订单，不扣库存）；`L1-05` 支付确认（支付成功扣库存/核销券，状态→PAID）。
- `L2-05` 提交订单、`L2-06` 发起支付。
- `L3-04` 订单绑定与占用（券/库存占用的时机修正）、`L3-05` 支付成功后核销。

## Service Blueprint Alignment

- **主要阶段**：`SB-STAGE-04`（提交订单）、`SB-STAGE-05`（模拟支付）、`SB-STAGE-06`（成功回流）。
- **影响节点**：
  - `SB-CUSTOMER-05`（**修改**）：C 端支付交互（结算成功后模拟支付按钮与状态反馈）。
  - `SB-BACKSTAGE-05`（**修改**）：`POST /api/payments/:orderId` 实现 —— 状态推进 + 库存扣减 + 券核销。
  - `SB-BACKSTAGE-04`（**修改**）：下单语义修正（不再扣库存/核销券）。
- **布局口径**：复用既有 capability 布局，不新增 stage/lane；无新增 taxonomy。因支付能力从"规划"落为"已落地"且状态机变化，`/opsx:sync` 预计需回流蓝图（详见 design 的 Sync Assessment）。

## Impact

- **后端（Node.js）**：`order.js`（createOrder 语义修正 + cancelOrder/markShipped/markCompleted 状态机方法）；`payment.js` 新增（pay 幂等 + 库存二次校验 + 扣减/核销）；`logic.js` 状态机校验；`server.js` 新增 `/api/payments/:orderId`；`data/orders.json` 透传。
- **前端（Vue）**：结算成功弹窗新增「模拟支付」按钮与状态反馈（对齐 Prototype）。
- **后端（Python）**：观察（不实现）。
- **基线同步**：`/opsx:sync` 预计需回流 `domain_model.html`（Order 状态机扩展 + 库存/券扣减时机 Policy 修正）与 `service_blueprint.html`（SB-BACKSTAGE-05 支付能力落地）。
- **后续流程**：含 UI 变更，下一步 `/opsx:prototype` → `/opsx:Story` → `/opsx:spec-design`。
