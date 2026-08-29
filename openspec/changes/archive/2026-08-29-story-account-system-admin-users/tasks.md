# Tasks: B 端用户管理（story-account-system-admin-users）

> 实现版本：Node.js 后端（`ecommerce/ecommerce-mini`）＋ Vue 前端（`ecommerce/ecommerce-mini-frontend`）＋ E2E（`e2e-tests/`）。
> 依赖 `specs/user-admin/spec.md` 与 `specs/account-management/spec.md`（行为契约）和 `design.md`（实现方案）。测试标签遵循 `docs/TESTING_STRATEGY.md` 金字塔。

## 1. 领域层 + 仓储层（Domain & Repo）— 用户角色与状态流转（@unit）

- [x] 1.1 `src/domain/types.js`：`User` JSDoc 增加 `role` 字段（`"客户" | "运营" | "客服"`，注册默认 `客户`）
- [x] 1.2 `src/domain/logic.js`：新增 `assertUserStatusValue(status)`（仅允许 `正常`/`禁用`，否则抛 `INVALID_STATUS`）
- [x] 1.3 编写领域测试（`__tests__/userAdmin.spec.js`）：状态值校验（合法通过/非法拒绝）；`assertUserEnabled` 对禁用抛 `USER_DISABLED`（回归确认）

## 2. 服务层（Service）— AdminUserService（@unit）

- [x] 2.1 新建 `src/services/userAdmin.js`：`AdminUserService(userRepo, orderRepo)`
  - `list({ keyword })`：全量用户 + `orderCount` 聚合（`Order.userId` 匹配）+ 注册时间倒序 + 关键词过滤（手机号包含 **或** 昵称包含，空关键词返回全量，响应脱敏无密码字段）
  - `getDetail(id)`：用户基础信息 + 该用户订单聚合（倒序）；用户不存在抛 `USER_NOT_FOUND`
  - `setStatus(id, status)`：Domain 校验状态值（`INVALID_STATUS`）→ 查找用户（`USER_NOT_FOUND`）→ 幂等更新 `status`（重复设置同值成功）
- [x] 2.2 编写服务测试：列表含订单数聚合与倒序；手机号/昵称检索；空关键词全量；详情聚合仅本用户订单；`USER_NOT_FOUND`；`setStatus` 正常/禁用/幂等/非法状态；DTO 无 `passwordHash`

## 3. HTTP 层（Server）— 运营角色门禁 + 用户管理路由 + 测试后门（@api）

- [x] 3.1 `src/http/server.js`：新增 `requireAdminRole(req, authService)`（解析 Bearer → `getSessionUser` → `role === '运营'`，否则抛 `FORBIDDEN`）；错误映射 `FORBIDDEN`→403「无权限，仅运营角色可访问用户管理」、`USER_NOT_FOUND`→404、`INVALID_STATUS`→400
- [x] 3.2 新增路由：`GET /api/admin/users`（`?keyword=` 检索）、`GET /api/admin/users/:id`（详情+订单聚合）、`PATCH /api/admin/users/:id/status`（body `{ status }`）——均经 `requireAdminRole`
- [x] 3.3 新增测试后门 `POST /api/__test/user-role`（NODE_ENV=test）：按手机号设置 `role`（供 E2E 创建运营/客服账号）
- [x] 3.4 `src/http/server.prod.js`（FileStore 生产版）同步：`requireAdminRole`、用户管理三路由（读 `users.json`/`orders.json`）
- [x] 3.5 编写集成测试（@api）：运营角色列表/检索/详情/启停全通过；客服（role=客服）访问用户列表 403 且无敏感数据；未登录 403；禁用后该用户持会话访问订单 403 `USER_DISABLED`；启用后可重新登录；`INVALID_STATUS` 400；`USER_NOT_FOUND` 404

## 4. 前端（Vue）— 用户管理入口与视图

- [x] 4.1 `App.vue`：`isOperator` computed（`currentUser?.role === '运营'`）；侧边栏新增「账户中心」分组 +「用户管理」链接（`adminTab = 'user'`，`v-if="isOperator"`，R-ADM-001）
- [x] 4.2 `adminTab === 'user'` 视图：检索区（关键词 + 搜索/重置）+ 用户列表表格（用户ID/昵称/手机号/订单数/注册日期/状态/操作）+ 详情抽屉（基础信息 + 该用户订单聚合）+ 禁用/启用切换，对齐原型 `admin-users.html`
- [x] 4.3 数据请求：`fetchAdminUsers(keyword)`、`fetchAdminUserDetail(id)`、`toggleUserStatus(id, status)` 携带 `authHeaders()`；403 响应显示「无权限，仅运营角色可访问用户管理」；非运营越权进入 `user` tab 显示无权限面板
- [x] 4.4 前端构建通过（`./init.sh vue:build`）

## 5. E2E — Cucumber 用户旅程（@e2e）

- [x] 5.1 新建 `e2e-tests/features/account_admin_users.feature`：3 条场景（运营按手机号检索并下钻用户订单 / 禁用用户导致会话失效跨 Story 联动 / 客服账号访问用户管理被拒），与 specs 中 @e2e 场景一一对应
- [x] 5.2 在 `e2e-tests/steps/account_admin_users.js` 增加步骤定义：运营/客服账号动态创建（注册 + `/api/__test/user-role` 提升角色 + 会话写入 localStorage）、进入用户管理、检索断言、详情下钻断言、禁用/启用断言、会话失效断言、客服无入口断言
- [x] 5.3 运行 `./init.sh e2e:run`，新场景全部通过（含既有场景回归，场景数不倒退）——24 scenarios / 132 steps 全 PASS（21 → 24 增长）

## 6. 验证与门禁（Hard Gates）

- [x] 6.1 `openspec validate story-account-system-admin-users` PASS
- [x] 6.2 `./init.sh test:all`（Node 单测 + 集成测试 + Python 冒烟）PASS（Node 150 pass / Python 12 pass）
- [x] 6.3 `./init.sh vue:build` 前端构建 PASS
- [x] 6.4 `./init.sh e2e:run` 全量 E2E（含既有场景回归）PASS，`verify.md` 记录实际场景数（24 scenarios / 132 steps）
- [x] 6.5 初始化并维护 `verify.md`（每项任务验证证据实时记录；Hard Gates 全 PASS 方可收尾）
