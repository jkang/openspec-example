# Proposal: 会话保持与退出（story-account-system-session）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/account-system/stories/story-account-system-session/story.md`（已 HITL 确认，UI 门禁通过：原型 `epics/account-system/prototypes/account-session.html`）。
> Epic：`account-system`（用户账户体系）第三个 Story，依赖 register（用户池）与 login（会话创建）已归档实现；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

register/login 已让买家（如林晓明）获得真实 `userId` 与会话凭证，但会话凭证目前**只被登录接口创建、未被全局消费**：刷新后前端仅靠 localStorage 保存登录态，后端「我的订单」（`GET /api/orders?userId=`）与下单仍以调用方自报的 `userId`（缺省 `user_dev` 占位）作为归属主体，订单归属隔离形同虚设。本变更新增会话生命周期闭环（**持久化校验 / 退出销毁 / 禁用即失效**），并将 order-management 的归属查询与下单绑定收口到**会话 userId**：未登录访问受保护能力被拦截并引导登录（R-SES-004），「我的订单」仅返回当前登录用户订单（R-SES-003），新订单绑定当前会话用户（R-SES-007），彻底替代 `user_dev` 占位。

## What Changes (变更内容)

- **会话全局校验中间件（后端）**：`Authorization: Bearer <sessionToken>` 全局校验；访问受保护接口（下单 `POST /api/orders`、`POST /api/checkout`、我的订单 `GET /api/orders`、购物车归属）时无有效会话返回 `401 UNAUTHORIZED`（R-SES-002）；校验时同时检测用户状态，`status=禁用` 即拒绝并提示（R-SES-006，联动 B 端用户管理）。
- **「我的订单」按会话 userId 归属查询**：`GET /api/orders` 不再信任客户端 `?userId=` 参数，改为从会话解析归属 userId 返回该用户订单（倒序，R-SES-003）；未登录访问返回 401 引导登录（R-SES-004）。
- **下单绑定当前会话 userId**：`POST /api/orders` / `POST /api/checkout` 从会话解析 `userId`（替代 body.userId / `user_dev` 占位），`Order.userId = 当前登录用户`（R-SES-007）。
- **退出登录（后端 + 前端）**：新增 `POST /api/auth/logout` 销毁服务端会话凭证（R-SES-005）；前端清除 localStorage（`ecommerce_session` / `ecommerce_user`）回到未登录态；再次访问「我的订单」被引导登录。
- **前端登录拦截与回跳**：「我的订单」未登录访问 → 整页跳转登录视图并携带回跳目标，登录成功后回到「我的订单」（R-SES-004）；header 登录态展示「退出登录」按钮。
- **会话持久化**：登录态刷新/重开浏览器不掉（localStorage + 服务端 sessions 持久化已有，本变更将其与全局校验打通；会话长期有效，过期续期策略 Out of Scope）。

### Out of Scope（本 Story 不实现）

- 会话过期时间自动刷新/续期策略、多设备会话并行管理（story.md Out of Scope）。
- 购物车跨端同步完整实现（仅归属字段就绪，同步策略后续阶段）。
- B 端用户管理（禁用动作入口，story-account-system-admin-users 承接；本变更仅消费其产生的 `status=禁用` 数据做会话失效判定）。
- 历史 `user_dev` 订单归属迁移（Q-6：仅新订单绑定真实用户）。

## Capabilities (系统能力)

### Modified Capabilities

- **`user-session`（修改）**：既有 `openspec/specs/user-session/spec.md`（会话创建，Story 2 已落地）基础上新增会话生命周期用例。生成增量 `specs/user-session/spec.md`。
  - 会话全局校验（需登录接口强制校验）、会话持久化（刷新保持）、退出销毁、禁用用户会话失效。
- **`order-management`（修改）**：既有 `openspec/specs/order-management/spec.md`（按用户查询订单列表）基础上新增归属收口用例。生成增量 `specs/order-management/spec.md`。
  - 「我的订单」按会话 userId 归属查询（替代客户端自报 userId）；下单绑定当前会话 userId（替代 `user_dev`）；未登录访问受保护订单接口拦截。

### 无新增 taxonomy

本变更不新增 capability：`user-session` 与 `order-management` 均已在 domain_model 映射表（`bc-user → cap-user-session` 边由 Story 1/2 声明，`bc-order → cap-order` 既有）。`account-management`（登录态消费）本变更只读消费，无行为变更，不改其 spec。

## Impacted Bounded Contexts

- **User Context（Story 1 新增 BC，本变更继续扩展）**：承载 `user-session` capability 的校验/销毁契约（会话生命周期闭环）。
- **Order Context（修改）**：承载 `order-management` 归属收口——`GET /api/orders?userId=` 语义从"客户端自报"改为"会话解析"，`POST /api/orders` 绑定会话 userId。
- **Shared / Cross（复用）**：`error-handling`（`UNAUTHORIZED` 401 中文提示、会话失效引导登录）、`frontend-ui`（我的订单登录拦截视图与退出按钮）。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-04 下单结算` | 下单绑定当前会话 `userId`（替代 `user_dev`），未登录下单被拦截（R-SES-007） |
| `L1-06 履约与完成` | 「我的订单」按会话 userId 归属查询，归属隔离（R-SES-003） |
| `L2-01 进入结算` | 进入结算前会话校验（无有效会话 401 → 前端引导登录并回跳，R-SES-002/004） |

> 说明：本变更不修改 L3 规则流节点语义；会话校验为 L2-01 前置环节的运行时实现。

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-04`（提交订单） | **修改** | 订单归属从调用方自报 userId 改为会话 userId（R-SES-007） |
| `SB-STAGE-06`（成功回流） | **修改** | 「我的订单」入口按会话归属展示（R-SES-003） |
| `SB-CUSTOMER-04` | **修改** | 客户动作「提交订单」携带会话凭证，下单绑定登录用户 |
| `SB-CUSTOMER-06` | **修改** | 客户动作「查看我的订单」需登录会话；未登录被引导登录（回跳） |
| `SB-BACKSTAGE-04` | **修改** | `GET /api/orders?userId=` 归属查询改造为会话解析 userId；新增 `POST /api/auth/logout` 会话销毁 |

> 说明：复用既有 stage/lane 结构，不新增阶段；`/opsx:sync` 阶段仅做 Spec Sync（change 级），蓝图为 Epic 级基线，待 Epic 全部 Story 归档后由 `/opsx:baseline/sync` 统一回流（本阶段预判不执行）。

## Impact (影响范围)

- **后端（Node.js，`ecommerce/ecommerce-mini`）**：
  - `AuthService` 新增 `logout(sessionToken)`（销毁会话）与 `getSessionUser(sessionToken)`（会话校验 + 禁用失效判定）用例；`SessionRepo` 新增 `delete(token)`。
  - HTTP 层新增会话校验中间件（受保护路由列表：orders 下单/查询、checkout、cart 归属）+ `POST /api/auth/logout` 路由；错误映射 `UNAUTHORIZED`→401「请先登录」/ `SESSION_EXPIRED`→401 引导重新登录。
  - `server.prod.js`（FileStore 生产版）同步新增会话校验、logout 与 orders 归属改造。
  - `GET /api/orders` 改为从会话解析 userId（移除客户端 `?userId=` 信任）；`POST /api/orders` / `POST /api/checkout` 从会话绑定 userId。
- **前端（Vue，`ecommerce/ecommerce-mini-frontend`）**：`goToOrders` 未登录拦截（跳登录 + 回跳）；header「退出登录」按钮（调用 logout API + 清除 localStorage）；`fetchMyOrders` 改为携带会话凭证（不再用 `currentUserId` 自报）。
- **后端（Python，`ecommerce/ecommerce-mini-python`）**：观察（不实现，保持对齐由架构指南约束）。
- **数据**：复用 `users.json`/`sessions.json`；无新增数据文件。
- **基线同步预判**：`domain_model.html` **Needs Sync**（Order/Cart 归属语义更新属 Epic 级变化，归档后统一执行）；`service_blueprint.html` **Needs Sync**（SB-BACKSTAGE-04 归属查询改造 + SB-CUSTOMER-06 登录拦截触点，同上）。本 change 仅 Spec Sync。
- **后续流程**：handoff 场景，原型已在需求侧完成（UI 门禁通过），开发侧**跳过 prototype 阶段**，直接进入 `/opsx:spec-design`。
