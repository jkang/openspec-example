# accounts-receivable Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/accounts-receivable/spec.md`（本 change 对既有能力的增量修改，Story 1 已建立主 spec）。治理归属：`bc-order → cap-accounts-receivable`。

## ADDED Requirements

### Requirement: 应收单列表与回款登记

系统 SHALL 提供应收管理与回款登记（story-ar-receipt-entry / `accounts-receivable` capability）：

- **应收单列表（R-AR-101/104）**：返回应收单（客户/订单/应收金额/已回/剩余/到期日/状态），支持状态过滤（全部/未结清/仅逾期/已结清）；**逾期推导**（到期日已过且剩余>0 → overdue=true，不落库）。
- **回款登记（R-AR-102/103，仅运营写）**：`POST` 登记回款（金额 ≤ 剩余、>0，priceCents）→ 生成 Receipt 流水 → `receivedCents` 累加、剩余递减；减至 0 → 已结清（不可再登记）。
- **剩余/状态派生（R-AR-101）**：剩余 = 应收 − Σ已回（receivedCents 维护于应收单）；状态 未回款/部分回款/已结清/逾期。
- **权限（R-AR-105）**：回款登记仅 `role=运营`；老板只读列表（无登记）；客服 403、未登录 401。
- **流水落库（R-AR-106）**：Receipt { id, receivableId, amountCents, recordedAt, operator } 持久化（receipts.json）。

- **Priority**: P0
- **Rationale**: 客户打款需即时登记（部分/整单），告别 Excel/群聊（research 访谈 2 财务）；决策 Q2=B 运营执行登记。

#### Scenario: 部分回款 + 结清（主流程）
- @e2e
- **GIVEN** 应收单（应收 ¥356.00、未回款）
- **WHEN** 运营登记回款 ¥200.00
- **THEN** 已回 = ¥200.00、剩余 = ¥156.00、状态 = 部分回款
- **WHEN** 运营再次登记回款 ¥156.00
- **THEN** 剩余 = ¥0.00、状态 = 已结清，不可再登记

#### Scenario: 逾期应收标识
- @e2e
- **GIVEN** 应收单 到期日已过且剩余 > 0
- **WHEN** 运营查看应收列表（状态过滤=仅逾期）
- **THEN** 该单展示「已逾期」并出现在逾期过滤

#### Scenario: 回款金额校验
- @api
- **GIVEN** 应收单剩余 ¥100.00
- **WHEN** 登记 ¥150.00 或 ¥0
- **THEN** 返回校验错误，应收/已回不变

#### Scenario: 回款权限门禁
- @api
- **GIVEN** 客服 / 老板 / 运营
- **WHEN** 调用回款登记 API
- **THEN** 客服 403；老板 403（登记被拒）；运营成功

## Governance Mapping

- **Bounded Context**: Order Context（`bc-order → cap-accounts-receivable`）
- **Capability Taxonomy**: `accounts-receivable`（新增 taxonomy，增量追加）
- **Process Alignment**: 应收管理（账期回款登记业务支流）
- **Service Blueprint**: `SB-OPS-*`（应收列表 + 回款登记）、`SB-BACKSTAGE-*`（回款入账）
- **实现版本**: Node.js；Frontend（Vue）
