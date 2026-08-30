## Gates
- Schema validate: PASS（openspec validate）
- Node test: PASS（node:test（单元 + API））
- Python test: PASS（本 change 仅 Node.js 变更，Python 后端无改动，显式跳过）
- E2E cucumber: PASS（e2e:run（全部 Cucumber））
- Frontend build: PASS（前端浏览器验证（极简约束））

# Verify: story-sales-dashboard-overview

> 实施验证报告（apply 过程中实时记录）| B 端销售总览看板（P0）

## E2E 门禁

- 场景数：**28 scenarios / 169 steps**（`./init.sh e2e:run` 输出；25 既有 e2e 场景回归 + 3 新增 sales_dashboard）
- sales_dashboard.feature 覆盖：✅ 近7日指标与订单一致 / 切换今日维度刷新 / 客服 403 无数据（`e2e-tests/features/sales_dashboard.feature`）
- 既有回归无破坏：`user-admin`（客服 403 用户管理）、`smoke` 主链路、`account_*` 会话/登录/注册全通过（requireRole 白名单改造无回归）

## 验证矩阵

| 任务 | 验证命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| 规划制品校验 | `openspec validate story-sales-dashboard-overview` | ✅ PASS | Change is valid |
| 1.1 只读聚合 aggregateSales | `npm test`（`__tests__/salesDashboard.spec.js` @unit） | ✅ PASS | 口径（CANCELLED/PENDING 不计入）、[from,to) 边界、空区间零指标、按日分桶、coupon 占比、序列合计=总额 |
| 1.2~1.3 角色模型 + requireRole | `npm test`（全量） | ✅ PASS | `__test/user-role` 接受 老板；`requireRole('运营')` 用户管理（老板 403）、`requireRole('运营','老板')` 看板 |
| 1.4~1.6 看板路由 + API 测试 | `npm test`（`__tests__/salesDashboard.spec.js` @api） | ✅ PASS | 运营 200 指标/趋势/优惠券；老板 200 且用户管理 403；客服 403 无数据；未登录 403；空区间 200 零指标；维度换算（today=1 桶/week=7/month=30，默认 week） |
| 2.1~2.3 前端看板视图 | `npm run build` + 浏览器 | ✅ PASS | vite build ✓；4 指标卡 + 时间切换 + SVG 趋势 + 优惠券效果；dimension 联动刷新；默认近7日 |
| 2.4 前端极简约束 | Chrome DevTools 计算样式 | ✅ PASS | roundedViolations=0、shadowViolations=0、无占位符/emoji、无第三方图表库（SVG polyline 手写） |
| 3.1~3.3 E2E 新增+回归 | `./init.sh e2e:run` | ✅ PASS | 28 scenarios / 169 steps 全通过（含 sales_dashboard 3 场景） |
| 4.1 Node 全量 | `./init.sh node:test` | ✅ PASS | 179 pass / 0 fail |
| 4.2 E2E 全量 | `./init.sh e2e:run` | ✅ PASS | 28 scenarios / 169 steps |
| 4.3 浏览器验证 | Chrome DevTools 手测 | ✅ PASS | 运营看板 ¥416.10/3单/¥138.70/¥39.90 与订单明细一致；今日切换标签 1 个；客服侧边栏无「销售看板」；老板侧边栏有「销售看板」无「用户管理」 |
| 4.4 verify.md | — | ✅ PASS | 本文件实时记录 |
| 4.5 Spec Sync | `openspec sync`（change 级） | ✅ PASS | delta specs 回流 `openspec/specs/`（sales-dashboard 新增 / user-admin·order-management 增量追加） |

## 人工验收

- 浏览器（Chrome DevTools）以 运营/老板/客服 三角色验收：见 4.3 证据；截图 `sales-dashboard-boss.png`（老板视角看板）。
- 时间切换联动：近7日（默认）↔ 今日 ↔ 近30日，指标卡/趋势图/优惠券效果区全部随 dimension 刷新，无第三方图表库。

## 实施中发现并处理的问题

- **Order 模型缺 `paidAt` 字段**：spec/design 依赖支付时间做销售时间归属（R-DASH-005），但既有 Order 类型与 `PaymentService.pay()` 均未记录支付时间。已补：`types.js` 增 `paidAt` JSDoc，`pay()` 在 PAID 时写入 `paidAt=new Date().toISOString()`；无 `paidAt` 的订单不参与聚合（无时间归属）。
- **`requireAdmin` 改造消息文案**：`FORBIDDEN` 错误消息从「仅运营角色可访问用户管理」改为通用「无权限访问该资源」（requireRole 现为白名单参数化，用户管理/看板共用）；既有断言仅校验 `code=FORBIDDEN`，无回归。
- **前端 fetch 裸传 headers 对象**：`fetchSalesDashboard` 将 `authHeaders()` 直接作为 init 参数，`Authorization` 被 fetch 当作未知选项忽略 → 403。已修为 `{ headers: authHeaders() }`（对齐 `fetchAdminUsers` 等既有模式）。
- **E2E 步骤含 `/` 未匹配**：Cucumber Expression 将 `/` 视为保留字符，`Given 系统存在混合销售订单数据（已支付/待支付/已取消）` 匹配失败（undefined）。已改步骤文本避免斜杠（`已支付、待支付与已取消`）。
- **今日切换断言竞态**：标题随 `currentRangeLabel` 同步更新但趋势数据异步刷新，断言日期标签数需 `waitForFunction` 等待（今日=1 个标签）。
- **跨测试状态污染**：API 测试共享 server 时前序测试核销优惠券/订单落入近7日区间导致断言失败；改为每个 `it` 独立 server 实例（`startServer()` + try/finally close），完全隔离。
- **时区口径**：趋势按本地日分桶（与 API 维度换算一致）；单元测试用本地时间构造边界，跨时区确定 7/30 桶数。
