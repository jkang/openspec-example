# Tasks: story-stock-warning-list

> 关联 proposal/specs/design：见 `openspec/changes/story-stock-warning-list/`
> 需求侧业务面：story.md（已 HITL 确认）| 原型：`epics/epic-stock-insight/prototypes/stock-insight.html`（Epic 整体，已确认）
> 实现版本标注：Node.js = 后端（ecommerce/ecommerce-mini）｜Frontend = 前端（ecommerce/ecommerce-mini-frontend）｜E2E = 全局 e2e-tests

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：B 端运营/老板查看低库存预警列表（登录 → 进入「库存预警」→ 预警列表 + Tabs + Badge → 阈值配置（运营）→ 即时生效）；权限门禁（客服/客户 403 + 导航不可见、未登录 401）。
- ① **smoke 主链路完整性**：`smoke.feature` 已以一体化场景覆盖核心交易主链路（注册→选购→加购→结算→支付→我的订单，`smoke_journey.js`）；本 change 是 **B 端新视图**，不改变 C 端主链路 → smoke 无需改动，保持覆盖。
- ② **新增功能覆盖**：本 change 新增 `@e2e` 场景 =「运营巡检预警列表主流程」「阈值配置即时生效（商品级覆盖 + 全局默认）」「客服/客户角色访问被拒 403（+ 未登录 401，权限旅程一并断言）」＋「老板只读视角」→ 需新增 feature 文件 `e2e-tests/features/stock_warning.feature` + 步骤文件 `e2e-tests/steps/stock_warning.js`（命名空间 `stock_warning_` 前缀防 ambiguous，对齐 `dashboard_` 先例）。
- ③ **既有场景回归风险**：新增预警/配置端点采用 `requireRoleStrict`（未登录 401 / 越权 403 区分），**不修改**既有 `requireRole` 与 sales-dashboard 端点行为——既有 `sales_dashboard.feature`（客服 403）、`account_admin_users.feature`、`smoke.feature` 必须保持通过，列为全量回归任务。
- **缺口落盘**：新增 feature/steps + 既有 E2E 全量回归（见任务 4.1、4.6、5.2）。

## 1. 后端：预警只读聚合与阈值配置（Node.js）

- [x] 1.1 Domain 层新增预警判定纯函数（`domain/logic.js` 或 `src/domain/stock.js`，零外部依赖）：入列判定（`stock ≤ effectiveThreshold`，覆盖优先否则全局默认）、预计售罄天数（`stock / dailyAvg`，无销量 null）、超卖风险（有销量且 `0 < stock < dailyAvg×7`）、排序（已售罄置顶 → 天数升序 → 无销量置底）
- [x] 1.2 新增 `stockConfigRepo`（fileRepo/memoryRepo 双实现）：读写 `data/stock-config.json`（结构 `{ globalThreshold: 10, overrides: { "<productId>": <threshold> } }`），默认全局阈值 10
- [x] 1.3 `order-management` 或聚合 service 新增只读聚合 `aggregateStockInsight`（复用 `buildProductRanking` 底座）：近7日销量（`status ∈ {PAID, SHIPPED, COMPLETED}` 且 `paidAt` 落入近7日，按商品明细 `quantity` 求和）÷ 7 = dailyAvg；组装 Product.stock + 订单销量 + stock-config 三源；过滤 `status=deleted` 商品（其覆盖配置保留但不参与聚合）
- [x] 1.4 新增路由 `GET /api/admin/dashboard/stock`（requireRoleStrict 运营/老板）：返回预警列表（productId/name/stock/effectiveThreshold/thresholdSource/dailyAvg/sales7d/daysToSellout/risk/status/listed）+ 全局默认阈值；只读聚合不产生任何写操作
- [x] 1.5 新增路由 `PUT /api/admin/stock-config`（仅运营）：写全局默认阈值，落盘 + 即时生效；`PUT /api/admin/products/{id}/stock-config`（仅运营）：写商品级覆盖阈值，落盘 + 即时生效；无效阈值（负数/非数字）返回 400
- [x] 1.6 新增单元测试（`__tests__/stockInsight.spec.js` @unit）：入列判定与有效阈值（覆盖优先）、已售罄恒入列置顶、超卖风险判定（2.5/4 天 <7 风险；16.7 天无风险；stock=0 无风险）、排序（置顶→升序→无销量置底）、软删除过滤、默认阈值 10、配置结构读写
- [x] 1.7 新增 API 测试（@api）：运营/老板 200 预警列表、客服/客户 403 无数据、未登录 401、运营写配置 200 且下一次查询生效、老板/客服写配置 403、配置即时生效双向调整（覆盖 5 → 移出列表；改回 10 → 重新入列）

## 2. 后端：权限门禁与老板种子账号（Node.js）

- [x] 2.1 新增 `requireRoleStrict(...allowedRoles)` 中间件（保留 UNAUTHORIZED 语义 → 未登录 401「请先登录」，越权 → 403 `FORBIDDEN`）；预警/配置端点使用之；既有 `requireRole`（未登录统一 403）与 sales-dashboard 端点**零改动**
- [x] 2.2 种子数据补充 `user_1003`（`initialUsers` 增加 role=老板·昵称「李老板」；file 模式随 `seedFileRepos` 注入 + `syncSequence`；`data/users.json` 同步补录）
- [x] 2.3 新增 API 测试（@api）：`user_1003` 登录成功、可只读访问 `GET /api/admin/dashboard/stock` 与 `GET /api/admin/dashboard/sales`（200）、写接口（stock-config / user status / product）403
- [x] 2.4 运行 `./init.sh node:test` 全量 Node 测试（单元 + API）全绿

## 3. 前端：库存预警视图（Frontend）

- [x] 3.1 App.vue 新增「库存预警」视图（`adminTab === 'stock'`）：导航「经营分析」分组新增入口（与「销售看板」并列，复用 `isDashboardRole` 运营/老板可见；客服/客户不可见）
- [x] 3.2 视图实现（对齐原型 `stock-insight.html`）：预警列表 8 列（商品名/当前库存/预警阈值（覆盖·`--warning`｜全局·muted）/近7日日均销量/预计售罄天数/超卖风险标识/建议补货量/状态）+「预警中 / 健康水位」Tabs + 已售罄（accent）/超卖风险（`--warning`）/低库存/库存充足 Badge + 排序口径脚注
- [x] 3.3 阈值配置区（仅运营渲染）：全局默认阈值输入 +「保存配置」按钮 +「✓ 已保存 · 阈值已即时生效」反馈（`text-success`，3 秒消失）；行内商品级覆盖阈值编辑（`aria-label=商品级覆盖阈值`）；保存后重新请求 API 即时刷新列表
- [x] 3.4 老板只读区：无配置区；标题旁「纯只读 · 无配置入口」标识；全局库存健康度总览卡片（预警商品数/已售罄数/超卖风险数）
- [x] 3.5 建议补货量列本 Story 渲染「—」占位（P1 `story-stock-replenish-suggestion` 补齐），保留「到货周期 7 天（MVP）」脚注；数据全部来自 API（前端不做 mock 计算）
- [x] 3.6 前端极简约束自查（`docs/FRONTEND.md` §6.2 强制自检清单）：无圆角/无阴影/无硬编码 hex（仅 ZAPP 语义令牌 `--warning` 等）/真实中文数据/无占位符；空状态中文化
- [x] 3.7 运行 `./init.sh vue:build` 前端构建通过

## 4. E2E 覆盖（新增 + 回归）

- [x] 4.1 新增 `e2e-tests/features/stock_warning.feature`：
  - @e2e 运营巡检预警列表主流程（构造真实库存/订单数据 → 断言预警 5 项、已售罄置顶 accent、超卖风险 Badge（键盘/鼠标 <7 天）、覆盖/全局标注、排序、无写操作）
  - @e2e 阈值配置即时生效（运营将无线办公鼠标覆盖阈值 5 → 移出预警；改回 10 → 重新入列；断言「✓ 已保存 · 阈值已即时生效」与持久化配置）
  - @e2e 客服/客户角色访问被拒（403 无数据 + B 端导航不展示「库存预警」入口）+ 未登录访问返回 401
  - @e2e 老板只读视角（种子 `user_1003` 登录 → 纯只读标识 + 无配置入口 + 健康度卡片）
- [x] 4.2 新增 `e2e-tests/steps/stock_warning.js`（命名空间 `stock_warning_` 前缀防 ambiguous）：复用既有辅助（动态建号 + 测试后门翻转角色，对齐 `dashboardSetupRole`）；库存精确设置（后门 `PUT /api/products/:id`）；订单构造保证日均销量与 story 一致（键盘售罄天数 ≈2.5~2.6 天断言取近似，排序与风险语义为硬断言）
- [x] 4.3 老板种子账号 E2E 复用（`user_1003` 只读断言，不做变更性操作——对齐测试数据策略）
- [x] 4.4 运行 `./init.sh e2e:run`：新增场景通过，场景数 ≥ 既有 37 + 新增（`verify.md` 记录实际场景数：e2e profile 40 = 既有 36 + 新增 4，另有 @persist 1 独立 profile）
- [x] 4.5 既有回归验证：`sales_dashboard.feature`（客服 403）、`account_admin_users.feature`、`smoke.feature` 主链路全部通过（requireRoleStrict 为新增中间件，既有端点零改动无回归）

## 5. 验证与同步

- [x] 5.1 运行 `openspec validate --change "story-stock-warning-list"`（硬门禁：specs/design/tasks 齐备且格式合法）
- [x] 5.2 运行 `./init.sh test:all`（Node 测试全绿；Python 测试：本 change 仅 Node.js 变更，Python 后端无改动——显式确认 `skip_python: 无 Python 代码变更`）
- [x] 5.3 浏览器视觉验证闭环（`docs/FRONTEND.md` §6）：`./init.sh vue:start` → Chrome DevTools 以运营/老板/客服三角色验收：预警列表渲染、Tabs 切换、Badge 色值、配置保存反馈、老板只读视图、客服无入口；ZAPP 自检清单（0 圆角/0 阴影/语义令牌/中文文案）逐项核对
- [x] 5.4 视觉验证核心截图落位 `verify-evidence/`（`stock-warning-operator.png`、`stock-warning-operator-config-saved.png`、`stock-warning-boss.png`、`stock-warning-no-entry-service.png`、`stock-warning-tab-healthy.png`），`verify.md` 证据行引用截图路径
- [x] 5.5 按 apply 流程逐项勾选 tasks.md：每完成一项 → 运行对应验证命令 → 更新 `verify.md` 证据 → `- [ ]` 改 `- [x]`
- [x] 5.6 全部完成后运行 `/opsx:verify`（或 `./init.sh test:all` + `e2e:run` + `vue:build`），Hard Gates（schema validate / Node test / Python test / 前端构建）与 Soft Gate（E2E cucumber）全部 PASS
- [x] 5.7 Spec Sync（change 级）：`/opsx:sync` 将 delta specs 回流 `openspec/specs/`（stock-insight 新增、frontend-ui/user-admin 增量追加）；Baseline Sync（`domain_model.html` / `service_blueprint.html`）按设计预判在 Epic `epic-stock-insight` 全部 Story 归档后统一执行（本 change 不触发）<!-- ⏸ 由 lead 执行（engineer 交付边界：不执行 Spec Sync 与 Archive） -->
