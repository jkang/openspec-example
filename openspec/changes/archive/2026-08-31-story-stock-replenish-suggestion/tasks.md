# Tasks: story-stock-replenish-suggestion

> 关联 proposal/specs/design：见 `openspec/changes/story-stock-replenish-suggestion/`
> 需求侧业务面：story.md（R-STOCK-101~107 + E2E 旅程 1/2，已 HITL 确认）| 原型：`epics/epic-stock-insight/prototypes/stock-insight.html`（Epic 整体，已确认）
> 实现版本标注：Node.js = 后端（ecommerce/ecommerce-mini）｜Frontend = 前端（ecommerce/ecommerce-mini-frontend）｜E2E = 全局 e2e-tests
> 依赖底座（Story 1 已归档，**已完成部分不重复列**）：`requireRoleStrict` 门禁、stock-config 阈值配置、`StockInsightService` 三源聚合、预警列表前端视图

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：B 端运营/老板在既有「库存预警」视图查看补货建议（近7日日均销量 → 预计售罄天数 → 建议补货量列 + 口径脚注）；老板只读全局库存健康度总览（预警/已售罄/超卖风险三卡片）；老板无配置入口（写配置 403）。
- ① **smoke 主链路完整性**：`smoke.feature` 已以一体化场景覆盖核心交易主链路（注册→选购→加购→结算→支付→我的订单）；本 change 是**既有 B 端视图的增量扩展**（仅新增列渲染与响应字段），不改变 C 端主链路与既有预警行为 → smoke 无需改动，保持覆盖。
- ② **新增功能覆盖**：本 change 新增 `@e2e` 场景 =「运营补货建议公式一致（键盘 6/鼠标 6/收纳架 28/显示器 无需补货 + 日均/售罄天数显示）」「无销量商品处理（暂无销量 / — / 无需补货，仍按水位入列）」「老板健康度总览数值（保全版 4/1/2）」「老板写阈值配置被拒 403」→ **扩展既有 `e2e-tests/features/stock_warning.feature`**（同一「库存预警」视图、同一数据种子，复用 `stock_warning_` 命名空间与 `STOCK_BASELINE`/`SALES_QTY` 构造辅助），**不新建 feature/steps**（避免重复数据基建，design 决策 4）。
- ③ **既有场景回归风险**：`replenish`/`healthOverview` 为**新增字段**，既有断言不涉及；`dailyAvg` 舍入口径收窄（round3 → ceil0.1）使显示值变化（1.1→1.2、2.6→2.5），但既有 E2E 断言用区间（within 2.4~2.8）不受影响；`requireRoleStrict` 与阈值配置端点**零改动** → 既有 `stock_warning.feature` 4 场景 + `sales_dashboard.feature` + `smoke.feature` + `account_admin_users.feature` 必须保持通过，列为全量回归任务。
- **缺口落盘**：story.md 旅程 2 场景 2「老板写阈值配置被拒」在既有 feature 中无显式断言 → 新增场景补齐（API 403 + 前端无配置入口既有场景已覆盖）；story.md 旅程 1 场景 2「无销量处理」既有 feature 未覆盖 → 新增场景补齐。

## 1. 后端：补货建议计算与健康度总览（Node.js）

- [x] 1.1 Domain 层 `src/domain/stock.js` 新增纯函数 `suggestReplenish(stock, dailyAvg)`（零外部依赖）：`max(0, ⌈dailyAvg×7⌉ − stock)`；无销量（dailyAvg≤0）天然落 0（`⌈0×7⌉−stock ≤ 0`），不特判
- [x] 1.2 `StockInsightService.aggregate()` 数值口径统一：`dailyAvg = Math.ceil((sales7d/7) × 10) / 10`（向上取整到 0.1：8/7→1.2、2/7→0.3）；`daysToSellout`/`risk` 沿用既有 Domain 函数（口径随 dailyAvg 自然对齐：键盘 2.5 天 / 显示器 16.7 天）
- [x] 1.3 `aggregate()` 响应增量扩展：items 每项追加 `replenish`（`suggestReplenish(stock, dailyAvg)` 结果，整数件）；响应顶层追加 `healthOverview = { warningCount, soldOutCount, riskCount }`（对入列预警项统计，与列表同源同口径）；保持只读聚合无写操作
- [x] 1.4 新增单元测试（`__tests__/stockInsight.spec.js` @unit）：补货量公式逐项吻合（键盘 `⌈1.2×7⌉−3=6`、鼠标 `14−8=6`、收纳架 `28−0=28`、显示器 `⌈0.3×7⌉−5=0`）；无销量 replenish=0（dailyAvg=0）且 daysToSellout=null；已售罄 stock=0 → daysToSellout=0、replenish 按公式；healthOverview 统计（4 项预警含 1 售罄 2 风险 → 4/1/2）
- [x] 1.5 **同步更新既有断言（口径收窄回归）**：`__tests__/stockInsight.spec.js` 中 `dailyAvg ≈ 8/7`（1.143）→ `strictEqual 1.2`、`daysToSellout ≈ 2.625` → `strictEqual 2.5`；确认风险/排序断言结论不变（2.5/4 < 7 risk、16.7 无 risk、排序序不变）
- [x] 1.6 新增 API 测试（@api）：`GET /api/admin/dashboard/stock` 响应 items 含 `replenish`（无销量商品 = 0）且顶层含 `healthOverview`（数值与 items 统计一致）；老板写 `PUT /api/admin/stock-config` 与 `PUT /api/admin/products/{id}/stock-config` 返回 403 且配置文件无变更
- [x] 1.7 运行 `./init.sh node:test` 全量 Node 测试（单元 + API）全绿

## 2. 前端：补货建议列与健康度总览（Frontend）

- [x] 2.1 App.vue「建议补货量」列由「—」占位替换为真实计算值渲染（数据来自 API `replenish`，前端不做 mock 计算）：`stock=0` → `{{ replenish }} 件`（`text-accent`）；`replenish > 0` → `{{ replenish }} 件`（`text-primary`）；`replenish = 0` → 「无需补货」（`text-muted-foreground`，R-STOCK-106 铁律）
- [x] 2.2 列表标题口径说明更新为真实公式「超卖风险 = 预计售罄天数 &lt; 7 天 · 建议补货量 = max(0, ⌈日均销量×7⌉ − 当前库存)」（移除「待『补货建议』Story 补齐（P1）」占位文案）；表格底部脚注保留「到货周期固定 7 天（MVP）· 无销量商品不计算售罄天数」
- [x] 2.3 老板「全局库存健康度总览」卡片由前端 computed 统计替换为**消费 API `healthOverview`**（预警商品数 `warningCount` `text-primary` / 已售罄数 `soldOutCount` `text-accent` / 超卖风险数 `riskCount` `text-warning`，三卡片副文案与「全局库存健康度总览 · 只读」标题保留）；老板视图仍无配置入口（复用既有约束）
- [x] 2.4 前端极简约束自查（`docs/FRONTEND.md` §6.2 强制自检清单）：无圆角/无阴影/无硬编码 hex（仅 ZAPP 语义令牌）/真实中文数据（「无需补货」「暂无销量」「—」）/无占位符残留
- [x] 2.5 运行 `./init.sh vue:build` 前端构建通过

## 3. E2E 覆盖（扩展既有 feature + 回归）

- [x] 3.1 扩展 `e2e-tests/features/stock_warning.feature` 新增 4 个 @e2e 场景（复用 `stock_warning_` 命名空间与数据构造辅助，`Before` hook 每场景 reset 后端保证隔离）：
  - 运营补货建议主流程：键盘 1.2 件/日 + 2.5 天 + 6 件、鼠标 2.0/4/6、收纳架 4.0/0/28（accent）、显示器 0.3/16.7/「无需补货」（R-STOCK-106 铁律），全部建议补货量与公式逐一吻合（断言与订单明细一致）
  - 无销量商品处理：无订单商品 stock=5 仍按 `5 ≤ 10` 入列，日均销量「暂无销量」、售罄天数「—」、无超卖风险 Badge、建议补货量「无需补货」
  - 老板健康度总览：老板（user_1003 保全种子）进入库存预警 → 三卡片数值与 API `healthOverview` 一致（预警 4 / 已售罄 1 / 超卖风险 2）
  - 老板写阈值配置被拒：老板会话 `PUT /api/admin/stock-config` → 403 `FORBIDDEN`，配置文件无变更
- [x] 3.2 `e2e-tests/steps/stock_warning.js` 新增对应步骤（`stock_warning_` 前缀防 ambiguous）：复用 `STOCK_BASELINE`/`SALES_QTY` 与 `stockWarningSetupScenarioData`/`stockWarningSetupBossData`；无销量场景用后门设置无订单商品 stock=5；补货量断言用整数精确值（6/6/28/0），日均/天数列断言用 toFixed(1) 显示值（1.2/2.5、0.3/16.7）
- [x] 3.3 运行 `./init.sh e2e:run`：新增 4 场景通过，既有 `stock_warning.feature` 场景全部通过（场景总数记录于 `verify.md`）
- [x] 3.4 既有回归验证：`sales_dashboard.feature`（客服 403）、`account_admin_users.feature`、`smoke.feature` 主链路全部通过（本 change 仅新增字段 + dailyAvg 口径收窄，无端点行为变更）

## 4. 验证与同步

- [x] 4.1 运行 `openspec validate --change "story-stock-replenish-suggestion"`（硬门禁：specs/design/tasks 齐备且格式合法）
- [x] 4.2 运行 `./init.sh test:all`（Node 测试全绿；Python 测试：本 change 仅 Node.js 变更，Python 后端无改动——显式确认 `skip_python: 无 Python 代码变更`）
- [x] 4.3 浏览器视觉验证闭环（`docs/FRONTEND.md` §6）：`./init.sh vue:start` → Chrome DevTools 以运营/老板双角色验收：建议补货量列三分支渲染（primary 数量 / 「无需补货」/ accent 已售罄量）、日均销量与售罄天数单元格、老板健康度总览三卡片数值、口径说明与脚注；ZAPP 自检清单（0 圆角/0 阴影/语义令牌/中文文案）逐项核对
- [x] 4.4 视觉验证核心截图落位 `verify-evidence/`（`replenish-operator-list.png`、`replenish-no-sales.png`、`replenish-boss-overview.png`），`verify.md` 证据行引用截图路径
- [x] 4.5 按 apply 流程逐项勾选 tasks.md：每完成一项 → 运行对应验证命令 → 更新 `verify.md` 证据 → `- [ ]` 改 `- [x]`
- [x] 4.6 全部完成后运行 `/opsx:verify`（或 `./init.sh test:all` + `e2e:run` + `vue:build`），Hard Gates（schema validate / Node test / Python test / 前端构建）与 Soft Gate（E2E cucumber）全部 PASS
- [x] 4.7 Spec Sync（change 级）：`/opsx:sync` 将 delta specs 回流 `openspec/specs/`（stock-insight / frontend-ui 增量追加）；Baseline Sync（`domain_model.html` / `service_blueprint.html`）按设计双 Sync Assessment 预判在 Epic `epic-stock-insight` 全部 Story 归档后统一执行（本 change 不触发）<!-- ⏸ 由 lead 执行（engineer 交付边界：不执行 Spec Sync 与 Archive） -->
