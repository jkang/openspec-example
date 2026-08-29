## Purpose

扩展 `account-management` capability（主规格 `openspec/specs/account-management/spec.md` 已承载注册与登录用例）补充**用户生命周期状态流转的登录门禁契约**：用户状态 `正常`/`禁用` 由 B 端用户管理（story-account-system-admin-users，`user-admin` capability）的启停动作产生；禁用即禁止登录（既有 R-LOG-003），启用后重新可登录（R-ADM-006）。本增量规格将「禁用用户登录拦截」需求的禁用状态来源与启用恢复行为显式契约化。

## MODIFIED Requirements

### Requirement: 禁用用户登录拦截

系统 SHALL 在凭证校验前检查用户状态；用户 `status = 禁用` 时 SHALL NOT 创建会话，提示「该账户已被禁用，如有疑问请联系平台客服」。禁用状态由 B 端用户管理（`PATCH /api/admin/users/:id/status`）的禁用动作产生；被启用的用户（状态恢复 `正常`）SHALL 可重新登录。

- **Priority**: P0
- **Rationale**: B 端禁用动作（story-account-system-admin-users）联动（R-LOG-003 / R-ADM-005/006），禁用即禁止恢复登录态，启用即恢复登录能力。

#### Scenario: 禁用用户登录被拦截
- @api
- **GIVEN** 用户王强（手机号 `15876543210`）状态为 `禁用`（由运营在 B 端用户管理禁用产生）
- **WHEN** 王强以正确凭证请求 `POST /api/auth/login`
- **THEN** 返回状态码 403
- **AND** 响应错误码为 `USER_DISABLED`，提示「该账户已被禁用，如有疑问请联系平台客服」
- **AND** 不创建会话

#### Scenario: 正常用户登录不受拦截
- @unit
- **GIVEN** 用户状态为 `正常`
- **WHEN** 以正确凭证发起登录
- **THEN** 通过禁用状态检查，进入凭证比对

#### Scenario: 被启用用户可重新登录
- @api
- **GIVEN** 用户王强状态曾被禁用，随后由运营在 B 端用户管理启用（状态恢复 `正常`）
- **WHEN** 王强以正确凭证请求 `POST /api/auth/login`
- **THEN** 返回状态码 201，创建持久会话，登录成功
- **AND** 不再触发 `USER_DISABLED` 拦截

## Governance Mapping

- **Bounded Context**: `User Context`（Story 1 新增 BC）——账户认证边界；本变更将登录门禁的状态来源（B 端启停动作）契约化，`account-management` 与 `user-admin` 同属 User Context。
- **Capability Taxonomy**: `account-management`（修改，既有主规格）；状态流转动作归属 `user-admin`（新增 taxonomy，见 `specs/user-admin/spec.md`）。
- **Related Process Nodes**: `L2-01 进入结算`（登录前置门禁）、`L3-02 执行资格校验`（用户状态作为凭证校验的资格事实）。
- **Related Service Blueprint Nodes**: `SB-STAGE-01`（登录/注册触点）、`SB-CUSTOMER-01`（客户登录动作）、`SB-BACKSTAGE-*`（B 端启停动作产生状态事实，用户管理泳道待 Baseline Sync 落位）。
- **Sync Assessment**: `domain_model.html` **Needs Sync: Yes**（用户状态机 `正常`↔`禁用` 语义 + 登录门禁依赖状态事实，Epic 级统一回流）；`service_blueprint.html` **Needs Sync: Yes**（同上，新增用户管理泳道）。
