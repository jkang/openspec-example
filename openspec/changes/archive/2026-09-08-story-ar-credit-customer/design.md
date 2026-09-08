# Design: story-ar-credit-customer

> 关联 proposal：`openspec/changes/story-ar-credit-customer/proposal.md`
> 关联需求侧：story.md（R-AR-001~005）/ 原型 `accounts-receivable.html`（Epic 整体，已确认）
> 关联 specs：`specs/accounts-receivable/spec.md`（新增 taxonomy 主 spec）、`specs/user-admin/spec.md`、`specs/frontend-ui/spec.md`（增量）
> 依赖底座：User/订单体系（Phase 4）、Order 发货链路 `markShipped`、user-admin 用户详情、FileRepo/memoryRepo 双模式

## Context (上下文)

本 change 交付 **账期客户与应收生成**（Phase 7 依赖链根）：`User.creditDays`（0=现结/>0=账期）、账期客户订单免现结（服务端判定）、发货 SHIPPED 自动生成应收（Receivable）。后端 Node.js 权威实现；前端客户详情账期配置区。

**关键口径**：creditDays 客户级；应收金额 = 订单 `actualPaidCents`（priceCents）；到期日 = 发货日 + creditDays；一单一应收无人工补录；现结客户语义零改动（回归保障）。

## Domain Boundary Impact (领域边界影响)

- **Order Context（扩展）**：新增 `accounts-receivable` capability（`bc-order → cap-accounts-receivable` 边，Baseline Sync 落位）——应收生成钩子挂在订单履约（markShipped）。
- **User Context（修改）**：`User.creditDays` 字段 + user-admin 客户详情账期配置（bc-user → cap-admin 扩展，复用 R-ADM 门禁）。
- **Shared / Cross（修改）**：frontend-ui 客户详情账期配置区。
- 现结客户/既有订单语义零改动。

## Process Delta (流程影响)

- L1-06 履约与完成：账期客户订单发货 SHIPPED 时触发应收生成（现结客户发货不触发）。
- 交易主流程其余语义零改动；L1-07 看板支流由 dashboard Story 扩展。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **Needs Sync: No**（本 change 级；Epic 级需 Sync——Phase 7 完整交付后 service_blueprint.html 更新：SB-STAGE-06 应收生成语义、SB-OPS-* 应收管理/回款登记/账期配置后台活动、SB-BACKSTAGE-* 应收/回款后台支撑；单 change 不触发）

## Domain Model Sync Assessment (领域模型同步评估)

- **Needs Sync: No**（本 change 级；Epic 级需 Sync——User.creditDays 字段、Receivable/Receipt 实体、`accounts-receivable` capability 与 Governs 边在 Epic 全部 Story 归档后统一回写 domain_model.html）

## 关键设计决策

1. **creditDays 判定与免现结（R-AR-002）**：`User.creditDays`（数字，默认 0）。账期客户（>0）订单创建时不要求先支付——下单路由读用户 creditDays；非账期客户维持既有（订单 PENDING_PAYMENT → 模拟支付 → PAID → 发货）。
2. **应收生成钩子（R-AR-003）**：`OrderService.markShipped` 调用后，若订单归属用户 creditDays>0 → 生成应收。为避免 service 层耦合，新增 `AccountsReceivableService`（编排 orderRepo + userRepo + receivableRepo）或复用 order.js 扩展注入。**决策**：新建 `src/services/accountsReceivable.js`——`onOrderShipped(order)` 纯生成；`server.js` markShipped 路由调用。仓储独立 `receivables.json`。
3. **应收字段（R-AR-005）**：`Receivable { id: 'ar_<rand>', userId, orderId, amountCents, receivedCents: 0, dueDate: 'YYYY-MM-DD', createdAt }`（分整型）。
4. **账期配置 API**：`PUT /api/admin/users/:id/credit-days`（仅运营，body { creditDays }，0~365 整数校验）；`GET /api/admin/users` 与 `GET /api/admin/users/:id` 响应补 creditDays。
5. **存储**：User + creditDays（users.json 兼容，缺省 0）；receivableRepo：file `receivables.json` / memory（对齐既有模式）。
6. **种子**：既有演示用户中补充账期客户语义（如 user_1002 林晓明 → 可被运营配置；新增 林明贸易 等企业客户种子 phone 需先注册——采用 E2E 后门配置 creditDays，避免种子破坏既有断言）。
7. **Python 不对齐**；零第三方依赖。

## 目录结构变更（Node.js）

```
ecommerce/ecommerce-mini/
├── src/domain/types.js                  # [MOD] User + creditDays
├── src/services/accountsReceivable.js   # [NEW] 应收生成（onOrderShipped 纯函数）
├── src/repo/memoryRepo.js               # [MOD] ReceivableRepo（memory）+ UserRepo 支持 creditDays
├── src/repo/fileRepo.js                 # [MOD] ReceivableFileRepo（receivables.json）
├── src/http/server.js                   # [MOD] markShipped 钩子 + PUT /api/admin/users/:id/credit-days + list/detail 返回 creditDays
ecommerce/ecommerce-mini-frontend/src/App.vue   # [MOD] 客户详情账期配置区
```
