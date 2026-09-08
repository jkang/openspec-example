# frontend-ui Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/frontend-ui/spec.md`。治理归属：`bc-shared → cap-ui`。

## ADDED Requirements

### Requirement: 应收看板视图（指标卡 + 客户欠款集中度）

系统 SHALL 提供 B 端「应收看板」视图（story-ar-dashboard / `accounts-receivable` capability，老板/运营只读）：

- **指标卡**：应收总额 / 已回款 / 未回余额 / 逾期金额（颜色区分，数据来自后端权威聚合）。
- **客户欠款集中度**：列表（客户/应收单数/未回余额/逾期金额/最大账期）。
- **入口**：与「应收账款」同视图内切换（运营/老板可见；客服不可见）；纯只读（无登记动作）。
- ZAPP 令牌、无圆角阴影、真实中文数据。

- **Priority**: P1
- **Rationale**: 老板一眼看应收健康度（research 访谈 1）；对齐原型看板视图。

#### Scenario: 老板应收看板展示
- @e2e
- **GIVEN** 老板进入应收看板（存在账期应收数据）
- **THEN** 展示 4 指标卡与客户欠款集中度列表（与后端聚合一致）

## Governance Mapping

- **Bounded Context**: Shared / Cross（`bc-shared → cap-ui`）
- **Capability Taxonomy**: `frontend-ui`（修改）
- **Process Alignment**: `L1-07` 经营分析（只读支流）
- **Service Blueprint**: `SB-OPS-*`（应收看板界面）
- **实现版本**: Frontend（Vue）
