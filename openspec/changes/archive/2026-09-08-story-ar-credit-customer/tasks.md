# Tasks: story-ar-credit-customer

> 关联 proposal/specs/design：见 `openspec/changes/story-ar-credit-customer/`
> 需求侧业务面：story.md（R-AR-001~005，已 HITL 确认）| 原型：`accounts-receivable.html`（已确认）
> 实现版本标注：Node.js = 后端（ecommerce/ecommerce-mini）｜Frontend = 前端（ecommerce/ecommerce-mini-frontend）｜E2E = 全局 e2e-tests

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：账期客户订单履约自动转应收；现结客户回归；账期配置权限。
- ① **smoke 主链路完整性**：smoke 覆盖现结主链路；账期免现结为**新分支**（现结语义不变）→ smoke 无需改动。
- ② **新增功能覆盖**：新建 `e2e-tests/features/accounts_receivable.feature`（跨 3 Story 共享，本 change 落 credit-customer 契约场景）：账期客户发货转应收 / 现结回归 / 账期配置权限。
- ③ **既有回归**：User + creditDays 为向后兼容增量（缺省 0）→ order_lifecycle/smoke/mvp 等全量回归。
- **缺口落盘**：story 旅程 1/2 以契约 E2E 断言；前端账期配置区以 E2E DOM 断言。

## 1. 后端：User.creditDays + 应收生成（Node.js）

- [x] 1.1 `types.js`：User 增加 `creditDays`（可空，默认 0）
- [x] 1.2 `memoryRepo.js`：UserRepo 兼容 creditDays；新增 `ReceivableRepo`（save/findAll/findById/findByUserId/findByOrderId/clear）
- [x] 1.3 `fileRepo.js`：`ReceivableFileRepo`（receivables.json，自愈默认，对齐既有模式）
- [x] 1.4 新建 `src/services/accountsReceivable.js`：`onOrderShipped(order, user)` 生成应收（amountCents=order.actualPaidCents、dueDate=发货日+user.creditDays、receivedCents=0）；`listByUserId` / 只读辅助
- [x] 1.5 `server.js`：`markShipped` 路由 → 若用户 creditDays>0 调用应收生成；新增 `PUT /api/admin/users/:id/credit-days`（仅运营，0~365 校验）；users list/detail 返回 creditDays
- [x] 1.6 单元测试（`__tests__/accountsReceivable.spec.js` @unit）：onOrderShipped 生成应收（金额/到期日/状态）；creditDays=0 不生成
- [x] 1.7 API 测试（@api）：账期客户发货 → 应收生成（GET 查询）；现结回归；账期配置权限（运营成功/老板客服 403）
- [x] 1.8 运行 `./init.sh node:test` 全量 Node 测试全绿

## 2. 前端：客户详情账期配置区（Frontend）

- [x] 2.1 App.vue 用户详情信息卡增加「账期」展示（creditDays 0 → 现结 / >0 → 账期客户 N 天）
- [x] 2.2 运营可见账期配置（数字输入 + 保存，调 PUT credit-days）；老板/客服不渲染
- [x] 2.3 ZAPP 视觉自查 + `vue:build` 通过

## 3. E2E（新建 feature）

- [x] 3.1 新建 `e2e-tests/features/accounts_receivable.feature`（credit-customer 契约场景，@e2e/@api）：
  - 账期客户订单发货 → 自动生成应收（金额/到期日/状态）
  - 现结客户订单支付发货 → 不生成应收
  - 运营配置客户账期成功；老板/客服 403
- [x] 3.2 `e2e-tests/steps/accounts_receivable.js`（`accountsReceivable_` 前缀）：账期配置、下单发货、应收查询断言
- [x] 3.3 运行 `./init.sh e2e:run`：新增场景通过 + 既有回归（场景总数记录 verify.md）

## 4. 验证与同步

- [x] 4.1 `openspec validate story-ar-credit-customer`
- [x] 4.2 `./init.sh test:all`（Node 全绿；Python skip）
- [x] 4.3 勾选 tasks；verify.md
- [x] 4.4 Spec Sync（change 级）：accounts-receivable 主 spec + user-admin/frontend-ui 增量回流 `openspec/specs/`
- [x] 4.5 Archive + 更新 story-list.json
