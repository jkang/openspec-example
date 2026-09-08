# Design: story-ar-dashboard

> 关联 proposal：`openspec/changes/story-ar-dashboard/proposal.md`
> 关联需求侧：story.md（R-AR-201~205）/ 原型 `accounts-receivable.html`（Epic 整体，已确认）
> 关联 specs：`specs/accounts-receivable/spec.md`（增量）、`specs/frontend-ui/spec.md`（增量）
> 依赖底座：Story 1（应收生成）+ Story 2（回款登记，应收单含 receivedCents）已归档

## Context (上下文)

本 change 交付 **应收只读看板**（老板/运营）：聚合 API（总应收/已回/未回/逾期 + 客户欠款集中度）+ 看板 UI（指标卡 + 列表）。数据与应收单登记同源（后端权威聚合，防对账漂移）。复用 Phase 5 销售/库存看板范式。

## Domain Boundary Impact (领域边界影响)

- **Order Context（扩展既有 accounts-receivable）**：只读聚合行为（对 Receivable/Receipt 数据聚合，纯只读）。
- **Shared / Cross（修改）**：frontend-ui 应收看板视图。

## Process Delta (流程影响)

- L1-07 经营分析（只读支流）：应收看板与销售/库存看板并列（B 端运营/老板只读聚合）。

## Sync Assessment

- **Service Blueprint / Domain Model：Needs Sync: No**（本 change 级；Phase 7 完整交付后 Epic 级 Sync——SB-OPS 应收看板、Receivable/Receipt 实体、capability 与 User.creditDays 统一回写基线）

## 关键设计决策

1. **聚合 API**：`GET /api/admin/receivables/summary`（运营/老板白名单）——返回 `{ totalCents, receivedCents, balanceCents, overdueCents }` + `byCustomer: [{ userId, nickname, count, balanceCents, overdueCents, creditDays }]`。实现放 `AccountsReceivableService.summary()`（复用 listAll + toView，纯只读）。
2. **逾期口径**：到期日已过且剩余>0（Σ 该单剩余）。
3. **前端**：应收视图顶部加「总览/明细」切换（或应收列表上方常驻指标卡）；本 Story 在应收账款 tab 内增加指标卡 + 客户集中度区（运营/老板可见，客服无权限兜底）。
4. **Python 不对齐**；零第三方依赖；无图表库（纯 CSS 指标卡 + 表格）。

## 目录结构变更（Node.js）

```
ecommerce/ecommerce-mini/
├── src/services/accountsReceivable.js   # [MOD] summary() 只读聚合
├── src/http/server.js                   # [MOD] GET /api/admin/receivables/summary
ecommerce/ecommerce-mini-frontend/src/App.vue  # [MOD] 应收 tab 增加看板（指标卡 + 客户集中度）
```
