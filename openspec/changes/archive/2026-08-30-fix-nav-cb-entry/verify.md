# Verify: 修复 C 端 / B 端入口导航信息架构（fix-nav-cb-entry）

> 变更范围：纯前端 UI Bug Fix，仅改动 `ecommerce/ecommerce-mini-frontend/src/App.vue` 与 E2E feature/steps。
> 实现版本：Vue 前端。**无 Node.js / Python 后端改动**。Change A（`fix-admin-user-mgmt-visibility` 的顶部角色标签 + 侧边栏账户中心可见性）改动**已保留、未回归**。

## Gates

- Schema validate: PASS
- Node test: PASS（190 项全通过）
- Python test: PASS（12 项通过）
- Frontend build: PASS（vite 216ms）
- E2E cucumber: PASS（36 scenarios / 207 steps）

## 环境

- Node.js `v24.13.0` / npm（Vue 前端 via Vite `v8.2.1`）
- 后端：Node `3000`（`NODE_ENV=test`）、Python `8000`（`APP_ENV=test`）、Vue dev `5173`（`./init.sh e2e:run` 自动拉起并清理）

## 实施摘要（tasks.md 逐项）

**1. C 端 header 作用域化（@e2e via E2E 场景，前端无独立 @unit 框架）**
- [x] 1.1 C 端视图（`viewMode !== 'admin'`：store/orders/register/login）header 仅保留顾客操作：品牌 + 商品搜索（store 时）+ 购物车 + 我的订单 + 登录态昵称 + 退出登录 + 独立「运营后台」入口按钮。
- [x] 1.2 移除 C 端 header 内「店铺 | 运营后台」**分段切换控件**，改为独立「运营后台」按钮（`@click="switchViewMode('admin')"`）；既有顾客操作按钮 `v-if` 条件保留不变。

**2. B 端 header 独立作用域（@e2e）**
- [x] 2.1 B 端（admin）header 改为独立运营作用域：`运营后台 / {{ pathMap[adminTab] }}` 分层面包屑 + 「运营专员|老板」真实角色标签（`currentUser` 驱动，与 Change A 一致）+ 「返回店铺」出口（`@click="switchViewMode('store')"`）。
- [x] 2.2 B 端 header 不再复用 C 端顾客操作序列（移除 `v-if="viewMode !== 'admin'"` 负向屏蔽，改用作用域分支 `<template v-if/v-else>` 渲染）。

**3. 顶部路径分层面包屑（@e2e）**
- [x] 3.1 新增 `pathMap`（adminTab → 模块中文名，与侧边栏分组标题对齐：经营分析/交易管理/营销中心/账户中心），B 端用 `运营后台 / {{ pathMap[adminTab] }}` 呈现；C 端各视图路径统一口径（store→店铺搜索框、orders→「我的订单」、login/register→「账户 / 登录|注册」）。

**4. E2E（Cucumber）— 覆盖补强（@e2e）**
- [x] 4.1 新增场景「C 端店铺视图 header 不混排运营后台顾客操作」（`features/nav_cb_entry.feature`）。
- [x] 4.2 新增场景「B 端运营后台视图 header 为独立作用域」（同上）。
- [x] 4.3 新增步骤定义（`steps/nav_cb_entry.js`）：断言「运营后台」独立入口按钮、B 端面包屑「运营后台 / 当前模块」、header 不含购物车/我的订单/退出登录、断言「返回店铺」存在、B 端「运营专员」真实昵称。

**5. 验证与门禁（Hard Gates）**
- [x] 5.1 `openspec validate fix-nav-cb-entry` → **PASS**（`Change 'fix-nav-cb-entry' is valid`）。
- [x] 5.2 `./init.sh vue:build` → **PASS**（`✓ built in 216ms`，`dist/index-*.js 147.13 kB`）。
- [x] 5.3 `./init.sh test:all` → **PASS**（Node `190 pass` + Python `12 pass`，无回归）。
- [x] 5.4 `./init.sh e2e:run` → **PASS**（`36 scenarios (36 passed) / 207 steps (207 passed)`，场景数由 32→36 不倒退）。
- [x] 5.5 本文件初始化并记录验证证据（含 E2E 覆盖审查结论）。
- [x] 5.6 浏览器视觉验证（Chrome DevTools）：C 端 header 仅顾客操作（搜索/我的订单/昵称/退出登录/购物车）+ 独立「运营后台」按钮、无分段切换控件；B 端 header 独立作用域（「运营后台 / 营销中心 / 优惠券管理」面包屑 + 「运营专员: —」标签 + 「返回店铺」）；侧边栏账户中心非运营显示「仅运营角色可见」（Change A 保留）；无圆角/无阴影/slate 色系/1px 实线边框，无占位符。

## E2E 覆盖审查结论（写入 verify.md）

- **smoke 主链路完整性**：`smoke.feature` 的一体化场景（注册→选购→加购→优惠券→结算→支付→订单可见）全部 PASS；其中「用户返回店铺首页」「顶部导航显示用户昵称」步骤依赖重构后仍保留的「返回店铺」/「运营后台」按钮文本，无回归。
- **新增功能覆盖**：本 change 修改 C/B 顶部导航作用域，新增 4 个场景（`nav_cb_entry.feature`：C 端 header 作用域、B 端 header 作用域、分层面包屑、运营专员真实昵称），对应 delta spec 全部 `@e2e` 场景。
- **既有场景回归**：所有既有 E2E 入口步骤用 `button:has-text("运营后台")` / `button:has-text("返回店铺")` 文本，重构后语义保留，✅ 确认无回归（36/36 通过）。

## 偏差与风险

1. **前端无独立 @unit 测试框架**：项目 Vue 前端未有 node:test 单测装置，header 作用域属纯 UI 契约，由 `@e2e` 场景覆盖（符合测试金字塔「底层逻辑不推给 @e2e」，但此处无底层逻辑可单测，纯 DOM 渲染契约归 e2e）。
2. **「返回店铺」按钮文本多上文**：B 端 header「返回店铺」与 register/login 成功页「返回店铺」为不同视图下渲染，任一时刻仅一个可见，Playwright strict mode 无歧义（E2E 全量通过佐证）。
3. **「运营专员: —」语义**：当前浏览器会话为「客户」角色时，B 端角色标签按 Change A 语义显示「—」（非硬编码）。运营/老板角色下显示真实昵称（E2E 场景 4 已验证 `陈晓芸`）。
4. **C 端 store 顶部路径**：store 视图中部为商品搜索框（非路径文案），「C 端店铺」口径未在 header 重复渲染（与原型一致），其余 C 端视图（orders/login/register）路径已统一口径。

## Sync Assessment

`design.md` 的 Service Blueprint / Domain Model Sync Assessment 均为**显式 No-op**，本次仅前端 header 呈现，未触达 baseline，**无需回流**。

## Lead 质量复核（QA 对抗审查 + 锚点修正）

- **QA 独立复核结论（对抗审查）**：代码正确、门禁全绿、Change A 未回归（顶部角色标签与侧边栏账户中心可见性均保留，无「店铺 | 运营后台」分段控件残留）。
- **治理锚点修正（Lead 定案，QA 发现同类误引）**：
  - `SB-OPS-05`（实际为「确认支付/推进订单已支付」，与 header 无关）→ **更正为 `SB-OPS-06`**（电商运营层·「查看订单/发货/用户管理/frontend-ui」支撑节点）。
  - `SB-STAGE-01 商品发现`、`L1-01 商品发现` → **更正名称为「触达与发现」**（节点 ID 不变，唯名称笔误）。
  - `Frontend / Commerce Context`（虚构 BC）→ **更正为 `Shared / Cross`（bc-shared，Cross-Context「全局极简 UI 组件库」）**。
  - 同步修正 proposal / specs / design 三处 + tasks 场景数字（2→4）。
- **复核后**：`openspec validate fix-nav-cb-entry` 仍 PASS（ADDED + MODIFIED delta 完整、schema 合规）；Change A 与 Change B 治理锚点均已对齐真实 baseline。
