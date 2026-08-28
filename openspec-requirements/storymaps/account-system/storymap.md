# Storymap: 用户账户体系（注册 / 登录 / 会话 / B 端用户管理）

<!--
storymap 用于把大需求（Epic 级）拆分为多个可独立交付的 Story。
每个 Story 对应 stories/<key>/story.md（业务面交付物）。
要求：拆分必须【覆盖完整】（Epic 每个承诺项都要有 Story 承接），粒度取【完整端到端功能】。
-->

> 关联 Epic: `planning/epics/account-system/epic.md` | 来源 Idea: `ideas/idea-account-system.md`

## 需求背景 (Background)

现有系统将订单、优惠券归属硬编码为 `user_dev` 占位用户，所有买家共享同一份身份，无法回答"这笔订单/这张券属于哪个真实买家"。本 storymap 把「用户账户体系」拆为 **4 个可独立交付、可独立验收的 Story**，让「我的订单」按登录用户查询、未登录不可下单，并让 B 端运营能对账户做生命周期管理（启停），为回款闭环奠基。存量 `user_dev` 数据本阶段**不做迁移**（保留并视为无归属），新订单/新发券使用真实 userId。

## 拆分粒度原则 (Granularity)

- Story = 一个**完整端到端功能**的粒度：如「用户注册」覆盖 表单→校验→创建账户→自动登录 整条链路；「B 端用户管理」覆盖 列表→搜索→启用/禁用→C 端登录联动 整条链路。
- 不拆到行为/UI 细节级（接口状态码、字段校验细节留给开发侧 proposal 后生成 specs）。
- 每个 Story 必须可独立交付、可独立验收；三要素：角色 (Role) / 价值 (Value) / 目标 (Goal)。
- 依赖线性清晰：register（无依赖，P0）→ login（依赖 register，P0）→ session（依赖 login，P1）；admin-users（依赖 login，P0，可与 session 并行）。

## Story 拆分明细

| Story ID | 标题 | 角色 (Role) | 价值 (Value) | 目标 (Goal) | 依赖 | 优先级 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| account-system-01-register | 用户注册 | 游客（新买家） | 快速创建自己的账户 | 注册后获得状态为 ACTIVE 的账户并自动登录，可继续逛/下单 | 无 | P0 | planned |
| account-system-02-login | 用户登录 | 已注册用户 | 安全访问自己的账户与订单 | 用邮箱+密码登录进入个人区；登录后新下单归属本人；我的订单仅返回本人订单 | account-system-01-register | P0 | planned |
| account-system-03-session | 会话保持 | 已登录用户 | 免重复登录、时刻知道"我是谁" | 刷新不掉登录态，退出即失效，未登录下单/看订单被拦截引导 | account-system-02-login | P1 | planned |
| account-system-04-admin-users | B 端用户管理 | 系统管理员/运营 | 掌控用户池与账户生命周期 | 后台查看用户列表、按邮箱搜索、启用/禁用（ACTIVE/DISABLED），禁用后无法登录 | account-system-02-login | P0 | planned |

## 覆盖对账 (Coverage Reconciliation)

| Epic 承诺项（来自 epic.md） | 承接 Story | 覆盖状态 |
| --- | --- | --- |
| Exit Criteria ①：注册 E2E 通过（新买家注册成功获得 ACTIVE 账户，可进入登录） | account-system-01-register | ✅ 覆盖 |
| Exit Criteria ②：登录 E2E 通过（买家登录后跳转个人区，可下单，订单 userId 归属当前登录用户） | account-system-02-login | ✅ 覆盖 |
| Exit Criteria ③：会话保持 E2E 通过（刷新不掉登录态；退出登录后会话失效） | account-system-03-session | ✅ 覆盖 |
| Exit Criteria ④：未登录拦截 E2E 通过（未登录点击下单/「我的订单」触发登录引导） | account-system-03-session | ✅ 覆盖 |
| Exit Criteria ⑤：B 端用户管理可用（后台可查看用户列表并启停账户，禁用用户无法登录） | account-system-04-admin-users | ✅ 覆盖 |
| In Scope: C 端认证（注册/登录/会话/退出登录） | account-system-01-register + account-system-02-login + account-system-03-session | ✅ 覆盖 |
| In Scope: 订单/优惠券真实归属（新订单 userId 绑定当前登录用户；我的订单按 userId 查询；优惠券 userId 非空） | account-system-02-login | ✅ 覆盖（新订单归属本人；优惠券 userId 非空以真实用户存在为前提，随 login 建立身份主体） |
| In Scope: 用户基础信息（昵称/联系方式） | account-system-01-register | ✅ 覆盖 |
| In Scope: B 端用户管理（后台「用户管理」入口，查看列表，启用/禁用） | account-system-04-admin-users | ✅ 覆盖 |
| B 端承诺项：账户生命周期 ACTIVE ↔ DISABLED 由运营掌控、禁用即禁止登录 | account-system-04-admin-users + account-system-02-login（R-LOGIN-003 联动） | ✅ 覆盖 |

> 对账结论：Epic 全部 5 条 Exit Criteria 与全部 In Scope / B 端承诺项均有 ≥1 个 Story 承接，覆盖完整，无缺口。

## 治理映射对齐

- **Impacted Bounded Contexts**: `account`（**新增 BC**：注册/登录/会话/用户管理）、`cart`（Cart Context：Session 归属一致性）、`order`（Order Context：订单 `userId` 真实归属）、`coupon`（Coupon Context：发券 `userId` 非空）、`shared`（`frontend-ui` / `domain-model`）。
- **新增 Capability Taxonomy**: `account-management`（register/login story）、`user-session`（session story）、`user-admin`（admin-users story）。
- **Candidate Capabilities (复用)**: `frontend-ui`、`domain-model`、`order-management`、`cart-management`、`coupon-management`。
- **Impacted Process Nodes**: `L1-03 加购与准备`（注册/登录前置身份、禁用账户登录准入）、`L1-04 下单结算`（未登录下单拦截）、`L1-06 履约与完成`（我的订单按用户）、`L2-02 加载结算上下文`（身份上下文）、`L2-06 发起支付`（归属校验）。
- **Impacted Service Blueprint Nodes**: `SB-STAGE-01`（登录/注册入口，CUSTOMER-01）、`SB-STAGE-02`（加购身份校验，CUSTOMER-02）、`SB-STAGE-04`（下单拦截，CUSTOMER-04）、`SB-STAGE-06`（我的订单按用户，CUSTOMER-06）、`SB-LANE-OPS` / `SB-OPS-06`（B 端用户管理，新增运营活动）、`SB-LANE-BACKSTAGE` / `SB-BACKSTAGE-02`（Session 一致性）、`SB-BACKSTAGE-04`（订单 `userId=` 查询）；账户体系为横切新增，贯穿 `SB-LANE-CUSTOMER` / `SB-LANE-OPS` / `SB-LANE-BACKSTAGE`。
- **Sync Assessment**: **Yes**（新增 `account` BC 与 `account-management`/`user-session`/`user-admin` taxonomy，Phase 完成后回流三份基线）。

## 关联 Stories

- stories/account-system-01-register/story.md（用户注册，P0，无依赖）
- stories/account-system-02-login/story.md（用户登录，P0，依赖 register）
- stories/account-system-03-session/story.md（会话保持，P1，依赖 login）
- stories/account-system-04-admin-users/story.md（B 端用户管理，P0，依赖 login）
