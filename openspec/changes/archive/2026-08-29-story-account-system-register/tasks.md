# Tasks: 用户注册（story-account-system-register）

> 实现版本：Node.js 后端（`ecommerce/ecommerce-mini`）＋ Vue 前端（`ecommerce/ecommerce-mini-frontend`）＋ E2E（`e2e-tests/`）。
> 依赖 `specs/account-management/spec.md`（行为契约）与 `design.md`（实现方案）。测试标签遵循 `docs/TESTING_STRATEGY.md` 金字塔。

## 1. 领域层（Domain）— 注册规则与密码安全（@unit）

- [x] 1.1 在 `src/domain/types.js` 增加 `User` 与 `Session` JSDoc 类型（id/phone/passwordHash/nickname/status/createdAt；token/userId/createdAt）
- [x] 1.2 在 `src/domain/logic.js` 增加 `assertPhoneFormat`（`1\d{10}`，非法抛 `INVALID_PHONE`）
- [x] 1.3 在 `src/domain/logic.js` 增加 `assertPasswordRule`（6~32 位，不足抛 `PASSWORD_TOO_SHORT`、超长抛 `PASSWORD_TOO_LONG`）
- [x] 1.4 在 `src/domain/logic.js` 增加 `assertNicknameRule`（必填 ≤20 字，空抛 `NICKNAME_REQUIRED`、超长抛 `NICKNAME_TOO_LONG`）
- [x] 1.5 在 `src/domain/logic.js` 增加 `defaultNickname(phone)`（未填时由手机尾号生成 `<尾号>用户`）
- [x] 1.6 在 `src/domain/logic.js` 增加 `hashPassword` / `verifyPassword`（`crypto.scryptSync` 加盐，存储格式 `scrypt:<salt>:<hash>`）
- [x] 1.7 编写领域测试：手机号格式 / 密码长度边界 / 昵称规则 / 默认昵称 / 哈希不可逆且可校验（含非法输入拒绝用例）

## 2. 仓储层（Repo）— 用户与会话持久化（@unit）

- [x] 2.1 在 `src/repo/memoryRepo.js` 增加 `UserRepo`（`save`/`findAll`/`findById`/`findByPhone`/`nextId`）
- [x] 2.2 在 `src/repo/memoryRepo.js` 增加 `SessionRepo`（`create(userId)` 生成 token / `findByToken`）
- [x] 2.3 编写仓储测试：手机号唯一查找、ID 序列自增、会话创建与按 token 解析 userId

## 3. 服务层（Service）— AuthService 注册用例（@unit）

- [x] 3.1 新建 `src/services/auth.js`：`AuthService.register({ phone, nickname, password })` 编排「格式校验 → 唯一性校验（`PHONE_ALREADY_REGISTERED`）→ 哈希 → 创建用户（status=正常）→ 创建会话」
- [x] 3.2 编写服务测试：注册成功（返回 user + sessionToken）、重复手机号抛 `PHONE_ALREADY_REGISTERED`、密码未明文入库（持久化记录无明文）

## 4. HTTP 层（Server）— 注册 API（@api）

- [x] 4.1 在 `src/http/server.js` 注入 `UserRepo`/`SessionRepo`/`AuthService`，新增 `POST /api/auth/register` 路由（201 返回 `{ user, sessionToken }`）
- [x] 4.2 错误映射：`INVALID_PHONE`→400「请输入 11 位有效手机号」、`PHONE_ALREADY_REGISTERED`→409「该手机号已注册，请直接登录」、`PASSWORD_TOO_SHORT`→400「密码至少 6 位」、`PASSWORD_TOO_LONG`→400「密码最多 32 位」、`NICKNAME_REQUIRED`→400「请输入昵称」、`NICKNAME_TOO_LONG`→400「昵称最多 20 字」
- [x] 4.3 `POST /api/__test/reset` 后门补充清空 userRepo/sessionRepo
- [x] 4.4 编写集成测试（@api）：合法注册 201 且含 sessionToken；重复手机号 409；非法手机号/短密码 400；响应体无密码明文

## 5. 前端（Vue）— 注册视图与会话持久化

- [x] 5.1 `App.vue` 增加 `viewMode = 'register'` 与 header「注册/登录」入口（未登录态展示）；`sessionToken`/`currentUser` 响应式状态 + localStorage 持久化（key `ecommerce_session`/`ecommerce_user`）
- [x] 5.2 注册视图：手机号/昵称/密码三栏表单、「显示密码」切换、字段级中文错误提示、手机号冲突提示「该手机号已注册，请直接登录」+ 跳转登录入口
- [x] 5.3 注册成功逻辑：调用 `POST /api/auth/register`，成功即持久化会话并展示「注册成功，已自动登录」横幅，登录态下 header 展示昵称；校验失败不提交
- [x] 5.4 前端构建通过（`./init.sh vue:build`）

## 6. E2E — Cucumber 用户旅程（@e2e）

- [x] 6.1 新建 `e2e-tests/features/account_register.feature`：3 条场景（正常主流程注册自动登录 / 手机号已注册冲突处理 / 非法输入校验），与 spec 中 @e2e 场景一一对应
- [x] 6.2 在 `e2e-tests/steps/` 增加注册步骤定义（打开注册页、填写表单、提交、断言横幅/错误提示/登录态）
- [x] 6.3 后端测试后门 `reset` 含预置已注册用户（`13912345678` 陈晓芸）用于冲突场景
- [x] 6.4 运行 `./init.sh e2e:run`，新场景全部通过

## 7. 验证与门禁（Hard Gates）

- [x] 7.1 `openspec validate --change "story-account-system-register"` PASS
- [x] 7.2 `./init.sh test:all`（Node 单测 + 集成测试 + Python 冒烟）PASS
- [x] 7.3 `./init.sh vue:build` 前端构建 PASS
- [x] 7.4 `./init.sh e2e:run` 全量 E2E（含既有场景回归）PASS，`verify.md` 记录实际场景数
- [x] 7.5 初始化并维护 `verify.md`（每项任务验证证据实时记录；Hard Gates 全 PASS 方可收尾）
