# Design: story-ar-receipt-entry

> 关联 proposal：`openspec/changes/story-ar-receipt-entry/proposal.md`
> 关联需求侧：story.md（R-AR-101~106）/ 原型 `accounts-receivable.html`（Epic 整体，已确认）
> 关联 specs：`specs/accounts-receivable/spec.md`（增量）、`specs/frontend-ui/spec.md`（增量）
> 依赖底座：Story 1 `story-ar-credit-customer`（已归档——User.creditDays、ReceivableRepo/ReceiptRepo（file/memory）、`onOrderShipped` 生成应收、ship 响应含 receivable）

## Context (上下文)

本 change 在 Story 1 应收底座上追加**回款登记**：应收单列表（客户维度/状态过滤/逾期推导）→ 回款登记（金额 ≤ 剩余、部分多次）→ 剩余/结清/流水。后端 Node.js；前端「应收账款」视图（运营登记/老板只读/客服不可见）。

**关键口径**：剩余 = 应收 − receivedCents（维护于应收单）；逾期推导态（dueDate < today 且剩余>0）；状态 未回/部分/结清；Receipt 流水落库（receipts.json）。

## Domain Boundary Impact (领域边界影响)

- **Order Context（扩展既有 accounts-receivable）**：回款登记行为（Receipt 流水 + receivedCents 累加 + 状态派生）。
- **Shared / Cross（修改）**：frontend-ui 应收视图。
- 无新 taxonomy（accounts-receivable 已由 Story 1 建立）。

## Process Delta (流程影响)

- 应收管理业务支流：应收单查询 + 回款登记（B 端后台活动；非交易主流程节点）。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **Needs Sync: No**（本 change 级；Epic 级 Sync——SB-OPS-* 应收管理/回款登记后台活动在 Phase 7 完整交付后统一回写）

## Domain Model Sync Assessment (领域模型同步评估)

- **Needs Sync: No**（本 change 级；Epic 级 Sync——Receipt 实体与状态口径在 Epic 归档后统一回写 domain_model.html）

## 关键设计决策

1. **应收单查询 API**：`GET /api/admin/receivables`（仅运营/老板）——返回应收单 + 客户昵称 + 派生视图（receivedCents/balance/settled/overdue）；`?status=ALL|OPEN|OVERDUE|SETTLED` 过滤；逾期按 dueDate 推导。实现放 `AccountsReceivableService.listAll(receivables)`（复用 toView，需要客户昵称 → userRepo）。
2. **回款登记 API**：`POST /api/admin/receivables/:id/receipt`（仅运营）——body { amountCents }；校验：应收存在、金额 >0、≤ 剩余；生成 Receipt（receiptRepo）、receivedCents 累加（receivableRepo.save）；返回更新后应收视图。结清后（剩余 0）不可再登记（校验）。
3. **金额 priceCents**（请求传分；前端元转分）。
4. **前端**：B 端导航「应收账款」项（isDashboardRole 可见：运营/老板）；运营登记区 + 老板只读（无登记按钮）；状态徽标（逾期 accent）。
5. **逾期为推导**：不在仓储落 overdue 字段，查询时计算。
6. **Python 不对齐**；零第三方依赖。

## 目录结构变更（Node.js）

```
ecommerce/ecommerce-mini/
├── src/services/accountsReceivable.js   # [MOD] listAll / recordReceipt / assertReceiptAmount
├── src/http/server.js                   # [MOD] GET /api/admin/receivables + POST /api/admin/receivables/:id/receipt
ecommerce/ecommerce-mini-frontend/src/App.vue  # [MOD] B 端「应收账款」视图（列表 + 登记）
```
