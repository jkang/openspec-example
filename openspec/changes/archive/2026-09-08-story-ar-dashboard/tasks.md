# Tasks: story-ar-dashboard

> 关联 proposal/specs/design：见 `openspec/changes/story-ar-dashboard/`
> 需求侧业务面：story.md（R-AR-201~205，已 HITL 确认）| 原型：`accounts-receivable.html`（已确认）
> 依赖底座（Story 1/2 已归档）：Receivable/Receipt 数据 + 应收单 API + 回款登记

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：老板/运营应收只读看板（指标 + 客户集中度）；客服无权。
- ① smoke 主链路：纯只读聚合，不影响交易链路。
- ② 新增覆盖：向 `accounts_receivable.feature` 追加 dashboard 场景（指标同源 / 登记联动 / 权限）。
- ③ 回归：accountsReceivable.spec 扩展（summary 单测 + API）。
- **缺口落盘**：story 旅程 1/2 场景逐步落 E2E；逾期口径在 dashboard 场景明确（种子含逾期应收）。

## 1. 后端：应收只读聚合（Node.js）

- [x] 1.1 `accountsReceivable.js`：`summary()`——总应收/已回/未回/逾期 + 客户集中度（复用 toView 派生；纯只读）
- [x] 1.2 `server.js`：`GET /api/admin/receivables/summary`（运营/老板白名单）
- [x] 1.3 单元测试（summary：含逾期/部分回款/多客户聚合）
- [x] 1.4 API 测试（@api）：老板/运营 200 且数值与列表逐笔一致；登记后联动；客服/客户/未登录 403/401
- [x] 1.5 `./init.sh node:test` 全绿

## 2. 前端：应收看板（Frontend）

- [x] 2.1 应收账款 tab 增加看板区（运营/老板可见）：4 指标卡（应收总额/已回款/未回余额/逾期金额，颜色区分）+ 客户欠款集中度列表
- [x] 2.2 客服无权限兜底；数据来自 summary API（fetchReceivableSummary）
- [x] 2.3 ZAPP 令牌自查 + `vue:build` 通过

## 3. E2E（向 accounts_receivable.feature 追加 dashboard 场景）

- [x] 3.1 追加 @e2e/@api 场景：老板看板指标与列表同源 / 登记联动 / 权限门禁
- [x] 3.2 steps 追加（summary 断言）
- [x] 3.3 `./init.sh e2e:run`：新增场景通过 + 全量回归（总数记录 verify.md）

## 4. 验证与同步

- [x] 4.1 `openspec validate story-ar-dashboard`
- [x] 4.2 `./init.sh test:all`
- [x] 4.3 勾选 tasks；verify.md
- [x] 4.4 Spec Sync（change 级）
- [x] 4.5 Archive + story-list done → Epic 收尾（归档 + Baseline Sync + Roadmap + 看板 + 提交）
