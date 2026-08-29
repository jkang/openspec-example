## Purpose

承载 C 端用户账户的注册能力：买家以手机号+昵称+密码极简注册，手机号全局唯一，注册成功即自动登录进入可用状态，为用户订单/购物车提供真实归属主体（用户账户体系 Epic 首个 Story）。

## ADDED Requirements

### Requirement: 手机号格式校验

系统 SHALL 校验注册手机号为 11 位中国大陆手机号（格式 `1\d{10}`）。手机号不合法时 SHALL NOT 创建用户，并提示「请输入 11 位有效手机号」。

- **Priority**: P0
- **Rationale**: 手机号是登录凭证与唯一标识（R-REG-001），非法格式必须先于业务校验拦截。

#### Scenario: 非 11 位手机号被拒绝
- @unit
- **GIVEN** 买家输入手机号 `123`
- **WHEN** 提交注册表单
- **THEN** 系统提示「请输入 11 位有效手机号」
- **AND** 不创建用户

#### Scenario: 合法 11 位手机号通过格式校验
- @unit
- **GIVEN** 买家输入手机号 `13888217536`
- **WHEN** 提交注册表单
- **THEN** 格式校验通过，进入手机号唯一性与密码校验

### Requirement: 手机号全局唯一

系统 SHALL 保证手机号全局唯一。注册手机号已存在时 SHALL NOT 创建新用户，提示「该手机号已注册，请直接登录」，并提供跳转登录入口。

- **Priority**: P0
- **Rationale**: 手机号作为登录凭证必须唯一，重复注册破坏归属边界（R-REG-002）。

#### Scenario: 已注册手机号拒绝重复注册
- @api
- **GIVEN** 系统已存在用户（手机号 `13912345678`，昵称 陈晓芸）
- **WHEN** 请求 `POST /api/auth/register`，手机号为 `13912345678`
- **THEN** 返回状态码 409
- **AND** 响应错误码为 `PHONE_ALREADY_REGISTERED`，提示「该手机号已注册，请直接登录」
- **AND** 用户总量不变，不创建重复用户

#### Scenario: 唯一性检查不区分昵称/密码
- @unit
- **GIVEN** 系统已存在手机号 `13912345678`
- **WHEN** 使用相同手机号、不同昵称与密码提交注册
- **THEN** 仍被判定为重复注册，拒绝创建

### Requirement: 昵称规则

系统 SHALL 接受必填昵称，长度 SHALL NOT 超过 20 字；买家未填写昵称时系统 SHALL 采用默认昵称「手机尾号用户」（由手机号后 4 位生成，如手机号 `13888217536` → `7536用户`）。昵称超过 20 字时 SHALL 提示「昵称最多 20 字」，不创建用户。

- **Priority**: P0
- **Rationale**: 昵称是 B 端用户管理与订单归属展示的基础字段（R-REG-003），默认昵称保证必填约束下仍可极简注册。

#### Scenario: 未填昵称时采用默认昵称
- @unit
- **GIVEN** 买家输入手机号 `13888217536`、密码 `123456`
- **WHEN** 不填昵称提交注册
- **THEN** 系统以默认昵称创建用户（`7536用户`）

#### Scenario: 昵称超过 20 字被拒绝
- @unit
- **GIVEN** 买家输入 21 字昵称
- **WHEN** 提交注册
- **THEN** 系统提示「昵称最多 20 字」，不创建用户

### Requirement: 密码强度规则

系统 SHALL 要求注册密码长度在 6 至 32 位之间；密码不足 6 位时 SHALL 提示「密码至少 6 位」，超过 32 位 SHALL 提示「密码最多 32 位」，均不创建用户。注册表单为单次密码输入，支持明文可见切换。

- **Priority**: P0
- **Rationale**: 极简注册优先（Q-1），单次输入 + 明文切换；长度门槛防弱口令（R-REG-004）。

#### Scenario: 密码不足 6 位被拒绝
- @unit
- **GIVEN** 买家输入密码 `123`
- **WHEN** 提交注册
- **THEN** 系统提示「密码至少 6 位」，不创建用户

#### Scenario: 密码超过 32 位被拒绝
- @unit
- **GIVEN** 买家输入 33 位密码
- **WHEN** 提交注册
- **THEN** 系统提示「密码最多 32 位」，不创建用户

#### Scenario: 6 至 32 位密码通过校验
- @api
- **GIVEN** 买家输入合法手机号 `13888217536` 与密码 `123456`
- **WHEN** 请求 `POST /api/auth/register`
- **THEN** 返回状态码 201
- **AND** 用户创建成功

### Requirement: 密码哈希存储

系统 SHALL NOT 以明文存储用户密码；用户记录 SHALL 仅保存密码哈希（使用不可逆哈希算法加盐）。任何查询用户接口返回的响应体 SHALL NOT 包含明文或可逆密码字段。

- **Priority**: P0
- **Rationale**: 安全硬约束（R-REG-005），注册/登录存储同一哈希格式，供 Story 2 登录复用。

#### Scenario: 存储密码哈希而非明文
- @unit
- **GIVEN** 买家以密码 `123456` 注册成功
- **WHEN** 读取用户持久化记录
- **THEN** 记录中 `passwordHash` 为哈希值且不等于 `123456`
- **AND** 不含明文字段

#### Scenario: 注册接口响应不泄露密码
- @api
- **GIVEN** 合法注册请求
- **WHEN** 请求 `POST /api/auth/register`
- **THEN** 响应体不包含密码明文或哈希字段

### Requirement: 注册成功自动登录

系统 SHALL 在用户创建成功后立即创建会话凭证（token → userId 映射），并将会话凭证与用户信息一并返回；前端持久化会话凭证后进入登录态，买家 SHALL NOT 需要二次登录即可继续结算。

- **Priority**: P0
- **Rationale**: 减少一步登录（R-REG-006），会话能力与 Story 2/3 复用同一会话存储。

#### Scenario: 注册响应返回会话凭证
- @api
- **GIVEN** 买家提交合法注册请求
- **WHEN** 请求 `POST /api/auth/register`
- **THEN** 返回状态码 201
- **AND** 响应体包含 `sessionToken` 与用户信息（id/phone/nickname/status）

#### Scenario: 会话映射可被会话校验消费
- @unit
- **GIVEN** 注册成功且已创建会话
- **WHEN** 以会话凭证查询会话存储
- **THEN** 可解析出对应的 `userId`

### Requirement: 新用户默认状态正常

系统 SHALL 将新注册用户的状态置为「正常」，注册用户 SHALL 可立即下单。状态字段 SHALL 成为 B 端用户管理（story-account-system-admin-users）的数据来源。

- **Priority**: P0
- **Rationale**: 生命周期起点：注册成功 → 状态正常（R-REG-007）。

#### Scenario: 新用户状态为正常
- @unit
- **GIVEN** 注册请求通过全部校验
- **WHEN** 用户创建完成
- **THEN** 用户记录 `status` 为 `正常`

### Requirement: 注册页交互流程

系统 SHALL 提供中文注册视图：手机号/昵称/密码三栏表单、「显示密码」切换、注册成功自动登录横幅（「注册成功，已自动登录」）、手机号冲突与字段错误的行内中文提示。字段校验失败时 SHALL NOT 提交注册请求。

- **Priority**: P0
- **Rationale**: 原型已 HITL 确认（`account-register.html`），交互逻辑须与原型一致；字段级校验前置减少无效请求。

#### Scenario: 字段校验失败不提交请求
- @e2e
- **GIVEN** 买家在注册页输入手机号 `123`、密码 `123`（不足 6 位）
- **WHEN** 点击「注册并登录」
- **THEN** 页面分别提示「请输入 11 位有效手机号」与「密码至少 6 位」
- **AND** 未发起注册请求，页面停留注册态

#### Scenario: 注册成功自动登录并展示横幅
- @e2e
- **GIVEN** 买家林晓明的购物车已加入 1 件「纯棉圆领T恤（白色 / M）」，点击「去结算」被引导登录，当前无任何账户
- **WHEN** 在注册页输入手机号 `13888217536`、昵称 林晓明、密码 `123456`，点击「注册并登录」
- **THEN** 系统创建用户（status=正常），自动登录并创建持久会话
- **AND** 页面显示「注册成功，已自动登录」，买家可直接继续结算并生成归属该用户的待支付订单

#### Scenario: 手机号已注册的冲突处理
- @e2e
- **GIVEN** 系统已存在用户（手机号 `13912345678`，昵称 陈晓芸）
- **WHEN** 新买家在注册页输入手机号 `13912345678` 并提交
- **THEN** 系统不创建新用户，提示「该手机号已注册，请直接登录」
- **AND** 页面提供跳转登录入口

## Governance Mapping

- **Bounded Context**: `User Context`（**新增 BC**，`domain_model.html` 现无用户认证 BC；`bc-shared → cap-error` 复用错误码规范）
- **Capability Taxonomy**: `account-management`（**新增 taxonomy**，来自 idea 候选 Capabilities；现有 10 个 capability 均无账户认证能力）
- **Process Alignment**: `L1-03 加购与准备`（结算前身份前置，未登录引导注册）；`L1-04 下单结算`（注册自动登录后继续下单）；`L2-01 进入结算`（结算前身份确认前置环节）
- **Service Blueprint**: `SB-STAGE-01`（顶部登录/注册入口）、`SB-STAGE-03`（结算引导注册）、`SB-CUSTOMER-01`（注册触点）、`SB-CUSTOMER-03`（结算前登录引导）
- **实现版本**: Node.js（后端 API + 会话存储）＋ Frontend（注册视图）＋ E2E（用户旅程）
