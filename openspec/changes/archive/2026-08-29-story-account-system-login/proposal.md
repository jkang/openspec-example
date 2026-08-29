# Proposal: 用户登录（story-account-system-login）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/account-system/stories/story-account-system-login/story.md`（已 HITL 确认，UI 门禁通过：原型 `epics/account-system/prototypes/account-login.html`）。
> Epic：`account-system`（用户账户体系）第二个 Story；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

已注册买家（如林晓明）更换设备或清理浏览器后，购物车跟随账户、查看「我的订单」、继续下单都需要恢复身份。Story 1（register）已提供用户池与注册即自动登录，但**无独立登录链路**：session 失效的买家无法凭「手机号 + 密码」恢复登录态。本变更新增 C 端用户登录：凭证校验通过即创建持久会话，前端持久化后刷新不掉登录态；密码错误与禁用状态给出明确反馈（安全惯例：不区分账号不存在与密码错误，防账号枚举）。

## What Changes (变更内容)

- **登录表单（前端）**：手机号（11 位）+ 密码；「显示密码」切换；忘记密码引导（跳转客服，本阶段无自助找回）。
- **登录接口（后端）**：新增 `POST /api/auth/login`：
  - 手机号格式校验（`1\d{10}`，11 位中国大陆手机号，对齐注册校验 R-LOG-001）。
  - 凭证校验：手机号存在 + 密码哈希匹配（复用 `verifyPassword`，scrypt 加盐比对）。
  - **统一失败提示**：账号不存在与密码错误均返回「手机号或密码不正确，请重试」（R-LOG-002，防枚举），错误码 `INVALID_CREDENTIALS`。
  - **禁用拦截**：用户 `status = 禁用` 时登录返回「该账户已被禁用，如有疑问请联系平台客服」（R-LOG-003），不创建会话。
  - 登录成功：创建持久会话（token → userId），响应返回 `201 { user, sessionToken }`（R-LOG-004/005）。
- **登录跳转入口**：注册页「已有账户？直接登录」由占位改为真实跳转；header「注册 / 登录」未登录态进入登录页；注册冲突提示的「去登录」链路打通。

### Out of Scope（本 Story 不实现）

- 短信验证码登录、第三方 OAuth、扫码登录（见 story.md Out of Scope）。
- 会话全局校验中间件 / 退出登录 / 我的订单按登录用户归属收口（`story-account-system-session` 承接）。
- B 端用户管理（禁用动作入口，`story-account-system-admin-users` 承接；本 Story 仅消费其产生的 `status=禁用` 数据）。
- 登录凭证校验失败次数策略（Q-1 默认不限次，待确认）。

## Capabilities (系统能力)

### Modified Capabilities

- **`account-management`（修改）**：既有 `openspec/specs/account-management/spec.md`（注册能力）基础上新增登录用例。生成增量 `specs/account-management/spec.md`。
  - 登录校验（手机号格式 / 凭证匹配 / 禁用拦截 / 统一失败提示）为 `account-management` 的新增需求（登录与注册同属用户账户认证边界）。

### New Capabilities

- **`user-session`（新增 taxonomy）**：承载会话创建能力（登录成功创建持久会话凭证）。生成 `specs/user-session/spec.md`。
  - **理由（新增标注）**：`domain_model.html` 现有 BC→Capability 映射（`bc-cart`/`bc-catalog`/`bc-coupon`/`bc-order`/`bc-shared` → 10 个 capability）中，Cart Context 的 `user/session` 仅作为购物车归属字段，**无认证会话管理能力**；新增 taxonomy 以承载会话生命周期（创建/校验/销毁，本 Story 先落地创建），会话校验与销毁由 story-account-system-session 承接。

## Impacted Bounded Contexts

- **User Context（新增 BC，来自 Story 1，需标注）**：承载 `account-management` 与 `user-session` capability。`domain_model.html` 现无用户认证 BC，Story 1 已声明新增边界（含 `User` Aggregate），本变更在该边界内补充登录与会话创建能力，属**基线级新增**，Epic 归档后由 `/opsx:baseline/sync` 统一回流（本阶段预判不执行，见 design.md Sync Assessment）。
- **Shared / Cross（复用）**：`error-handling`（登录错误码与中文提示，如 `INVALID_CREDENTIALS`、`USER_DISABLED`）、`frontend-ui`（登录页视图）。

无既有 BC 修改：登录消费 Story 1 的 `User`/`Session` 数据，不改 Order/Cart/Coupon 行为。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-03 加购与准备` | 身份前置：已注册买家在结算/查看订单前被引导登录恢复身份（buyer_process.html L1-03） |
| `L1-04 下单结算` | 登录成功后创建持久会话，继续结算绑定真实 `userId`（归属收口由 session Story 完成） |
| `L2-01 进入结算` | 结算前身份确认前置环节：未登录引导登录（回跳原页面 R-LOG-006，本 Story 提供整页跳转 + 回跳） |

> 说明：登录链路为 L1-03 延伸出的身份恢复前置子流程；不修改既有 L2/L3 节点语义。

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-01`（触达与发现） | **修改** | 顶部登录/注册入口（未登录态进入登录页） |
| `SB-STAGE-03`（结算确认） | **修改** | 结算前引导未登录买家登录（回跳原页面） |
| `SB-CUSTOMER-01` | **修改** | 客户动作新增「登录账户（手机号+密码）」触点 |
| `SB-CUSTOMER-03` | **修改** | 客户动作新增「结算前登录恢复身份」触点 |

> 说明：复用既有 stage/lane 结构，不新增阶段；登录触点为 CUSTOMER 泳道能力分布变化，`/opsx:sync` 阶段仅做 Spec Sync（change 级），蓝图为 Epic 级基线，待 Epic 全部 Story 归档后由 `/opsx:baseline/sync` 统一回流（本阶段预判不执行）。

## Impact (影响范围)

- **后端（Node.js，`ecommerce/ecommerce-mini`）**：
  - `AuthService` 新增 `login({ phone, password })` 用例：格式校验 → 查用户 → **禁用拦截** → `verifyPassword` 凭证比对 → 创建会话；复用 `UserRepo`/`SessionRepo`/`hashPassword`/`verifyPassword`（Story 1 已落地）。
  - HTTP 层新增 `POST /api/auth/login` 路由 + 错误映射（`INVALID_CREDENTIALS`→401、`USER_DISABLED`→403）。
  - `server.prod.js`（FileStore 生产版）同步新增登录路由，对齐 `users.json`/`sessions.json` 持久化。
- **前端（Vue，`ecommerce/ecommerce-mini-frontend`）**：`App.vue` 新增 `viewMode = 'login'` 登录视图；header「注册 / 登录」与注册页「直接登录」入口打通；登录成功横幅「登录成功，{昵称}」+ localStorage 持久化会话（`ecommerce_session`/`ecommerce_user`）。
- **后端（Python，`ecommerce/ecommerce-mini-python`）**：观察（不实现，保持对齐由架构指南约束）。
- **数据**：复用 `users.json`（含 `status` 字段）+ `sessions.json`；无新增数据文件。
- **基线同步预判**：`domain_model.html` **Needs Sync**（`user-session` taxonomy 新增，属 Epic 级变化，归档后统一执行）；`service_blueprint.html` **Needs Sync**（SB-CUSTOMER-01/03 登录触点，同上）。本 change 仅 Spec Sync。
- **后续流程**：handoff 场景，原型已在需求侧完成（UI 门禁通过），开发侧**跳过 prototype 阶段**，直接进入 `/opsx:spec-design`。
