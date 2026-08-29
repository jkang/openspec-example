# user-session Specification

## Purpose
承载 C 端**会话生命周期**能力：会话创建（登录/注册自动登录）、全局校验（需登录接口强制校验凭证）、持久化保持（刷新不掉登录态）、退出销毁、禁用即失效。零第三方依赖（文件/内存会话存储），前端持久化后刷新不掉登录态。

## Requirements

### Requirement: 会话凭证创建

系统 SHALL 在凭证校验通过（登录）或用户创建成功（注册自动登录）后创建持久会话：生成随机唯一会话凭证（token）并映射到归属 `userId`，会话记录 SHALL 包含创建时间。会话存储 SHALL 使用文件/内存会话存储，零第三方依赖。

- **Priority**: P0
- **Rationale**: 会话创建是会话生命周期起点（R-LOG-004/005，idea.md §4 会话能力）；Story 1 已实现 `SessionRepo.create(userId)`，本变更将其契约化并供登录链路消费。

#### Scenario: 登录成功创建会话映射
- @unit
- **GIVEN** 买家登录凭证校验通过
- **WHEN** 系统创建会话
- **THEN** 会话记录含随机唯一 token、归属 `userId` 与创建时间
- **AND** 以该 token 查询会话存储可解析出对应 `userId`

#### Scenario: 会话凭证随机不可预测
- @unit
- **GIVEN** 同一用户连续两次创建会话
- **WHEN** 比较两次返回的 token
- **THEN** 两个 token 不同，不可由既有会话推导

### Requirement: 会话持久化不依赖第三方

系统 SHALL NOT 引入第三方会话/认证依赖；会话凭证 SHALL 在服务端持久化（开发环境内存 Map、生产环境 `sessions.json` FileStore），前端仅保存凭证副本，刷新/重开浏览器后登录态不丢失。

- **Priority**: P0
- **Rationale**: ROADMAP Explore 护栏「零第三方依赖」（R-LOG-005）；会话为文件/内存存储，对齐既有 JSON 持久化风格。

#### Scenario: 开发环境会话持久化到内存存储
- @unit
- **GIVEN** 登录成功创建会话
- **WHEN** 重启前的同一进程内再次查询该 token
- **THEN** 会话仍可解析出 `userId`（内存 Map 生命周期内有效）

#### Scenario: 生产环境会话持久化到文件
- @api
- **GIVEN** 生产环境使用 `sessions.json` FileStore
- **WHEN** 登录成功返回 `sessionToken`
- **THEN** 会话凭证已写入持久化存储，可跨请求按 token 解析 `userId`

### Requirement: 登录接口返回会话凭证

系统 SHALL 在 `POST /api/auth/login` 校验通过后创建会话，并以 `201 { user, sessionToken }` 返回；响应中的用户信息 SHALL 为脱敏 DTO（不含密码明文或哈希字段）。

- **Priority**: P0
- **Rationale**: 一次请求交付身份与凭证（R-LOG-004）；脱敏约束与注册接口一致，防密码字段泄露。

#### Scenario: 登录响应返回会话凭证且不泄露密码
- @api
- **GIVEN** 已注册用户（手机号 `13888217536`，密码 `123456`）
- **WHEN** 请求 `POST /api/auth/login` 输入正确凭证
- **THEN** 返回状态码 201
- **AND** 响应体包含 `sessionToken` 与脱敏用户信息（id/phone/nickname/status）
- **AND** 响应体不包含 `passwordHash` 或明文密码字段

### Requirement: 会话凭证全局校验

系统 SHALL 在需登录接口（下单 `POST /api/orders`、结算 `POST /api/checkout`、我的订单 `GET /api/orders`、购物车归属接口）强制校验请求携带的会话凭证（`Authorization: Bearer <sessionToken>`）：缺失、无效或伪造凭证 SHALL 返回 `401 UNAUTHORIZED`（中文提示引导登录，R-SES-002），SHALL NOT 执行业务逻辑。

- **Priority**: P0
- **Rationale**: 会话凭证目前只被创建（login/register），未被全局消费；无校验则任何调用方可自报 `userId` 绕过归属隔离（R-SES-002）。

#### Scenario: 携带有效会话凭证通过校验
- @unit
- **GIVEN** 登录成功持有有效会话凭证（token → userId 映射存在）
- **WHEN** 以该凭证访问需登录接口
- **THEN** 通过校验并解析出归属 `userId`
- **AND** 进入业务逻辑

#### Scenario: 缺失会话凭证被拒绝
- @api
- **GIVEN** 请求未携带 `Authorization` 头
- **WHEN** 访问需登录接口（如下单）
- **THEN** 返回状态码 401
- **AND** 错误码为 `UNAUTHORIZED`，提示「请先登录」
- **AND** 不执行业务逻辑

#### Scenario: 无效会话凭证被拒绝
- @api
- **GIVEN** 请求携带伪造/已不存在的会话凭证
- **WHEN** 访问需登录接口
- **THEN** 返回状态码 401
- **AND** 不泄露任何业务数据

### Requirement: 登录态刷新保持

系统 SHALL 在页面刷新/重开浏览器后保持登录态：前端持久化会话凭证与用户信息（localStorage），后端会话存储（内存 Map / `sessions.json` FileStore）跨请求可按 token 解析 `userId`，无需重新登录（R-SES-001）。

- **Priority**: P0
- **Rationale**: 会话持久化是「刷新不掉登录态」的运行时保证（R-SES-001），对齐 idea.md §4 会话能力。

#### Scenario: 已登录买家刷新页面登录态保持
- @e2e
- **GIVEN** 买家林晓明已登录（持有持久会话凭证）
- **WHEN** 刷新浏览器页面
- **THEN** 页面仍显示「林晓明」已登录，无需重新登录

### Requirement: 退出登录销毁会话

系统 SHALL 提供退出登录：`POST /api/auth/logout` 销毁服务端会话凭证（删除 token → userId 映射），前端 SHALL 清除本地会话存储并回到未登录态；已销毁的会话凭证再次访问需登录接口 SHALL 被拒绝（R-SES-005）。

- **Priority**: P0
- **Rationale**: 公共设备上用完主动退出是会话生命周期的收尾动作（R-SES-005）；服务端销毁保证凭证不可复用。

#### Scenario: 退出登录销毁服务端会话
- @unit
- **GIVEN** 已登录用户持有会话凭证
- **WHEN** 执行退出登录
- **THEN** 服务端会话存储中该凭证被删除
- **AND** 以该凭证再次解析用户失败

#### Scenario: 退出后访问需登录接口被拒绝
- @api
- **GIVEN** 用户已退出登录（会话凭证已销毁）
- **WHEN** 携带原凭证访问我的订单接口
- **THEN** 返回状态码 401

#### Scenario: 退出登录后回到未登录态
- @e2e
- **GIVEN** 买家林晓明已登录
- **WHEN** 点击「退出登录」
- **THEN** 会话凭证被销毁，页面回到未登录态
- **AND** 再次访问「我的订单」被引导登录

### Requirement: 禁用用户会话立即失效

系统 SHALL 在会话校验时检测归属用户状态：用户被禁用后，其既有会话凭证访问需登录接口 SHALL 被拒绝（返回 `403 USER_DISABLED` 提示，或等效的未登录引导），实现「禁用即失效」（R-SES-006）。

- **Priority**: P0
- **Rationale**: B 端禁用动作（story-account-system-admin-users）联动要求禁用后会话立即失效（R-SES-006），防止被禁用户沿用旧会话访问受保护能力。

#### Scenario: 禁用用户持有会话访问受保护接口被拒绝
- @api
- **GIVEN** 用户王强已登录且持有有效会话凭证
- **WHEN** 运营将王强状态置为「禁用」后，王强携带会话凭证访问我的订单
- **THEN** 校验失败，返回状态码 403（错误码 `USER_DISABLED`）
- **AND** 不返回任何订单数据

#### Scenario: 禁用用户会话失效引导重新登录
- @e2e
- **GIVEN** 用户王强已登录且持有有效会话
- **WHEN** 运营在用户管理中将王强禁用
- **THEN** 王强下次访问需登录接口（如我的订单）时校验失败
- **AND** 被引导重新登录，登录页提示「该账户已被禁用，如有疑问请联系平台客服」
