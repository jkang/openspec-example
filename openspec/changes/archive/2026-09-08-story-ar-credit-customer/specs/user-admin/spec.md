# user-admin Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/user-admin/spec.md`（本 change 对既有能力的增量修改）。治理归属：`bc-user → cap-admin`（User Context）。

## ADDED Requirements

### Requirement: 客户账期（creditDays）展示与配置

系统 SHALL 在 B 端用户管理中展示并允许配置客户账期（story-ar-credit-customer / `accounts-receivable` capability 的客户侧配置）：

- 客户详情展示 `creditDays`（0=现结 / >0=账期天数）。
- 配置 `creditDays` 仅 `role=运营`（扩展 R-ADM 门禁家族）；客户列表/详情响应包含该字段。

- **Priority**: P0
- **Rationale**: 账期按客户差异化（research 访谈 3）；配置低频、运营执行（决策 Q2=B / Q3）。

#### Scenario: 运营配置客户账期并生效
- @e2e
- **GIVEN** 运营已登录 B 端用户管理，打开客户详情
- **WHEN** 运营配置该客户 creditDays=45 并保存
- **THEN** 客户详情显示 creditDays=45（「账期客户 · 45 天」或「现结」）
- **AND** 后续该客户订单履约自动按 45 天生成应收

## Governance Mapping

- **Bounded Context**: User Context（`bc-user → cap-admin`）
- **Capability Taxonomy**: `user-admin`（修改）
- **Process Alignment**: `L1-06` 履约与完成（客户账期配置影响应收生成）
- **Service Blueprint**: `SB-OPS-*`（B 端用户管理/客户账期配置）
- **实现版本**: Node.js；Frontend（Vue）
