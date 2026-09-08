# accounts-receivable Specification


## Purpose

承载应收账款闭环能力：账期客户（`User.creditDays > 0`）订单**免现结**，履约（发货 SHIPPED）**自动生成应收**（Receivable：金额=订单 `actualPaidCents`、到期日=发货日+账期天数、未回款状态）；应收状态与回款由登记行为驱动（后 Story）；逾期为推导态。兑现 PRODUCT "回款节点驱动应收账款看板"（Phase 7 差异化承诺）。

## Requirements

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



### Requirement: 应收单列表与回款登记

系统 SHALL 提供应收管理与回款登记（story-ar-receipt-entry / `accounts-receivable` capability）：

- **应收单列表（R-AR-101/104）**：返回应收单（客户/订单/应收金额/已回/剩余/到期日/状态），状态过滤（全部/未结清/仅逾期/已结清）；逾期推导（到期日已过且剩余>0，不落库）。
- **回款登记（R-AR-102/103，仅运营写）**：登记回款（金额 ≤ 剩余、>0，priceCents）→ Receipt 流水 → receivedCents 累加、剩余递减；减至 0 → 已结清（不可再登记）。
- **权限（R-AR-105）**：登记仅 `role=运营`；老板只读；客服 403。

- **Priority**: P0
- **Rationale**: 客户打款需即时登记（部分/整单），告别 Excel/群聊；决策 Q2=B 运营执行。

#### Scenario: 部分回款 + 结清（主流程）
- @e2e
- **GIVEN** 应收单（应收 ¥356.00、未回款）
- **WHEN** 运营登记部分回款
- **THEN** 已回增加、剩余递减、状态为部分回款
- **WHEN** 运营再次登记结清剩余
- **THEN** 剩余 0、状态已结清，不可再登记

#### Scenario: 回款金额校验与权限
- @api
- **GIVEN** 应收单剩余 ¥100.00
- **WHEN** 登记超剩余金额或零金额
- **THEN** 返回校验错误；客服/老板/未登录 403



### Requirement: 应收只读聚合（老板/运营看板）

系统 SHALL 提供应收只读聚合（story-ar-dashboard / `accounts-receivable` capability）：

- **聚合指标（R-AR-201/203）**：总应收 / 已回款 / 未回余额 / 逾期金额（逾期=到期日已过且剩余>0）。
- **客户欠款集中度（R-AR-202）**：每客户应收单数 / 未回余额 / 逾期金额 / 最大 creditDays。
- **只读语义（R-AR-204）**：聚合不产生写操作。
- **权限（R-AR-205）**：仅运营/老板可访问（客服/客户 403、未登录 401）。

- **Priority**: P1
- **Rationale**: 老板一眼看应收健康度（research 访谈 1）；与登记同源防对账漂移。

#### Scenario: 老板应收看板（指标与列表同源）
- @e2e
- **GIVEN** 存在多笔账期应收（含部分已回与逾期）
- **WHEN** 老板访问应收看板聚合
- **THEN** 指标卡（应收总额、已回款、未回余额、逾期金额）与应收单逐笔汇总一致
- **AND** 客户欠款集中度列出各客户应收单数、未回余额、账期

#### Scenario: 看板权限门禁
- @api
- **GIVEN** 客服 / 未登录
- **WHEN** 访问应收看板聚合 API
- **THEN** 返回 403（不返回应收数据）

## Governance Mapping

- **Bounded Context**: `Order Context`（扩展：`bc-order → cap-accounts-receivable`）；`User Context`（修改：User.creditDays + user-admin）
- **Capability Taxonomy**: **`accounts-receivable`（新增 taxonomy）**；`user-admin`（修改）
- **Process Alignment**: `L1-06` 履约与完成（账期发货触发应收）
- **Service Blueprint**: `SB-STAGE-06`（履约完成）、`SB-OPS-*`（客户账期配置）、`SB-BACKSTAGE-*`（应收生成）
- **实现版本**: Node.js（权威）；Frontend（Vue 客户详情账期配置）

## 原型参考 (Prototype Reference)

- `openspec-requirements/epics/epic-accounts-receivable/prototypes/accounts-receivable.html`（客户账期 creditDays 数据 + 演示账期订单生成应收）。
