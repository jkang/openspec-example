# wechat-auth Specification (Delta)

> 增量文件：**新增 taxonomy**，本 change 建立主 spec（对齐 `openspec/specs/<capability-path>/spec.md` 结构）。治理归属：**User Context（扩展）**——新增 `bc-user → cap-wechat-auth` Governs 边（`docs/baseline/domain_model.html` 现有 bc-user → cap-account/cap-session/cap-admin 边行 971-973，无 wechat-auth——Baseline Sync 时落位，本 delta 显式声明新增）。

## Purpose

承载微信授权登录因子与同源账户打通能力：`User.openid` 字段（Q1 方案 A）、code2session 换 openid（mock 网关可模拟）、手机号绑定（微信组件取号 / 撞号提示登录既有账号，Q2）、复用 user-session 会话（token→userId）、会话渠道来源标记（channel=MINIPROGRAM，Q7 供 order-channel 消费）、渠道停用拒绝登录（Q5）。

## ADDED Requirements

### Requirement: 微信授权登录（openid 登录因子）

系统 SHALL 提供微信授权登录：小程序端 `wx.login()` 取得 code → 服务端以渠道配置的 appid + appsecret 调 **code2session** 换取 openid（R-WX-001/002）：

- `POST /api/auth/wechat/login`：入参 `{ code }`；服务端换 openid 后按 `User.openid` 查询——
  - **命中**既有用户（R-WX-003）：复用既有会话创建（user-session，token→userId）→ 登录成功；历史订单归属既有用户（同源账户直连）。
  - **未命中**（R-WX-004）：返回需绑定手机号语义（错误码 `WECHAT_BIND_REQUIRED`），进入绑定流程。
- **渠道门禁（R-WX-009，Q5）**：渠道配置 `enabled=false`（或未配置）时返回 `CHANNEL_DISABLED`，不进入换 openid/登录流程；既有会话不受影响。
- **会话来源标记（R-WX-008，Q7）**：本能力创建的会话带来源渠道 `channel=MINIPROGRAM`（供 order-channel 下单写 `Order.channel` 消费；服务端判定，不信任客户端传参）。
- **appsecret 服务端持有**：appid/appsecret 读取自渠道配置（miniprogram-channel capability），严禁下发前端。
- **禁用即失效（R-WX-010）**：用户被 B 端禁用（status=禁用）后，微信登录拒绝且既有会话访问被拒（对齐 R-SES-006）。

- **Priority**: P0
- **Rationale**: 微信一键授权即登录是买家核心诉求（research 访谈 3：林采购"点一下微信授权就直接能用"）；openid 是既有 phone 之外的新登录因子（ROADMAP Guardrails：同源账户，不建独立用户池）。

#### Scenario: 老客户 openid 命中直接登录（同源直连）
- @e2e
- **GIVEN** 渠道已启用，用户 林晓明（user_1002）已绑定 `openid=openid_demo_001`
- **WHEN** 提交微信登录 code（测试环境 mock code2session 返回 openid=openid_demo_001）
- **THEN** 返回 201，创建会话并登录成功
- **AND** 会话来源为 MINIPROGRAM；该用户历史订单归属不变（同源账户，无重复用户记录）

#### Scenario: openid 未命中返回需绑定
- @api
- **GIVEN** 渠道已启用，openid=openid_demo_002 未绑定任何用户
- **WHEN** 提交微信登录 code（mock 返回该 openid）
- **THEN** 返回需绑定手机号语义（WECHAT_BIND_REQUIRED），不创建会话

#### Scenario: 渠道停用拒绝微信登录
- @e2e
- **GIVEN** 渠道配置 enabled=false（Q5）
- **WHEN** 提交微信登录 code
- **THEN** 返回 CHANNEL_DISABLED，不进入换 openid/登录流程

### Requirement: 手机号绑定（撞号提示登录既有账号）

系统 SHALL 支持手机号绑定以完成同源账户打通（R-WX-005/006，Q2）：

- `POST /api/auth/wechat/bind`：入参 `{ code, phone?, nickname? }` 或 `{ openid, phone, password? }` 语义——手机号来源为微信官方手机号组件（mock 可模拟）或手动输入。
- **新手机号（未注册，R-WX-005）**：创建新 User（phone + openid + role=客户，昵称默认规则沿用）→ 建会话自动登录。
- **撞号（Q2，R-WX-006）**：手机号已被既有账号占用 → **不自动合并**，返回既有账号登录引导语义（错误码 `PHONE_EXISTS_NEED_LOGIN`）；客户端引导输入既有账号（手机号+密码）登录，校验通过后 openid 写入既有 User → 建会话自动登录。
- 绑定完成后同一用户仅一个账户记录（无重复 user），历史订单未丢失。

- **Priority**: P0
- **Rationale**: 同源账户是硬约束（ROADMAP Guardrails）；撞号场景是手机号唯一约束（R-REG-002）与"微信新因子"的衔接点——Q2 已确认提示登录既有账号（不合并/不静默拒绝）。

#### Scenario: 新手机号绑定建号并登录
- @e2e
- **GIVEN** 渠道已启用，openid=openid_demo_002 未绑定，微信手机号组件（mock）返回 13700005678（未注册）
- **WHEN** 提交绑定请求（openid + 手机号 13700005678）
- **THEN** 创建新用户（phone=13700005678, openid=openid_demo_002, role=客户）并自动登录
- **AND** 会话来源为 MINIPROGRAM

#### Scenario: 撞号提示登录既有账号再绑定（Q2）
- @e2e
- **GIVEN** openid=openid_demo_003 未绑定，绑定手机号 13888217536 **已被注册**（林晓明 user_1002）
- **WHEN** 提交绑定请求（openid + 该手机号）
- **THEN** 返回 PHONE_EXISTS_NEED_LOGIN（不自动合并、不静默拒绝）
- **AND** 引导既有账号登录；既有账号校验通过后 openid 写入 user_1002 并自动登录
- **AND** 系统仍只有 user_1002 一个账户（无重复记录），历史订单未丢失

### Requirement: mock 微信网关（测试可复现）

系统 SHALL 在测试环境（`NODE_ENV=test`）提供 mock 微信网关（R-WX-011，Q6）：code2session / 手机号组件由 mock 实现返回固定映射（如 `code_demo_001 → openid_demo_001`），保证 E2E 可复现，不访问真实微信服务器；生产/运行环境调用真实微信网关（本期以 mock 常量占位或显式未接入标注，真实资质后置 +X）。

- **Priority**: P0
- **Rationale**: 微信网关无法在本地真实验证（research 访谈 4）；Q6 已确认对齐既有 `NODE_ENV=test` 测试后门模式（`/api/__test/*` 先例）。

#### Scenario: mock code2session 固定映射可复现
- @api
- **GIVEN** `NODE_ENV=test`，渠道已启用
- **WHEN** 携带 code=`code_demo_001` 调用微信登录 API
- **THEN** mock 网关返回其固定 openid=openid_demo_001（重复调用结果一致）

## Governance Mapping

- **Bounded Context**: `User Context`（**扩展**：新增 `wechat-auth` capability + `User.openid` 字段）；`Channel Context`（**新增**：只读消费渠道启用状态）；`Shared / Cross`（frontend-ui 小程序登录 UI 横切支撑）
- **Capability Taxonomy**: **`wechat-auth`（新增 taxonomy）**（新增路径，kebab-case）；`frontend-ui`（修改：小程序登录入口 UI）
- **Process Alignment**: `L1-01` 触达与发现（新增微信小程序登录触点）；`L2-01` 进入结算（身份前置：小程序用户先授权登录/绑定）；交易节点语义零改动
- **Service Blueprint**: `SB-STAGE-01`（新增微信授权登录入口触点）、`SB-CUSTOMER-01`（登录触点扩展：微信授权登录 + 手机号绑定 + 撞号引导）、`SB-BACKSTAGE-*`（微信网关对接后台支撑活动，mock 网关）
- **实现版本**: Node.js（后端权威实现，Python 不对齐）；Frontend（小程序登录 UI + Vue 联动）

## 原型参考 (Prototype Reference)

- `openspec-requirements/epics/epic-miniprogram-channel/prototypes/miniprogram-wechat-login.html`（已 HITL 确认）：微信一键登录 / 手机号绑定（快捷 + 手输）/ 撞号引导 / 老客户历史订单延续 / 渠道停用拒绝。
