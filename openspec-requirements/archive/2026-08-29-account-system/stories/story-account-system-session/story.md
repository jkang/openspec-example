# Story: 会话保持与退出

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-account-system-session` | 优先级: P0 | 依赖: story-account-system-login
> 关联 Storymap: `epics/account-system/storymap.md`
> 关联 Idea: `epics/account-system/idea.md`
> 关联原型（Epic 整体）: `epics/account-system/prototypes/account-session.html`

## 用户场景 (User Scenario)

- **目标用户（C 端）**：已登录买家（如林晓明）。
- **使用动机**：
  1. 刷新页面 / 切换标签后不想重新登录（会话保持）。
  2. 需要查看「我的订单」——只能看到自己的订单（归属隔离）。
  3. 公共设备上用完主动退出（销毁会话）。
- **关键目标**：会话持久化 + 全局校验；未登录访问受保护能力时引导登录（Exit Criteria ②③）。
- **B 端视角**：会话是用户生命周期的运行时状态。B 端禁用用户后其会话立即失效（R-SES-006）；「我的订单」按会话 userId 归属查询（`GET /api/orders?userId=`），order-management 改造的关键落点。

## 范围 (Scope)

### In Scope
- 会话凭证持久化：前端存储 + 后端会话文件/内存，刷新/重开浏览器不掉登录态。
- 全局会话校验：所有需登录接口（下单、我的订单、购物车归属）校验会话凭证有效性。
- 「我的订单」归属查询：按当前会话 userId 返回订单列表（替代 `user_dev` 占位）。
- 未登录访问「我的订单」/下单：拦截并引导登录（整页跳转 + 回跳）。
- 退出登录：销毁会话凭证，前端清除登录态，回到未登录状态。
- 禁用用户会话失效：会话校验时检测用户状态，禁用即拒绝（联动 story-account-system-admin-users）。

### Out of Scope
- 会话过期时间的自动刷新/续期策略（本阶段会话长期有效，待确认）。
- 多设备会话并行管理（仅单会话模型）。
- 购物车跨端同步的完整实现（本阶段仅归属字段就绪，具体同步策略后续阶段）。

## 原型参考 (Prototype Reference)

> ⚠️ UI 门禁：原型已生成并经 HITL 确认，满足交接条件。
- 原型链接：`epics/account-system/prototypes/account-session.html`
- 关键交互点：会话凭证/登录时间/持久化状态展示、刷新保持演示、我的订单列表（按用户归属隔离）、退出登录按钮、未登录引导态。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-SES-001 | 会话凭证持久化，刷新不掉 | 页面刷新/重开 | 登录态保持，无需重新登录 | Exit Criteria ③ |
| R-SES-002 | 需登录接口强制校验会话 | 访问下单/我的订单/购物车接口 | 无有效会话返回 401，前端引导登录 | Exit Criteria ② |
| R-SES-003 | 「我的订单」按会话 userId 归属查询 | 已登录访问我的订单 | 仅返回当前用户订单，倒序展示 | 替代 user_dev；对应 SB-BACKSTAGE-04 `GET /api/orders?userId=` |
| R-SES-004 | 未登录访问受保护页面 → 整页跳转登录并回跳 | 未登录访问我的订单/结算 | 跳转登录页，登录成功后回跳原页面 | Q-4 默认方案 |
| R-SES-005 | 退出登录销毁会话 | 点击「退出登录」 | 后端销毁会话凭证，前端清除登录态，回到未登录 | |
| R-SES-006 | 禁用用户会话立即失效 | 用户被禁用后访问需登录接口 | 会话校验拒绝，返回未登录引导 | 联动 story-account-system-admin-users |
| R-SES-007 | 下单绑定当前会话 userId | 已登录用户提交订单 | Order.userId = 当前登录用户（替代 user_dev） | order-management 修改落点，对齐 L1-04 |

## 验收标准 (E2E 用户旅程)

> 聚焦于跨模块的端到端用户旅程，使用 Given/When/Then 描述。
> 必须映射到流程基线中的 L1 (价值流) 和 L2 (协同流) 节点；同时映射到 service_blueprint.html 中的 SB-STAGE-* 与 SB-CUSTOMER-* 节点。

### 旅程 1：登录后会话保持并查看我的订单 (Ref: L1-04, L1-06 | SB-STAGE-04, SB-STAGE-06, SB-CUSTOMER-04, SB-CUSTOMER-06)
#### 场景：正常主流程——刷新不掉登录态且订单归属当前用户
- @e2e
- **GIVEN** 用户林晓明已登录（持有持久会话凭证），已支付 1 笔订单（OD20260820001 纯棉圆领T恤）
- **WHEN** 刷新浏览器页面
- **THEN** 登录态保持，页面仍显示「林晓明」已登录，无需重新登录
- **AND** 进入「我的订单」仅展示 OD20260820001 等林晓明的订单，不含其他用户订单（归属隔离）
- **AND** 该用户新提交订单时 Order.userId 绑定为当前登录用户，替代 user_dev

#### 场景：未登录访问我的订单被拦截
- @e2e
- **GIVEN** 浏览器无任何会话凭证（未登录）
- **WHEN** 直接访问「我的订单」页面
- **THEN** 系统拦截并跳转登录页（带回跳参数）
- **AND** 登录成功后回到「我的订单」页面

#### 场景：退出登录销毁会话
- @e2e
- **GIVEN** 用户林晓明已登录
- **WHEN** 点击「退出登录」
- **THEN** 会话凭证被销毁，页面回到未登录态
- **AND** 再次访问「我的订单」被引导登录

#### 场景：禁用用户会话失效（联动 B 端）
- @e2e
- **GIVEN** 用户王强已登录且持有有效会话
- **WHEN** 运营在用户管理中将王强禁用
- **THEN** 王强下次访问需登录接口（如我的订单）时校验失败
- **AND** 被引导重新登录，登录页提示「该账户已被禁用」

## 治理映射对齐 (Governance Mapping)

- Source of Truth: `docs/baseline/domain_model.html`
- Bounded Context: **User Context（新增 taxonomy）**；Order Context（修改，归属查询）、Cart Context（修改，购物车 userId 归属）
- Capability Taxonomy: **`user-session`（新增 taxonomy，会话生命周期）**、**`account-management`（新增，登录态消费）**、**`order-management`（修改，归属查询与下单绑定）**
- Related Process Nodes: `L1-04 下单结算`（订单绑定 userId）、`L1-06 履约与完成`（我的订单归属查询）、`L2-01 进入结算`（会话校验）
- Related Service Blueprint Nodes: `SB-STAGE-04`（提交订单归属）、`SB-STAGE-06`（成功回流·我的订单入口）、`SB-CUSTOMER-04`（下单归属）、`SB-CUSTOMER-06`（我的订单查看）、`SB-BACKSTAGE-04`（`GET /api/orders?userId=` 归属查询改造）
- Sync Assessment: **Yes** — 新增 `user-session` taxonomy + Order/Cart 归属语义更新，需 Epic 归档后 Baseline Sync（本阶段预判不执行）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff) — 满足交接条件（UI 门禁已通过：原型已确认）
- [x] 已交接 (changeName: story-account-system-session 记录于 openspec/epic-account-system.story-list.json)
