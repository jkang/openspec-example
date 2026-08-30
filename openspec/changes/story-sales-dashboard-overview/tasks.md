# Tasks: story-sales-dashboard-overview

> 关联 proposal/specs/design：见 `openspec/changes/story-sales-dashboard-overview/`
> 需求侧业务面：story.md（已 HITL 确认）| 原型：`sales-dashboard.html`（已确认）

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：B 端老板/运营查看销售总览（登录 → 进入看板 → 4 指标 + 时间切换 + 趋势 + 优惠券效果）；权限门禁（客服/未登录被拒）。
- ① **smoke 主链路完整性**：`smoke.feature` 已覆盖 C 端交易主链路（注册→选购→结算→支付→我的订单），本 change 是 **B 端新视图**，不改变 C 端主链路 → smoke 无需改动，保持覆盖。
- ② **新增功能覆盖**：本 change 新增 `@e2e` 场景 =「近7日销售总览指标与订单一致」「切换今日维度刷新指标」「客服角色访问被拒绝」→ 需新增 feature 文件 `e2e-tests/features/sales_dashboard.feature` + 步骤文件 `e2e-tests/steps/sales_dashboard.js`。
- ③ **既有场景回归风险**：`requireAdmin` 门禁改造为白名单参数化（运营/老板）——既有 `user-admin` E2E（客服 403）必须保持通过，列为回归验证任务。
- **缺口落盘**：新增 feature/steps + 既有 E2E 全量回归（见任务 1.3、1.4）。

## 1. 后端：只读聚合与看板 API

- [x] 1.1 `order-management` service 新增只读聚合方法 `aggregateSales({ from, to, statuses, granularity })`：
  - 过滤 `status ∈ {PAID, SHIPPED, COMPLETED}` 且 `paidAt ∈ [from, to)`
  - 返回 `{ salesCents, orderCount, discountCents, couponOrderCount, trend: [{date, salesCents}] }`（trend 按日分桶）
  - 复用 `orderRepo.findAll()`（memory/file 双实现），不新增写路径
- [x] 1.2 `user-admin` 角色模型：`User.role` 合法值增加 `老板`；测试辅助 `POST /api/__test/user-role` 接受 `role=老板`
- [x] 1.3 `requireAdmin` 门禁改造为白名单参数化：`requireRole(...allowedRoles)`；用户管理接口用 `requireRole('运营')`（老板 403），看板接口用 `requireRole('运营','老板')`
- [x] 1.4 新增路由 `GET /api/admin/dashboard/sales`（requireRole 运营/老板）：解析 `dimension`（today/week/month，默认 week）→ 换算 from/to → 调 `aggregateSales` → 组装 `{ metrics: {sales, orders, avgOrder, discount}, coupon: {discountCents, couponOrders, ratio}, trend, range }`
- [x] 1.5 新增单元测试：聚合口径（CANCELLED/PENDING 不计入）、时间区间边界、维度换算、空区间零指标、coupon 占比计算
- [x] 1.6 新增 API 测试：老板 200 且用户管理 403、客服 403、未登录 403、运营 200

## 2. 前端：销售看板视图

- [x] 2.1 App.vue 新增「销售看板」视图（导航入口仅 运营/老板 角色可见；客服/客户不显示）
- [x] 2.2 视图实现（对齐原型 `sales-dashboard.html`）：4 指标卡 + 时间切换（今日/近7日/近30日）+ SVG 趋势图 + 优惠券效果区；slate 极简（无圆角/无阴影/无第三方图表库）
- [x] 2.3 时间切换联动：`dimension` 变化 → 重新请求 API → 刷新指标卡/趋势/优惠券区；默认近7日
- [x] 2.4 前端极简约束验证：浏览器检查 0 圆角 / 0 阴影 / 真实中文数据 / 无占位符

## 3. E2E 覆盖（新增 + 回归）

- [x] 3.1 新增 `e2e-tests/features/sales_dashboard.feature`：
  - @e2e 近7日销售总览指标与订单一致（动态构造订单数据 → 断言指标与明细一致）
  - @e2e 切换今日维度刷新指标（今日销售额 = 今日实付之和）
  - @e2e 客服角色访问看板被拒绝（403，无数据返回）
- [x] 3.2 新增 `e2e-tests/steps/sales_dashboard.js`（步骤命名空间化：`dashboard_` 前缀防 ambiguous）
- [x] 3.3 回归验证：既有 `user-admin` E2E（客服 403 用户管理）与 `smoke.feature` 主链路保持通过（requireAdmin 改造无回归）

## 4. 验证与同步

- [x] 4.1 运行 `./init.sh node:test`（单元 + API 测试全绿）
- [x] 4.2 运行 `./init.sh e2e:run`（全部 E2E 通过，场景数 ≥ 既有 26 + 新增）
- [x] 4.3 浏览器验证前端（Chrome DevTools）：看板渲染、时间切换联动、客服角色无入口
- [x] 4.4 在 `verify.md` 记录 Hard Gates（node test / e2e / 浏览器验证）PASS 证据
- [x] 4.5 Spec Sync（change 级）：`/opsx:sync` 将 delta specs 回流 `openspec/specs/`（sales-dashboard 新增、user-admin/order-management 增量追加）
