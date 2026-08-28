# Story: B 端用户管理

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 openspec-handoff 以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `account-system-04-admin-users` | 优先级: P0 | 依赖: `account-system-02-login`
> 关联 Storymap: `storymaps/account-system/storymap.md`
> 关联 Idea: `ideas/idea-account-system.md`
> 关联原型（Epic 整体）: `prototypes/account-system/admin-users.html`（待生成并经用户 HITL 确认）

## 用户场景 (User Scenario)

**目标用户（B 端）**：系统管理员 / 运营人员（如后台运营"王运营"，Admin 单一后台角色，与现有商品/订单管理同权）。

**使用动机**：系统上线注册后，运营需要回答"谁是真实买家、系统里有多少活跃账户、哪个账户该被停用"。当前用户没有管理入口，无法对账户做生命周期管控。

**关键目标**：在后台「用户管理」查看用户列表（邮箱/昵称/手机号/状态/注册时间）、按邮箱搜索定位用户、执行启用/禁用（`ACTIVE` ↔ `DISABLED`），禁用后该用户无法登录、已颁发会话立即失效。

**C 端视角（关联影响）**：B 端禁用账户后，C 端该用户登录被拒（提示"账户已被禁用，请联系管理员"）；已登录会话在下次鉴权时失效。C 端无需感知后台操作，但生命周期结果直接作用于登录与鉴权。

**B 端业务逻辑（强约束）**：
- **后台怎么配置**：后台侧边栏新增「用户管理」入口，列表展示全部注册用户，支持按邮箱搜索。
- **生命周期**：`ACTIVE`（可用，注册默认）→ `DISABLED`（B 端手动，立即禁止登录）→ 可重新 `ACTIVE`（恢复登录）。
- **谁有权限**：系统管理员（Admin 单一后台角色），与现有商品/订单管理同权，无细粒度 RBAC。

## 范围 (Scope)

### In Scope
- 后台「用户管理」入口与用户列表：展示邮箱、昵称、手机号、状态（ACTIVE/DISABLED）、注册时间。
- 按邮箱关键词搜索用户（模糊匹配，如搜 `buyer@` 定位 `buyer@trade-demo.com`）。
- 账户禁用：将 `ACTIVE` 用户置为 `DISABLED`，立即生效——该用户无法登录；已颁发会话在下次鉴权时被拒。
- 账户启用：将 `DISABLED` 用户置回 `ACTIVE`，恢复登录能力。
- 禁用/启用操作反馈：操作成功即时刷新列表状态，明确成功/失败提示。

### Out of Scope
- 后台创建新用户（用户只通过 C 端注册进入用户池）。
- 编辑用户资料（昵称/手机号/邮箱）与重置密码。
- 删除用户（仅启用/禁用，保留数据主体）。
- 批量操作与分页导出（本阶段列表分页展示即可）。
- 细粒度 RBAC 与多管理员角色。

## 原型参考 (Prototype Reference)

> ⚠️ UI 门禁：本 Story 涉及后台用户管理 UI，Epic 整体原型尚未生成（`/req:prototype` 未产出），故「交接状态」不勾选待开发交接。原型经用户 HITL 确认后补充链接。

- 原型链接：`prototypes/account-system/admin-users.html`（Epic 整体原型，待 `/req:prototype` 生成并经用户 HITL 确认后链接）
- 关键交互点：后台「用户管理」列表（邮箱/昵称/手机号/状态/注册时间）、邮箱搜索框、单行启用/禁用操作按钮、状态切换后的即时反馈。
- UI 约束（`docs/FRONTEND.md`）：无圆角、无阴影、slate 色系、真实数据、全中文。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-ADM-001 | 用户列表展示全部注册用户 | 进入「用户管理」页 | 列表展示邮箱/昵称/手机号/状态/注册时间，注册用户自动入池 | 如"张采购"（buyer@trade-demo.com，ACTIVE） |
| R-ADM-002 | 按邮箱模糊搜索 | 输入邮箱关键词搜索 | 仅返回匹配邮箱的用户 | 如搜 `buyer@` 定位到 `buyer@trade-demo.com` |
| R-ADM-003 | 禁用账户立即生效 | 运营将 ACTIVE 用户置为 DISABLED | 状态变 DISABLED；该用户登录被拒（"账户已被禁用，请联系管理员"） | 与 R-LOGIN-003 协同 |
| R-ADM-004 | 禁用后已颁发会话失效 | 用户持有已颁发 token 时被禁用 | 下次鉴权拒绝访问，会话立即失效 | 与 R-SESS-007 协同 |
| R-ADM-005 | 启用账户恢复登录 | 运营将 DISABLED 用户置为 ACTIVE | 状态变 ACTIVE；该用户可重新登录 | 状态流转 ACTIVE ↔ DISABLED |
| R-ADM-006 | 操作权限：Admin 单一后台角色 | 任意用户管理操作 | 仅系统管理员可访问用户管理，与商品/订单管理同权 | 无细粒度 RBAC |
| R-ADM-007 | 操作反馈即时刷新 | 禁用/启用操作提交 | 列表状态即时更新，成功/失败均有明确提示 | 无空洞占位 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：运营查看并搜索用户列表 (Ref: L1-03 加购与准备（用户会话/身份管理前置）| SB-LANE-OPS, SB-OPS-06)
#### 场景：正常查看用户列表与邮箱搜索
- @e2e
- **GIVEN** 系统存在已注册用户：`buyer@trade-demo.com`（昵称"张采购"，手机 `13800001234`，ACTIVE）、`ops@trade-demo.com`（昵称"王运营"，手机 `13900005678`，ACTIVE）
- **WHEN** 运营"王运营"进入后台「用户管理」，并在搜索框输入 `buyer@`
- **THEN** 用户列表仅返回邮箱含 `buyer@` 的用户（`buyer@trade-demo.com`），展示邮箱/昵称/手机号/状态 `ACTIVE`/注册时间

### 旅程 2：禁用账户后 C 端无法登录 (Ref: L1-03 加购与准备 | SB-STAGE-01, SB-CUSTOMER-01, SB-OPS-06)
#### 场景：禁用账户立即生效
- @e2e
- **GIVEN** 用户 `buyer@trade-demo.com` 状态为 `ACTIVE`
- **WHEN** 运营在「用户管理」将该用户置为 `DISABLED`，随后该用户用正确邮箱与密码 `trade1234` 登录
- **THEN** 用户列表状态即时变为 `DISABLED`；登录被拒绝，提示"账户已被禁用，请联系管理员"

### 旅程 3：启用账户恢复登录 (Ref: L1-03 加购与准备 | SB-STAGE-01, SB-CUSTOMER-01, SB-OPS-06)
#### 场景：启用账户恢复可用
- @e2e
- **GIVEN** 用户 `buyer@trade-demo.com` 状态为 `DISABLED`
- **WHEN** 运营在「用户管理」将该用户置为 `ACTIVE`，随后该用户用正确邮箱与密码 `trade1234` 登录
- **THEN** 用户列表状态即时变为 `ACTIVE`；登录成功并进入个人区，可正常下单/查看我的订单

## 治理映射对齐 (Governance Mapping)

- **Source of Truth**: docs/baseline/domain_model.html
- **Bounded Context**: `account`（**新增 BC**，用户管理与账户生命周期）。
- **Capability Taxonomy**: `user-admin`（**新增**，B 端用户管理入口）；复用 `frontend-ui`（后台列表交互）、`domain-model`（`User` 聚合与 `ACTIVE/DISABLED` 状态机）。
- **Related Process Nodes**: `L1-03 加购与准备`（登录准入，禁用账户拒绝登录）、`L2-02 加载结算上下文`（身份校验）；用户管理为新增 B 端 L3 环节（基线补充，设计中）。
- **Related Service Blueprint Nodes**: `SB-LANE-OPS`（运营层新增用户管理活动）、`SB-OPS-06`（B 端订单/用户管理入口，新增用户管理活动）、`SB-STAGE-01`、`SB-CUSTOMER-01`（禁用后登录被拒的 C 端入口）、`SB-BACKSTAGE-02`（禁用后会话鉴权失效）。
- **Sync Assessment**: **Yes**（新增 `account` BC 与 `user-admin` capability；`User` 聚合 `ACTIVE/DISABLED` 状态机回流 domain_model；service_blueprint 运营泳道新增用户管理节点）。

## 交接状态 (Handoff Status)

<!--
UI 门禁：本 Story 涉及后台用户管理 UI，原型未生成并经用户 HITL 确认，禁止勾选「待开发交接」。
-->

- [ ] 待开发交接 (openspec-handoff)
- [ ] 已交接 (changeName: <change-name> 记录于 epic/storymap/story-list.json)
