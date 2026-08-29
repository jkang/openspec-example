# Design: 会话保持与退出（story-account-system-session）

## Context

动机见 `proposal.md - Why`：register/login 已交付用户池与会话创建，但会话凭证未被全局消费，「我的订单」与下单仍以调用方自报 `userId`（缺省 `user_dev`）归属。本变更在既有 Node.js 四层架构（HTTP → Service → Domain → Repo）内补齐会话生命周期闭环（全局校验 / 退出销毁 / 禁用失效），并将 order-management 的归属主体收口到会话 userId。

现状约束（复用 Story 1/2 基础设施）：
- `SessionRepo`（`create`/`findByToken`）已落地，生产版 `SessionFileRepo`（`sessions.json` FileStore）；本变更需补充 `delete(token)`。
- `AuthService`（`register`/`login`/`toPublicUser`）已就绪，`assertUserEnabled`（禁用门禁）在 Domain 层（Story 2 新增）。
- `OrderService.listByUser(userId)` 已实现倒序归属查询；HTTP 层 `GET /api/orders?userId=` 信任客户端参数，`POST /api/orders`/`POST /api/checkout` 信任 `body.userId`（缺省 `user_dev`）。
- 前端 `App.vue` 已有 `persistSession`（localStorage `ecommerce_session`/`ecommerce_user`）、登录/注册视图；`goToOrders` 未做未登录拦截；无「退出登录」入口。
- 需求侧 story.md 业务规则 R-SES-001~007 + 4 条 E2E 旅程为本变更的行为契约，delta specs 已逐条承接。

## Domain Boundary Impact (领域边界影响)

- **User Context**（Story 1/2 已声明的认证 BC）承载 `user-session` 扩展：
  - 会话校验：`getSessionUser(token)` = 解析 token → userId → 校验用户存在且 `status !== 禁用`（`assertUserEnabled`）。会话生命周期（创建/校验/销毁）与用户身份强内聚，归 User Context。
  - 会话销毁：`logout(token)` → `sessionRepo.delete(token)`（幂等：token 不存在也成功）。
- **Order Context（修改）** 承载 `order-management` 归属收口：
  - 下单/结算的 `userId` 由会话解析（Service 层无感知，HTTP 层负责从会话解析后传入）；`Order.userId` 语义从"调用方自报"改为"当前登录用户"。
  - 「我的订单」`GET /api/orders` 归属由会话解析（替代客户端 `?userId=` 参数）。
- 跨边界影响：本变更不改 Coupon/Cart 领域行为；购物车归属扩展为「有会话按会话 userId，无会话按游客」，仅 HTTP 层解析差异。

## Process Delta (流程影响)

| 流程节点 | 现状（Story 2 后） | 本变更 | 后续 Story |
| --- | --- | --- | --- |
| `L1-04 下单结算` | 登录成功创建会话，下单仍 `user_dev` 归属 | **下单绑定当前会话 userId**（替代 user_dev，R-SES-007）；未登录下单被拦截 | admin-users：B 端禁用联动 |
| `L1-06 履约与完成` | 我的订单按客户端自报 userId 查询 | **按会话 userId 归属查询**（R-SES-003），未登录 401 引导登录（R-SES-004） | — |
| `L2-01 进入结算` | 前端有登录引导入口，后端无强制校验 | **后端会话全局校验中间件**（下单/结算/我的订单，R-SES-002）+ 前端整页跳转回跳 | — |

> 说明：本变更不修改 L3 规则流节点语义；会话校验为 L2-01 前置环节的运行时实现。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **判定**：`Needs Sync: Yes`（触发项：SB-BACKSTAGE-04 归属查询改造 + SB-CUSTOMER 泳道 capability 分布变化）。
- **触发项**：
  1. `SB-BACKSTAGE-04`：`GET /api/orders?userId=` 归属查询改造为会话解析 userId；新增 `POST /api/auth/logout` 会话销毁接口。
  2. `SB-CUSTOMER-04` / `SB-CUSTOMER-06`：客户动作新增「携带会话凭证下单 / 未登录访问我的订单被引导登录（回跳）」触点。
  3. `SB-STAGE-04` / `SB-STAGE-06`：阶段内订单归属与我的订单入口的登录态要求变化。
- **计划更新部位**：`docs/baseline/service_blueprint.html` 的 SB-BACKSTAGE-04 单元格（系统 Feature 栏）、SB-CUSTOMER-04/06 单元格（客户动作/系统 Feature 两栏）。
- **执行时机**：按 SOP 分层 Sync 原则，本 change **仅执行 Spec Sync**；蓝图为 Epic 级基线，待 Epic 全部 Story 归档后由 `/opsx:baseline/sync` 统一回流（Story 1/2 已挂起同类触发项，本变更与之合并到 Epic 级统一回流）。

## Domain Model Sync Assessment (领域模型同步评估)

- **判定**：`Needs Sync: Yes`（触发项：Order/Cart 归属语义更新）。
- **触发项**：
  1. `Order.userId` 语义更新：从「调用方自报/占位 user_dev」→「会话解析的当前登录用户」（对象关系不变，语义变化）。
  2. `Cart` 归属语义更新：从「固定 userId（body 自报）」→「有会话按会话 userId，无会话按游客」。
- **计划更新部位**：`docs/baseline/domain_model.html` 的 Order/Cart Aggregate 归属字段语义说明；BC→Capability 映射无新增边（`user-session` 边已在 Story 2 声明）。
- **执行时机**：同上，Epic 归档后 `/opsx:baseline/sync` 统一执行（本 change 仅 Spec Sync）。

## Goals / Non-Goals

**Goals:**
- 会话生命周期闭环：全局校验中间件（下单/结算/我的订单）→ 无有效会话 401；退出登录销毁服务端会话；禁用用户会话立即失效。
- 归属收口：「我的订单」`GET /api/orders` 按会话 userId 查询（替代客户端 `?userId=`）；下单/结算 `Order.userId` 绑定当前会话用户（替代 `user_dev`）。
- 前端登录拦截与回跳：未登录访问「我的订单」→ 整页跳转登录并回跳；登录态展示「退出登录」按钮，退出后回到未登录态。
- 既有 E2E 回归不倒退：order_lifecycle / mvp_trading 中下单场景改为先注册登录，场景数不倒退。

**Non-Goals:**
- 会话过期时间自动刷新/续期策略、多设备会话并行管理（story.md Out of Scope，会话长期有效）。
- 购物车跨端同步完整实现（仅归属字段就绪）。
- B 端用户管理禁用动作入口（Story 4 admin-users；本变更仅消费 `status=禁用` 数据做会话失效判定）。
- 历史 `user_dev` 订单归属迁移（Q-6）。

## Decisions (技术决策)

### D1: 会话校验中间件统一错误码：`UNAUTHORIZED`（401）与 `USER_DISABLED`（403）
- **选择**：缺失/无效会话凭证 → `UNAUTHORIZED` 401「请先登录」；会话有效但归属用户被禁用 → `USER_DISABLED` 403「该账户已被禁用，如有疑问请联系平台客服」。
- **理由**：R-SES-002 要求无有效会话 401；R-SES-006 要求禁用立即失效且有明确提示（与登录拦截提示一致，产品显式区分）。
- **替代方案**：全部 401 —— 禁用用户无法获得明确原因，前端无法展示专属提示，否决。

### D2: `AuthService.getSessionUser` 供 HTTP 层中间件消费（HTTP → Service 单向依赖不变）
- **选择**：HTTP 层新增 `requireSession(req)` 辅助函数：解析 `Authorization: Bearer <token>` → `authService.getSessionUser(token)`（`findByToken` → 用户存在性 → `assertUserEnabled`）。服务层 `getSessionUser` 返回脱敏用户 DTO，HTTP 层从中取 `id` 作为归属 userId。
- **理由**：四层架构约束（HTTP 不直接碰 Repo/Domain）；`assertUserEnabled` 复用 Story 2 领域规则，零重复实现。
- **边界**：`getSessionUser` 抛 `UNAUTHORIZED`（会话不存在）或 `USER_DISABLED`（用户被禁用），由 HTTP 层错误映射统一处理。

### D3: 需登录接口清单（严格 401）与购物车归属（宽松游客）分层
- **选择**：
  - **严格 401**：`POST /api/orders`、`POST /api/checkout`、`GET /api/orders`（我的订单）——无有效会话即拦截（R-SES-002/004/007）。
  - **购物车归属（宽松）**：`POST /api/cart/items`、`POST /api/cart/remove` 有会话时按会话 userId 归属；无会话时允许游客加购（归 `user_dev` 游客购物车），不拦截。
- **理由**：idea.md 硬性约束「未登录不可下单/查看我的订单」只封顶下单与订单查询；旅程 A「浏览商品加入购物车（无需登录）」明确允许游客加购。R-SES-002 中「购物车归属」指登录用户购物车跟随账户（会话解析归属），而非封禁游客加购。
- **替代方案**：购物车也严格 401 —— 破坏游客加购旅程，与 idea.md 冲突，否决。

### D4: 前端登录拦截 + 回跳：`goToOrders` 检查会话，`loginRedirect` 状态存目标页
- **选择**：`goToOrders()` 未登录（无 `sessionToken`）时设 `viewMode='login'` 并记录 `loginRedirect='orders'`；登录成功 `submitLogin` 检查 `loginRedirect`，非空则回跳目标页并清空。header「我的订单」按钮仅登录态渲染；未登录态经「注册 / 登录」入口进入登录页。
- **理由**：对齐原型 `account-session.html`（未登录态展示引导登录卡片）；R-SES-004 整页跳转 + 回跳的最小实现（store 内视图切换，无真实路由）。
- **边界**：401 响应（会话失效）同样触发清会话 + 跳登录。

### D5: 退出登录：服务端销毁 + 前端清 localStorage
- **选择**：header 登录态渲染「退出登录」按钮 → `POST /api/auth/logout`（携带 Bearer 会话凭证）→ 服务端 `sessionRepo.delete(token)` → 前端清除 `ecommerce_session`/`ecommerce_user`、重置 `sessionToken`/`currentUser`/`currentUserId`，回到 store 视图（未登录态）。
- **理由**：R-SES-005 要求「后端销毁会话凭证 + 前端清除登录态」双端动作；服务端销毁保证凭证不可复用（即使 localStorage 未清）。

### D6: 既有下单类 E2E 前置改为「注册并登录」Given 步骤
- **选择**：`order_lifecycle.feature` / `mvp_trading.feature` 中依赖下单的场景，在 Given 阶段先经注册 API 创建用户 + localStorage 写入会话凭证（新增步骤「买家已注册并登录」），使前端处于登录态再走 UI 下单链路。
- **理由**：R-SES-002/007 落地后未登录不可下单，既有游客下单 E2E 必须反映新业务规则；场景数与步骤数随之增长（不倒退），符合 TESTING_STRATEGY §2 门禁。
- **替代方案**：后端放行游客下单 —— 违反 R-SES-007，否决。

## Risks / Trade-offs

- **[购物车游客/登录双归属导致加购后登录丢失游客购物车]** → 购物车跨端同步为 Out of Scope；登录后 `fetchCart()` 拉取账户购物车（可能为空），游客加购商品不迁移。产品已确认（Q-6 关联历史数据不迁移）。
- **[401 拦截影响既有 admin/guest API 消费方]** → `GET /api/admin/orders`（B 端）、`GET /api/products`（公开）不受影响；仅 C 端订单归属链路拦截。
- **[会话长期有效（无过期）的合规风险]** → Out of Scope（story.md 明确本阶段会话长期有效），Epic 级议题待后续阶段。
- **[禁用判定在中间件中访问用户存储的 IO 开销]** → 内存 Map 与 FileStore 均为常量级查找，可接受。

## Open Questions

- 无。需求侧 Q-4（整页跳转 + 回跳）、Q-6（历史 user_dev 不迁移）已在 idea.md 确认；会话过期策略由 Epic 级后续决策，不阻塞本变更。
