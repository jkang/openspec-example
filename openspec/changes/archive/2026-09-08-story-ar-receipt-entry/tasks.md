# Tasks: story-ar-receipt-entry

> 关联 proposal/specs/design：见 `openspec/changes/story-ar-receipt-entry/`
> 需求侧业务面：story.md（R-AR-101~106，已 HITL 确认）| 原型：`accounts-receivable.html`（已确认）
> 依赖底座（Story 1 已归档）：User.creditDays / ReceivableRepo + ReceiptRepo（file/memory）/ onOrderShipped

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：运营登记回款（部分/结清/逾期查看）；老板只读；客服无权。
- ① smoke 主链路：本 change 纯应收管理支流（B 端新增），不影响 C 端主链路。
- ② 新增覆盖：向 `accounts_receivable.feature` **追加 receipt-entry 场景**（部分+结清 / 逾期过滤 / 金额校验 / 权限）。
- ③ 回归：accountsReceivable.spec 扩展（服务层 recordReceipt）+ 全量回归。
- **缺口落盘**：story 旅程 1/2 场景逐步落 E2E；金额校验/权限以 @api。

## 1. 后端：应收列表 + 回款登记（Node.js）

- [x] 1.1 `accountsReceivable.js`：`listAll(receivables)`（含客户昵称与派生视图，状态过滤）；`recordReceipt(receivableId, amountCents, operator)`（校验应收存在/金额>0/≤剩余 → Receipt + receivedCents 累加 → 返回视图）
- [x] 1.2 `server.js`：`GET /api/admin/receivables`（运营/老板白名单，?status 过滤）；`POST /api/admin/receivables/:id/receipt`（仅运营）
- [x] 1.3 错误码：`RECEIVABLE_NOT_FOUND` / `INVALID_RECEIPT_AMOUNT` / `RECEIVABLE_SETTLED`
- [x] 1.4 单元测试（accountsReceivable.spec.js @unit 扩展）：recordReceipt 部分/结清/超剩/已结清拒绝
- [x] 1.5 API 测试（@api）：GET 列表（状态过滤/逾期推导）；POST 登记（部分+结清）；金额校验；权限（客服/老板/未登录）
- [x] 1.6 `./init.sh node:test` 全量 Node 测试全绿

## 2. 前端：应收账款视图（Frontend）

- [x] 2.1 B 端导航「应收账款」入口（运营/老板可见）；视图：应收单表格（客户/订单/应收/已回/剩余/到期/状态）+ 状态过滤 Tabs
- [x] 2.2 运营「登记回款」抽屉（金额 ≤ 剩余，部分多次）→ 入账后刷新；老板视图无登记按钮（只读提示）
- [x] 2.3 状态徽标（逾期 accent / 部分回款 warning / 结清 success / 未回款 muted）；ZAPP 令牌
- [x] 2.4 `vue:build` 通过

## 3. E2E（向 accounts_receivable.feature 追加 receipt-entry 场景）

- [x] 3.1 追加 @e2e 场景：部分回款 + 结清（¥356 → 已回 200/剩余 156 → 再 156 → 结清）；逾期应收过滤；金额校验；登记权限
- [x] 3.2 `accounts_receivable.js` steps 追加（receipt 登记/查询断言）
- [x] 3.3 `./init.sh e2e:run`：新增场景通过 + 全量回归（场景总数记录 verify.md）

## 4. 验证与同步

- [x] 4.1 `openspec validate story-ar-receipt-entry`
- [x] 4.2 `./init.sh test:all`（Node 全绿；Python skip）
- [x] 4.3 勾选 tasks；verify.md
- [x] 4.4 Spec Sync（change 级）：accounts-receivable + frontend-ui 增量回流 `openspec/specs/`
- [x] 4.5 Archive + 更新 story-list.json
