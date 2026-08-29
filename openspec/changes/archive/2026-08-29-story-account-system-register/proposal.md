# Proposal: 用户注册（story-account-system-register）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/account-system/stories/story-account-system-register/story.md`（已 HITL 确认）。
> Epic：`account-system`（用户账户体系）首个 Story；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

当前系统所有订单/购物车均归属固定占位用户 `user_dev`，买家没有真实身份，订单无法追溯、无法支撑「我的订单」与后续回款闭环。本变更新增 **C 端用户注册**：新买家（如林晓明）在结算前被引导登录时，可用「手机号 + 昵称 + 密码」极简注册，**注册成功即自动登录**（减少一次登录步骤），让订单/购物车拥有真实归属主体，是用户账户体系 Epic 的起点。

## What Changes (变更内容)

- **注册表单（前端）**：手机号（11 位）、昵称（默认"手机尾号用户"可改）、密码（≥6 位，单次输入 + 明文切换）。
- **注册接口（后端）**：新增 `POST /api/auth/register`：
  - 手机号格式校验（`1\d{10}`，11 位中国大陆手机号）。
  - 手机号全局唯一校验：已注册提示「该手机号已注册，请直接登录」，不创建重复用户。
  - 昵称必填 ≤20 字，缺省默认"手机尾号用户"。
  - 密码 ≥6 位 ≤32 位，**仅存哈希不落明文**。
  - 创建用户（`users.json` 持久化对齐现有 JSON 存储风格），新用户 `status = 正常`。
- **自动登录**：注册成功即创建会话凭证（token → userId 映射），响应返回会话凭证与用户信息；前端持久化后进入登录态，无需二次登录。
- **登录跳转入口**：手机号已注册时提供跳转登录入口（`account-login.html`，Story 2 落地）。

### Out of Scope（本 Story 不实现）

- 密码找回/忘记密码、第三方 OAuth、短信验证码、邮箱/实名认证（见 story.md Out of Scope）。
- 登录凭证校验与独立登录页（`story-account-system-login` 承接）。
- 会话全局校验/退出（`story-account-system-session` 承接）。
- B 端用户管理（`story-account-system-admin-users` 承接）。

## Capabilities (系统能力)

### New Capabilities

- **`account-management`（新增 taxonomy）**：承载用户注册（本 Story）与用户登录（Story 2）。生成 `specs/account-management/spec.md`。
  - **理由（新增标注）**：`domain_model.html` 现有 BC→Capability 映射（`bc-catalog`/`bc-cart`/`bc-coupon`/`bc-order`/`bc-shared` → 10 个 capability）**均无账户认证能力**；新增 taxonomy 以承载用户账户与认证边界（来自 idea 候选 Capabilities）。

### Modified Capabilities

- 无（本 Story 不改动既有 capability 行为；`user-session` 会话 taxonomy 由 Story 2/3 声明）。

## Impacted Bounded Contexts

- **User Context（新增 BC，需标注）**：承载 `account-management` capability。`domain_model.html` 现无用户认证 Bounded Context，本变更新增该边界（含 `User` Aggregate），属**基线级新增**，Epic 归档后由 `/opsx:baseline/sync` 统一回流（本阶段预判不执行，见 design.md Sync Assessment）。
- **Shared / Cross（复用）**：`error-handling`（注册错误码与中文提示，如 `PHONE_ALREADY_REGISTERED`）、`frontend-ui`（注册页视图）。

无既有 BC 修改：注册产生的新用户数据被后续 Story 消费（订单归属/用户管理），本变更不改 Order/Cart/Coupon 行为。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-03 加购与准备` | 结算前身份前置：未登录买家点击「去结算」被引导注册（buyer_process.html L1-03） |
| `L1-04 下单结算` | 注册自动登录后继续结算，订单绑定真实 `userId`（本 Story 只保证登录态，下单归属由 session Story 收口） |
| `L2-01 进入结算` | 结算前身份确认前置环节（未登录引导注册/登录） |

> 说明：注册链路为 L1-03 延伸出的新前置子流程；不修改既有 L2/L3 节点语义。

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-01`（触达与发现） | **修改** | 顶部新增登录/注册入口 |
| `SB-STAGE-03`（结算确认） | **修改** | 结算前引导未登录买家注册/登录 |
| `SB-CUSTOMER-01` | **修改** | 客户动作新增「注册账户（手机号+密码+昵称）」触点 |
| `SB-CUSTOMER-03` | **修改** | 客户动作新增「结算前注册并自动登录」触点 |

> 说明：复用既有 stage/lane 结构，不新增阶段；注册触点为 CUSTOMER 泳道能力分布变化，`/opsx:sync` 阶段按 design.md 的 Service Blueprint Sync Assessment 判定是否回流（Baseline Sync 在 Epic 归档后统一执行）。

## Impact (影响范围)

- **后端（Node.js，`ecommerce/ecommerce-mini`）**：
  - 新增 `User` 领域实体（id, phone, passwordHash, nickname, status, createdAt，见 idea.md §9）+ `UserRepo`（内存 Map 开发 / `FileStore` 生产 `users.json`）。
  - 新增 `AuthService`：注册用例（校验 → 唯一性 → 哈希 → 创建用户 → 创建会话）；密码哈希用 Node 原生 `crypto.scrypt`（零 npm 依赖）。
  - 新增会话存储（token → userId，内存 + `sessions.json` 持久化，供 Story 2/3 复用）。
  - HTTP 层新增 `POST /api/auth/register`（及会话校验中间件雏形，全量校验由 session Story 落地）。
- **前端（Vue，`ecommerce/ecommerce-mini-frontend`）**：`App.vue` 新增注册视图（`viewMode = 'register'`）；header 登录/注册入口；注册表单 + 错误提示 + 注册成功自动登录横幅；会话凭证 localStorage 持久化。
- **后端（Python，`ecommerce/ecommerce-mini-python`）**：观察（不实现，保持对齐由架构指南约束）。
- **数据**：新增 `users.json`（生产持久化）；开发环境内存 Map。
- **基线同步预判**：`domain_model.html` **Needs Sync**（新增 User Context BC + `account-management` taxonomy，属 Epic 级变化，归档后统一执行）；`service_blueprint.html` **Needs Sync**（SB-CUSTOMER-01/03 触点新增，同上）。本 change 仅 Spec Sync。
- **后续流程**：handoff 场景，原型已在需求侧完成（UI 门禁通过），开发侧**跳过 prototype 阶段**，直接进入 `/opsx:spec-design`。
