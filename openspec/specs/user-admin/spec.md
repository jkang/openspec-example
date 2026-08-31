# user-admin Specification

## Purpose
承载 **B 端用户管理**能力：用户列表（ID/昵称/手机号/订单数/注册日期/状态）、按手机号或昵称关键词检索、用户详情（基础信息 + 该用户订单聚合）、禁用/启用账户（`正常` ↔ `禁用` 状态流转），以及**运营角色权限门禁**（仅运营角色可见入口，客服无权限，手机号属敏感信息受权限约束）。治理归属：User Context（新增 taxonomy）。

## Requirements

### Requirement: B 端用户列表与关键词检索

系统 SHALL 提供 `GET /api/admin/users`（B 端运营角色）：返回全部用户列表，每项含用户 ID、昵称、手机号、订单数（聚合自订单归属 `Order.userId`）、注册日期、状态（R-ADM-002）；支持按手机号或昵称关键词检索（R-ADM-003），空关键词返回全量。列表 SHALL 按注册时间倒序。

- **Priority**: P0
- **Rationale**: 运营需要按真实用户定位买家（告别 user_dev），订单数聚合支撑一人多单判断（R-ADM-002/003）。

#### Scenario: 列表返回全部用户与订单聚合
- @api
- **GIVEN** 系统存在用户 林晓明（手机号 `13888217536`）已产生 2 笔订单，用户 王强（手机号 `15876543210`）无订单
- **WHEN** 运营角色请求 `GET /api/admin/users`
- **THEN** 返回状态码 200
- **AND** 列表中林晓明 `orderCount` 为 2、王强 `orderCount` 为 0
- **AND** 列表项包含 用户ID/昵称/手机号/注册日期/状态 字段

#### Scenario: 按手机号关键词检索
- @api
- **GIVEN** 系统存在用户 林晓明（手机号 `13888217536`）
- **WHEN** 运营角色请求 `GET /api/admin/users?keyword=1388821`
- **THEN** 返回列表仅包含手机号含 `1388821` 的用户（林晓明）

#### Scenario: 按昵称关键词检索
- @api
- **GIVEN** 系统存在用户 林晓明（昵称 `林晓明`）与 王强（昵称 `王强`）
- **WHEN** 运营角色请求 `GET /api/admin/users?keyword=林晓`
- **THEN** 返回列表仅包含昵称含 `林晓` 的用户（林晓明）

#### Scenario: 空关键词返回全量用户
- @unit
- **GIVEN** 系统存在 3 位用户
- **WHEN** 运营角色请求 `GET /api/admin/users`（无 keyword 参数）
- **THEN** 返回全部 3 位用户

#### Scenario: 列表响应不泄露密码字段
- @unit
- **GIVEN** 系统存在已注册用户
- **WHEN** 运营角色获取用户列表
- **THEN** 列表项 SHALL NOT 包含 `passwordHash` 或任何密码相关字段

### Requirement: 用户详情与订单聚合

系统 SHALL 提供 `GET /api/admin/users/:id`（B 端运营角色）：返回该用户基础信息（ID/昵称/手机号/注册日期/状态）+ 该用户全部订单聚合列表（订单号/商品/金额/状态，按创建时间倒序）（R-ADM-004）。用户不存在 SHALL 返回 404。

- **Priority**: P0
- **Rationale**: 一人多单聚合对齐运营诉求（客诉定位、按用户维度回查订单，story.md 旅程 1）。

#### Scenario: 详情返回基础信息与订单聚合
- @api
- **GIVEN** 用户 林晓明 已产生 3 笔订单（含已支付/待支付/已完成）
- **WHEN** 运营角色请求 `GET /api/admin/users/user_1001`
- **THEN** 返回状态码 200
- **AND** 响应体包含用户基础信息与该用户 3 笔订单（订单号/商品/金额/状态）

#### Scenario: 详情仅展示该用户自己的订单
- @unit
- **GIVEN** 用户 甲 有 2 笔订单、用户 乙 有 1 笔订单
- **WHEN** 请求用户 甲 的详情
- **THEN** 返回订单仅包含 甲 的 2 笔订单（不混入 乙 的订单）

#### Scenario: 不存在的用户返回 404
- @api
- **GIVEN** 系统不存在用户 `user_9999`
- **WHEN** 运营角色请求 `GET /api/admin/users/user_9999`
- **THEN** 返回状态码 404
- **AND** 错误码为 `USER_NOT_FOUND`

### Requirement: 禁用用户（含会话失效联动）

系统 SHALL 提供 `PATCH /api/admin/users/:id/status`（B 端运营角色）：将用户状态置为 `禁用`（R-ADM-005）。禁用后该用户 SHALL 无法登录（复用登录禁用拦截），其既有会话访问需登录接口 SHALL 被拒绝（复用会话校验 `assertUserEnabled` 门禁，联动 R-SES-006），实现「禁用即失效」。重复禁用 SHALL 幂等成功。

- **Priority**: P0
- **Rationale**: 禁用恶意/异常用户是用户生命周期管控的核心动作（R-ADM-005）；会话失效联动复用既有门禁，避免重复实现。

#### Scenario: 禁用用户后状态变为禁用
- @api
- **GIVEN** 用户 王强（`user_1002`）状态为 `正常`
- **WHEN** 运营角色请求 `PATCH /api/admin/users/user_1002/status`，body `{ "status": "禁用" }`
- **THEN** 返回状态码 200
- **AND** 用户状态变为 `禁用`

#### Scenario: 禁用后该用户既有会话立即失效
- @api
- **GIVEN** 用户 王强 已登录且持有有效会话凭证，运营已将王强置为 `禁用`
- **WHEN** 王强携带原会话凭证访问需登录接口（如我的订单）
- **THEN** 返回状态码 403（错误码 `USER_DISABLED`），不返回任何订单数据

#### Scenario: 禁用后该用户无法登录
- @api
- **GIVEN** 用户 王强 状态为 `禁用`
- **WHEN** 王强以正确凭证请求 `POST /api/auth/login`
- **THEN** 返回状态码 403（错误码 `USER_DISABLED`），提示「该账户已被禁用，如有疑问请联系平台客服」
- **AND** 不创建会话

#### Scenario: 重复禁用幂等
- @unit
- **GIVEN** 用户 王强 状态已为 `禁用`
- **WHEN** 再次请求 `PATCH /api/admin/users/user_1002/status` body `{ "status": "禁用" }`
- **THEN** 返回成功，状态保持 `禁用`，不报错

### Requirement: 启用用户

系统 SHALL 在 `PATCH /api/admin/users/:id/status` 中支持将用户状态从 `禁用` 恢复为 `正常`（R-ADM-006）；启用后该用户 SHALL 可重新登录并正常使用受保护能力。

- **Priority**: P0
- **Rationale**: 误禁用/申诉后恢复用户生命周期的闭环（R-ADM-006）。

#### Scenario: 启用用户后状态恢复为正常
- @api
- **GIVEN** 用户 王强 状态为 `禁用`
- **WHEN** 运营角色请求 `PATCH /api/admin/users/user_1002/status`，body `{ "status": "正常" }`
- **THEN** 返回状态码 200
- **AND** 用户状态恢复为 `正常`

#### Scenario: 启用后可重新登录
- @api
- **GIVEN** 用户 王强 已启用（状态 `正常`）
- **WHEN** 王强以正确凭证请求 `POST /api/auth/login`
- **THEN** 返回状态码 201，创建持久会话，登录成功

#### Scenario: 非法状态值被拒绝
- @unit
- **GIVEN** 用户 王强 状态为 `正常`
- **WHEN** 运营角色请求 `PATCH /api/admin/users/user_1002/status`，body `{ "status": "冻结" }`
- **THEN** 返回状态码 400（错误码 `INVALID_STATUS`），状态不变

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

### Requirement: 角色权限门禁扩展（新增 `老板` 只读角色）

用户角色 SHALL 支持 `role ∈ {客户, 运营, 客服, 老板}`。新增 `老板` 角色：仅可访问**只读看板**（`GET /api/admin/dashboard/*`），无任何管理写权限（不可访问用户管理/商品管理/订单管理写接口）。既有 `运营` 角色门禁（R-ADM-001：仅运营可访问用户管理）保持不变。测试辅助 `POST /api/__test/user-role` SHALL 支持设置 `role=老板`。

- **Priority**: P0
- **Rationale**: 老板是决策者，只需要看经营数据，不应获得管理权限（最小权限原则）；这是 sales-dashboard 看板权限模型的一部分（story.md 旅程 1：老板只读）。

#### Scenario: 老板角色可访问销售看板但不可访问用户管理
- @api
- **GIVEN** 存在 `role=老板` 的登录会话
- **WHEN** 老板请求 `GET /api/admin/dashboard/sales`
- **THEN** 返回状态码 200
- **AND** 老板请求 `GET /api/admin/users` 返回状态码 403
- **AND** 老板请求 `PATCH /api/admin/users/:id/status` 返回状态码 403

#### Scenario: 运营角色仍可访问用户管理
- @api
- **GIVEN** 存在 `role=运营` 的登录会话
- **WHEN** 运营请求 `GET /api/admin/users`
- **THEN** 返回状态码 200（既有行为不回归）

### Requirement: 老板角色种子演示账号 user_1003

系统 SHALL 在全局种子数据中补充演示用户 `user_1003`（`role=老板`，昵称「李老板」），与既有 `user_1001`（运营·陈晓芸）、`user_1002`（客户·林晓明）种子并存：种子注入时机与既有规则一致（file 模式数据文件缺失/为空时注入，memory 模式默认含种子；注入后同步用户序列号）。该账号 SHALL 供 E2E 与演示场景验证老板只读视角（库存预警/销售看板只读、无任何管理写权限），不改变 `role ∈ {客户, 运营, 客服, 老板}` 角色体系与既有门禁。

- **Priority**: P1
- **Rationale**: 对齐 Epic 5.1 老板角色，补齐种子缺口——此前老板角色仅能通过测试后门 `POST /api/__test/user-role` 构造，E2E/演示缺少开箱即用的老板演示账号（story.md In Scope：补充 `user_1003` 种子账号）。

#### Scenario: 种子数据包含 user_1003 且角色为老板
- @unit
- **GIVEN** 系统以默认种子启动（file 数据文件为空或 memory 模式）
- **WHEN** 读取用户种子数据
- **THEN** 种子用户包含 `user_1003`（昵称「李老板」，`role=老板`，状态 `正常`）
- **AND** 种子用户包含既有 `user_1001`（运营）与 `user_1002`（客户），三者并存

#### Scenario: user_1003 可登录并只读访问看板
- @api
- **GIVEN** 系统存在种子用户 `user_1003`（role=老板）及其登录凭证
- **WHEN** `user_1003` 请求登录并携带会话凭证访问 `GET /api/admin/dashboard/stock` 与 `GET /api/admin/dashboard/sales`
- **THEN** 登录成功（201）
- **AND** 两个看板接口均返回状态码 200（老板只读可访问）

#### Scenario: user_1003 无管理写权限
- @api
- **GIVEN** 存在 `user_1003`（role=老板）的登录会话
- **WHEN** 请求写接口（如 `PUT /api/admin/stock-config`、`PATCH /api/admin/users/:id/status`、`PUT /api/products/:id`）
- **THEN** 返回状态码 403（错误码 `FORBIDDEN`）
- **AND** 不产生任何数据变更

#### Scenario: 老板种子账号在库存预警页展示只读视角
- @e2e
- **GIVEN** 老板角色（种子 `user_1003`）已登录 B 端后台并进入「库存预警」视图
- **THEN** 页面展示「纯只读 · 无配置入口」标识
- **AND** 页面不渲染「保存配置」按钮与任何阈值输入框
