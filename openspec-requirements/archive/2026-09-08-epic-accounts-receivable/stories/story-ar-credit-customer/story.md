# Story: 账期客户与应收生成

<!--
Story 是需求侧唯一冻结交付物（业务面）。行为规格（Story-specs）由开发侧在 proposal 后生成，需求侧不生成 specs/。
-->

> Story Key: `story-ar-credit-customer` | 优先级: P0 | 依赖: 无（复用 User/Order 底座）
> 关联 Storymap: `epics/epic-accounts-receivable/storymap.md`
> 关联 Idea: `epics/epic-accounts-receivable/idea.md`
> 关联原型（Epic 整体）: `epics/epic-accounts-receivable/prototypes/accounts-receivable.html`（已确认）

## 用户场景 (User Scenario)

- **目标用户（B 端）**：运营（账期维护与客户认知）、账期客户（下单无感）。
- **使用动机**：贸易客户不少是月结/账期客户（发货后 30/45 天回款），现有"先付后货、PAID 即结清"模型不承认这种经营方式——发货后钱没收回来，系统里却查不到应收。运营需要能把客户标为账期客户，其订单履约后自动生成应收。
- **关键目标**：`User.creditDays`（0=现结 / >0=账期天数）由运营在客户详情维护；账期客户订单免模拟支付结清；发货 SHIPPED 自动生成应收（金额=订单 actualPaidCents、到期日=发货日+账期、状态=未回款）。
- **B 端视角**：
  - 后台怎么配置？—— 客户详情账期（creditDays）配置区，仅运营，低频（复用 user-admin 客户管理）。
  - 生命周期如何？—— 账期客户下单免现结 → 运营发货 → 自动生成应收（无人工补录）；应收生命周期由回款 Story 承接。
  - 谁有权限？—— 账期配置仅运营（复用 R-ADM 门禁）；老板可查看客户但只读。
- **C 端视角**：账期客户买家无感（仍是下单流程，只是后端免模拟支付）；不对 C 端暴露"账期"概念。

## 范围 (Scope)

### In Scope
- `User.creditDays` 字段（可空，默认 0=现结；>0=账期客户，如 30/45/60）。
- 客户详情展示/配置 creditDays（仅运营，user-admin 客户管理扩展）。
- 账期客户订单**免现结语义**：订单无需模拟支付（服务端按用户 creditDays 判定，不信任客户端 paymentType 传参）。
- 发货 SHIPPED 触发应收生成：Receivable { userId, orderId, amountCents=订单 actualPaidCents, receivedCents=0, dueDate=发货日+creditDays, createdAt }（状态=未回款）。
- 一单一应收（订单履约即一条应收）；金额 priceCents 精确制。
- 种子：账期客户演示数据（如 林明贸易 45 天 / 恒达五金 30 天 / 顺发工贸 60 天）与现结客户对照。

### Out of Scope
- 回款登记/部分回款（story-ar-receipt-entry）。
- 老板应收看板（story-ar-dashboard）。
- 存量 PAID 订单追溯补录（Q8 不追溯）；C 端改动（Q9）；收款方式扩展（发票/承兑等）。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-accounts-receivable/prototypes/accounts-receivable.html`
- 关键交互点：客户账期（creditDays）数据（林明贸易 45 / 恒达五金 30 / 顺发工贸 60 / 星河科技 0 现结）；「生成演示账期订单」后应收自动出现（到期日 = 发货日 + 账期）。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-AR-001 | User.creditDays 客户级账期（0=现结 / >0=账期天数） | 客户详情配置 | 保存客户账期 | 仅运营可写（R-ADM 扩展） |
| R-AR-002 | 账期客户订单免现结（服务端判定） | 账期客户提交订单 | 订单创建无需模拟支付（不要求 PAID 才发货） | 不信任客户端 paymentType |
| R-AR-003 | 发货 SHIPPED 自动生成应收 | 账期客户订单 markShipped | 生成 Receivable（amountCents=actualPaidCents、dueDate=发货日+creditDays、receivedCents=0） | 一单一应收，无人工补录 |
| R-AR-004 | 现结客户语义不变 | creditDays=0 客户订单 | 维持既有 下单→模拟支付→发货 流程（不生成应收） | 回归保障 |
| R-AR-005 | 应收金额 priceCents 精确制 | 应收生成 | amountCents = 订单 actualPaidCents（分，禁浮点） | 对齐财务精确性 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：账期客户履约自动转应收 (Ref: L1-06 | SB-STAGE-06)
#### 场景：正常主流程——账期客户订单发货后生成应收
- @e2e
- **GIVEN** 客户 林明贸易 被标记为账期客户（creditDays=45，运营在客户详情配置）
- **AND** 林明贸易提交一笔订单（免现结，未模拟支付）
- **WHEN** 运营对该订单执行发货（SHIPPED）
- **THEN** 自动生成应收 Receivable：amountCents=订单 actualPaidCents、receivedCents=0、dueDate=发货日+45 天、状态=未回款

#### 场景：现结客户不受影响（回归）
- @api
- **GIVEN** 现结客户（creditDays=0）提交订单
- **WHEN** 订单支付（PAID）并发货
- **THEN** 不生成应收（维持既有先付后货语义）

### 旅程 2：账期配置权限 (Ref: — | SB-OPS-*)
#### 场景：仅运营可配置客户账期
- @api
- **GIVEN** 运营 / 老板 / 客服 会话
- **WHEN** 修改客户 creditDays
- **THEN** 运营成功；老板/客服/未登录 401/403（配置不生效）

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: `User Context`（修改：User.creditDays）+ `Order Context`（扩展：accounts-receivable 应收生成）+ `Shared / Cross`（frontend-ui 客户账期配置区）
- Capability Taxonomy: **`accounts-receivable`（新增 taxonomy，bc-order → cap-accounts-receivable）**；`user-admin`（修改：客户详情 creditDays）
- Related Process Nodes: L1-06 履约与完成（账期发货触发应收）
- Related Service Blueprint Nodes: SB-STAGE-06（履约完成）、SB-OPS-*（客户账期配置）
- Sync Assessment: Yes（Epic 级；User.creditDays + Receivable 实体 + capability）

## 分析制品索引 (Analysis Artifacts)

- 故事详述: ❌ 未生成（业务规则与 E2E 已完整）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff)
- [x] 已交接 (changeName: `story-ar-credit-customer` 记录于 openspec/epic-accounts-receivable.story-list.json)
