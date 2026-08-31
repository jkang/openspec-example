# verify.md — story-stock-replenish-suggestion

> 实施证据单一文件（apply 门禁证据）；Hard Gates（schema validate / Node test / Python test / 前端构建）与 Soft Gate（E2E cucumber）全部记录于此。
> 生成人：engineer（sdd-team）| 变更目录：`openspec/changes/story-stock-replenish-suggestion/`

## Gate 结论总览

| Gate | 结论 | 摘要 |
| --- | --- | --- |
| Hard · openspec validate | ✅ PASS | 实施前预检 + 完成后复验均 PASS（4.1） |
| Hard · Node test | ✅ PASS | 225 tests / 0 fail（含新增 suggestReplenish @unit 1 + 聚合 4 + @api 2；既有断言口径收窄同步更新）（1.7/4.2） |
| Hard · Python test | ✅ PASS | 12 passed / 0 fail（`skip_python: 无 Python 代码变更`，显式确认）（4.2） |
| Hard · 前端构建 | ✅ PASS | `./init.sh vue:build` 通过（2.5/4.6） |
| Soft · E2E cucumber | ✅ PASS | `./init.sh e2e:run` → 44 scenarios / 260 steps 全 PASS（既有 40 + 新增 4；另有 @persist 场景走独立 profile）（3.3/4.6） |
| E2E 覆盖审查 | ✅ FULL | 新增功能 4 场景全覆盖（运营补货建议公式/无销量处理/老板健康度总览/老板写配置 403）+ 既有 stock_warning 4 场景 + smoke/sales_dashboard/account_admin_users 全量回归（见 tasks.md E2E 覆盖审查） |

## Gates

- Schema validate: PASS（openspec validate）
- Node test: PASS（node:test，225 tests / 0 fail）
- Python test: PASS（12 tests / 0 fail，无 Python 代码变更，回归确认）
- Frontend build: PASS（vue:build）
- E2E cucumber: PASS（44 scenarios / 260 steps 全 PASS）

---

## 1. 后端：补货建议计算与健康度总览（Node.js）

### 1.1 Domain 纯函数 `suggestReplenish` ✅
- `src/domain/stock.js` 新增 `suggestReplenish(stock, dailyAvg) = max(0, ⌈dailyAvg×7⌉ − stock)`（R-STOCK-104），零外部依赖；无销量 dailyAvg≤0 天然落 0 不特判。
- 证据：`stockInsight.spec.js`「建议补货量：max(0, ⌈dailyAvg×7⌉ − stock) 逐项吻合（R-STOCK-104）」7 断言全绿（键盘 6 / 鼠标 6 / 收纳架 28 / 显示器 0 / 无销量 0 / 售罄无销量 0 / 库存充足 0）。

### 1.2 数值口径统一（design 决策 1）✅
- `aggregate()`：`dailyAvg = Math.ceil((sales7d / 7) × 10) / 10`（向上取整到 0.1）；`daysToSellout`/`risk` 全部基于取整后 dailyAvg（复用既有 Domain 函数）；`daysToSellout` 响应保留 1 位小数（显示器 5/0.3 → 16.7）。
- 数值链自洽：键盘 1.2 → 2.5 天 → 补货 6；鼠标 2.0 → 4 天 → 6；收纳架 4.0 → 0 天 → 28；显示器 0.3 → 16.7 天 → 0。
- 证据：`stockInsight.spec.js`「补货量公式逐项吻合：键盘 6 / 鼠标 6 / 收纳架 28 / 显示器 0（R-STOCK-104 数值链）」。

### 1.3 响应增量扩展（replenish + healthOverview）✅
- items 每项追加 `replenish`（整数件）；顶层追加 `healthOverview = { warningCount, soldOutCount, riskCount }`（对入列预警项统计，与列表同源同口径）；只读聚合无写操作。
- 证据：@unit「healthOverview：对入列预警项统计 4/1/2」deepStrictEqual 断言 + 与列表同源一致性校验。

### 1.4 新增 @unit 测试 ✅
- 补货量公式逐项吻合（1.2/2.5/6、2.0/4/6、4.0/0/28、0.3/16.7/0）；无销量（dailyAvg=0、daysToSellout=null、replenish=0 且仍按 5≤10 入列）；已售罄（daysToSellout=0、replenish 按公式）；healthOverview 4/1/2。
- 证据：`stockInsight.spec.js` 新增 4 例 @unit。

### 1.5 既有断言同步更新（口径收窄回归）✅
- `dailyAvg ≈ 8/7`（1.143）→ `strictEqual 1.2`；`daysToSellout ≈ 2.625` → `strictEqual 2.5`；风险结论（2.5/4 < 7 risk、16.7 无 risk）与排序序（['4','1','2','3','5','6']）不变。

### 1.6 新增 @api 测试 ✅
- 「运营：响应 items 含 replenish（无销量=0）且顶层 healthOverview 与列表统计一致」：真实订单链路（购车→下单→支付）+ 库存后门回写基线，断言 replenish 6/6/28/0/0、dailyAvg 0.3、daysToSellout 16.7、healthOverview 5/1/2、请求前后库存快照不变（只读）。
- 「老板：只读访问 healthOverview（200）且写阈值配置被拒（403 FORBIDDEN，配置无变更）」：全局 + 商品级均 403，`globalThreshold` 仍 10、`overrides` 空。

### 1.7 Node 全量测试 ✅
- `./init.sh node:test` → **225 tests / 0 fail**（既有 218 + 新增 7：suggestReplenish 1 + 聚合 4 + @api 2）。

```
tests 225
pass 225
fail 0
```

---

## 2. 前端：补货建议列与健康度总览（Frontend）

### 2.1 建议补货量列三分支渲染 ✅
- `App.vue` 补货建议列由「—」占位替换为真实计算值：`stock=0` → `{{ replenish }} 件`（`text-accent`）；`replenish > 0` → `{{ replenish }} 件`（`text-primary`）；`replenish = 0` → 「无需补货」（`text-muted-foreground`，R-STOCK-106 铁律）。数据来自 API `replenish`，前端零 mock 计算。
- 证据：浏览器视觉验证 `verify-evidence/replenish-operator-list.png` / `replenish-no-sales.png`（4.4）。

### 2.2 口径说明与脚注 ✅
- 标题口径说明更新为「超卖风险 = 预计售罄天数 &lt; 7 天 · 建议补货量 = max(0, ⌈日均销量×7⌉ − 当前库存)」（移除「待『补货建议』Story 补齐（P1）」占位文案）；表格底部脚注保留「到货周期固定 7 天（MVP）· 无销量商品不计算售罄天数」。

### 2.3 老板健康度总览消费 API ✅
- `statWarning/statSoldOut/statRisk` 三个 computed 由前端统计替换为消费 `stockInsightData.healthOverview`（`warningCount`/`soldOutCount`/`riskCount`）；三卡片副文案与「全局库存健康度总览 · 只读」标题保留；老板视图无配置入口（复用既有约束）。
- 证据：浏览器视觉验证 `verify-evidence/replenish-boss-overview.png`（4.4）+ E2E 场景「老板查看全局库存健康度总览」。

### 2.4 极简约束自查 ✅
- `docs/FRONTEND.md` §6.2 强制自检清单：仅 `rounded-none`、无 `box-shadow`/`linear-gradient`、无硬编码 hex（全 ZAPP 语义令牌）、真实中文数据（「无需补货」「暂无销量」「—」）、无占位符残留。DOM 级脚本断言见 4.3。

### 2.5 前端构建 ✅
- `./init.sh vue:build` → PASS（`vite v8.2.1 … ✓ built in 489ms`）。

---

## 3. E2E 覆盖（扩展既有 feature + 回归）

### 3.1 stock_warning.feature 扩展（4 新增 @e2e 场景）✅
- 扩展既有 `stock_warning.feature`（design 决策 4：不新建 feature），共 8 场景（既有 4 + 新增 4）：
  1. **运营补货建议主流程**：键盘 1.2 件/日 + 2.5 天 + 6 件（primary）、鼠标 2.0/4/6（primary）、收纳架 4.0/0/28（accent）、显示器 0.3/16.7/「无需补货」（muted，R-STOCK-106 铁律）；建议补货量与公式 `max(0, ⌈日均销量×7⌉−库存)` 逐一吻合（API 级断言与订单明细一致）；标题真实公式 + 脚注保留。
  2. **无销量商品处理**：氛围灯（无订单）stock=5 仍按 `5 ≤ 10` 入列，日均「暂无销量」、天数「—」、无「超卖风险」Badge、补货「无需补货」；健康水位商品（高清显示器 stock=40）不入列。
  3. **老板健康度总览**：三卡片数值 `['4','1','2']` 与 API `healthOverview { warningCount:4, soldOutCount:1, riskCount:2 }` deepStrictEqual 一致；无任何阈值配置区。
  4. **老板写阈值配置被拒**：`PUT /api/admin/stock-config` → 403 `FORBIDDEN`；`globalThreshold` 仍 10、`overrides` 空（配置无变更）。

### 3.2 steps/stock_warning.js 扩展（`stock_warning_` 前缀）✅
- 新增 17 个步骤：复用 `STOCK_BASELINE`/`SALES_QTY` 与 `stockWarningSetupScenarioData`/`stockWarningSetupBossData`；新增 `stockWarningSetStock`（无销量后门）与 `stockWarningRowCellText`（8 列单元格级断言：3 日均 / 4 天数 / 6 补货量）；补货量整数精确断言（6/6/28/0），日均/天数列 toFixed(1) 显示值断言（1.2/2.5、2.0/4、4.0/0、0.3/16.7）；补货量列颜色分支断言（`text-primary`/`text-accent`/`text-muted-foreground`）。
- Cucumber 表达式转义：`\/`（件/日、PUT /api/...）、`\(` `\)`（公式），dry-run 44 场景无 undefined。

### 3.3 E2E 全量 ✅
- `./init.sh e2e:run` → **44 scenarios / 260 steps 全 PASS**（既有 40 场景含 stock_warning 既有 4 + 新增 4；另有 @persist 场景走独立 profile）。`stock_warning.feature` 8 场景全部通过。

### 3.4 既有回归 ✅
- `sales_dashboard.feature`（客服 403 兜底语义）、`account_admin_users.feature`、`smoke.feature` 主链路随全量套件 PASS（本 change 仅新增字段 + dailyAvg 口径收窄，无端点行为变更）。

---

## 4. 验证与同步

### 4.1 openspec validate ✅
- 实施前预检 + 完成后复验：`openspec validate story-stock-replenish-suggestion` → `Change 'story-stock-replenish-suggestion' is valid`（exit 0，两次均 PASS）。

### 4.2 test:all ✅
- `./init.sh test:all` → Node **225 tests / 0 fail**；Python **12 passed / 0 fail**（`skip_python: 无 Python 代码变更`，显式确认——本 change 仅 Node.js 后端与 Vue 前端变更，Python 后端零改动，既有 12 例回归通过）。

```
[1/2] Node: tests 225 / pass 225 / fail 0
[2/2] Python: 12 passed in 0.52s
```

### 4.3 浏览器视觉验证闭环 ✅
- `./init.sh vue:start` + Chrome DevTools 双角色（运营/老板）验收，与确认原型逐项核对：
  - **建议补货量列三分支**（DOM 断言）：收纳架（已售罄 stock=0）`28 件` `text-accent`；键盘/鼠标（replenish>0）`6 件` `text-primary`；显示器/支架（replenish=0）「无需补货」`text-muted-foreground`（R-STOCK-106 铁律）。
  - **日均销量与售罄天数列**：键盘 `1.2 件/日` + `近7日 8 件` + `2.5 天`；鼠标 `2.0 件/日` + `近7日 14 件` + `4 天`；收纳架 `4.0 件/日` + `近7日 28 件` + `0 天`；显示器 `0.3 件/日` + `近7日 2 件` + `16.7 天`；无销量氛围灯「暂无销量」+「—」+「—」。
  - **老板健康度总览三卡片**：4（预警商品数，`text-primary`）/ 1（已售罄数，`text-accent`）/ 2（超卖风险数，`text-warning`），与 API `healthOverview {4,1,2}` 一致；「全局库存健康度总览 · 只读」标题 + 副文案保留。
  - **口径说明与脚注**：标题「超卖风险 = 预计售罄天数 &lt; 7 天 · 建议补货量 = max(0, ⌈日均销量×7⌉ − 当前库存)」（无「待 P1 补齐」占位残留）；脚注「到货周期固定 7 天（MVP）· 无销量商品不计算售罄天数」。
  - **ZAPP 自检清单（DOM 级脚本断言）**：box-shadow 0 / linear-gradient 0 / border-radius ≠ 0·2px 0 / 内联 hex 0；全语义令牌；真实中文数据。
  - 浏览器控制台无本变更相关错误（仅 Unsplash 图片热链 CORB 拦截与既有表单 a11y 提示，非本次变更引入）。

### 4.4 视觉验证截图落位 ✅
| 截图 | 视角 | 内容 |
| --- | --- | --- |
| `verify-evidence/replenish-operator-list.png` | 运营 | 预警列表补货建议列三色分支（28 件 accent / 6 件×2 primary / 无需补货×2）+ 日均销量/售罄天数单元格 + 口径说明 + 脚注 |
| `verify-evidence/replenish-no-sales.png` | 运营 | 无销量商品（氛围灯 5 件）「暂无销量」/「—」/「无需补货」，健康水位 5 项不入列 |
| `verify-evidence/replenish-boss-overview.png` | 老板 | 全局库存健康度总览三卡片 4/1/2 + 「纯只读 · 无配置入口」+ 预警列表 |

### 4.5 逐项勾选 ✅
- tasks.md 22/23 项 `- [x]`（4.7 Spec Sync ⏸ 由 lead 执行）；每项完成即运行对应验证命令并记录证据。

### 4.6 全部门禁 ✅
- Hard Gates 全绿：schema validate PASS / Node test 225 PASS / Python test 12 PASS（skip 确认无变更）/ vue:build PASS；Soft Gate：E2E cucumber 44 scenarios / 260 steps 全 PASS。

### 4.7 Spec Sync ⏸（lead 执行）
- 本 change 不执行 Spec Sync 与 Archive（engineer 交付边界）；Baseline Sync 按 design 双 Sync Assessment 在 Epic `epic-stock-insight` 全部 Story 归档后统一执行。
