# Proposal: B 端用户管理（story-account-system-admin-users）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/account-system/stories/story-account-system-admin-users/story.md`（已 HITL 确认，UI 门禁通过：原型 `epics/account-system/prototypes/admin-users.html`）。
> Epic：`account-system`（用户账户体系）**第四个（最后一个）Story**，依赖 register（用户池）/login（禁用拦截）/session（会话失效联动）已归档实现；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

register/login/session 已让买家（如林晓明）获得真实 `userId` 与会话闭环，但 **B 端没有用户视角**：运营只能看到订单归属 `user_1001` 这样的 ID，无法按手机号/昵称定位具体顾客、无法查看一人多单的订单聚合、无法禁用恶意/异常用户。本变更新增 **B 端用户管理**：用户列表（ID/昵称/手机号/订单数/注册日期/状态）、按手机号或昵称关键词检索、用户详情（基础信息 + 该用户订单聚合）、禁用/启用账户（ACTIVE↔DISABLED），并施加**运营角色权限门禁**（R-ADM-001/007：仅运营角色可见入口，客服无权限，手机号属敏感信息受权限约束）。禁用动作联动既有会话失效机制（复用 `AuthService.assertUserEnabled` 门禁 + `SessionRepo`）与登录拦截（R-LOG-003 已有），实现「禁用后该用户会话立即失效且无法登录」（R-ADM-005）。

## What Changes (变更内容)

- **用户列表接口（后端）**：新增 `GET /api/admin/users`（B 端运营角色）：
  - 返回全部用户（按注册时间倒序）：用户 ID、昵称、手机号、订单数（聚合自订单归属）、注册日期、状态（R-ADM-002）。
  - 关键词检索：按手机号或昵称关键词过滤（R-ADM-003）；空关键词返回全量。
- **用户详情接口（后端）**：新增 `GET /api/admin/users/:id`：返回用户基础信息 + 该用户订单聚合列表（订单号/商品/金额/状态，R-ADM-004，一人多单聚合对齐运营诉求）。
- **禁用/启用接口（后端）**：新增 `PATCH /api/admin/users/:id/status`：
  - 禁用：状态 `正常 → 禁用`；该用户既有会话**立即失效**（复用 session 失效机制：会话校验时 `assertUserEnabled` 抛 `USER_DISABLED`，R-ADM-005 联动 R-SES-006）。
  - 启用：状态 `禁用 → 正常`；可重新登录（R-ADM-006）。
  - 不修改密码/昵称等资料（story.md Out of Scope：Q-5 只读）。
- **权限门禁（后端）**：B 端用户管理接口（`/api/admin/users*`）需**运营角色**校验；非运营角色访问返回 403 无权限，不返回任何用户手机号等敏感信息（R-ADM-001/007）。
- **B 端入口（前端）**：后台侧边栏新增「用户管理」菜单（仅运营角色可见）；用户列表页（检索区 + 列表 + 详情抽屉 + 禁用/启用切换），交互对齐原型 `admin-users.html`。

### Out of Scope（本 Story 不实现）

- 用户资料编辑（昵称/手机号修改，Q-5 默认只读）。
- 密码重置（运营侧改密）。
- 用户数据导出 / 批量操作。
- 客服视角的受限用户视图（本阶段客服无任何用户管理权限，R-ADM-001/007）。
- 历史 `user_dev` 订单归属迁移（Q-6：仅新订单绑定真实用户；未归属订单在 B 端按 `user_dev` 展示）。

## Capabilities (系统能力)

### New Capabilities

- **`user-admin`（新增 taxonomy）**：承载 B 端用户管理能力（用户列表/检索/详情/禁用启用 + 运营角色权限门禁）。生成 `specs/user-admin/spec.md`。
  - **理由（新增标注）**：`domain_model.html` 现有 BC→Capability 映射（`bc-catalog`/`bc-cart`/`bc-coupon`/`bc-order`/`bc-shared` → 10 个 capability + Story 1/2 已声明 `account-management`/`user-session`）**均无 B 端用户管理能力**；运营后台目前仅有商品/订单/优惠券管理；新增 taxonomy 承载 B 端用户视角（来自 idea 候选 Capabilities 第 3 条）。

### Modified Capabilities

- **`account-management`（修改）**：既有 `openspec/specs/account-management/spec.md`（注册 + 登录）基础上补充「禁用状态可由 B 端启停动作产生并联动登录门禁」的用例说明。生成增量 `specs/account-management/spec.md`。
  - 本 Story 补充：登录拦截（R-LOG-003 已有）的禁用状态来源由 B 端用户管理产生；启用后重新可登录（R-ADM-006）—— 行为契约补充「禁用/启用状态流转」用例。

## Impacted Bounded Contexts

- **User Context（Story 1 新增 BC，本变更继续扩展）**：承载 `user-admin`（新增）与 `account-management`（修改，禁用联动登录门禁）。User Context 内聚用户账户、认证、会话与 B 端用户生命周期管理边界。
- **Order Context（修改，只读消费）**：用户详情订单聚合复用 `OrderRepo.findAll()` 按 `userId` 过滤（`Order.userId` 归属已由 session Story 收口到真实用户）；`GET /api/admin/users/:id` 聚合该用户订单。
- **Shared / Cross（复用）**：`error-handling`（`FORBIDDEN` 403 运营权限提示、`USER_NOT_FOUND` 404）、`frontend-ui`（B 端用户管理视图）。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-06 履约与完成` | B 端按用户维度回查订单聚合（一人多单），支撑客诉定位与订单管理（story.md 旅程 1 映射 L1-06） |
| `L2-01 进入结算` | B 端权限门禁：仅运营角色可访问用户管理入口（R-ADM-001）；客服无权限（R-ADM-007 敏感信息保护） |
| `L3-02 执行资格校验` | 用户状态（正常/禁用）作为登录/会话门禁的事实来源（间接依赖，禁用用户禁止登录） |

> 说明：本变更不修改 L3 规则流节点语义；用户生命周期状态机（正常↔禁用）为新增领域状态约束，由 Domain Model Sync 落位。

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-06`（成功回流） | **修改** | 订单归属真实用户后，B 端可按用户聚合回查（story.md 旅程 1：SB-STAGE-06） |
| `SB-CUSTOMER-06` | **修改** | 「我的订单」数据源由真实用户归属承载，B 端用户详情复用同一归属（B 端视角数据源） |
| `SB-BACKSTAGE-04` | **修改** | 复用 `GET /api/orders` 归属查询语义（`GET /api/admin/users/:id` 聚合该用户订单） |
| **新增 B 端用户管理泳道节点** | **新增** | `GET /api/admin/users`（列表/检索）、`PATCH /api/admin/users/:id/status`（禁用/启用）落位到 SB-BACKSTAGE-* 新节点（待 Baseline Sync 落位，见 design.md Sync Assessment） |

> 说明：新增 B 端用户管理泳道节点属 Epic 级基线变化，`/opsx:sync` 阶段仅做 Spec Sync（change 级），蓝图为 Epic 级基线，待 Epic 全部 Story 归档后由 `/opsx:baseline/sync` 统一回流（story.md Sync Assessment 明确：**Needs Sync: Yes**，本阶段预判不执行）。

## Impact (影响范围)

- **后端（Node.js，`ecommerce/ecommerce-mini`）**：
  - 新增 `AdminUserService`（或 UserService）：用户列表（关键词检索 phone/nickname）、用户详情（含订单聚合）、禁用/启用状态流转（`正常` ↔ `禁用`）。
  - `UserRepo` 增加 `findByKeyword(keyword)`（手机号/昵称模糊匹配）或 Service 层过滤；复用 `OrderRepo.findAll()` 做订单聚合。
  - 复用既有 `assertUserEnabled`（禁用门禁）与 session 失效机制：禁用动作本身幂等（已禁用再禁用不报错）；禁用后该用户持既有会话访问受保护接口 → 403 `USER_DISABLED`（R-SES-006 已有实现，无需改动）。
  - HTTP 层新增运营角色校验辅助（`requireAdminRole`）：`GET /api/admin/users`、`GET /api/admin/users/:id`、`PATCH /api/admin/users/:id/status`。
  - `server.prod.js`（FileStore 生产版）同步新增用户管理路由与角色校验。
- **前端（Vue，`ecommerce/ecommerce-mini-frontend`）**：后台侧边栏新增「用户管理」菜单（仅运营角色渲染）；用户列表 tab（检索区 + 表格 + 详情抽屉 + 禁用/启用切换），对齐原型 `admin-users.html`。
- **后端（Python，`ecommerce/ecommerce-mini-python`）**：观察（不实现，保持对齐由架构指南约束）。
- **数据**：复用 `users.json`（含 `status` 字段）+ `orders.json`（订单聚合）；无新增数据文件。
- **基线同步预判**：`domain_model.html` **Needs Sync**（User Context 新增 `user-admin` taxonomy + 用户状态机 正常↔禁用 + userId 归属语义变化，属 Epic 级变化，归档后统一执行）；`service_blueprint.html` **Needs Sync**（新增 B 端用户管理泳道节点，同上）。本 change 仅 Spec Sync。
- **后续流程**：handoff 场景，原型已在需求侧完成（UI 门禁通过），开发侧**跳过 prototype 阶段**，直接进入 `/opsx:spec-design`。
