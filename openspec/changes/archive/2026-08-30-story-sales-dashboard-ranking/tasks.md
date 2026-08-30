# Tasks: story-sales-dashboard-ranking

> 关联 proposal/specs/design：见 `openspec/changes/story-sales-dashboard-ranking/`
> 依赖：story-sales-dashboard-overview（看板框架/权限/聚合服务已交付）

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：运营/老板查看销售看板排行区（商品 TOP10 + 分类 TOP10）；时间切换联动排行。
- ① **smoke 主链路完整性**：C 端交易主链路（smoke.feature）不受影响，无需改动。
- ② **新增功能覆盖**：新增 `@e2e` 场景 =「近7日商品 TOP10 按销售额降序」「切换今日维度排行联动刷新」→ 并入 `sales_dashboard.feature`（新增 ranking 场景）与 `sales_dashboard.js` 步骤。
- ③ **既有场景回归风险**：排行复用 overview 的聚合服务，需回归 sales_dashboard.feature 既有场景（指标与排行同源）。
- **缺口落盘**：见任务 3.1/3.2。

## 1. 后端：排行聚合与 API

- [x] 1.1 `order-management` 聚合方法扩展：`aggregateSales` 增加 `groupBy: 'product' | 'category'` 模式：
  - product：按 `productId` 聚合 `priceCents × quantity` 汇总 + 销量（订单快照价，含软删除商品）
  - category：按商品 `categoryId` 聚合（null → 未分类），含销售额/订单数/占比
- [x] 1.2 新增路由 `GET /api/admin/dashboard/ranking`（requireRole 运营/老板，同看板门禁）：解析 dimension → 调聚合 → 返回 `{ productRanking: [...10], categoryRanking: [...] }`
- [x] 1.3 单元测试：快照价聚合、软删除商品计入、未分类归入、占比合计 100%（四舍五入容差）、CANCELLED 不计入

## 2. 前端：排行区块

- [x] 2.1 销售看板视图追加「商品销售 TOP10」区块（商品/销量/销售额，按销售额降序）
- [x] 2.2 追加「分类销售排行」区块（分类/销售额/占比/订单数，含未分类行）
- [x] 2.3 时间切换联动：dimension 变化 → 重新请求 ranking → 刷新两个排行区块
- [x] 2.4 极简约束验证：0 圆角 / 0 阴影 / 真实中文数据 / 无占位符（浏览器验证见任务 4.3）

## 3. E2E 覆盖（新增 + 回归）

- [x] 3.1 `sales_dashboard.feature` 追加场景：
  - @e2e 近7日商品 TOP10 按销售额降序且与订单明细一致（含软删除商品历史订单）
  - @e2e 切换今日维度排行联动刷新（与今日总览口径一致）
- [x] 3.2 `sales_dashboard.js` 追加 `dashboard_ranking_` 前缀步骤（防 ambiguous）
- [x] 3.3 回归：sales_dashboard.feature 既有场景（总览）保持通过

## 4. 验证与同步

- [x] 4.1 运行 `./init.sh node:test`（单元 + API 全绿：190 通过）
- [x] 4.2 运行 `./init.sh e2e:run`（全部通过：30 场景 / 179 步骤，较 overview 28 场景 +2，无回归）
- [x] 4.3 浏览器验证：排行区块渲染（商品 TOP10 含软删除商品、分类占比合计 100%）、时间切换联动（今日标题+数据刷新）、客服/客户无看板入口且 API 403
- [x] 4.4 `verify.md` 记录 Hard Gates PASS 证据
- [x] 4.5 Spec Sync（change 级）：`/opsx:sync` 回流 `sales-dashboard` delta 到主 specs（`openspec/specs/sales-dashboard/spec.md` 以 ADDED 形式追加 3 个排行 Requirement；`openspec validate --specs` 15/15 通过）
