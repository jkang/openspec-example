## MODIFIED Requirements

### Requirement: 运营角色权限门禁与敏感信息保护

系统 SHALL 对 `GET /api/admin/users*` 系列接口施加**运营角色**门禁（R-ADM-001）：仅持有 `role = 运营` 用户的会话凭证可访问；非运营角色（含客服、未登录）SHALL 返回 403 无权限，且 SHALL NOT 返回任何用户手机号等敏感信息（R-ADM-007）。

B 端**用户管理入口与账户中心分组**的前端可见性 SHALL 由当前会话真实角色决定：仅 `role = 运营` 会话下「账户中心」分组显示「用户管理」链接；非运营（顾客/客服）或未登录会话下「账户中心」分组 SHALL NOT 空悬（不得仅渲染分组标题而无任何内容），而 SHALL 显示明确的"仅运营角色可见"引导；顶部「运营专员」角色标签 SHALL 基于真实 `currentUser` 渲染（运营角色显示其昵称，非运营/未登录显示 `—`），SHALL NOT 使用任何硬编码占位姓名（如"王琳"）。

- **Priority**: P0
- **Rationale**: research 访谈记录 2 信号：客服无权限访问全量用户资料（敏感信息保护）；权限门禁防止 B 端数据越权。入口可见性与角色标签真实化避免"功能缺失"误判（非运营进入后台时账户中心不空悬 + 显式权限引导）。

#### Scenario: 客服角色访问用户列表被拒绝
- @api
- **GIVEN** 客服角色用户已登录（持有 `role = 客服` 的会话凭证）
- **WHEN** 客服携带会话凭证请求 `GET /api/admin/users`
- **THEN** 返回状态码 403
- **AND** 响应不包含任何用户手机号等敏感信息

#### Scenario: 未登录访问用户列表被拒绝
- @api
- **GIVEN** 请求未携带任何会话凭证
- **WHEN** 访问 `GET /api/admin/users`
- **THEN** 返回状态码 403（无权限），不返回任何用户数据

#### Scenario: 运营角色可通过权限门禁
- @unit
- **GIVEN** 用户角色为 `运营`
- **WHEN** 以该用户的会话凭证访问用户管理接口
- **THEN** 通过权限门禁，进入业务逻辑

#### Scenario: 客服无法在后台看到用户管理入口
- @e2e
- **GIVEN** 客服角色账号已登录 B 端后台
- **WHEN** 客服查看后台侧边栏
- **THEN** 侧边栏不显示「用户管理」入口

#### Scenario: 运营角色可在账户中心看到并进入用户管理
- @e2e
- **GIVEN** 运营角色账号已登录 B 端后台（`role = 运营`）
- **WHEN** 运营查看后台侧边栏「账户中心」分组
- **THEN** 分组下显示「用户管理」链接
- **AND** 点击后进入用户管理视图，顶部显示当前运营昵称

#### Scenario: 非运营或未登录进入后台账户中心不空悬并显示权限引导
- @e2e
- **GIVEN** 非运营角色（顾客/客服）或未登录会话已进入 B 端后台
- **WHEN** 查看侧边栏「账户中心」分组
- **THEN** 分组下 SHALL NOT 仅渲染空分组标题
- **AND** SHALL 显示"仅运营角色可见"的引导提示

#### Scenario: 顶部运营专员标签基于真实角色渲染而非硬编码
- @e2e
- **GIVEN** 会话为运营角色用户
- **WHEN** 查看 B 端后台顶部「运营专员」标签
- **THEN** 标签显示该运营用户真实昵称
- **AND** 不出现任何硬编码占位姓名（如"王琳"）

#### Scenario: 非运营会话顶部运营专员标签不显示占位姓名
- @e2e
- **GIVEN** 会话为非运营角色（顾客/客服）或未登录，已进入 B 端后台
- **WHEN** 查看顶部「运营专员」标签
- **THEN** 标签显示 `—`（而非硬编码占位姓名）

## Governance Mapping

- **Bounded Context**: User Context（`docs/baseline/domain_model.html`：`BC -> Capability` 映射，`user-admin` 已收录）
- **Capability Taxonomy**: `user-admin`（修改·前端入口可见性契约细化；taxonomy 无新增/移除）
- **Process Nodes**: `L1-06 履约与完成`（后台支撑活动；用户管理为 B 端支撑活动，非 L3 交易节点）
- **Service Blueprint**: `SB-OPS-06`（电商运营层支撑泳道·用户管理活动，`user-admin` capability；前端入口呈现修正，能力分布与状态不变）
- **测试标签**: `@api`（权限门禁 API）/ `@unit`（门禁逻辑）/ `@e2e`（前端入口可见性与角色标签）
