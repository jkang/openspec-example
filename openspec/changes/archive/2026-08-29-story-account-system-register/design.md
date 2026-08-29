# Design: 用户注册（story-account-system-register）

## Context

动机见 `proposal.md - Why`：替换 `user_dev` 占位用户，让订单/购物车拥有真实归属。本变更在既有 Node.js 四层架构（HTTP → Service → Domain → Repo）内新增 `User` 领域与 `account-management` capability，并对既有 Vue 前端增加注册视图。

现状约束：
- Node.js 后端零 npm 依赖（仅原生模块 `http`/`fs`/`crypto`/`node:test`），JSDoc 类型，开发环境内存 Map、生产 `FileStore` JSON。
- 前端 Vue 3 Composition API + Vite + Tailwind（slate 色系/无圆角/无阴影/1px 实线边框），`viewMode` 单视图切换。
- 会话能力为 Story 2/3 的复用基础：本变更先落地「会话创建」，存储结构对齐后续 Story（登录创建 / 会话页校验 / 退出销毁）。
- 需求侧 story.md E2E 验收（R-REG-001~007 + 3 条 E2E 旅程）为本变更的行为契约，specs/account-management/spec.md 已逐条承接。

## Domain Boundary Impact (领域边界影响)

- 新增 **`User Context`** 边界（`domain_model.html` 现无用户认证 BC），治理 `account-management` capability。理由：注册/登录/用户档案属于独立认证边界，与 Catalog/Cart/Coupon/Order 无共享 Aggregate；仅复用 `bc-shared → cap-error`（错误码规范）与 `bc-shared → cap-ui`（前端极简 UI 规范）。
- `User` Aggregate：`id`（`user_<seq>`，对齐 `user_1001` 风格）、`phone`（唯一）、`passwordHash`（scrypt 加盐）、`nickname`、`status`（`正常`/`禁用`，本 Story 仅 `正常`）、`createdAt`。
- 跨边界影响：本变更不改 Order/Cart/Coupon 行为；注册产生的 `userId` 由后续 Story（session 归属查询、admin-users、订单归属）消费。

## Process Delta (流程影响)

| 流程节点 | 现状 | 本变更 | 后续 Story |
| --- | --- | --- | --- |
| `L1-03 加购与准备` | 无身份前置，任何人直接结算 | 结算前未登录买家被引导注册（前端入口） | session：全局会话校验 |
| `L1-04 下单结算` | 订单归属 `user_dev` | 注册成功进入登录态（可继续结算） | session：订单绑定真实 `userId` |
| `L2-01 进入结算` | 无身份确认 | 引导注册/登录前置环节 | login/session：凭证校验 |

> 说明：本变更补齐 L1-03/L2-01 的「身份前置（注册）」语义；不修改既有 L3 规则流节点。注册为独立前置子流程，不侵入结算链路。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **判定**：`Needs Sync: Yes`（触发项：SB-CUSTOMER 泳道 capability 分布变化）。
- **触发项**：
  1. `SB-CUSTOMER-01`（触达与发现）客户动作新增「注册账户」触点。
  2. `SB-CUSTOMER-03`（结算确认）客户动作新增「结算前注册并自动登录」触点。
  3. `SB-STAGE-01` / `SB-STAGE-03` 阶段内新出现注册引导入口。
- **计划更新部位**：`docs/baseline/service_blueprint.html` 的 SB-CUSTOMER-01 / SB-CUSTOMER-03 单元格（客户动作/系统 Feature 两栏）与 SB-STAGE-01 / SB-STAGE-03 阶段说明。
- **执行时机**：按 SOP 分层 Sync 原则，本 change **仅执行 Spec Sync**；蓝图为 Epic 级基线，待 Epic 全部 Story 归档后由 `/opsx:baseline/sync` 统一回流（避免单 Story 中间态污染基线）。

## Domain Model Sync Assessment (领域模型同步评估)

- **判定**：`Needs Sync: Yes`（触发项：新增 BC 边界、BC→Capability 映射、Aggregate 与状态字段）。
- **触发项**：
  1. 新增 `User Context` BC（边界）。
  2. BC→Capability 映射新增 `bc-user → cap-account-management` 边。
  3. 新增 `User` Aggregate（`status` 状态字段 `正常`）。
- **计划更新部位**：`docs/baseline/domain_model.html` 的 BC 画布与 BC→Capability 映射表。
- **执行时机**：同上，Epic 归档后 `/opsx:baseline/sync` 统一执行。

## Goals / Non-Goals

**Goals:**
- 注册链路完整可跑：前端注册视图 → 后端 `POST /api/auth/register` → 校验 → 哈希落库 → 会话创建 → 前端登录态。
- 会话存储（token → userId）结构就绪，供 login/session Story 直接复用。
- 密码哈希采用 Node 原生 `crypto.scrypt`（零新增依赖），存储不含明文。

**Non-Goals:**
- 不做登录接口（`POST /api/auth/login` 归 Story 2）、不做会话全局校验中间件与退出（Story 3）。
- 不做 B 端用户管理 API（Story 4）。
- 不做购物车/订单归属迁移（`user_dev` 存量数据不迁移，Q-6）。

## Decisions (技术决策)

### D1: 密码哈希用 `crypto.scrypt` 同步实现（Node 原生）
- **选择**：`crypto.scryptSync(password, salt, 64)`，salt 随机 16 字节 hex，存储格式 `scrypt:<salt>:<hash>`。
- **理由**：零 npm 依赖（硬约束）、抗暴力破解、Node 内建。
- **替代方案**：`bcrypt` 需第三方依赖（违反零依赖）；`crypto.pbkdf2` 可替代但 scrypt 内存硬化更强。

### D2: 用户 ID 格式 `user_<seq>`（对齐既有 `user_1001` 约定）
- **选择**：`UserRepo` 维护自增序列，从 `user_1001` 起始；与既有 `INVALID_USER_ID` 校验（`/^user_\d+$/`）兼容。
- **理由**：避免与既有 coupon 发放的 `userId` 校验冲突，且 E2E 验收（U00001）在真实 API 中以 `user_1001` 呈现（U00001 为业务示例编号，实现以现有用户 ID 规范为准）。

### D3: 会话存储独立 `SessionRepo`（内存 Map + 生产 `sessions.json`）
- **选择**：`SessionRepo` 提供 `create(userId)` / `findByToken(token)`；token 为 `crypto.randomUUID()`。注册成功即 `create(userId)` 并返回 token。
- **理由**：会话生命周期（创建/校验/销毁）为 Story 2/3 复用面，独立 Repo 保证单一数据源。
- **替代方案**：会话塞进 User 记录 —— 破坏 User 聚合内聚，且退出/多会话管理困难，否决。

### D4: 注册响应返回会话凭证 + 用户信息
- **选择**：`POST /api/auth/register` 成功返回 `201 { user: {...}, sessionToken }`。
- **理由**：注册即登录（R-REG-006），一次请求交付身份与凭证；前端持久化 `sessionToken` 到 `localStorage`。

### D5: 前端新增 `viewMode = 'register'` + 注册视图组件
- **选择**：在 `App.vue` 内以 `viewMode` 单视图切换新增注册视图；header 增加「注册」入口（未登录态）；注册成功横幅 + 自动切回登录态。
- **理由**：与既有单文件 App.vue 架构一致；原型 `account-register.html` 交互逻辑（三栏表单/明文切换/冲突提示/成功横幅）逐条对齐。
- UI 状态管理：`sessionToken` + `currentUser` 响应式状态，`localStorage` 持久化（key `ecommerce_session` / `ecommerce_user`）。

## Risks / Trade-offs

- **[scrypt 同步哈希阻塞事件循环]** → 注册为低频操作，同步调用可接受；如需并发优化后续切 `crypto.scrypt` 异步版。
- **[内存会话在 dev 重启后失效]** → dev 仅演示，生产用 `FileStore` 持久化 `sessions.json`（对齐 `users.json` 风格）。
- **[会话 token 无过期时间]** → 本 Story 只建会话，过期/销毁策略归 session Story；`SessionRepo` 预留 `createdAt` 字段。
- **[默认昵称与业务预期「手机尾号用户」措辞差异]** → 业务规则 R-REG-003 语义为"由手机尾号生成"，实现采用 `<尾号>用户`（如 `7536用户`），与 story 验收一致。

## Open Questions

- 无。需求侧 Q-1~Q-6 已在 idea.md 确认；会话过期策略由 Story 3 决策，不阻塞本变更。
