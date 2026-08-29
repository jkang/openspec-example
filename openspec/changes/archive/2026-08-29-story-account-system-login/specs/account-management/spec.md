## Purpose

扩展 `account-management` capability（Story 1 已承载用户注册，主规格 `openspec/specs/account-management/spec.md`）覆盖**用户登录**用例：已注册买家以手机号 + 密码恢复身份，凭证校验通过即创建持久会话，密码错误与禁用状态给出明确中文反馈（安全惯例：不区分账号不存在与密码错误，防账号枚举）。

## ADDED Requirements

### Requirement: 登录手机号格式校验

系统 SHALL 校验登录手机号为 11 位中国大陆手机号（格式 `1\d{10}`）。手机号格式非法时 SHALL NOT 发起凭证校验，并提示「请输入 11 位有效手机号」。校验规则与注册保持一致。

- **Priority**: P0
- **Rationale**: 手机号是登录凭证（R-LOG-001），非法格式先于业务校验拦截，减少无效请求。

#### Scenario: 非法手机号登录被拒绝
- @unit
- **GIVEN** 买家在登录页输入手机号 `123`
- **WHEN** 提交登录表单
- **THEN** 系统提示「请输入 11 位有效手机号」
- **AND** 不发起登录请求

#### Scenario: 合法手机号通过格式校验
- @unit
- **GIVEN** 买家输入手机号 `13888217536`、密码 `123456`
- **WHEN** 提交登录表单
- **THEN** 格式校验通过，进入凭证校验

### Requirement: 登录凭证校验与统一失败提示

系统 SHALL 校验「手机号存在 + 密码哈希匹配」（存储格式 `scrypt:<salt>:<hash>`，使用不可逆哈希比对）。校验失败时 SHALL NOT 创建会话，并**统一**提示「手机号或密码不正确，请重试」，不区分账号不存在与密码错误。

- **Priority**: P0
- **Rationale**: 安全惯例（R-LOG-002），统一失败提示防账号枚举；不泄露「该手机号未注册」等差异信息。

#### Scenario: 密码错误登录被拒
- @api
- **GIVEN** 已注册用户林晓明（手机号 `13888217536`，密码 `123456`）
- **WHEN** 请求 `POST /api/auth/login`，手机号 `13888217536`、密码 `654321`
- **THEN** 返回状态码 401
- **AND** 响应错误码为 `INVALID_CREDENTIALS`，提示「手机号或密码不正确，请重试」
- **AND** 不创建任何会话

#### Scenario: 账号不存在登录被拒
- @api
- **GIVEN** 系统不存在手机号 `13100000000` 的用户
- **WHEN** 请求 `POST /api/auth/login`，手机号 `13100000000`、密码 `123456`
- **THEN** 返回状态码 401，错误码 `INVALID_CREDENTIALS`
- **AND** 提示「手机号或密码不正确，请重试」（与密码错误提示一致）

#### Scenario: 凭证校验不泄露密码存储格式
- @unit
- **GIVEN** 用户存储为 `scrypt:<salt>:<hash>`
- **WHEN** 以正确明文密码调用密码校验函数
- **THEN** 校验通过；以错误密码校验返回失败
- **AND** 任何响应体不包含 `passwordHash` 或明文密码字段

### Requirement: 禁用用户登录拦截

系统 SHALL 在凭证校验前检查用户状态；用户 `status = 禁用` 时 SHALL NOT 创建会话，提示「该账户已被禁用，如有疑问请联系平台客服」。

- **Priority**: P0
- **Rationale**: B 端禁用动作（story-account-system-admin-users）联动（R-LOG-003），禁用即禁止恢复登录态。

#### Scenario: 禁用用户登录被拦截
- @api
- **GIVEN** 用户王强（手机号 `15876543210`）状态为 `禁用`
- **WHEN** 王强以正确凭证请求 `POST /api/auth/login`
- **THEN** 返回状态码 403
- **AND** 响应错误码为 `USER_DISABLED`，提示「该账户已被禁用，如有疑问请联系平台客服」
- **AND** 不创建会话

#### Scenario: 正常用户登录不受拦截
- @unit
- **GIVEN** 用户状态为 `正常`
- **WHEN** 以正确凭证发起登录
- **THEN** 通过禁用状态检查，进入凭证比对

### Requirement: 登录成功创建持久会话

系统 SHALL 在凭证校验通过后创建持久会话凭证（token → userId 映射，零第三方依赖，文件/内存会话存储），并返回 `201 { user, sessionToken }`；前端持久化会话凭证后登录态刷新不掉。

- **Priority**: P0
- **Rationale**: 恢复身份的核心目标（R-LOG-004/005）；会话能力归属 `user-session` capability（本变更新增 taxonomy），本需求声明其创建行为，校验/销毁由 story-account-system-session 承接。

#### Scenario: 登录成功返回会话凭证与用户信息
- @api
- **GIVEN** 已注册用户林晓明（手机号 `13888217536`，密码 `123456`）
- **WHEN** 请求 `POST /api/auth/login`，输入正确凭证
- **THEN** 返回状态码 201
- **AND** 响应体包含 `sessionToken` 与用户信息（id/phone/nickname/status，不含密码字段）

#### Scenario: 登录创建的会话可被会话校验消费
- @unit
- **GIVEN** 登录成功且已创建会话
- **WHEN** 以返回的会话凭证查询会话存储
- **THEN** 可解析出对应的 `userId`

### Requirement: 登录页交互流程

系统 SHALL 提供中文登录视图：手机号 + 密码双栏表单、「显示密码」切换、忘记密码引导（跳转平台客服，本阶段无自助找回）、凭证错误与禁用拦截的中文提示、登录成功横幅「登录成功，{昵称}」。字段校验失败时 SHALL NOT 提交登录请求。

- **Priority**: P0
- **Rationale**: 原型已 HITL 确认（`account-login.html`），交互逻辑须与原型一致；字段级校验前置减少无效请求。

#### Scenario: 登录成功展示横幅并进入登录态
- @e2e
- **GIVEN** 已注册用户林晓明（手机号 `13888217536`，密码 `123456`）在浏览器中会话已失效
- **WHEN** 在登录页输入手机号与正确密码，点击「登录」
- **THEN** 系统校验通过并创建持久会话凭证
- **AND** 页面显示「登录成功，林晓明」，导航出现「我的订单」入口

#### Scenario: 凭证错误提示且不创建会话
- @e2e
- **GIVEN** 已注册用户林晓明在登录页
- **WHEN** 输入手机号 `13888217536` 与错误密码 `654321`，点击「登录」
- **THEN** 系统提示「手机号或密码不正确，请重试」
- **AND** 无会话凭证写入，页面停留登录态

#### Scenario: 禁用用户登录被拦截
- @e2e
- **GIVEN** 用户王强（手机号 `15876543210`）已被运营禁用
- **WHEN** 王强在登录页输入正确凭证并提交
- **THEN** 系统提示「该账户已被禁用，如有疑问请联系平台客服」
- **AND** 不创建会话，页面停留登录态

#### Scenario: 字段校验失败不提交登录请求
- @e2e
- **GIVEN** 买家在登录页输入手机号 `123`
- **WHEN** 点击「登录」
- **THEN** 页面提示「请输入 11 位有效手机号」
- **AND** 未发起登录请求，页面停留登录态

## Governance Mapping

- **Bounded Context**: `User Context`（**新增 BC**，Story 1 已声明，`domain_model.html` 现无用户认证 BC；`bc-shared → cap-error` 复用错误码规范）
- **Capability Taxonomy**: `account-management`（**既有 capability 扩展（MODIFIED）**：Story 1 已新增 taxonomy 并承载注册，本变更补充登录用例；现有 10 个 capability 均无认证能力）
- **Process Alignment**: `L1-03 加购与准备`（身份恢复前置，未登录引导登录）；`L1-04 下单结算`（登录后继续结算）；`L2-01 进入结算`（结算前身份确认前置环节）
- **Service Blueprint**: `SB-STAGE-01`（顶部登录/注册入口）、`SB-STAGE-03`（结算引导登录）、`SB-CUSTOMER-01`（登录触点）、`SB-CUSTOMER-03`（结算前登录恢复身份）
- **实现版本**: Node.js（后端 API + 会话创建）＋ Frontend（登录视图）＋ E2E（用户旅程）
