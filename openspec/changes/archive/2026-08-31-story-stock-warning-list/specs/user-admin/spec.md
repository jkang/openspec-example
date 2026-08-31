# user-admin Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/user-admin/spec.md`（本 change 对既有能力的轻量修改）。治理归属：User Context（`bc-user → cap-user-admin`）。本增量仅补充 `user_1003`（role=老板）种子演示账号，角色体系与权限门禁语义不变。

## ADDED Requirements

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

## Governance Mapping

- **Bounded Context**: User Context（`domain_model.html` BC → Capability 映射表：`bc-user → cap-user-admin`，Governs：B 端用户管理 + role=老板 只读扩展）
- **Capability Taxonomy**: `user-admin`（修改·轻量：补充 `user_1003` 老板种子账号，角色体系不变）
- **Process Alignment**: L1-07 经营分析（只读支流：老板只读视角的数据访问者）；不改变 L2/L3 交易节点
- **Service Blueprint**: SB-STAGE-06（老板只读聚合回查视角）、SB-BACKSTAGE-06（老板只读消费「库存数据聚合」）；SB-<LANE>-* 无 C 端变化
- **实现版本**: Node.js（种子数据扩展）
