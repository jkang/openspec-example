# user-admin Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/user-admin/spec.md`（本 change 对既有能力的修改）。治理归属：User Context。

## MODIFIED Requirements

### Requirement: 角色权限门禁扩展（新增 `老板` 只读角色）

用户角色 SHALL 支持 `role ∈ {客户, 运营, 客服, 老板}`。新增 `老板` 角色：仅可访问**只读看板**（`GET /api/admin/dashboard/*`），无任何管理写权限（不可访问用户管理/商品管理/订单管理写接口）。既有 `运营` 角色门禁（R-ADM-001：仅运营可访问用户管理）保持不变。测试辅助 `POST /api/__test/user-role` SHALL 支持设置 `role=老板`。

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

## Governance Mapping

- **Bounded Context**: User Context（`domain_model.html` BC → Capability 映射表：`bc-user → cap-user-admin`）
- **Capability Taxonomy**: `user-admin`（修改：角色模型扩展 `role=老板`）
- **Process Alignment**: L1-06 履约与完成（B 端聚合回查的角色视角）；不改变 L2/L3 交易节点
- **Service Blueprint**: SB-BACKSTAGE-06（老板只读视角）；SB-<LANE>-* 无 C 端变化
- **实现版本**: Node.js（role 校验扩展 + 看板门禁）
