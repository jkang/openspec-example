# frontend-ui Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/frontend-ui/spec.md`（本 change 对既有能力的增量修改）。治理归属：`bc-shared → cap-ui`。

## ADDED Requirements

### Requirement: 客户详情账期配置区

系统 SHALL 在 B 端用户管理「客户详情」提供账期配置（story-ar-credit-customer / `accounts-receivable`）：

- 展示 creditDays：`0` → 「现结客户」徽标；`>0` → 「账期客户 · N 天」。
- 配置区仅运营可见（输入天数 0/30/45/60… + 保存）；老板/客服不渲染配置入口。
- ZAPP 暗黑令牌、无圆角阴影、真实中文数据。

- **Priority**: P0
- **Rationale**: 账期配置是运营低频动作（research 访谈 3）；对齐原型客户账期数据。

#### Scenario: 运营配置客户账期
- @e2e
- **GIVEN** 运营已打开客户详情（现结客户）
- **WHEN** 运营输入 creditDays=45 并保存
- **THEN** 详情展示「账期客户 · 45 天」，保存成功反馈

## Governance Mapping

- **Bounded Context**: Shared / Cross（`bc-shared → cap-ui`）
- **Capability Taxonomy**: `frontend-ui`（修改）
- **Process Alignment**: `L1-06` 履约与完成
- **Service Blueprint**: `SB-OPS-*`（B 端用户管理/账期配置）
- **实现版本**: Frontend（Vue）
