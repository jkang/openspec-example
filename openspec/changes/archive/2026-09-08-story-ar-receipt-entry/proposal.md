# Proposal: 回款登记（story-ar-receipt-entry）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-accounts-receivable/stories/story-ar-receipt-entry/story.md`（已 HITL 确认，用户授权全程自主）。
> Epic：`epic-accounts-receivable`（Phase 7 · P0，依赖 story-ar-credit-customer 应收单来源）；本提案由需求侧 story.md + idea.md 合成。

## Why (背景原因)

账期客户发货自动转应收后，客户打款需**即时登记**（整单或部分）——运营要告别"回款记在 Excel、忘了哪笔没催"。本变更交付 **回款登记**：应收单列表（客户维度 + 状态/逾期过滤）→ 登记回款（金额 ≤ 剩余，部分回款多次）→ 剩余递减/结清状态；回款流水 Receipt 落库；仅运营可登记（客服无权，老板只读）。

## What Changes (变更内容)

- **应收单列表 API（B 端运营/老板只读）**：应收单（客户/订单/应收/已回/剩余/到期日/状态）；状态过滤（全部/未结清/仅逾期/已结清）；**逾期推导**（到期日已过且剩余>0 → 逾期标识，推导态不落库）。
- **回款登记 API（R-AR-102/103，仅运营写）**：选择未结清应收单 → 金额（≤ 剩余，>0，priceCents）→ 生成 Receipt 流水 → 剩余递减；减至 0 → 已结清（不可再登记）。
- **回款流水仓储**：`ReceiptRepo`（file/memory 双模式，`receipts.json`）。
- 前端：应收单列表 + 「登记回款」交互（金额校验、部分多次）；老板只读视图无登记入口；客服不可见。

### Out of Scope

- 账期客户/应收生成（story-ar-credit-customer）；老板看板（story-ar-dashboard）。
- 批量回款/跨单分配；红冲/撤销回款。

## Capabilities (系统能力)

### New Capabilities

- **`accounts-receivable`（新增 taxonomy，Order Context 扩展，Story 1 建立主 spec）**：本 change **追加回款登记行为**（应收单查询 + Receipt 流水 + 状态流转）。非新 taxonomy——更新 `specs/accounts-receivable/spec.md`（ADDED）。

### Modified Capabilities

- **`frontend-ui`（修改）**：应收单列表 + 回款登记交互（仅运营登记区渲染；老板只读；客服不可见）。

### 只读消费（不修改语义）

- `order-management`（订单金额来源）、`user-session`（权限）、`accounts-receivable`（Story 1 Receivable 底座）。

## Impacted Bounded Contexts

- **`Order Context`（扩展）**：accounts-receivable——回款流水/状态（bc-order → cap-accounts-receivable）。
- **`Shared / Cross`（修改）**：frontend-ui 应收列表 + 登记。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| 应收管理（账期回款登记业务支流） | 回款登记为 B 端业务支流（Baseline Sync 定稿节点） |

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-OPS-*` | NEW | 应收单列表 + 回款登记后台活动（仅运营） |
| `SB-BACKSTAGE-*` | NEW | 回款入账后台支撑（ReceiptRepo） |

## Impact (影响面)

- **后端（Node.js）**：应收单列表 API（状态/逾期过滤 + 客户维度）、回款登记 API（仅运营）、ReceiptRepo（receipts.json）；金额 priceCents。
- **前端（Vue）**：应收视图（列表 + 登记抽屉）；老板只读；客服 403。
- **数据模型**：receipts.json（Receipt）；无 Order/User 变更。
- **测试影响**：E2E/API（部分+结清主流程 / 逾期标识 / 金额校验 / 权限门禁）。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-accounts-receivable/stories/story-ar-receipt-entry/story.md`
