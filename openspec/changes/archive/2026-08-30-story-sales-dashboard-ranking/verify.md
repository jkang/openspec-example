## Gates
- Schema validate: PASS（openspec validate）
- Node test: PASS（node:test（单元 + API））
- Python test: PASS（本 change 仅 Node.js 变更，Python 后端无改动，显式跳过）
- E2E cucumber: PASS（e2e:run（全部 Cucumber））
- Frontend build: PASS（前端浏览器验证（极简约束））

# Verify: story-sales-dashboard-ranking

> 实施验证报告（apply 过程中实时记录）| B 端商品/分类销售排行（P1）| 依赖：story-sales-dashboard-overview（已交付）

## E2E 门禁

- 场景数：**30 scenarios / 179 steps**（`./init.sh e2e:run` 输出；28 既有 e2e 场景回归 + 2 新增 ranking 场景）
- sales_dashboard.feature 覆盖：✅ 近7日总览指标与订单一致 / 切换今日刷新指标 / 客服 403 无数据（回归）+ **近7日商品 TOP10 按销售额降序且与订单明细一致（含软删除商品）** / **切换今日排行联动刷新**（新增）
- 既有回归无破坏：`smoke` 主链路、`user-admin`、`account_*`、`mvp_trading`、`order_lifecycle`、`persistence` 全通过

## 验证矩阵

| 任务 | 验证命令 | 结果 | 证据 |
| --- | --- | --- | --- |
| 规划制品校验 | `openspec validate story-sales-dashboard-ranking` | ✅ PASS | Change is valid |
| 1.1 aggregateSales groupBy 扩展 | `npm test`（`__tests__/salesDashboard.spec.js` 排行 @unit） | ✅ PASS | 快照价聚合（priceCents×quantity 非实付）、软删除商品计入、CANCELLED/PENDING 不计入、未分类归「未分类」行、占比 1 位小数合计 100%（±0.1）、一单多分类订单数去重、groupBy 与总览同源 |
| 1.2 排行路由 | `npm test`（排行 @api） | ✅ PASS | 运营 200 返回 productRanking/categoryRanking；默认 week；显式 from/to 与总览同一 resolveDashboardRange（range.from/to 一致）；老板 200；客服 403 无数据；未登录 403 |
| 2.1~2.2 前端排行区块 | `npm run build` + 浏览器 | ✅ PASS | vite build ✓；「商品销售 TOP10（商品/销量/销售额）」+「分类销售排行（分类/销售额/占比/订单数，含未分类行）」表格 |
| 2.3 时间切换联动 | 浏览器点击「今日」 | ✅ PASS | 标题「销售趋势（今日）/商品销售 TOP10（今日）/分类销售排行（今日）」同步刷新，表格数据按今日区间重新聚合 |
| 2.4 前端极简约束 | Chrome DevTools 计算样式 | ✅ PASS | roundedCount=0、shadowCount=0、无占位符（foo/bar/test）、真实中文数据、无第三方图表库（纯表格） |
| 3.1~3.2 E2E 新增 | `./init.sh e2e:run` | ✅ PASS | 2 新场景（近7日商品 TOP10 与明细一致含软删除 / 切换今日联动）步骤前缀 `dashboard_ranking_` 防 ambiguous |
| 3.3 E2E 回归 | `./init.sh e2e:run` | ✅ PASS | 28 既有场景全通过（含 sales_dashboard 3 场景） |
| 4.1 Node 全量 | `./init.sh node:test` | ✅ PASS | 190 pass / 0 fail |
| 4.2 E2E 全量 | `./init.sh e2e:run` | ✅ PASS | 30 scenarios / 179 steps |
| 4.3 浏览器验证 | Chrome DevTools 手测 | ✅ PASS | 商品 TOP10：高清显示器 ¥1,299.00 > 极简机械键盘 ¥299.00 > 无线办公鼠标 ¥89.00 > 铝合金笔记本支架 ¥68.00（软删除商品在列）；分类：显示设备 74% / 键鼠外设 22.1% / 桌面收纳 3.9%（合计 100%）；客户角色侧边栏无「销售看板」且 ranking API 403 |
| 4.4 verify.md | — | ✅ PASS | 本文件实时记录 |
| 4.5 Spec Sync | `openspec validate --specs` | ✅ PASS | 排行 delta 回流 `openspec/specs/sales-dashboard/spec.md`（ADDED：商品销售 TOP10 排行 / 分类销售排行 / 排行时间维度联动 3 个 Requirement）；order-management 主 spec 已含 ③ 商品/分类聚合描述，无需改动 |

## 人工验收

- 浏览器（Chrome DevTools）以 运营/客户 角色验收：
  - 运营进入销售看板 → 近7日排行区渲染商品 TOP10（按销售额降序）+ 分类排行（占比合计 100%，含未分类行逻辑由 E2E 数据覆盖）。
  - 切换「今日」→ 三个区块标题与数据联动刷新（今日 4 笔成交均列示）。
  - 客户角色登录 → 运营后台侧边栏无「销售看板」入口；直接请求 `GET /api/admin/dashboard/ranking` 返回 403。
  - 截图 `browser-verify-ranking.png`（排行区块近7日视图）。
- 快照价验证：商品 1 订单命中 PERCENT9 券实付 ¥269.10，排行销售额显示 ¥299.00（订单快照价，非实付）——与 R-RANK-001「用订单快照价，非当前价」一致。

## 实施中发现并处理的问题

- **E2E 服务器种子商品 4 非未分类**：单测种子中商品 4 为 `categoryId: null`，但 server 种子中商品 4（桌面收纳架）归属 `cat-desk`。E2E 数据步骤已通过 `PUT /api/products/4`（`categoryId: null`）显式构造未分类商品，验证 R-RANK-005 未分类聚合行。
- **排行与总览 `to=now` 毫秒竞态**：场景「切换今日排行联动刷新」断言 `ranking.range.to === sales.range.to`，两次请求间 `now` 可能前进 1ms。已改为：dimension 与 `from` 精确相等、`to` 差值 ≤ 2000ms（同一 resolveDashboardRange 换算语义）。
- **UI 排行数据异步刷新竞态**：切换维度后标题（`currentRangeLabel`）立即更新，但表格数据经 fetch 异步到达；断言前先 `waitForFunction` 等待目标商品行出现，避免误判空表。
- **categoryRanking 不设 TOP10 截断**：占比合计须 100%，截断会破坏合计；当前分类数（4）远小于 10，返回全部分类，与 delta spec「分类销售排行」字面一致（proposal 中「分类 TOP10」语义由全量返回覆盖）。
- **OrderService 构造注入 categoryRepo（可选参数）**：分类聚合需解析分类名（订单快照不含 categoryId），`OrderService` 构造函数新增可选第 5 参 `categoryRepo`；既有 4 处实例化中仅 server.js 与排行测试传入，`unit.spec.js` 不传（product 聚合不依赖 categoryRepo），零回归。
