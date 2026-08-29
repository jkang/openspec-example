# Tasks: 用户登录（story-account-system-login）

> 实现版本：Node.js 后端（`ecommerce/ecommerce-mini`）＋ Vue 前端（`ecommerce/ecommerce-mini-frontend`）＋ E2E（`e2e-tests/`）。
> 依赖 `specs/account-management/spec.md` 与 `specs/user-session/spec.md`（行为契约）和 `design.md`（实现方案）。测试标签遵循 `docs/TESTING_STRATEGY.md` 金字塔。

## 1. 领域层（Domain）— 登录规则（@unit）

- [x] 1.1 在 `src/domain/logic.js` 增加 `assertUserEnabled(user)`：`status === '禁用'` 时抛 `USER_DISABLED`（账户级门禁，登录专用）
- [x] 1.2 确认复用 `assertPhoneFormat` / `verifyPassword`（Story 1 已就绪，不重复实现）
- [x] 1.3 编写领域测试：禁用状态抛出 `USER_DISABLED`、正常状态通过；`verifyPassword` 正确/错误密码比对（含非法存储格式容错）

## 2. 服务层（Service）— AuthService 登录用例（@unit）

- [x] 2.1 在 `src/services/auth.js` 增加 `AuthService.login({ phone, password })` 编排：「输入归一 `String(phone).trim()` → 格式校验 → `findByPhone`（未找到抛 `INVALID_CREDENTIALS`）→ 禁用检查抛 `USER_DISABLED` → `verifyPassword` 失败抛 `INVALID_CREDENTIALS` → 创建会话 → 返回 `{ user: toPublicUser(user), sessionToken }`」
- [x] 2.2 编写服务测试：登录成功返回 user+sessionToken；密码错误抛 `INVALID_CREDENTIALS`；账号不存在抛 `INVALID_CREDENTIALS`（提示一致）；禁用用户（含密码错误时）抛 `USER_DISABLED`；数字型手机号归一后仍可登录（ISSUE-011 回归）；响应 DTO 无密码字段

## 3. HTTP 层（Server）— 登录 API（@api）

- [x] 3.1 在 `src/http/server.js` 新增 `POST /api/auth/login` 路由（201 返回 `{ user, sessionToken }`）
- [x] 3.2 错误映射：`INVALID_PHONE`→400「请输入 11 位有效手机号」、`INVALID_CREDENTIALS`→401「手机号或密码不正确，请重试」、`USER_DISABLED`→403「该账户已被禁用，如有疑问请联系平台客服」
- [x] 3.3 新增测试后门 `POST /api/__test/user-status`（NODE_ENV=test 启用）置指定手机号为禁用，供登录 E2E 与集成测试使用（注：原方案「reset 预置用户」因与注册 E2E 的 13888217536 全新注册冲突而调整，见 verify.md 实施偏差）
- [x] 3.4 在 `src/http/server.prod.js`（FileStore 生产版）同步新增登录路由与错误映射
- [x] 3.5 编写集成测试（@api）：正确凭证 201 且含 sessionToken、响应无密码泄露；错误密码 401 `INVALID_CREDENTIALS`；账号不存在 401（与密码错误提示一致）；禁用用户 403 `USER_DISABLED` 且不创建会话；非法手机号 400

## 4. 前端（Vue）— 登录视图与会话恢复

- [x] 4.1 `App.vue` 增加 `viewMode = 'login'`；header「注册 / 登录」未登录态点击进入登录页（含「我的订单」未登录访问引导登录）
- [x] 4.2 登录视图：手机号/密码双栏表单、「显示密码」切换、忘记密码引导（跳转客服，无自助找回）、字段级中文错误提示、凭证错误/禁用拦截中文提示（对齐原型 `account-login.html`）
- [x] 4.3 登录成功逻辑：调用 `POST /api/auth/login`，成功即 `persistSession()` 持久化并展示「登录成功，{昵称}」横幅，header 展示昵称 + 「我的订单」入口；注册页「已有账户？直接登录」与注册冲突「去登录」链路切到登录视图
- [x] 4.4 前端构建通过（`./init.sh vue:build`）

## 5. E2E — Cucumber 用户旅程（@e2e）

- [x] 5.1 新建 `e2e-tests/features/account_login.feature`：4 条场景（正常主流程凭证正确登录成功 / 凭证错误不创建会话 / 禁用用户登录拦截 / 字段校验失败不提交），与 specs 中 @e2e 场景一一对应
- [x] 5.2 在 `e2e-tests/steps/` 增加登录步骤定义（进入登录页、填写手机号+密码、提交、断言成功横幅/错误提示/禁用提示/未创建会话）
- [x] 5.3 运行 `./init.sh e2e:run`，新场景全部通过（含既有注册场景回归）

## 6. 验证与门禁（Hard Gates）

- [x] 6.1 `openspec validate story-account-system-login` PASS
- [x] 6.2 `./init.sh test:all`（Node 单测 + 集成测试 + Python 冒烟）PASS
- [x] 6.3 `./init.sh vue:build` 前端构建 PASS
- [x] 6.4 `./init.sh e2e:run` 全量 E2E（含既有场景回归）PASS，`verify.md` 记录实际场景数（17 scenarios / 91 steps）
- [x] 6.5 初始化并维护 `verify.md`（每项任务验证证据实时记录；Hard Gates 全 PASS 方可收尾）