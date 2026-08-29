# Design: 用户登录（story-account-system-login）

## Context

动机见 `proposal.md - Why`：已注册买家（用户池来自 Story 1 register）在会话失效后凭「手机号 + 密码」恢复登录态。本变更在既有 Node.js 四层架构（HTTP → Service → Domain → Repo）内，为 Story 1 已落地的 `User` 领域/`account-management` capability 补充登录用例，并将「会话创建」契约化为新的 `user-session` capability。

现状约束（复用 Story 1 基础设施）：
- Node.js 后端零 npm 依赖，`AuthService` 已具备 `register` 用例与 `toPublicUser` 脱敏 DTO；`verifyPassword`（scrypt 比对）已在 Domain 层就绪（Story 1 预留）。
- `UserRepo`（`findByPhone`/`findById`/`save`）与 `SessionRepo`（`create`/`findByToken`）已落地，生产版 `server.prod.js` 有 FileStore 化的 `UserFileRepo`/`SessionFileRepo`。
- 前端 `App.vue` 已有 `viewMode = 'register'`、会话持久化（`persistSession` → localStorage）与 header「注册 / 登录」入口；登录视图为新增。
- 需求侧 story.md 业务规则 R-LOG-001~006 + 3 条 E2E 旅程为本变更的行为契约，delta specs 已逐条承接。

## Domain Boundary Impact (领域边界影响)

- **User Context**（Story 1 新增 BC）承载本变更全部能力：
  - `account-management`（既有 taxonomy，扩展）：登录凭证校验 / 禁用拦截 / 统一失败提示。与注册共用同一 `User` Aggregate（phone 唯一 + passwordHash + status），登录只读消费。
  - `user-session`（**新增 taxonomy**）：会话创建契约。归入 User Context 的理由：会话凭证绑定 `userId`，生命周期（创建/校验/销毁）与用户身份强内聚；Story 1 的 `SessionRepo` 即该边界的仓储实现。
- 跨边界影响：本变更不改 Order/Cart/Coupon 行为；登录创建的 `sessionToken` 由后续 session Story 的全局校验中间件消费（购物车跟随账户/订单归属收口）。

## Process Delta (流程影响)

| 流程节点 | 现状（Story 1 后） | 本变更 | 后续 Story |
| --- | --- | --- | --- |
| `L1-03 加购与准备` | 未登录买家被引导注册（新用户） | **已注册买家**被引导登录恢复身份（回跳原页面 R-LOG-006） | session：全局会话校验 |
| `L1-04 下单结算` | 注册自动登录进入登录态 | 登录成功创建持久会话，可继续结算 | session：订单绑定真实 `userId` |
| `L2-01 进入结算` | 引导注册/登录前置环节 | 登录入口与回跳打通（header + 注册冲突「去登录」） | session：凭证校验 |

> 说明：本变更补齐 L1-03/L2-01 的「身份恢复（登录）」语义；不修改既有 L3 规则流节点。登录为独立前置子流程，不侵入结算链路。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **判定**：`Needs Sync: Yes`（触发项：SB-CUSTOMER 泳道 capability 分布变化）。
- **触发项**：
  1. `SB-CUSTOMER-01`（触达与发现）客户动作新增「登录账户（手机号+密码）」触点。
  2. `SB-CUSTOMER-03`（结算确认）客户动作新增「结算前登录恢复身份」触点。
  3. `SB-STAGE-01` / `SB-STAGE-03` 阶段内新出现登录引导入口。
- **计划更新部位**：`docs/baseline/service_blueprint.html` 的 SB-CUSTOMER-01 / SB-CUSTOMER-03 单元格（客户动作/系统 Feature 两栏）与 SB-STAGE-01 / SB-STAGE-03 阶段说明。
- **执行时机**：按 SOP 分层 Sync 原则，本 change **仅执行 Spec Sync**；蓝图为 Epic 级基线，待 Epic 全部 Story 归档后由 `/opsx:baseline/sync` 统一回流（避免单 Story 中间态污染基线）。Story 1（register）已挂起同类触发项，本变更与之合并到 Epic 级统一回流。

## Domain Model Sync Assessment (领域模型同步评估)

- **判定**：`Needs Sync: Yes`（触发项：新增 capability taxonomy）。
- **触发项**：
  1. BC→Capability 映射新增 `bc-user → cap-user-session` 边（`account-management` 边已在 Story 1 声明）。
  2. `user-session` taxonomy 新增（会话创建/校验/销毁能力边界）。
- **计划更新部位**：`docs/baseline/domain_model.html` 的 BC→Capability 映射表（新增 `cap-user-session` 边，与 `cap-account-management` 并列）。
- **执行时机**：同上，Epic 归档后 `/opsx:baseline/sync` 统一执行（本 change 仅 Spec Sync）。

## Goals / Non-Goals

**Goals:**
- 登录链路完整可跑：Vue 登录视图 → `POST /api/auth/login` → 凭证校验 → 禁用拦截 → 会话创建 → 前端登录态（localStorage 持久化，刷新不掉）。
- 统一失败提示（R-LOG-002）：账号不存在与密码错误均返回 `INVALID_CREDENTIALS` 401，防账号枚举。
- 禁用拦截（R-LOG-003）：`status=禁用` 返回 `USER_DISABLED` 403，不创建会话。
- `user-session` capability 契约化会话创建，供 session Story 复用。

**Non-Goals:**
- 不做会话全局校验中间件 / 退出登录 / 我的订单归属收口（Story 3 session）。
- 不做 B 端用户管理与禁用动作入口（Story 4 admin-users；本变更仅消费其 `status` 数据，测试通过后门预置禁用用户）。
- 不做短信验证码/OAuth/扫码登录；不做凭证失败次数限制（Q-1 默认不限次）。
- 不做历史 `user_dev` 数据迁移（Q-6）。

## Decisions (技术决策)

### D1: 登录错误码区分 `INVALID_CREDENTIALS`（401）与 `USER_DISABLED`（403）
- **选择**：凭证错误/账号不存在统一 `INVALID_CREDENTIALS` 401「手机号或密码不正确，请重试」；禁用用户 `USER_DISABLED` 403「该账户已被禁用，如有疑问请联系平台客服」。
- **理由**：R-LOG-002 要求不区分账号不存在与密码错误（防枚举）；R-LOG-003 要求禁用有明确专属提示（业务必须显式区分禁用，这是产品决策而非安全泄漏）。
- **替代方案**：全部 401 统一提示 —— 禁用用户无法获得明确原因，违反 R-LOG-003，否决。

### D2: `AuthService.login` 复用 Story 1 的 `verifyPassword` 与 `toPublicUser`
- **选择**：`login({ phone, password })` 编排「输入归一 `String(phone).trim()` → `assertPhoneFormat` → `findByPhone` → 未找到抛 `INVALID_CREDENTIALS` → 禁用检查抛 `USER_DISABLED` → `verifyPassword` 失败抛 `INVALID_CREDENTIALS` → `sessionRepo.create` → 返回 `{ user: toPublicUser(user), sessionToken }`」。
- **理由**：输入归一延续 ISSUE-011 修复（数字型手机号类型漂移）；`verifyPassword`/`toPublicUser` 为 Story 1 预留的复用面，零重复实现。
- **替代方案**：登录单独实现哈希比对 —— 重复且易漂移，否决。

### D3: 禁用检查先于密码比对
- **选择**：`findByPhone` 命中后先查 `status === '禁用'` 抛 `USER_DISABLED`，再执行 `verifyPassword`。
- **理由**：禁用拦截是账户级门禁（R-LOG-003），不依赖凭证正确性；先拦截可减少无谓的 scrypt 计算。
- **边界**：禁用用户即使密码错误也返回 `USER_DISABLED`（账户级拦截优先于凭证错误），避免泄露凭证有效性。

### D4: 前端新增 `viewMode = 'login'`，复用 `persistSession`
- **选择**：`App.vue` 新增登录视图；header「注册 / 登录」未登录态点击进入登录页；注册页「已有账户？直接登录」与注册冲突「去登录」均切到登录视图；登录成功调用既有 `persistSession(body.sessionToken, body.user)` 并展示「登录成功，{昵称}」横幅。
- **理由**：与既有单视图切换架构一致；会话持久化 key（`ecommerce_session`/`ecommerce_user`）与注册共用，登录/注册互斥覆盖。
- **回跳（R-LOG-006）**：受保护页（「我的订单」）未登录时整页跳转登录视图并携带 `redirect` 参数，登录成功后回跳原目标页；本阶段实现为 store 内 `viewMode` 回切（订单页在未登录时引导登录，见前端任务）。

## Risks / Trade-offs

- **[scrypt 同步哈希阻塞事件循环]** → 登录为低频操作，同步调用可接受（对齐注册实现）；如需并发优化后续切 `crypto.scrypt` 异步版。
- **[禁用检查先于密码比对可能泄露账户状态]** → 这是产品显式需求（R-LOG-003），禁用提示为业务必要反馈，非安全漏洞；凭证错误仍统一提示防枚举。
- **[内存会话 dev 重启后失效]** → dev 仅演示；生产用 FileStore `sessions.json` 持久化（对齐 users.json 风格），刷新不掉。
- **[会话 token 无过期时间]** → 本 Story 只建会话，过期/销毁策略归 session Story；`SessionRepo` 已预留 `createdAt` 字段。

## Open Questions

- 无。需求侧 Q-1（凭证失败次数不限次）、Q-4（整页跳转 + 回跳）已在 idea.md 确认；会话过期策略由 Story 3 决策，不阻塞本变更。
