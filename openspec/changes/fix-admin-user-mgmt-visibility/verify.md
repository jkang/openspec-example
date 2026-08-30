# Verify: 修复 B 端用户管理入口可见性与角色表达（fix-admin-user-mgmt-visibility）

> 实现版本：纯前端 Vue（`ecommerce/ecommerce-mini-frontend/src/App.vue`）+ E2E（`e2e-tests/features/account_admin_users.feature` / `e2e-tests/steps/account_admin_users.js`）。无 Node.js / Python 后端改动。
>
> 验证日期：2026-08-30。以下硬门禁（Hard Gates）均已实际执行并采集证据，无伪造。

## 任务逐项证据

### 1. 前端 — 账户中心分组角色感知（@unit/@e2e）

- [x] **1.1** 侧边栏「账户中心」分组改为按会话真实角色条件渲染（对齐 delta spec R-ADM-001）。将分组标题与其下内容一起纳入可见性判断：
  - 运营（`isOperator`）→ 渲染分组标题 + 「用户管理」链接（`adminTab='user'`）。
  - 非运营/未登录 → 渲染**分组标题 + "仅运营角色可见"引导**（不空悬）。
  - 实现见 `App.vue` 第 421-428 行：标题与内容包裹于 `<div class="mt-8">`，内部 `v-if="isOperator"`（链接）/ `v-else`（引导）。
- [x] **1.2** 移除旧的无条件渲染空分组（原第 421 `账户中心` 标题无条件 + 链接 `v-if`），现标题与内容同属一个角色感知容器，非运营不再空悬。

**验证**：`App.vue` 第 421-428 行改写完成（见 diff）。浏览器核对：运营视角「账户中心」「用户管理」；非运营/顾客视角「账户中心」「仅运营角色可见」。

### 2. 前端 — 顶部运营专员标签真实化（@unit/@e2e）

- [x] **2.1** 顶部「运营专员」标签去除硬编码 `'王琳'` 兜底，改为基于真实 `currentUser` 渲染。运营 → 昵称；非运营/未登录 → `—`。实现见 `App.vue` 第 59 行：
  - `{{ currentUser?.role === '老板' ? '老板' : '运营专员' }}: {{ currentUser?.role === '老板' ? (currentUser?.nickname || '—') : ((isOperator && currentUser?.nickname) || '—') }}`

**验证**：`grep '王琳'` 在 `App.vue` 已无匹配（硬编码移除）。浏览器核对：运营→「运营专员: 陈晓芸」；顾客→「运营专员: —」。

### 3. 前端 — 无权限兜底面板一致化（@unit）

- [x] **3.1** 复核 `adminTab === 'user'` 下 `v-if="!isOperator"` 无权限面板（`App.vue` 第 937-941 行）文案与侧边栏引导一致：
  - 文案改为「无权限访问用户管理：仅运营角色可见。手机号等用户资料属敏感信息，客服与普通账号无法查看。」
  - 新增未登录提示：`当前未登录，请先使用运营账号登录后再访问。`（基于 `sessionToken`）。

**验证**：与侧边栏引导「仅运营角色可见」措辞对齐；未登录提示满足 design.md Risk「请先使用运营账号登录」缓解。

### 4. E2E（Cucumber）— 覆盖补强（@e2e）

- [x] **4.1** `e2e-tests/features/account_admin_users.feature` 新增场景「运营角色可在账户中心看到并进入用户管理」（Given 运营已登录 → 查看账户中心分组 → 分组下显示用户管理链接 → 点击进入用户管理视图 → 顶部显示当前运营昵称）。
- [x] **4.2** 新增场景「非运营或未登录进入后台账户中心不空悬并显示权限引导」（Given 客服已登录 → 查看账户中心分组 → 不空悬 + 显示"仅运营角色可见"引导 → 顶部运营专员显示 — 而非硬编码姓名）。
- [x] **4.3** `e2e-tests/steps/account_admin_users.js` 新增 7 组步骤定义（见 `verify.md` 末节「新增步骤定义清单」）。步骤名均为此 change 专用唯一文案，**无 ambiguous step 冲突**（全量 E2E 无 ambiguous 报错）。

**验证**：全量 E2E `./init.sh e2e:run` 运行 `account_admin_users.feature` 5 场景全部通过（既有 3 回归 + 新增 2）。

### 5. 验证与门禁（Hard Gates）

- [x] **5.1** `openspec validate fix-admin-user-mgmt-visibility` → **PASS**（输出 `Change 'fix-admin-user-mgmt-visibility' is valid`）。
- [x] **5.2** `./init.sh vue:build` → **PASS**（`vite build` 12 modules transformed，`index-OSrGuE9I.css` / `index-u8QmWBqD.js` 产物生成）。
- [x] **5.3** `./init.sh test:all` → **PASS**（Node `190 pass / 0 fail`，30 suites；Python `12 passed`）。本变更不触后端，无回归。
- [x] **5.4** `./init.sh e2e:run` → **PASS**（**32 scenarios / 188 steps 全部通过**，0 failed；含既有 `account_admin_users.feature` 3 场景回归 + 新增 2 场景，场景数不倒退）。cucumber-report.html 已确认 `account_admin_users.feature` 5 场景全部执行。
- [x] **5.5** 本 `verify.md` 已初始化并记录证据；E2E 覆盖审查结论见下方。
- [x] **5.6** 浏览器视觉验证（FRONTEND.md §6.2）→ **PASS**：
  - DOM 扫描全元素：`border-radius` 与 `box-shadow` 违规数 **0**（运营/非运营两种视角均核验）。
  - 色彩：slate 色系 + 1px 实线边框，无异常。
  - 数据：真实昵称（陈晓芸 / 持久化测试 / 林晓明），无 foo/test 占位符；顶部角色标签不再出现硬编码「王琳」。
  - 行为：运营 → 账户中心「用户管理」可点击进入 `用户管理` 视图；顾客/非运营 → 账户中心「仅运营角色可见」非空悬。

## E2E 覆盖审查结论（写入 verify.md）

- **smoke 主链路完整性**：`smoke.feature` 已用一体化场景覆盖注册→选购→加购→优惠券→结算→支付→订单可见，✅ 完整，无需补强。
- **新增功能覆盖**：本 change 修改 `user-admin` 前端入口可见性（账户中心分组 + 运营专员标签），无既有 @e2e 场景，按任务 4.1/4.2 新增 **2 场景**，均 PASS。
- **既有场景回归**：`account_admin_users.feature` 既有 3 场景（检索下钻 / 禁用会话失效 / 客服权限拦截）以角色登录与接口行为为主，不受前端分组可见性重构影响，全量运行 **3/3 PASS**，✅ 无回归。
- **场景数**：全量 E2E 由既有 30 场景增至 **32 场景**（+2），无倒退。

## 新增步骤定义清单（account_admin_users.js，步骤名唯一）

| 步骤 | 类型 | 复用/新增 |
| :--- | :--- | :--- |
| 运营查看后台侧边栏「账户中心」分组 | When | 新增 |
| 账户中心分组下显示「用户管理」入口 | Then | 新增 |
| 点击「用户管理」入口进入用户管理视图 | When | 新增 |
| 顶部「运营专员」标签显示当前运营昵称 | Then | 新增 |
| 客服查看后台侧边栏「账户中心」分组 | When | 新增 |
| 账户中心分组不空悬并显示「仅运营角色可见」引导 | Then | 新增 |
| 顶部「运营专员」标签显示 — 而非硬编码姓名 | Then | 新增 |

> 步骤名均带明确前后缀（如「账户中心」分组 / 「运营专员」标签），与既有 `客服查看后台侧边栏`、`运营进入「用户管理」并输入手机号…` 等步骤文案**不重叠**，规避 ambiguous step 冲突（此前 verify 教训已规避）。

## 偏差 / 风险

- **行程记录**：所有 Hard Gates（5.1-5.6）在本地实际执行并通过，无强行伪造。
- **`老板` 角色标签**：顶部标签保留既有 `老板` 分支前缀（`currentUser?.role === '老板' ? '老板' : '运营专员'`），仅将昵称兜底改为按角色/`isOperator` 门控 + `—`。delta spec 的非运营集合（顾客/客服/未登录）行为符合 `—`，老板为既有独立 capability，未受影响。
- **遗留服务**：验证期间临时起停的 Vite dev server 已在验证后关闭，端口 3000/5173/8000 无遗留监听。
- **未做项**：未改动 `fix-nav-cb-entry` 相关代码（C/B 入口信息架构），属独立 change。
