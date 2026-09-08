# Proposal: 老板应收只读看板（story-ar-dashboard）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-accounts-receivable/stories/story-ar-dashboard/story.md`（已 HITL 确认，用户授权全程自主）。
> Epic：`epic-accounts-receivable`（Phase 7 · P1，依赖 credit-customer + receipt-entry 数据源）；本提案由需求侧 story.md + idea.md 合成。

## Why (背景原因)

老板需要一眼看应收健康度（总应收/已回/未回/逾期 + 客户欠款集中度）判断现金流与催收重点——"回款进度在群聊"必须变成可追踪的数字化视图。本变更交付 **应收只读看板**（指标卡 + 客户欠款集中度），数据与运营登记同源（后端权威聚合防对账漂移），复用 Phase 5 看板范式。

## What Changes (变更内容)

- **应收只读聚合 API（R-AR-201/202/203）**：总应收（Σ amountCents）/ 已回款（Σ receivedCents）/ 未回余额（Σ 剩余）/ 逾期金额（到期未结清剩余 Σ）；客户维度聚合（应收单数/未回余额/逾期金额/最大 creditDays）。
- **看板 UI（R-AR-204 只读）**：4 指标卡 + 客户欠款集中度列表；ZAPP 令牌、零图表库（纯 CSS 列表）。
- **权限（R-AR-205）**：仅 `requireRole('运营','老板')` 可访问（对齐 R-DASH 白名单）；客服/客户 403、未登录 401。

### Out of Scope

- 账期客户/应收生成（S1）；回款登记（S2）；图表库/导出；趋势图（MVP 指标卡+列表）。

## Capabilities (系统能力)

### New Capabilities

- **`accounts-receivable`（新增 taxonomy，Order Context 扩展）**：本 change **追加应收只读聚合**（看板指标 + 客户集中度）。非新 taxonomy——更新 `specs/accounts-receivable/spec.md`（ADDED）。

### Modified Capabilities

- **`frontend-ui`（修改）**：应收看板视图（指标卡 + 客户欠款集中度）。

### 只读消费

- `order-management` / `user-session` / `accounts-receivable`（Receivable + Receipt 数据源，Story 1/2 底座）。

## Impacted Bounded Contexts

- **`Order Context`（扩展）**：accounts-receivable——只读聚合（bc-order → cap-accounts-receivable）。
- **`Shared / Cross`（修改）**：frontend-ui 应收看板。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-07 经营分析（只读支流）` | 应收看板（与销售看板/库存洞察并列只读聚合） |

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-06` | REUSE | 履约完成/应收数据来源 |
| `SB-OPS-*` | NEW | 老板/运营应收看板界面（只读） |

## Impact (影响面)

- **后端（Node.js）**：应收只读聚合 API（老板/运营白名单；纯只读无写操作）。
- **前端（Vue）**：应收看板视图（指标卡 + 客户集中度）；B 端导航与销售/库存看板并列。
- **数据模型**：无变更（只读聚合 Receivable/Receipt）。
- **测试影响**：E2E/API（指标与列表同源 / 登记联动 / 权限门禁）。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-accounts-receivable/stories/story-ar-dashboard/story.md`
