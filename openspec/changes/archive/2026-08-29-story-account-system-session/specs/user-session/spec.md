## Purpose

扩展 `user-session` capability（既有主规格已承载会话创建契约，Story 2 login 已落地）覆盖**会话生命周期闭环**：全局校验（需登录接口强制校验会话凭证）、持久化保持（刷新不掉登录态）、退出销毁（服务端 + 前端）、禁用即失效（校验时检测用户状态）。story.md 业务规则 R-SES-001~006 为本增量规格的行为契约。

## ADDED Requirements

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

## Governance Mapping

- **Bounded Context**: `User Context`（Story 1/2 已声明的认证边界；本变更新增会话校验/销毁契约归入该边界）
- **Capability Taxonomy**: `user-session`（**既有 capability 扩展（MODIFIED）**：Story 2 已新增 taxonomy 并承载会话创建，本变更补充校验/销毁；无新增 taxonomy）
- **Process Alignment**: `L1-04 下单结算`（下单前会话校验）；`L1-06 履约与完成`（我的订单会话归属）；`L2-01 进入结算`（结算前身份校验前置环节）
- **Service Blueprint**: `SB-STAGE-04`（提交订单归属会话）、`SB-STAGE-06`（成功回流·我的订单入口）、`SB-CUSTOMER-04/06`（下单归属/我的订单查看）、`SB-BACKSTAGE-04`（`GET /api/orders` 归属查询改造 + `POST /api/auth/logout`）
- **实现版本**: Node.js（后端会话校验/销毁）＋ Frontend（退出按钮/登录拦截回跳）＋ E2E（用户旅程）
