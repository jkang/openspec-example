# Design: B 端用户管理（story-account-system-admin-users）

## Context

动机见 `proposal.md - Why`：register/login/session 已交付用户池、登录门禁与会话闭环，但 B 端无用户视角。本变更在既有 Node.js 四层架构（HTTP → Service → Domain → Repo）内新增 **B 端用户管理**（`user-admin` 新增 taxonomy）：用户列表/检索/详情（订单聚合）/禁用启用 + 运营角色权限门禁，并将禁用动作联动既有会话失效与登录拦截（复用 `AuthService.assertUserEnabled` 门禁，零重复实现）。

现状约束（复用既有基础设施）：
- `UserRepo`（`findAll`/`findById`/`findByPhone`/`nextId`）与 `SessionRepo`（`create`/`findByToken`/`delete`）已就绪；生产版 `UserFileRepo`/`SessionFileRepo`（`users.json`/`sessions.json` FileStore）已落地。
- `AuthService.getSessionUser(sessionToken)`（会话校验 + `assertUserEnabled` 禁用门禁）已就绪，供 HTTP 层 `requireSession`/`optionalSession` 消费。
- `OrderService.listByUser(userId)` 已实现归属倒序查询；`OrderRepo.findAll()` 可用于跨用户订单聚合。
- 前端 `App.vue` 已有 `adminTab`（coupon/product/category/order）B 端运营后台视图、`authHeaders()` 会话凭证请求头、登录态（`sessionToken`/`currentUser` localStorage）。
- 需求侧 story.md 业务规则 R-ADM-001~007 + 3 条 E2E 旅程为本变更的行为契约，delta specs 已逐条承接。
- **现状无角色概念**：`User` 无 `role` 字段；B 端运营后台入口无任何鉴权（商品/订单/优惠券管理历史行为）。本变更仅对**用户管理**入口施加运营角色门禁（story.md R-ADM-001/007 限定范围），不改动既有 B 端管理链路。

## Domain Boundary Impact (领域边界影响)

- **User Context**（Story 1/2/3 已声明的认证 BC）承载 `user-admin`（新增）与 `account-management`（修改）：
  - 用户实体扩展 `role` 字段（`客户` 默认 / `运营` / `客服`）：角色是 B 端权限门禁的事实来源，内聚于用户账户边界。
  - 用户生命周期状态机 `正常 ↔ 禁用`：`setStatus` 状态流转（Domain 校验状态值合法 + 幂等）与登录/会话门禁（`assertUserEnabled`）同属 User Context。
  - 用户列表/检索/详情：Service 层编排（`UserRepo.findAll` 过滤 + `OrderRepo` 聚合），HTTP 层做会话与角色门禁。
- **Order Context（只读消费）**：`GET /api/admin/users/:id` 复用 `Order.userId` 归属做订单聚合（仅查询，不改 Order 行为）。
- 跨边界影响：不改 Coupon/Cart 领域行为；购物车/优惠券归属已收口到会话 userId（session Story 已落地），B 端用户管理只读消费归属事实。

## Process Delta (流程影响)

| 流程节点 | 现状（Story 3 后） | 本变更 | 后续 |
| --- | --- | --- | --- |
| `L1-06 履约与完成` | B 端订单列表按订单号/用户 ID 检索 | **B 端用户管理按手机号/昵称定位用户，下钻订单聚合**（R-ADM-002/003/004），客诉定位闭环 | — |
| `L2-01 进入结算` | 登录/会话门禁（C 端） | **B 端权限门禁**：用户管理入口仅运营角色（R-ADM-001）；客服无权限（R-ADM-007） | — |
| `L3-02 执行资格校验` | 禁用用户禁止登录（R-LOG-003）/会话失效（R-SES-006） | **禁用状态来源 = B 端启停动作**；启用恢复登录（R-ADM-006） | — |

> 说明：本变更不修改 L3 规则流节点语义；「正常↔禁用」状态流转为 User Context 新增领域状态约束（Domain Model Sync 落位）。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **判定**：`Needs Sync: Yes`（触发项：新增 B 端用户管理泳道节点 + capability 分布变化）。
- **触发项**：
  1. **新增** B 端用户管理泳道节点（`SB-BACKSTAGE-*` 扩展）：`GET /api/admin/users`（列表/检索）、`GET /api/admin/users/:id`（详情+订单聚合）、`PATCH /api/admin/users/:id/status`（禁用/启用）——story.md 治理映射「新增 B 端用户管理泳道节点（待 Baseline Sync 落位）」。
  2. `SB-BACKSTAGE-04`：复用 `GET /api/orders` 归属查询语义（`/api/admin/users/:id` 聚合该用户订单）。
  3. `SB-STAGE-06` / `SB-CUSTOMER-06`：订单归属真实用户后 B 端按用户聚合回查（数据源一致）。
  4. `user-admin` capability 状态从「规划中」→「已落地」；`account-management`/`user-session` 状态确认「已落地」。
- **计划更新部位**：`docs/baseline/service_blueprint.html` 的 SB-BACKSTAGE 泳道新增用户管理节点（或 SB-OPS 泳道标注用户管理活动）、capability 分布表新增 `user-admin` 行。
- **执行时机**：按 SOP 分层 Sync 原则，本 change **仅执行 Spec Sync**；蓝图为 Epic 级基线，待 Epic 全部 Story 归档后由 `/opsx:baseline/sync` 统一回流（本变更与之合并到 Epic 级统一回流）。

## Domain Model Sync Assessment (领域模型同步评估)

- **判定**：`Needs Sync: Yes`（触发项：新增 capability taxonomy + 用户状态机 + BC 扩展 + userId 归属语义）。
- **触发项**：
  1. **新增 taxonomy `user-admin`**：BC→Capability 映射新增 `bc-user → cap-user-admin` 边（User Context 治理 B 端用户管理）。
  2. **User Aggregate 扩展**：`User` 新增 `role` 字段（`客户`/`运营`/`客服`）；状态机 `正常 ↔ 禁用`（注册起点 `正常`，B 端启停动作迁移）。
  3. **Domain Event/Command**：新增 `UserDisabled` / `UserEnabled` 事件、`DisableUser` / `EnableUser` 命令（Event-Storming 矩阵回流）。
  4. **userId 归属语义**：`Order.userId` 由占位 `user_dev` → 真实注册用户（session Story 已落地）；B 端用户管理只读消费该归属（订单聚合）。
- **计划更新部位**：`docs/baseline/domain_model.html` 的 Bounded Context Map（新增 User Context）、对象关系图（User 节点 + Order.userId 引用）、状态机（User 状态机）、Event Storming 矩阵（User 命令/事件/策略/读模型）、BC→Capability 映射表（`account-management`/`user-session`/`user-admin` 三条边）。
- **执行时机**：同上，Epic 归档后 `/opsx:baseline/sync` 统一执行（本 change 仅 Spec Sync）。

## Goals / Non-Goals

**Goals:**
- B 端用户管理 API 三件套：`GET /api/admin/users`（列表+检索）、`GET /api/admin/users/:id`（详情+订单聚合）、`PATCH /api/admin/users/:id/status`（禁用/启用）。
- 运营角色权限门禁：用户管理接口仅 `role = 运营` 会话可访问；客服/未登录返回 403，不泄露手机号等敏感信息（R-ADM-001/007）。
- 禁用联动：禁用后该用户会话立即失效（复用 `assertUserEnabled` 门禁，403 `USER_DISABLED`）+ 禁止登录（R-LOG-003 已有）；启用后恢复登录（R-ADM-006）。
- 前端 B 端入口：侧边栏新增「用户管理」菜单（仅运营角色渲染）；列表/检索/详情抽屉/禁用启用切换对齐原型 `admin-users.html`。
- 既有 E2E 回归不倒退：register/login/session/order_lifecycle/mvp_trading 场景数不倒退。

**Non-Goals:**
- 用户资料编辑（昵称/手机号修改，Q-5 只读）、密码重置、用户数据导出/批量操作、客服受限视图（story.md Out of Scope）。
- 改造既有 B 端商品/订单/优惠券管理链路的鉴权（历史行为不在本 Story 范围，避免回归风险）。
- 禁用后主动删除该用户全部会话记录（保持既有「惰性失效」语义：`assertUserEnabled` 门禁即时拒绝任何访问，且保留 403 专属提示，见 D2）。
- 防止运营禁用自身账户的自我保护规则（story.md 未要求，属后续增强）。
- 历史 `user_dev` 订单归属迁移（Q-6：仅新订单绑定真实用户）。

## Decisions (技术决策)

### D1: 用户实体新增 `role` 字段（`客户` / `运营` / `客服`），注册默认 `客户`
- **选择**：`User.role` 默认 `'客户'`；B 端用户管理接口校验 `role === '运营'`。运营/客服账号不预置进 `createServer()` 初始数据（避免破坏既有集成测试对 `user_1001` 起始序列的硬断言），E2E 通过注册 API + 测试后门 `POST /api/__test/user-role`（NODE_ENV=test）动态创建并提升角色。
- **理由**：角色是权限门禁的最小事实来源；对齐 story.md「运营陈晓芸已登录 B 端后台（运营角色）/客服角色账号」；测试后门模式复用 ISSUE-012 既定方案（`/api/__test/user-status`），避免种子数据与既有测试序列冲突。
- **替代方案**：预置运营种子用户 —— 破坏集成测试 `user_1001` 序列断言与注册 E2E「全新注册」假设，否决。

### D2: 禁用会话失效沿用「惰性门禁」而非主动删除会话
- **选择**：禁用动作只更新 `User.status`，不遍历删除该用户会话；既有 `AuthService.getSessionUser` 的 `assertUserEnabled` 门禁使该用户任何后续访问即时返回 403 `USER_DISABLED`（R-SES-006 语义，account_session E2E 已覆盖）。启用后（status 恢复 `正常`）同一会话/重新登录均可恢复。
- **理由**：「禁用即失效」的消费者语义已由门禁保证（任何访问被拒）；主动删会话会把 403 `USER_DISABLED`（专属提示「该账户已被禁用…」）退化为 401 `UNAUTHORIZED`（「请先登录」），破坏既有 account_session E2E 对禁用提示的断言，且引入跨表清理复杂度。
- **替代方案**：`SessionRepo.deleteByUserId` 主动清理 —— 改变既有错误语义与 E2E 契约，否决。

### D3: 新增 `AdminUserService`（Service 层），HTTP 层新增 `requireAdminRole(req, authService)` 门禁
- **选择**：
  - `AdminUserService`（`services/userAdmin.js`）：`list({ keyword })`（全量用户 + 订单数聚合 + 注册时间倒序 + 手机号/昵称模糊过滤）、`getDetail(id)`（基础信息 + 该用户订单倒序聚合）、`setStatus(id, status)`（Domain 校验状态值 + 幂等）。
  - HTTP 层 `requireAdminRole`：解析 Bearer → `authService.getSessionUser(token)`（复用会话校验 + 禁用门禁）→ 校验 `user.role === '运营'`；无会话/非运营抛 `FORBIDDEN`（403）。
- **理由**：四层架构约束（HTTP 不直接碰 Repo/Domain）；`getSessionUser` 已含禁用门禁，运营被禁用同样被拦截（自洽）；Service 层编排保持 Domain 零依赖。
- **边界**：用户管理接口放在 `/api/admin/users*` 路径，与既有 `/api/admin/*`（商品/订单/优惠券）B 端路径命名对齐，但**仅本组接口**加角色门禁（Non-Goals 明确）。

### D4: 关键词检索为「手机号包含 或 昵称包含」的不区分大小写包含匹配
- **选择**：`keyword` 空/空白 → 返回全量；非空 → `phone.includes(k)` || `nickname.toLowerCase().includes(k)`（k 为 trim + 小写）。
- **理由**：对齐原型 `admin-users.html` 检索交互（`u.phone.includes(kw) || u.nickname.includes(kw)`）与 R-ADM-003「按手机号或昵称关键词过滤；空关键词返回全量」。

### D5: 状态流转接口契约 `PATCH /api/admin/users/:id/status` body `{ status: "正常" | "禁用" }`
- **选择**：body 直接携带目标状态值（与领域存储值一致，避免 action 语义二次映射）；Domain 层新增 `assertUserStatusValue(status)`（仅允许 `正常`/`禁用`，否则 `INVALID_STATUS` 400）；`setStatus` 幂等（同状态重复设置成功）。
- **理由**：R-ADM-005/006 明确「状态恢复/变为」语义；`status` 字段语义与 C 端门禁消费一致（`assertUserEnabled` 判断 `status === '禁用'`）。

### D6: 前端用户管理入口仅运营角色渲染 + 403 兜底提示
- **选择**：`isOperator = computed(() => currentUser?.role === '运营')`；侧边栏「账户中心」分组下「用户管理」链接 `v-if="isOperator"`（R-ADM-001）；`adminTab = 'user'` 视图在非运营态（越权进入）显示「无权限」面板。列表/详情/启停请求携带 `authHeaders()` 会话凭证；403 响应显示「无权限，仅运营角色可访问用户管理」。
- **理由**：R-ADM-001「入口仅运营角色可见」+ R-ADM-007「非运营不返回手机号」双端落实；后端 403 是最终防线，前端隐藏入口是体验层约束。

### D7: E2E 运营/客服账号动态创建（注册 API + 角色后门）
- **选择**：E2E Given 步骤通过注册 API 创建 运营陈晓芸（`13600000001`，role 提升为 运营）、客服小赵（`13600000002`，role 客服），并将会话凭证写入 localStorage（复用 `ensureLoggedIn` 模式）；用户列表断言目标用户用独立注册的用户（林晓明 `13888217536`、王强 `15876543210`），避免与既有 register/login E2E 的手机号互斥（ISSUE-012 经验）。
- **理由**：角色后门（`/api/__test/user-role`）与既有 `/api/__test/user-status` 同构；E2E 场景间 reset 隔离保证确定性。
- **替代方案**：种子预置运营账号 —— 破坏 user 序列，否决（同 D1）。

## Risks / Trade-offs

- **[角色门禁仅覆盖用户管理，未覆盖既有 B 端管理链路]** → Non-Goals 明确：本 Story 范围仅 R-ADM-001/007 限定的用户管理；既有商品/订单/优惠券管理鉴权为历史债务，记录至 tech debt，后续阶段统一治理。
- **[运营账号依赖角色后门/数据预置，真实生产需在 users.json 预置运营数据]** → 生产版（`server.prod.js`）角色字段持久化于 `users.json`，运营账号为运维预置数据；测试后门仅在 NODE_ENV=test 启用，生产不可用（安全可控）。
- **[惰性失效：禁用瞬间到下次请求之间存在窗口]** → 门禁即时拒绝任何访问，窗口无实际业务穿透（已登录页面刷新/请求即被拦），且保留 403 专属提示，满足 R-ADM-005「会话立即失效」的消费者语义。
- **[`orderCount` 聚合在用户量大时 O(n*m)]** → 当前 JSON 文件规模（几十用户/订单）下可接受；数据洞察阶段引入索引/读模型（Roadmap Phase C）。

## Open Questions

- 无。需求侧 Q-5（资料只读）、Q-6（历史 user_dev 不迁移）、权限约束（research 访谈记录 2）已在 idea.md/story.md 确认；运营自我保护（禁用自身）与客服受限视图为后续增强，不阻塞本变更。
