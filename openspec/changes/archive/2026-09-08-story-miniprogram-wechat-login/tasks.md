# Tasks: story-miniprogram-wechat-login

> 关联 proposal/specs/design：见 `openspec/changes/story-miniprogram-wechat-login/`
> 需求侧业务面：story.md（R-WX-001~011 + E2E 旅程 1/2/3/4，已 HITL 确认）| 原型：`epics/epic-miniprogram-channel/prototypes/miniprogram-wechat-login.html`（Epic 整体，已确认）
> 实现版本标注：Node.js = 后端（ecommerce/ecommerce-mini）｜Frontend = 前端（ecommerce/ecommerce-mini-frontend）｜E2E = 全局 e2e-tests
> 依赖底座（Story 1 已归档 2026-09-08）：`ChannelConfigRepo` / `GET|PUT /api/admin/channel/miniprogram`（渠道启用状态 + appid/appsecret 配置）、`requireRole` 门禁、用户/会话体系、`data/channel-config.json`

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：买家在微信小程序点击「微信一键登录」（openid 命中直连 / 未命中手机号绑定，撞号引导登录既有账号）；老客户跨端历史订单延续（同源账户）；渠道停用拒绝新登录；B 端禁用即失效。
- ① **smoke 主链路完整性**：`smoke.feature` 已覆盖核心交易主链路；本 change 是**新增登录因子**（微信授权），不改既有网页注册/登录/交易语义 → smoke 无需改动（既有网页链路回归必须保持）。
- ② **新增功能覆盖**：本 change 新增 @e2e 场景 =「老客户 openid 命中直连（历史订单延续）」「新客户微信快捷绑定建号」「撞号 → 提示登录既有账号再绑定」「渠道停用拒绝 CHANNEL_DISABLED」「禁用用户登录拒绝」→ **新建 `e2e-tests/features/miniprogram_wechat_login.feature`**（新 capability，独立 feature + steps 命名空间 `miniprogramWechatLogin_`），复用既有登录/后门基建。
- ③ **既有场景回归风险**：`User`/`Session` 结构扩展（openid 可空、channel 默认 WEB）为**向后兼容增量**（存量数据无字段 → 空/WEB）；既有 `/api/auth/login|register` 零改动 → 全量回归（account_login/register/session/admin_users/smoke 等）必须保持通过。
- **缺口落盘**：story.md 旅程 2 撞号场景需 @e2e（前端引导 + API 语义）；旅程 4 mock 可复现性以 @api 断言落盘；B 端禁用联动（旅程 3 场景 2）以 @api 断言。

## 1. 后端：User.openid + 微信授权登录/绑定（Node.js）

- [x] 1.1 `src/domain/types.js`：`User` 增加 `openid` 字段（可空）；`Session` 增加 `channel` 字段（默认 `'WEB'`）
- [x] 1.2 `src/repo/memoryRepo.js`：`UserRepo.findByOpenid(openid)`（openid 命中查询）；`SessionRepo.create(userId, channel)`（默认 WEB，保存 channel）
- [x] 1.3 `src/repo/fileRepo.js`：`UserFileRepo.findByOpenid`；`SessionFileRepo.create` 保存 channel（存量兼容：读取缺省 WEB）
- [x] 1.4 新建 `src/services/wechatGateway.js`（mock 微信网关，Q6）：`exchangeCodeForOpenid(code, config)`——`NODE_ENV=test` 查固定映射表（code_demo_001→openid_demo_001 / code_demo_002→openid_demo_002 / code_demo_003→openid_demo_003），未知 code 抛 `WECHAT_CODE_INVALID`；生产抛「真实微信网关未接入（资质后置 +X）」；`fetchPhoneByCode(code)` 同理（mock：phone_demo_001→13700005678）
- [x] 1.5 新建 `src/services/wechatAuth.js`：`WechatAuthService`——`loginWithCode(code)`（渠道门禁 CHANNEL_DISABLED → code2session 换 openid → findByOpenid 命中：会话(MINIPROGRAM) / 未命中：WECHAT_BIND_REQUIRED）、`bindByPhone(code|openid, phone)`（手机号未注册建号+绑定+登录 / 已注册：PHONE_EXISTS_NEED_LOGIN）、`bindOpenidToExisting(openid, userId, operatorToken)`（撞号场景：既有账号会话校验后写入，防越权）、复用 AuthService/既有领域函数
- [x] 1.6 `server.js` 新增路由：
  - `POST /api/auth/wechat/login`（body { code }）→ 201 登录 / CHANNEL_DISABLED / WECHAT_BIND_REQUIRED
  - `POST /api/auth/wechat/bind`（body { code, phone }）→ 建号登录 / PHONE_EXISTS_NEED_LOGIN
  - `POST /api/auth/wechat/bind-openid`（body { openid } + 既有账号会话）→ 200 绑定成功（撞号完成）
- [x] 1.7 单元测试（`__tests__/wechatAuth.spec.js` @unit）：mock 网关映射、openid 命中/未命中、绑定建号/撞号分支、channel 默认 WEB、toPublicUser 语义
- [x] 1.8 API 测试（@api）：老客户直连 201 / 新号绑定 201 / 撞号 PHONE_EXISTS_NEED_LOGIN → bind-openid 完成 / 渠道停用 CHANNEL_DISABLED / 禁用用户拒绝 / 会话 channel=MINIPROGRAM 断言 / bind-openid 防越权（非归属会话 403）
- [x] 1.9 运行 `./init.sh node:test` 全量 Node 测试全绿

## 2. mock 网关与渠道门禁装配（Node.js）

- [x] 2.1 `wechatGateway.js` 注入渠道配置读取（channelConfigRepo → appid/appsecret），mock 模式仅 test 生效
- [x] 2.2 登录/绑定路由入口渠道门禁：enabled=false → CHANNEL_DISABLED（对齐 Story 1 契约）
- [x] 2.3 运行 Node 测试全绿（含新增断言）

## 3. E2E 覆盖（新建 feature + 回归）

- [x] 3.1 新建 `e2e-tests/features/miniprogram_wechat_login.feature`（5 个 @e2e 场景）：
  - 老客户 openid 命中直连（user_1002 林晓明绑定 openid_demo_001 → code_demo_001 登录 → 历史订单可见）
  - 新客户微信快捷绑定建号（code_demo_002 → 手机号 13700005678 → 建号登录）
  - 撞号提示登录既有账号再绑定（code_demo_003 → 手机号 13888217536 已注册 → PHONE_EXISTS_NEED_LOGIN → 既有账号登录 → bind-openid 完成）
  - 渠道停用拒绝（enabled=false → CHANNEL_DISABLED）
  - 禁用用户微信登录拒绝（user-status 后门禁用 → 拒绝）
- [x] 3.2 新建 `e2e-tests/steps/miniprogram_wechat_login.js`（`miniprogramWechatLogin_` 前缀）：直接 API 断言为主（mock 网关无真实小程序 UI 可点），登录/绑定/撞号/门禁逐步断言
- [x] 3.3 运行 `./init.sh e2e:run`：新增场景通过，既有场景全部通过（场景总数记录于 verify.md）
- [x] 3.4 既有回归：account_login/register/session/admin_users/smoke/order_lifecycle 全部通过（User/Session 扩展向后兼容）

## 4. 验证与同步

- [x] 4.1 运行 `openspec validate story-miniprogram-wechat-login`（硬门禁）
- [x] 4.2 运行 `./init.sh test:all`（Node 全绿；Python skip：无 Python 代码变更）
- [x] 4.3 前端构建通过（本 change 无 Vue B 端新增视图；小程序登录 UI 为原生端原型（未锁定技术栈），Vue 侧仅确认零回归 `vue:build`）
- [x] 4.4 按 apply 流程逐项勾选 tasks.md；完成后 verify 证据写入 `verify.md`
- [x] 4.5 Spec Sync（change 级）：`wechat-auth`（新增主 spec）+ `frontend-ui`（小程序登录 UI 增量）回流 `openspec/specs/`；Baseline Sync 在 Epic 全部 Story 归档后统一执行（本 change 不触发）<!-- ⏸ 由 lead 执行 -->
- [x] 4.6 Archive：`openspec archive story-miniprogram-wechat-login --yes --skip-specs`（主 specs 已手工 Sync）；更新 `epic-miniprogram-channel.story-list.json`（story 2 → done）
