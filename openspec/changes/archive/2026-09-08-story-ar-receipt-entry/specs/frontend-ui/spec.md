# frontend-ui Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/frontend-ui/spec.md`。治理归属：`bc-shared → cap-ui`。

## ADDED Requirements

### Requirement: 应收视图（列表 + 回款登记）

系统 SHALL 提供 B 端「应收账款」视图（story-ar-receipt-entry / `accounts-receivable` capability）：

- **入口与角色**：B 端导航新增「应收账款」（运营可操作/老板只读；客服不可见）。
- **应收单列表**：客户 / 订单 / 应收 / 已回 / 剩余 / 到期日 / 状态（未回款 / 部分回款 / 已结清 / 逾期 accent）；状态过滤（全部/未结清/仅逾期/已结清）。
- **回款登记（运营）**：未结清应收单行「登记回款」→ 金额输入（≤ 剩余提示）→ 确认入账 → 已回/剩余/状态即时更新；老板视图无登记入口。
- ZAPP 暗黑令牌、无圆角阴影、真实中文数据。

- **Priority**: P0
- **Rationale**: 财务/运营日常回款登记（research 访谈 2）；对齐原型 `accounts-receivable.html`。

#### Scenario: 运营登记回款（部分 + 结清）
- @e2e
- **GIVEN** 运营进入「应收账款」，某应收单剩余 ¥156.00（部分回款态）
- **WHEN** 运营登记回款 ¥156.00 并确认
- **THEN** 已回更新、剩余 ¥0.00、状态「已结清」，该行不再显示登记按钮

#### Scenario: 老板只读视图
- @e2e
- **GIVEN** 老板进入「应收账款」
- **THEN** 展示应收单列表（含逾期标识）但无「登记回款」按钮（纯只读提示）

## Governance Mapping

- **Bounded Context**: Shared / Cross（`bc-shared → cap-ui`）
- **Capability Taxonomy**: `frontend-ui`（修改）
- **Process Alignment**: 应收管理支流
- **Service Blueprint**: `SB-OPS-*`（应收列表/登记界面）
- **实现版本**: Frontend（Vue）
