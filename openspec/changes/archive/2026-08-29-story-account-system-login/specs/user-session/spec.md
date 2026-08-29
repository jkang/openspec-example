## Purpose

承载 C 端**会话生命周期**能力中的「会话创建」：登录成功（或注册自动登录）后创建持久会话凭证（token → userId 映射），零第三方依赖（文件/内存会话存储），前端持久化后刷新不掉登录态。会话校验与销毁由 story-account-system-session 承接，本 capability 先落地创建契约。

## ADDED Requirements

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

## Governance Mapping

- **Bounded Context**: `User Context`（**新增 BC**，Story 1 已声明；本变更新增 `user-session` taxonomy 归入该认证边界）
- **Capability Taxonomy**: `user-session`（**新增 taxonomy**，来自 idea 候选 Capabilities；现有 10 个 capability 及 Cart Context 的 `user/session` 归属字段均无认证会话管理能力）
- **Process Alignment**: `L1-03 加购与准备`（会话创建支持身份恢复）；`L2-01 进入结算`（登录后会话就绪可继续结算）
- **Service Blueprint**: `SB-STAGE-01`（登录入口会话创建）、`SB-CUSTOMER-01`（登录触点）、`SB-CUSTOMER-03`（结算前登录引导）
- **实现版本**: Node.js（后端会话存储）＋ Frontend（会话凭证持久化）＋ E2E（用户旅程）
