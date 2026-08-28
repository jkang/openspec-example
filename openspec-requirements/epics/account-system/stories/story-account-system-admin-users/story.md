# Story: B 端用户管理

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-account-system-admin-users` | 优先级: P1 | 依赖: story-account-system-register（用户数据）
> 关联 Storymap: `epics/account-system/storymap.md`
> 关联 Idea: `epics/account-system/idea.md`
> 关联原型（Epic 整体）: `epics/account-system/prototypes/admin-users.html`

## 用户场景 (User Scenario)

- **目标用户（B 端）**：运营角色（如陈运营），日常处理订单管理、优惠券发放、客诉。
- **使用动机**：现状订单列表全是 `user_dev`，无法区分买家身份；想按用户维度聚合订单（一人多单）、定位具体顾客，需要后台用户管理入口。
- **关键目标**：按手机号/昵称检索用户、查看用户基础信息与其订单聚合、禁用恶意/异常用户；敏感信息受权限约束。
- **B 端视角**：
  - **后台怎么配置**：用户管理为查看型后台功能，无需运营配置项（用户数据由 C 端注册产生）。
  - **生命周期**：查看正常/禁用用户；禁用后用户会话立即失效（联动 story-account-system-session R-SES-006）；可重新启用。
  - **谁有权限**：仅「运营」角色可见本入口；客服账号无权限访问全量用户资料（敏感信息保护，research 访谈记录 2 信号）。

## 范围 (Scope)

### In Scope
- 用户列表：用户 ID、昵称、手机号、订单数、注册日期、状态。
- 检索：按手机号 / 昵称关键词过滤。
- 用户详情：基础信息 + 该用户订单聚合列表。
- 禁用/启用用户：状态变更；禁用后其会话失效。
- 权限约束：仅运营角色可访问用户管理入口。

### Out of Scope
- 用户资料编辑（昵称/手机号修改，Q-5 默认只读）。
- 密码重置（运营侧改密）。
- 用户数据导出 / 批量操作。
- 客服视角的受限用户视图（本阶段客服无任何用户管理权限）。

## 原型参考 (Prototype Reference)

> ⚠️ UI 门禁：原型已生成并经 HITL 确认，满足交接条件。
- 原型链接：`epics/account-system/prototypes/admin-users.html`
- 关键交互点：检索区（关键词搜索/重置）、用户列表（含订单数/状态/操作）、用户详情抽屉（含订单聚合）、禁用/启用切换、权限说明区。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-ADM-001 | 用户管理入口仅运营角色可见 | 非运营角色访问 | 拒绝访问，无入口显示 | 权限约束（research 访谈记录 2） |
| R-ADM-002 | 列表展示用户基础信息与订单数 | 进入用户管理 | 展示 ID/昵称/手机号/订单数/注册日期/状态 | 订单数聚合自订单归属 |
| R-ADM-003 | 按手机号或昵称关键词检索 | 输入关键词搜索 | 返回匹配用户列表；空关键词返回全量 | |
| R-ADM-004 | 用户详情展示该用户全部订单 | 点击用户查看详情 | 展示基础信息 + 订单聚合（订单号/商品/金额/状态） | 一人多单聚合，对齐运营诉求 |
| R-ADM-005 | 禁用用户 | 点击「禁用」 | 状态变为「已禁用」；该用户现有会话立即失效 | 联动 story-account-system-session R-SES-006 |
| R-ADM-006 | 启用用户 | 点击「启用」 | 状态恢复「正常」；可重新登录 | |
| R-ADM-007 | 手机号属敏感信息，访问受限 | 非运营角色尝试读取用户手机号 | 拒绝返回手机号字段 | 敏感信息保护 |

## 验收标准 (E2E 用户旅程)

> 聚焦于跨模块的端到端用户旅程，使用 Given/When/Then 描述。
> 必须映射到流程基线中的 L1 (价值流) 和 L2 (协同流) 节点；同时映射到 service_blueprint.html 中的 SB-STAGE-* 与 SB-CUSTOMER-* 节点。

### 旅程 1：运营定位用户并处理客诉 (Ref: L1-06 | SB-STAGE-06, SB-BACKSTAGE-04, SB-CUSTOMER-06)
#### 场景：正常主流程——按手机号检索并下钻用户订单
- @e2e
- **GIVEN** 运营陈晓芸已登录 B 端后台（运营角色），订单列表出现一笔归属 U00001 林晓明的订单
- **WHEN** 进入「用户管理」，输入手机号 13888217536 搜索
- **THEN** 列表返回用户 林晓明（订单数 3，状态正常）
- **AND** 点击用户详情，展示林晓明的 3 笔订单（OD20260820001/02/03），可用于客诉定位

#### 场景：禁用用户导致会话失效（跨 Story 联动）
- @e2e
- **GIVEN** 用户王强（15876543210）已登录且会话有效
- **WHEN** 运营在用户管理中将王强禁用
- **THEN** 王强状态变为「已禁用」
- **AND** 王强再次访问需登录接口被拒绝，登录时提示「该账户已被禁用」

#### 场景：权限拦截——客服账号访问用户管理
- @e2e
- **GIVEN** 客服角色账号（非运营）已登录 B 端后台
- **WHEN** 客服尝试访问用户管理入口或调用用户列表接口
- **THEN** 系统拒绝访问，提示无权限，不返回任何用户手机号等敏感信息

## 治理映射对齐 (Governance Mapping)

- Source of Truth: `docs/baseline/domain_model.html`
- Bounded Context: **User Context（新增 taxonomy）**；Order Context（修改，订单聚合查询依赖归属）
- Capability Taxonomy: **`user-admin`（新增 taxonomy，B 端用户管理）**
- Related Process Nodes: `L1-06 履约与完成`（订单聚合回查）、`L3-02 执行资格校验`（优惠券用户归属匹配，间接依赖真实用户数据）
- Related Service Blueprint Nodes: `SB-STAGE-06`（成功回流·订单归属沉淀）、`SB-CUSTOMER-06`（我的订单，B 端视角数据源）、`SB-BACKSTAGE-04`（`GET /api/orders?userId=` 归属查询复用）；新增 B 端用户管理泳道节点（待 Baseline Sync 落位）
- Sync Assessment: **Yes** — 新增 `user-admin` taxonomy 与 B 端泳道，需 Epic 归档后 Baseline Sync（本阶段预判不执行）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff) — 满足交接条件（UI 门禁已通过：原型已确认）
- [ ] 已交接 (changeName: <change-name> 记录于 openspec/epic-account-system.story-list.json)
