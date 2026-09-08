# accounts-receivable Specification (Delta)

> 增量文件：**新增 taxonomy**，本 change 建立主 spec。治理归属：**Order Context（扩展）**——`bc-order → cap-accounts-receivable` Governs 边（Baseline Sync 落位 domain_model）。本 spec 覆盖应收产生端；回款登记/看板行为由后续 change ADDED（story-ar-receipt-entry / story-ar-dashboard 共享本 capability）。

## Purpose

承载应收账款闭环能力：账期客户（`User.creditDays > 0`）订单**免现结**，履约（发货 SHIPPED）**自动生成应收**（Receivable：金额=订单 `actualPaidCents`、到期日=发货日+账期天数、未回款状态）；应收状态与回款由登记行为驱动（后 Story）；逾期为推导态。兑现 PRODUCT "回款节点驱动应收账款看板"（Phase 7 差异化承诺）。

## ADDED Requirements

### Requirement: 账期客户履约自动生成应收

系统 SHALL 支持账期客户应收自动生成：

- `User.creditDays` 客户级账期（0=现结 / >0=账期天数）；账期配置仅 `role=运营`（扩展 R-ADM 门禁，user-admin 客户详情）。
- **账期客户订单免现结（R-AR-002）**：creditDays>0 用户提交订单无需模拟支付即可履约（不要求 PAID 才发货）；**服务端按用户判定，不信任客户端 paymentType 传参**。
- **发货自动转应收（R-AR-003）**：账期客户订单 `markShipped`（SHIPPED）时自动生成 `Receivable { id, userId, orderId, amountCents=订单 actualPaidCents, receivedCents=0, dueDate=发货日+creditDays, createdAt }`；一单一应收，无人工补录。
- **现结语义不变（R-AR-004）**：creditDays=0 客户维持 下单→模拟支付→发货（不生成应收）。
- **金额精确制（R-AR-005）**：应收金额 `amountCents` = 订单 `actualPaidCents`（分，禁浮点）。

- **Priority**: P0
- **Rationale**: 账期（赊销）是贸易客户真实经营方式（research 访谈 1/3）；应收产生是 Phase 7 闭环源头（决策 Q1=A）。

#### Scenario: 账期客户订单发货后生成应收（主流程）
- @e2e
- **GIVEN** 客户被标记为账期客户（creditDays=45，运营配置）
- **AND** 该客户提交订单（免现结，未模拟支付）
- **WHEN** 运营对该订单执行发货（SHIPPED）
- **THEN** 自动生成应收：amountCents=订单 actualPaidCents、receivedCents=0、dueDate=发货日+45 天、状态=未回款

#### Scenario: 现结客户不受影响（回归）
- @api
- **GIVEN** 现结客户（creditDays=0）提交订单并支付（PAID）
- **WHEN** 运营发货
- **THEN** 不生成应收（维持既有先付后货语义）

### Requirement: 客户账期配置

系统 SHALL 支持在用户管理（user-admin）为客户维护账期：客户详情展示 `creditDays` 并可配置（仅 `role=运营`，R-AR-001）；客户列表/详情返回该字段。

- **Priority**: P0
- **Rationale**: 账期按客户差异化（老客户 45 天/新客户现结，research 访谈 3）；配置低频、运营执行（决策 Q2=B / Q3）。

#### Scenario: 运营配置客户账期
- @api
- **GIVEN** 运营会话
- **WHEN** 修改客户 creditDays=45
- **THEN** 保存成功，客户详情返回 creditDays=45

#### Scenario: 账期配置权限
- @api
- **GIVEN** 老板 / 客服 / 未登录
- **WHEN** 修改客户 creditDays
- **THEN** 老板/客服/未登录返回 403（配置不生效）

## Governance Mapping

- **Bounded Context**: `Order Context`（扩展：`bc-order → cap-accounts-receivable`）；`User Context`（修改：User.creditDays + user-admin）
- **Capability Taxonomy**: **`accounts-receivable`（新增 taxonomy）**；`user-admin`（修改）
- **Process Alignment**: `L1-06` 履约与完成（账期发货触发应收）
- **Service Blueprint**: `SB-STAGE-06`（履约完成）、`SB-OPS-*`（客户账期配置）、`SB-BACKSTAGE-*`（应收生成）
- **实现版本**: Node.js（权威）；Frontend（Vue 客户详情账期配置）

## 原型参考 (Prototype Reference)

- `openspec-requirements/epics/epic-accounts-receivable/prototypes/accounts-receivable.html`（客户账期 creditDays 数据 + 演示账期订单生成应收）。
