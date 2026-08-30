# Tasks: 修复 B 端用户管理入口可见性与角色表达（fix-admin-user-mgmt-visibility）

> 实现版本：Vue 前端（`ecommerce/ecommerce-mini-frontend`）。依赖 `specs/user-admin/spec.md`（delta，修改 R-ADM-001 前端入口可见性契约）与 `design.md`（RCA + Sync Assessment，均显式 No-op）。测试标签遵循 `docs/TESTING_STRATEGY.md` 金字塔。**无 Node.js / Python 后端改动**。

## 1. 前端（Vue App.vue）— 账户中心分组角色感知（@unit/@e2e）

- [ ] 1.1 侧边栏「账户中心」分组改为**按会话真实角色条件渲染**（对齐 delta spec R-ADM-001）：分组标题与其下内容一起纳入可见性判断。运营（`isOperator`）→ 渲染分组标题 + 「用户管理」链接（`adminTab='user'`，沿用既有 `v-if="isOperator"`）；非运营/未登录 → 渲染**分组标题 + "仅运营角色可见"引导**（不得仅渲染空分组标题）。
- [ ] 1.2 移除既有"分组标题无条件渲染"（第 418 行），避免非运营时账户中心空悬。

## 2. 前端（Vue App.vue）— 顶部运营专员标签真实化（@unit/@e2e）

- [ ] 2.1 顶部「运营专员」标签去除硬编码 `'王琳'` 兜底（第 59 行），改为 `运营专员: {{ (isOperator && currentUser?.nickname) || '—' }}`；对齐 delta spec「角色标签基于真实 currentUser 渲染，SHALL NOT 使用硬编码占位姓名」。

## 3. 前端（Vue App.vue）— 无权限兜底面板一致化（@unit）

- [ ] 3.1 复核 `adminTab === 'user'` 下的 `v-if="!isOperator"` 无权限面板（第 783 行）文案与侧边栏引导一致（"仅运营角色可见/请先使用运营账号登录"），确保非运营强行进入用户管理 tab 时呈现一致的权限引导。

## 4. E2E（Cucumber）— 覆盖补强（@e2e）

- [ ] 4.1 在 `e2e-tests/features/account_admin_users.feature` 补充场景：**运营角色在账户中心看到并进入用户管理**（Given 运营已登录 B 端后台 → 查看侧边栏「账户中心」分组 → 分组下显示「用户管理」链接 → 点击进入用户管理视图 → 顶部显示当前运营昵称）。对应 delta spec `@e2e` 场景。
- [ ] 4.2 补充场景：**非运营/未登录进入后台账户中心不空悬并显示权限引导**（Given 非运营/未登录已进入后台 → 查看「账户中心」分组 → 不显示空分组 → 显示"仅运营角色可见"引导 → 顶部「运营专员」显示 `—` 而非硬编码姓名）。对应 delta spec `@e2e` 场景。
- [ ] 4.3 在 `e2e-tests/steps/account_admin_users.js` 增加/复用步骤定义：进入「账户中心」分组、断言「用户管理」入口可见性、断言"仅运营角色可见"引导、断言顶部「运营专员」文案。

## 5. 验证与门禁（Hard Gates）

- [ ] 5.1 `openspec validate fix-admin-user-mgmt-visibility` PASS（含 delta spec 的 `## MODIFIED Requirements` + `#### Scenario:` 各场景）。
- [ ] 5.2 `./init.sh vue:build` 前端构建 PASS。
- [ ] 5.3 `./init.sh test:all`（Node 单测/集成 + Python 冒烟）PASS（应无回归，本变更不触后端）。
- [ ] 5.4 `./init.sh e2e:run` 全量 E2E PASS（含既有 `account_admin_users.feature` 3 场景回归 + 新增 2 场景；场景数不倒退）。
- [ ] 5.5 初始化并维护 `verify.md`：记录验证证据；**E2E 覆盖审查结论**（smoke 主链路完整 / 新增覆盖 / 既有回归）写入 verify.md。
- [ ] 5.6 浏览器视觉验证（FRONTEND.md §6.2）：无圆角/无阴影/无占位符；侧边栏账户中心在运营/非运营视角表现符合 delta spec。

## E2E 覆盖审查结论（写入 verify.md）

- **smoke 主链路完整性**：`smoke.feature` 已用一体化场景覆盖注册→选购→加购→优惠券→结算→支付→订单可见，✅ 完整，无需补强。
- **新增功能覆盖**：本 change 修改 `user-admin` 前端入口可见性（账户中心分组 + 运营专员标签），**无既有 @e2e 场景**，需新增 2 场景（见任务 4.1/4.2）。
- **既有场景回归**：`account_admin_users.feature` 既有 3 场景以角色登录/接口行为为主，不受前端分组可见性重构影响，✅ 无回归。
