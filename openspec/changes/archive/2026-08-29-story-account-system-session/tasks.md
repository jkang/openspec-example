# Tasks: 会话保持与退出（story-account-system-session）

> 实现版本：Node.js 后端（`ecommerce/ecommerce-mini`）＋ Vue 前端（`ecommerce/ecommerce-mini-frontend`）＋ E2E（`e2e-tests/`）。
> 依赖 `specs/user-session/spec.md` 与 `specs/order-management/spec.md`（行为契约）和 `design.md`（实现方案）。测试标签遵循 `docs/TESTING_STRATEGY.md` 金字塔。

## 1. 领域层 + 仓储层（Domain & Repo）— 会话生命周期规则（@unit）

- [x] 1.1 确认复用 `assertUserEnabled`（Story 2 已就绪，不重复实现）；`SessionRepo` 新增 `delete(token)`（删除 token → userId 映射，幂等）
- [x] 1.2 编写仓储测试：`SessionRepo.delete` 删除后 `findByToken` 返回 undefined；删除不存在的 token 不抛错

## 2. 服务层（Service）— AuthService 会话校验与退出（@unit）

- [x] 2.1 在 `src/services/auth.js` 增加 `AuthService.getSessionUser(sessionToken)`：`findByToken`（未找到抛 `UNAUTHORIZED`）→ `findById`（用户不存在抛 `UNAUTHORIZED`）→ `assertUserEnabled`（禁用抛 `USER_DISABLED`）→ 返回脱敏用户 DTO
- [x] 2.2 在 `src/services/auth.js` 增加 `AuthService.logout(sessionToken)`：存在则 `sessionRepo.delete(sessionToken)`，幂等
- [x] 2.3 编写服务测试：有效会话解析出用户；无效/伪造 token 抛 `UNAUTHORIZED`；禁用用户抛 `USER_DISABLED`（R-SES-006）；logout 销毁后再次解析失败；logout 不存在的 token 不抛错；返回 DTO 无密码字段

## 3. HTTP 层（Server）— 会话校验中间件 + 退出登录 + 归属收口（@api）

- [x] 3.1 在 `src/http/server.js` 增加 `requireSession(req)` 辅助：解析 `Authorization: Bearer <token>` → `authService.getSessionUser`；错误映射 `UNAUTHORIZED`→401「请先登录」、`USER_DISABLED`→403「该账户已被禁用，如有疑问请联系平台客服」
- [x] 3.2 需登录接口接入：`POST /api/orders`、`POST /api/checkout`、`GET /api/orders`（我的订单）——userId 从会话解析，**移除对 `body.userId` / `?userId=` 参数的信任**（R-SES-007/003）
- [x] 3.3 购物车归属：`POST /api/cart/items`、`POST /api/cart/remove` 有会话时按会话 userId 归属，无会话时沿用游客 `user_dev`（设计 D3）
- [x] 3.4 新增 `POST /api/auth/logout` 路由：销毁会话凭证（幂等）
- [x] 3.5 在 `src/http/server.prod.js`（FileStore 生产版）同步：会话校验中间件、logout 路由、orders 归属改造；`SessionFileRepo` 增加 `delete(token)`（含 FileStore `has`/`delete`）
- [x] 3.6 编写集成测试（@api）：无会话访问 GET /api/orders → 401；无会话 POST /api/orders → 401；有效会话下单 → 201 且 `Order.userId` = 会话用户；会话用户查询我的订单只返回自己的订单（归属隔离，含 `?userId=他人` 参数也不越权）；退出后原凭证访问 → 401；禁用用户持会话访问 → 403 `USER_DISABLED` 且无订单数据

## 4. 前端（Vue）— 退出登录 + 登录拦截回跳 + 归属凭证

- [x] 4.1 `App.vue` header 登录态渲染「退出登录」按钮：`POST /api/auth/logout`（Bearer 凭证）→ 清除 localStorage（`ecommerce_session`/`ecommerce_user`）→ 重置登录态回未登录（R-SES-005）
- [x] 4.2 `goToOrders()` 未登录拦截：无 `sessionToken` → 切登录视图并记录 `loginRedirect='orders'`；登录成功回跳目标页（R-SES-004）；header「我的订单」仅登录态渲染
- [x] 4.3 `fetchMyOrders` / 购物车 / 下单请求携带 `Authorization: Bearer <sessionToken>`；401 响应清会话并跳登录（R-SES-002）
- [x] 4.4 前端构建通过（`./init.sh vue:build`）

## 5. E2E — Cucumber 用户旅程（@e2e）

- [x] 5.1 新建 `e2e-tests/features/account_session.feature`：4 条场景（刷新保持登录态 + 我的订单归属隔离 / 未登录访问我的订单被拦截并回跳 / 退出登录销毁会话 / 禁用用户会话失效引导重新登录），与 specs 中 @e2e 场景一一对应
- [x] 5.2 在 `e2e-tests/steps/` 增加会话步骤定义（注册并登录前置、刷新保持断言、退出登录断言、禁用后访问校验失败、未登录访问我的订单跳转登录断言）
- [x] 5.3 **既有回归改造**：`order_lifecycle.feature` 与 `mvp_trading.feature` 中依赖下单的场景前置「买家已注册并登录」Given 步骤（新业务规则：未登录不可下单，ISSUE-013 落地）
- [x] 5.4 运行 `./init.sh e2e:run`，新场景全部通过（含既有场景回归，场景数不倒退）——21 scenarios / 116 steps 全 PASS（17 → 21 增长）

## 6. 验证与门禁（Hard Gates）

- [x] 6.1 `openspec validate story-account-system-session` PASS
- [x] 6.2 `./init.sh test:all`（Node 单测 + 集成测试 + Python 冒烟）PASS（Node 122 pass / Python 12 pass）
- [x] 6.3 `./init.sh vue:build` 前端构建 PASS
- [x] 6.4 `./init.sh e2e:run` 全量 E2E（含既有场景回归）PASS，`verify.md` 记录实际场景数（21 scenarios / 116 steps）
- [x] 6.5 初始化并维护 `verify.md`（每项任务验证证据实时记录；Hard Gates 全 PASS 方可收尾）
