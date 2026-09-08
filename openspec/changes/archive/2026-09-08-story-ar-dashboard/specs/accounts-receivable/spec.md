# accounts-receivable Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/accounts-receivable/spec.md`（本 change 对既有能力的增量修改）。治理归属：`bc-order → cap-accounts-receivable`。

## ADDED Requirements

### Requirement: 应收只读聚合（老板/运营看板）

系统 SHALL 提供应收只读聚合（story-ar-dashboard / `accounts-receivable` capability）：

- **聚合指标（R-AR-201/203）**：总应收（Σ amountCents）/ 已回款（Σ receivedCents）/ 未回余额（Σ 剩余）/ 逾期金额（到期未结清剩余 Σ）。
- **客户欠款集中度（R-AR-202）**：每客户应收单数 / 未回余额 / 逾期金额 / 最大 creditDays。
- **只读语义（R-AR-204）**：聚合请求不产生任何写操作。
- **权限（R-AR-205）**：仅 `role=运营 / 老板` 可访问（客服/客户 403、未登录 401，对齐 R-DASH 白名单）。

- **Priority**: P1
- **Rationale**: 老板一眼看应收健康度（research 访谈 1）；与登记同源防对账漂移（访谈 2）。

#### Scenario: 老板应收看板（指标与列表同源）
- @e2e
- **GIVEN** 存在多笔账期应收（含部分已回与逾期）
- **WHEN** 老板访问应收看板聚合
- **THEN** 指标卡（总应收/已回款/未回余额/逾期金额）与应收单逐笔汇总一致
- **AND** 客户欠款集中度列出各客户应收单数/未回/逾期/最大账期

#### Scenario: 回款登记后看板联动（同源）
- @api
- **GIVEN** 一笔应收登记部分回款
- **WHEN** 再次访问看板聚合
- **THEN** 已回款与未回余额即时反映（无漂移）

#### Scenario: 看板权限门禁
- @api
- **GIVEN** 客服 / 客户 / 未登录
- **WHEN** 访问应收看板聚合 API
- **THEN** 客服/客户 403、未登录 401（不返回应收数据）

## Governance Mapping

- **Bounded Context**: Order Context（`bc-order → cap-accounts-receivable`）
- **Capability Taxonomy**: `accounts-receivable`（新增 taxonomy，增量追加）
- **Process Alignment**: `L1-07` 经营分析（只读支流：应收看板，与销售/库存看板并列）
- **Service Blueprint**: `SB-STAGE-06`（应收数据来源）、`SB-OPS-*`（老板/运营应收看板）
- **实现版本**: Node.js；Frontend（Vue）
