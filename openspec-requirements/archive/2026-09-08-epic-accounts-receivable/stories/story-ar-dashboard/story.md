# Story: 老板应收只读看板

<!--
Story 是需求侧唯一冻结交付物（业务面）。行为规格（Story-specs）由开发侧在 proposal 后生成。
-->

> Story Key: `story-ar-dashboard` | 优先级: P1 | 依赖: story-ar-credit-customer + story-ar-receipt-entry（数据源）
> 关联 Storymap: `epics/epic-accounts-receivable/storymap.md`
> 关联 Idea: `epics/epic-accounts-receivable/idea.md`
> 关联原型（Epic 整体）: `epics/epic-accounts-receivable/prototypes/accounts-receivable.html`（已确认）

## 用户场景 (User Scenario)

- **目标用户（B 端）**：老板（只读决策者）、运营（只读复核）。
- **使用动机**：老板"看得到卖了多少、库存剩多少，但看不清楚钱收没收回来"——需要一眼看应收健康度（总应收/已回/未回/逾期 + 客户欠款集中度），判断现金流与催收重点。
- **关键目标**：应收只读聚合（后端权威，与登记数据同源）+ 看板 UI：指标卡（总应收/已回款/未回余额/逾期金额）+ 客户欠款集中度（应收单数/未回余额/逾期金额/最大账期）；仅运营/老板可访问（客服/客户 403、未登录 401）。
- **B 端视角**：纯只读聚合（无写操作）；数据与运营登记的回款实时一致（同源防对账漂移）。

## 范围 (Scope)

### In Scope
- 应收只读聚合 API：总应收（Σ amountCents）/ 已回款（Σ receivedCents）/ 未回余额（Σ 剩余）/ 逾期金额（到期未结清剩余 Σ）；客户维度聚合（应收单数/未回余额/逾期金额/最大 creditDays）。
- 看板 UI：4 指标卡 + 客户欠款集中度列表。
- 权限：仅运营/老板可访问（`requireRole('运营','老板')` 白名单，对齐 R-DASH）；客服/客户 403、未登录 401。
- 真实数据（种子账期客户 + 登记联动）。

### Out of Scope
- 账期客户/应收生成（S1）；回款登记（S2）。
- 图表库/导出（零第三方、纯 CSS 列表）；趋势图（MVP 指标卡 + 列表即可）。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-accounts-receivable/prototypes/accounts-receivable.html`
- 关键交互点：「应收看板」视图：4 指标卡（应收总额/已回款/未回余额/逾期金额，颜色区分）+ 客户欠款集中度表（客户/应收单数/未回余额/逾期金额/最大账期）；角色切换验证老板只读/客服无权。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-AR-201 | 应收只读聚合（总应收/已回/未回/逾期） | 老板/运营访问看板 API | 返回聚合指标（priceCents 精确制） | 后端权威，与登记同源 |
| R-AR-202 | 客户欠款集中度聚合 | 访问看板 | 每客户：应收单数/未回余额/逾期金额/最大 creditDays | 按客户分组 |
| R-AR-203 | 逾期金额口径 | 聚合 | Σ（到期未结清单的剩余应收） | 与应收列表逾期标识同口径 |
| R-AR-204 | 只读语义 | 任意看板请求 | 不产生任何写操作 | 看板纯只读 |
| R-AR-205 | 权限门禁 | 运营/老板/客服/客户/未登录 | 运营/老板 200；客服/客户 403；未登录 401 | 对齐 R-DASH 白名单 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：老板应收看板 (Ref: L1-07 | SB-STAGE-06, SB-OPS-*)
#### 场景：正常主流程——指标与登记数据同源
- @e2e
- **GIVEN** 存在账期客户应收：林明贸易 ¥1280.00（已回 ¥0，逾期 ¥1280.00）、恒达五金 ¥356.00（已回 ¥200，剩余 ¥156.00）等
- **WHEN** 老板访问应收看板
- **THEN** 指标卡：应收总额 / 已回款 / 未回余额 / 逾期金额 与应收列表逐单汇总一致（同源）
- **AND** 客户欠款集中度列表显示各客户应收单数/未回余额/逾期金额/最大账期

#### 场景：回款登记后看板实时联动
- @api
- **GIVEN** 恒达五金应收 ¥356.00（未回）
- **WHEN** 运营登记回款 ¥200.00 后访问看板聚合
- **THEN** 已回款与未回余额即时反映登记（同源一致，无漂移）

### 旅程 2：权限门禁
#### 场景：客服/客户无权、未登录 401
- @api
- **GIVEN** 客服 / 客户 会话 或 未登录
- **WHEN** 访问应收看板聚合 API
- **THEN** 客服/客户 403、未登录 401（不返回任何应收数据）

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: `Order Context`（扩展：accounts-receivable——只读聚合）+ `Shared / Cross`（frontend-ui 看板 UI）
- Capability Taxonomy: **`accounts-receivable`（新增 taxonomy）**（看板只读聚合 + 应收管理读写同属一 capability）
- Related Process Nodes: L1-07 经营分析（只读支流：应收看板，与销售/库存看板并列）
- Related Service Blueprint Nodes: SB-STAGE-06（履约完成/应收数据来源）、SB-OPS-*（老板/运营应收看板界面）
- Sync Assessment: Yes（Epic 级：聚合口径 + 看板支流标注）

## 分析制品索引 (Analysis Artifacts)

- 故事详述: ❌ 未生成（业务规则与 E2E 已完整）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff)
- [x] 已交接 (changeName: `story-ar-dashboard` 记录于 openspec/epic-accounts-receivable.story-list.json)
