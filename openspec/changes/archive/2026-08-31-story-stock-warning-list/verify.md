# verify.md — story-stock-warning-list

> 实施证据单一文件（apply 门禁证据）；Hard Gates（schema validate / Node test / Python test / 前端构建）与 Soft Gate（E2E cucumber）全部记录于此。
> 生成人：engineer（sdd-team）| 变更目录：`openspec/changes/story-stock-warning-list/`

## Gate 结论总览

| Gate | 结论 | 摘要 |
| --- | --- | --- |
| Hard · openspec validate | ✅ PASS | specs/design/tasks 齐备且格式合法（5.1） |
| Hard · Node test | ✅ PASS | 218 tests / 0 fail（含新增 stockInsight @unit 16 + @api 10 + userAdmin 种子 2）（2.4） |
| Hard · Python test | ✅ SKIP | 本 change 仅 Node.js 变更，Python 后端无代码改动；既有 Python 12 tests 回归通过（5.2） |
| Hard · 前端构建 | ✅ PASS | `./init.sh vue:build` 通过（3.7） |
| Soft · E2E cucumber | ✅ PASS | `./init.sh e2e:run` → 40 scenarios / 237 steps 全 PASS（既有 36 + 新增 4；另有 @persist 1 场景走独立 profile）（4.4/4.5） |
| E2E 覆盖审查 | ✅ FULL | 新增功能 4 场景全覆盖（运营主流程/阈值即时生效/权限 403·401/老板只读）+ 既有 smoke/sales_dashboard/account_admin_users 全量回归（见 tasks.md E2E 覆盖审查） |

## Gates

- Schema validate: PASS（openspec validate）
- Node test: PASS（node:test，218 tests / 0 fail）
- Python test: PASS（本 change 仅 Node.js 变更，Python 后端无代码改动，显式跳过；既有 Python 12 tests 回归通过）
- Frontend build: PASS（vue:build）
- E2E cucumber: PASS（40 scenarios / 237 steps 全 PASS）

---

## 1. 后端：预警只读聚合与阈值配置（Node.js）

### 1.1 Domain 纯函数 `src/domain/stock.js` ✅
- 实现：`resolveEffectiveThreshold`（R-STOCK-005 覆盖优先）、`isStockWarning`（R-STOCK-001/002 含 stock=0 恒入列）、`daysToSellout`（无销量 null）、`isOversellRisk`（0<stock<dailyAvg×7）、`sortStockWarning`（已售罄置顶→天数升序→无销量置底，productId 确定性兜底）、`assertThresholdValue`（≥0 整数）。
- 零外部依赖（仅导出纯函数），@unit 直接测试。
- 证据：`ecommerce/ecommerce-mini/__tests__/stockInsight.spec.js`「库存洞察领域纯函数（@unit）」7 例全绿。

### 1.2 stockConfigRepo 双实现 ✅
- `memoryRepo.js` 新增 `StockConfigRepo`（默认 `{ globalThreshold: 10, overrides: {} }`）。
- `fileRepo.js` 新增 `StockConfigFileRepo`（`data/stock-config.json` 单对象文件、原子写 tmp+rename、损坏自愈为默认）。
- 证据：`stockInsight.spec.js`「stockConfigRepo 配置结构读写（@unit）」3 例（默认值 / 结构 / file 落盘重读）。

### 1.3 StockInsightService.aggregate ✅
- `src/services/stockInsight.js`：复用 `orderService.aggregateSales`（groupBy='product'，与销售看板同源同口径）取近7日销量；组装 Product.stock + 订单销量 + stock-config 三源；过滤 `status=deleted`（覆盖配置保留在 `overrides` 返回但不参与聚合）。
- 口径：近7日 = [今日本地00:00−6天, now]（上界 +1ms 含此刻刚支付订单，规避 [from,to) 同毫秒边界）。
- 证据：`stockInsight.spec.js`「StockInsightService 预警聚合（@unit）」6 例。

### 1.4 GET /api/admin/dashboard/stock ✅
- `server.js`：`requireRoleStrict('运营','老板')`；返回 `{ items[], globalThreshold, overrides }`（字段含 productId/name/stock/effectiveThreshold/thresholdSource/dailyAvg/sales7d/daysToSellout/risk/status/listed）；只读聚合无任何写操作。
- 证据：@api 例「运营角色：预警列表 200 …只读聚合无写操作」（请求前后 products/orders 快照 deepStrictEqual）。

### 1.5 阈值配置写路由 ✅
- `PUT /api/admin/stock-config`（仅运营）、`PUT /api/admin/products/{id}/stock-config`（仅运营，商品 404 校验）；无效阈值（负数/非数字/小数）→ 400 `INVALID_THRESHOLD`；落盘+即时生效。
- 证据：@api 4 例（全局 20 即时生效 / 商品级 5→移出、10→重入 / 无效阈值 400 / 老板客服写 403）。

### 1.6 / 1.7 测试 ✅
- @unit 7 + 配置 3 + 聚合 6；@api：预警列表 5（200/200/403×2/401）+ 配置 4 = 9。
- `./init.sh node:test` → 218 tests / 0 fail。

## 2. 后端：权限门禁与老板种子账号（Node.js）

### 2.1 requireRoleStrict ✅
- `server.js` 新增 `requireRoleStrict(...allowedRoles)`：无有效会话 → 保留 `UNAUTHORIZED`（401「请先登录」）；角色不在白名单 → `FORBIDDEN`（403）。仅预警/配置端点使用；既有 `requireRole`（未登录统一 403）与 sales-dashboard 端点零改动。
- 证据：@api「未登录访问预警 401（UNAUTHORIZED）」+ 既有 sales_dashboard E2E 回归（客服 403 兜底语义未变）。

### 2.2 user_1003 种子 ✅
- `initialUsers` 增加 `user_1003`（role=老板，昵称「李老板」，密码 boss123，scrypt 哈希已生成）；file 模式经 `seedFileRepos` 注入 + `syncSequence`；`data/users.json` 同步补录。
- 证据：userAdmin.spec.js @unit「代码种子包含 user_1003 与 user_1001 并存」+「运行时数据层三者并存」；persistence.spec.js 断言 file 模式种子含 user_1003。

### 2.3 user_1003 门禁 @api ✅
- 登录成功（201，id=user_1003，role=老板）、`GET /api/admin/dashboard/stock` 与 `/sales` 均 200；写接口（stock-config / user status / **商品级 stock-config**）全部 403 `FORBIDDEN` 且配置无变更。
- 注：任务 2.3 中「product 403」映射为本 change 引入的商品级配置写端点 `PUT /api/admin/products/{id}/stock-config`（既有开放目录端点 `PUT /api/products/:id` 为 catalog-management 既有实现，主规格未要求门禁、integration 测试与 E2E 后门大量无鉴权依赖；user-admin delta spec 声明「权限门禁语义不变」，故零改动——详见交付报告「设计偏差」节）。

### 2.4 Node 全量测试 ✅
- `./init.sh node:test` → **218 tests / 0 fail**（命令输出见下）。

```
tests 218
pass 218
fail 0
```

---

## 3. 前端：库存预警视图（Frontend）

> 3.1–3.6 详见前端实现；证据以 `./init.sh vue:build` + 浏览器视觉验证为准。

### 3.7 前端构建 ✅
- `./init.sh vue:build` → PASS（输出见 Hard Gate 章节）。

## 4. E2E 覆盖（新增 + 回归）

### 4.1 stock_warning.feature（4 场景）✅
- @e2e 运营巡检预警列表主流程 / 阈值配置即时生效 / 客服客户 403 + 未登录 401 + 导航不可见 / 老板只读视角。
### 4.2 steps/stock_warning.js（`stock_warning_` 前缀）✅
- 复用动态建号 + 角色后门（对齐 dashboardSetupRole）；库存后门 `PUT /api/products/:id` 精确设置；订单构造保证日均销量（键盘 2.625 天、鼠标 4 天、显示器 17.5 天、支架 105 天）。
### 4.3 老板种子账号 E2E 复用 ✅（只读断言，无变更性操作）
### 4.4 / 4.5 E2E 全量 ✅
- `./init.sh e2e:run` → **40 scenarios / 237 steps 全 PASS**（e2e profile：既有 36 + 新增 4；feature 文件级另有 @persist 1 场景走独立 profile，既有文件级 37 + 新增 4 = 41）。

## 5. 验证与同步

### 5.1 openspec validate ✅
- `openspec validate story-stock-warning-list` → `Change 'story-stock-warning-list' is valid`（exit 0）。
### 5.2 test:all ✅
- Node 全量 218 PASS；Python 既有 12 tests PASS（`skip_python: 无 Python 代码变更`，显式确认）。
### 5.3 / 5.4 浏览器视觉验证 ✅
- Chrome DevTools 三角色验收（运营/老板/客服），ZAPP 自检清单逐项核对（DOM 级脚本断言：box-shadow 0 / rounded>2px 0 / gradient 0 / inline hex 0）；截图落位 `verify-evidence/`（见下）。
### 5.5 / 5.6 逐项勾选与全部门禁 ✅（见 Gate 总览）
### 5.7 Spec Sync ⏸ 由 lead 执行（engineer 交付边界不执行 Spec Sync 与 Archive；Baseline Sync 按设计在 Epic 归档后统一执行）

---

## 浏览器视觉验证（§5.3/5.4）

- 环境：临时 DATA_DIR（file 模式）启动 Node 后端 + `vue:start`；运营（user_1001 陈晓芸 / 123456）、老板（user_1003 李老板 / boss123）、客服（临时补录 user_1099 / service123）三角色验收。
- 数据口径实测（GET /api/admin/dashboard/stock）：桌面收纳架 sold_out(0) → 极简机械键盘 2.625天/risk → 无线办公鼠标 4天/risk → 高清显示器 17.5天 → 铝合金笔记本支架 105天/覆盖15 → 桌面拾音氛围灯 healthy(40)。
- 配置持久化实测：file 模式 `data/stock-config.json` 落盘 `{"globalThreshold":10,"overrides":{"5":15}}`；未登录访问预警接口返回 401 `UNAUTHORIZED`「请先登录」。
- ZAPP 自检清单（DOM 级核对）：✅ 0 box-shadow | ✅ 0 圆角(>2px) | ✅ 0 background 渐变 | ✅ 0 inline 硬编码 hex（全部语义令牌）| ✅ 三字体（font-display/sans/mono）| ✅ 真实中文数据无占位符 | ✅ 空状态中文化 | ✅ `--warning`(超卖风险)/`--accent`(已售罄)/`--success`(库存充足) Badge 渲染。
- 截图清单（`openspec/changes/story-stock-warning-list/verify-evidence/`）：
  - `stock-warning-operator.png` — 运营：预警列表 8 列 + Tabs「预警中 · 5」+ Badge + 阈值配置区 + 行内覆盖编辑
  - `stock-warning-operator-config-saved.png` — 运营：保存配置反馈（「✓ 已保存 · 阈值已即时生效」由 DOM 断言 savedFlag=true 验证 + E2E 场景 2 文本断言；截图因 3s 窗口与工具延迟可能已过时效）
  - `stock-warning-boss.png` — 老板：「纯只读 · 无配置入口」标识 + 健康度卡片 5/1/2 + 无配置入口
  - `stock-warning-no-entry-service.png` — 客服：导航无「库存预警」入口（经营分析分组整体不可见）
  - `stock-warning-tab-healthy.png` — 健康水位 Tab（桌面拾音氛围灯 · 库存充足）

## 测试统计

| 层 | 数量 | 说明 |
| --- | --- | --- |
| Node @unit | 新增 18 | stockInsight 领域 7 + 配置仓储 3 + 聚合 6 + userAdmin 种子 2 |
| Node @api | 新增 10 | 预警列表 4 + 阈值配置 4 + user_1003 门禁 2 |
| Node 全量 | 218 tests / 0 fail | 含既有回归（integration/salesDashboard/persistence/auth 等） |
| Python | 12 tests / 0 fail | 无代码变更（回归确认） |
| E2E 场景 | 既有 36 + 新增 4 = 40（e2e profile）| 另有 @persist 1 场景走独立 profile；feature 文件级既有 37 + 新增 4 = 41 |
| E2E steps | 237 steps 全 PASS | 含既有回归（smoke/sales_dashboard/account_admin_users/...） |

---

## 设计偏差 / 未决问题（交付报告摘要）

1. **任务 2.3「product 403」映射**：user-admin delta spec 与任务 2.3 中写接口示例含 `PUT /api/products/:id`，但该端点为 catalog-management 既有**开放实现**（主规格未要求门禁；`integration.spec.js` 等 10+ 处既有测试与 sales_dashboard E2E 后门均无鉴权依赖该端点；user-admin delta spec 明示「权限门禁语义不变」）。**实施映射**：验证 `user_1003` 对本 change 引入的管理写端点——全局 `stock-config`、用户 status、**商品级 `stock-config`** 均 403 且配置无变更；开放目录端点零改动（防回归）。若后续需收紧 catalog 写权限，应另立 change 并同步更新既有测试。
2. **`data/users.json` 补录 user_1003 为运行态**：`data/*.json` 全部 gitignore（FileStore 运行态产物），补录仅为本地 file 模式可用的运行时状态；代码种子以 `initialUsers`（user_1001 + user_1003）为基线。
3. **既有缺陷（本 change 未引入、未修复）**：memory 模式种子注入不推进用户序列（`integration.spec.js` 依赖注册即覆盖 user_1001 的行为），导致种子 user_1003 在 E2E 中会被后续注册覆盖。E2E 老板场景通过「仅 2 笔订单（2 次注册不触碰 user_1003）」规避；完整修复（memory `syncSequence`）涉及 integration.spec.js 优惠券段与购物流程断言重构，风险高、超出本 change 范围——建议 lead 评估单独 Tech Debt change。
4. **`App.vue` 订单 tab 分支修复**：原 `<div v-else>` 兜底导致「销售看板/库存预警」视图下订单列表同时渲染（重复表格）；本 change 将其改为 `v-else-if="adminTab === 'order'"`（修复了 dashboard 的既有同款双渲染问题，回归验证通过）。
