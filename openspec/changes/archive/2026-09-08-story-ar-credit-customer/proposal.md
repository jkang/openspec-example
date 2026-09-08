# Proposal: 账期客户与应收生成（story-ar-credit-customer）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-accounts-receivable/stories/story-ar-credit-customer/story.md`（已 HITL 确认，用户授权全程自主）。
> Epic：`epic-accounts-receivable`（Phase 7 · P0，依赖链根）；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

老板"看得到卖了多少、库存剩多少，但看不清楚钱收没收回来"——贸易客户不少是月结/账期客户（发货后 30/45 天回款），现有"先付后货、PAID 即结清"模型不承认这种经营方式（发货后未回款却在系统里无应收）。本变更引入**账期客户**维度：`User.creditDays`（0=现结/>0=账期），账期客户订单免现结、发货 SHIPPED 即自动转应收——兑现"回款节点驱动应收账款"（PRODUCT 差异化承诺）的产生端。

## What Changes (变更内容)

- **`User.creditDays` 字段**（可空，默认 0=现结；>0=账期天数如 30/45/60）：
  - 客户详情展示/配置 creditDays（仅 `role=运营`，扩展 R-ADM 门禁；user-admin 客户详情扩展）。
- **账期客户订单免现结（R-AR-002）**：订单创建语义按用户 creditDays 判定——账期客户（>0）订单无需模拟支付即可履约（发货）；**服务端判定，不信任客户端 paymentType 传参**；现结客户（0）维持既有 下单→模拟支付→发货。
- **发货 SHIPPED 自动生成应收（R-AR-003）**：`markShipped` 时若用户 creditDays>0 → 生成 `Receivable { id, userId, orderId, amountCents=订单 actualPaidCents, receivedCents=0, dueDate=发货日+creditDays, createdAt }`（一单一应收，无人工补录）。
- 应收/回款仓储：`ReceivableRepo`（file/memory 双模式，`receivables.json`）。
- 种子：账期客户演示（林明贸易 45 / 恒达五金 30 / 顺发工贸 60）与现结客户对照。
- 前端：客户详情 creditDays 配置区（运营）+ 应收视图占位入口（Story 2 完整化）。

### Out of Scope（本 change 不实现）

- 回款登记/部分回款（story-ar-receipt-entry）；老板应收看板（story-ar-dashboard）。
- 存量 PAID 订单追溯（Q8 不追溯）；C 端改动（Q9）。

## Capabilities (系统能力)

### New Capabilities

- **`accounts-receivable`（新增 taxonomy，Order Context 扩展）**：账期客户履约自动生成应收——Receivable 实体（金额=actualPaidCents/到期日=发货日+creditDays/未回款状态）。理由：ROADMAP Phase 7 与 PRODUCT 差异化承诺空白（原无任何应收概念）；应收"源头事实"是订单履约（SHIPPED），归属 `bc-order → cap-accounts-receivable`（决策 Q10 已定）。

### Modified Capabilities

- **`user-admin`（User Context）**：客户详情增加 `creditDays` 账期标记展示/配置（仅运营）。
- **`frontend-ui`（Shared / Cross）**：客户详情账期配置区 + 应收视图入口占位。

### 只读消费（不修改语义）

- `order-management`（订单履约/金额来源）、`user-session`（权限/客户判定）。

## Impacted Bounded Contexts

- **`Order Context`（扩展）**：`accounts-receivable` capability + Receivable 生成钩子（markShipped）。
- **`User Context`（修改）**：User.creditDays + user-admin 客户账期配置。
- **`Shared / Cross`（修改）**：frontend-ui 账期配置区。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-06 履约与完成` | 账期客户订单发货 SHIPPED 触发应收生成（现结客户语义不变） |

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-06` | MOD | 履约完成：账期客户应收生成 |
| `SB-OPS-*` | NEW | 客户账期配置后台活动（user-admin 扩展） |
| `SB-BACKSTAGE-*` | NEW | 应收生成后台支撑（ReceivableRepo） |

## Impact (影响面)

- **后端（Node.js 权威实现）**：User + creditDays（users.json）；ReceivableRepo（receivables.json）；`markShipped` 钩子生成应收；客户账期配置 API（仅运营）；金额 priceCents 精确制。**零第三方依赖**。
- **Python 后端**：不对齐（无客户语义覆盖）。
- **前端 UI（Vue）**：客户详情账期配置区（运营）；ZAPP 令牌、无圆角阴影、真实中文数据。
- **数据模型**：User + creditDays；新增 receivables.json（Receivable）。
- **测试影响**：新增 E2E/API（账期客户发货自动转应收 / 现结回归 / 账期配置权限）。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-accounts-receivable/stories/story-ar-credit-customer/story.md`
