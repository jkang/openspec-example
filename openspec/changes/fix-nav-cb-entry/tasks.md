# Tasks: 修复 C 端 / B 端入口导航信息架构（fix-nav-cb-entry）

> 实现版本：Vue 前端（`ecommerce/ecommerce-mini-frontend`）。依赖 `specs/frontend-ui/spec.md`（delta：ADDED「C/B 顶部导航作用域分离」+ MODIFIED「B 端运营后台布局」）与 `design.md`（RCA + Sync Assessment，均显式 No-op）。测试标签遵循 `docs/TESTING_STRATEGY.md` 金字塔。**无 Node.js / Python 后端改动**。

## 1. 前端（Vue App.vue）— C 端 header 作用域化（@unit/@e2e）

- [ ] 1.1 C 端视图（store / orders / register / login / checkout 等 `viewMode` 分支）header 仅保留顾客操作：店铺品牌 + 商品搜索（store 时）+ 购物车 + 我的订单 + 登录态用户信息 + 退出登录 + **独立「运营后台」入口按钮**。
- [ ] 1.2 移除 C 端 header 内的「店铺 | 运营后台」**分段切换控件**（第 30-39 行），改为独立「运营后台」按钮（`@click="switchViewMode('admin')"`）；保留既有顾客操作按钮（`goToOrders` / 购物车 / 退出登录）的 `v-if` 条件不变。

## 2. 前端（Vue App.vue）— B 端 header 独立作用域（@unit/@e2e）

- [ ] 2.1 B 端（admin）header 改为**独立运营作用域**：顶部渲染「运营后台 / {{ pathMap[adminTab] }}」分层面包屑 + 「运营专员」标签（基于真实 `currentUser`，与 Change A 一致）+ **「返回店铺」出口**（`@click="switchViewMode('store')"`）。
- [ ] 2.2 B 端 header SHALL NOT 复用 C 端顾客操作系列（移除 `v-if="viewMode !== 'admin'"` 的负向屏蔽逻辑，改用作用域分支渲染）。

## 3. 前端（Vue App.vue）— 顶部路径分层面包屑（@unit/@e2e）

- [ ] 3.1 新增 `pathMap`（adminTab → 模块中文名，与侧边栏分组标题对齐），B 端用 `运营后台 / {{ pathMap[adminTab] }}` 呈现；C 端各视图路径统一口径（store→「C 端店铺」、orders→「我的订单」、login/register→「账户 / 登录|注册」）。

## 4. E2E（Cucumber）— 覆盖补强（@e2e）

- [ ] 4.1 在 `e2e-tests/features/` 增补场景：**C 端店铺视图 header 不混排运营后台顾客操作**（Given 买家打开店铺 → 查看 header → 仅顾客操作 + 独立「运营后台」按钮 + 无「店铺 | 运营后台」分段切换控件）。对应 delta spec `@e2e` 场景。
- [ ] 4.2 增补场景：**B 端后台视图 header 为独立作用域**（Given 运营人员进入后台 → header 显示「运营后台 / 当前模块」面包屑 + 「返回店铺」出口 → 不含购物车/我的订单/退出登录）。对应 delta spec `@e2e` 场景（覆盖 B 端布局修改）。
- [ ] 4.3 在 `e2e-tests/steps/` 增加/复用步骤定义：断言「运营后台」入口按钮、断言 B 端面包屑「运营后台 / 当前模块」、断言 header 不含购物车等 C 端操作、断言「返回店铺」存在。

## 5. 验证与门禁（Hard Gates）

- [ ] 5.1 `openspec validate fix-nav-cb-entry` PASS（含 delta spec 的 `## ADDED Requirements` + `## MODIFIED Requirements` + 各 `#### Scenario:`）。
- [ ] 5.2 `./init.sh vue:build` 前端构建 PASS。
- [ ] 5.3 `./init.sh test:all`（Node 单测/集成 + Python 冒烟）PASS（应无回归，本变更不触后端）。
- [ ] 5.4 `./init.sh e2e:run` 全量 E2E PASS（含既有 `smoke.feature` / `ui_steps.js` / `sales_dashboard.js` 等所有「运营后台」「返回店铺」入口步骤回归 + 新增场景；**场景数不倒退**）。
- [ ] 5.5 初始化并维护 `verify.md`：记录验证证据；**E2E 覆盖审查结论**（smoke 主链路完整 / 新增覆盖 / 既有回归确认无）写入 verify.md。
- [ ] 5.6 浏览器视觉验证（FRONTEND.md §6.2）：C 端 header 仅顾客操作、B 端 header 独立作用域 + 面包屑 + 返回店铺；无圆角/无阴影/无占位符。

## E2E 覆盖审查结论（写入 verify.md）

- **smoke 主链路完整性**：`smoke.feature` 已用一体化场景覆盖注册→选购→加购→优惠券→结算→支付→订单可见，✅ 完整；其中「用户返回店铺首页」「顶部导航显示用户昵称」步骤均依赖重构后仍保留的「返回店铺」/「运营后台」按钮文本，无回归。
- **新增功能覆盖**：本 change 修改 C/B 顶部导航作用域，需新增 2 场景（任务 4.1/4.2）。
- **既有场景回归**：所有既有 E2E 入口步骤用 `button:has-text("运营后台")` / `button:has-text("返回店铺")` 文本，重构后语义保留，✅ 确认无回归。
