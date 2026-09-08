# Story: 回款登记

<!--
Story 是需求侧唯一冻结交付物（业务面）。行为规格（Story-specs）由开发侧在 proposal 后生成。
-->

> Story Key: `story-ar-receipt-entry` | 优先级: P0 | 依赖: story-ar-credit-customer（应收单来源）
> 关联 Storymap: `epics/epic-accounts-receivable/storymap.md`
> 关联 Idea: `epics/epic-accounts-receivable/idea.md`
> 关联原型（Epic 整体）: `epics/epic-accounts-receivable/prototypes/accounts-receivable.html`（已确认）

## 用户场景 (User Scenario)

- **目标用户（B 端）**：运营（回款登记执行人，决策 Q2=B 复用运营）、老板（查看）。
- **使用动机**：客户打款后运营要即时登记（整单或部分），系统自动算剩余应收、结清状态与逾期——告别"回款记在 Excel、忘了哪笔没催"。
- **关键目标**：应收单列表（客户维度：应收/已回/剩余/到期/逾期标识、状态过滤）+ 回款登记（金额 ≤ 剩余，支持部分回款多次 → 剩余递减、结清状态更新）；回款流水 Receipt 落库；仅运营可登记，客服无权。
- **B 端视角**：
  - 后台怎么配置？—— 无配置；登记动作即写操作。
  - 生命周期如何？—— 应收单产生（Story 1）→ 运营登记回款（部分/多次）→ 剩余递减 → 结清；到期未结清 → 逾期标识。
  - 谁有权限？—— 登记仅运营；老板只读查看（无登记入口）；客服无权。

## 范围 (Scope)

### In Scope
- 应收单列表：客户维度（应收/已回/剩余/到期日/逾期标识），支持按状态过滤（全部/未结清/仅逾期/已结清）。
- 回款登记：选择未结清应收单 → 输入回款金额（≤ 剩余，>0）→ 入账生成 Receipt 流水 → 剩余递减；结清 → 状态更新。
- 逾期推导：到期日已过且剩余 > 0 → 逾期标识（推导态，非存储）。
- 权限：登记仅运营（客服 403、未登录 401）；老板只读列表（无登记按钮）。
- 回款流水 Receipt { id, receivableId, amountCents, recordedAt, operator } 落库。

### Out of Scope
- 账期客户与应收生成（story-ar-credit-customer）；老板看板（story-ar-dashboard）。
- 批量回款、跨单分配回款（MVP 逐单登记）；红冲/撤销回款（未列承诺）。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-accounts-receivable/prototypes/accounts-receivable.html`
- 关键交互点：「应收账款」应收单表格（客户/订单/应收/已回/剩余/到期日/状态）+「登记回款」抽屉（金额 ≤ 剩余提示，部分多次）；角色切换验证运营可登记/老板只读/客服无权。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-AR-101 | 应收单展示 应收/已回/剩余（剩余=应收−Σ已回） | 应收列表 | 每单显示四金额口径与状态 | 剩余 ≥ 0 |
| R-AR-102 | 回款登记金额必须 ≤ 剩余且 > 0 | 登记回款 | 入账成功（Receipt 落库）；金额非法 → 拒绝 | 支持部分回款多次 |
| R-AR-103 | 结清判定 | 剩余减至 0 | 应收单状态 → 已结清 | 结清后不可再登记 |
| R-AR-104 | 逾期推导 | 到期日已过且剩余 > 0 | 列表/详情标「已逾期」（推导态不落库） | 无宽限期（Q7） |
| R-AR-105 | 回款登记权限 | 运营/客服/老板 会话 | 运营成功；客服 403；老板只读无登记入口 | 决策 Q2=B |
| R-AR-106 | 金额 priceCents 精确制 | 入账 | amountCents 分整型；部分回款不丢精度 | 财务精确性 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：运营登记回款 (Ref: — | SB-OPS-*)
#### 场景：部分回款 + 结清（主流程）
- @e2e
- **GIVEN** 客户 恒达五金 存在应收单（应收 ¥356.00、未回款）
- **WHEN** 运营登记回款 ¥200.00
- **THEN** 已回 = ¥200.00、剩余 = ¥156.00、状态 = 部分回款（Receipt 流水落库）
- **WHEN** 运营再次登记回款 ¥156.00
- **THEN** 剩余 = ¥0.00、状态 = 已结清，不可再登记

#### 场景：逾期应收标识
- @e2e
- **GIVEN** 某应收单 到期日已过 且 剩余 > 0（未结清）
- **WHEN** 运营查看应收列表（状态过滤=仅逾期）
- **THEN** 该单展示「已逾期」标识并出现在逾期过滤结果

#### 场景：登记金额校验（超剩余/非正数被拒）
- @api
- **GIVEN** 应收单剩余 ¥100.00
- **WHEN** 运营登记 ¥150.00 或 ¥0
- **THEN** 返回校验错误，应收/已回不变

### 旅程 2：权限门禁
#### 场景：客服无权、老板只读
- @api
- **GIVEN** 客服 / 老板 / 运营 会话
- **WHEN** 调用回款登记 API / 查看应收单
- **THEN** 客服 403（不可见）；老板 200 只读但登记被拒（403）；运营可读写

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: `Order Context`（扩展：accounts-receivable——回款流水/状态）+ `Shared / Cross`（frontend-ui 应收列表 + 登记）
- Capability Taxonomy: **`accounts-receivable`（新增 taxonomy）**
- Related Process Nodes: 应收管理（账期回款登记业务支流，Baseline Sync 定稿节点）
- Related Service Blueprint Nodes: SB-OPS-*（应收列表 + 回款登记后台活动）、SB-BACKSTAGE-*（回款入账后台支撑）
- Sync Assessment: Yes（Epic 级：Receipt 实体 + 状态口径）

## 分析制品索引 (Analysis Artifacts)

- 故事详述: ❌ 未生成（业务规则与 E2E 已完整）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff)
- [x] 已交接 (changeName: `story-ar-receipt-entry` 记录于 openspec/epic-accounts-receivable.story-list.json)
