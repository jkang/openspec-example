# Storymap: 用户账户体系 需求拆分

> Epic Key: `account-system`
> 关联调研: `epics/account-system/research.md`
> 关联 Idea: `epics/account-system/idea.md`
> 关联原型: `epics/account-system/prototypes/account-register.html`、`account-login.html`、`account-session.html`、`admin-users.html`（Epic 整体，已 HITL 确认）
> 产出后需用户确认（HITL）

<!--
storymap 用于把大需求（Epic 级）拆分为多个可独立交付的 Story。
每个 Story 对应 epics/account-system/stories/<story-key>/story.md（业务面交付物）。
要求：拆分必须【覆盖完整】（Epic 每个承诺项都要有 Story 承接），粒度取【完整端到端功能】。
-->

## 需求背景 (Background)

让订单、优惠券、购物车拥有真实归属主体 —— 用户账户体系（注册/登录/会话），替换 `user_dev` 占位用户。C 端买家可极简注册登录并查看「我的订单」；B 端运营可查询真实用户与订单归属；为「回款与应收账款闭环」（Phase D）奠定账户基础。跨能力（认证 + 会话 + 订单归属 + B 端用户管理），属大块 Epic，拆分 4 个端到端 Story。

## 拆分粒度原则 (Granularity)

- Story = 一个【完整端到端功能】的粒度（如"用户注册"含 表单 → 校验 → 创建用户 → 自动登录 整条链路）。
- 不拆到行为/UI 细节级，避免破坏上下文。
- 每个 Story 必须可独立交付、可独立验收。
- 三要素：角色 (Role) / 价值 (Value) / 目标 (Goal)。

## Story 拆分明细

| Story ID | 标题 | 角色 (Role) | 价值 (Value) | 目标 (Goal) | 依赖 | 优先级 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| story-account-register | 用户注册 | C 端新买家（如林晓明） | 极简注册后即自动登录，无需二次登录即可下单 | 手机号+密码+昵称完成注册，手机号唯一校验，成功后创建账户并自动登录 | 无 | P0 | planned |
| story-account-login | 用户登录 | C 端已注册买家 | 凭手机号+密码恢复身份，访问受保护的「我的订单」与下单能力 | 校验凭证正确后创建持久会话，错误与禁用状态有明确提示 | story-account-register（用户池） | P0 | planned |
| story-account-session | 会话保持与退出 | C 端买家（登录后） | 刷新/换页不掉登录态，订单归属当前用户；主动退出即销毁会话 | 会话凭证持久化并全局校验；「我的订单」按登录用户归属查询；退出登录销毁会话 | story-account-login | P0 | planned |
| story-account-admin-users | B 端用户管理 | B 端运营（陈运营） | 告别"订单里全是 user_dev"，按真实用户检索并查看订单聚合，支持禁用管控 | 用户列表/按手机号或昵称检索/详情（含订单聚合）/禁用启用；仅运营角色可见 | story-account-register（用户数据） | P1 | planned |

## 覆盖对账 (Coverage Reconciliation)

> ⚠️ 强制步骤：拆分前先列出 Epic 的承诺项（来自 idea/research 的 In Scope + Exit Criteria + 候选 Capabilities + B 端承诺）；拆分后逐项对账。

| Epic 承诺项（来自 idea/research） | 承接 Story | 覆盖状态 |
| --- | --- | --- |
| Exit Criteria ① 注册/登录 E2E 通过（登录后可下单，订单归属当前用户） | story-account-register + story-account-login + story-account-session | ✅ 覆盖（注册自动登录 → 登录会话 → 会话页归属订单） |
| Exit Criteria ② 未登录不可下单/查看我的订单（引导登录） | story-account-session（未登录拦截 + 引导） | ✅ 覆盖 |
| Exit Criteria ③ 会话保持（刷新不掉登录态） | story-account-session | ✅ 覆盖 |
| In Scope：用户账户注册/登录/会话（基础认证，无第三方依赖） | story-account-register + story-account-login + story-account-session | ✅ 覆盖 |
| In Scope：订单与优惠券按真实用户归属；「我的订单」按登录用户查询 | story-account-session（我的订单归属隔离）；order-management 改造约束写入 story-account-session 验收 | ✅ 覆盖 |
| In Scope：用户基础信息（昵称/联系方式） | story-account-register（注册采集昵称+手机号） | ✅ 覆盖 |
| B 端承诺：用户管理入口（列表/检索/详情/禁用，运营权限） | story-account-admin-users | ✅ 覆盖 |
| Candidate Capability: `account-management`（新增 taxonomy） | story-account-register + story-account-login | ✅ 覆盖 |
| Candidate Capability: `user-session`（新增 taxonomy） | story-account-login + story-account-session | ✅ 覆盖 |
| Candidate Capability: `user-admin`（新增 taxonomy） | story-account-admin-users | ✅ 覆盖 |
| Candidate Capability: `order-management`（修改，真实 userId 归属） | story-account-session（归属查询验收）；下单归属改造并入 register/login 链路验收 | ✅ 覆盖 |
| Explore 护栏：B/C 双端原型 | story-account-register/login/session（C 端）+ story-account-admin-users（B 端） | ✅ 覆盖 |
| 约束：零第三方认证依赖 / 文件会话持久化 | story-account-login + story-account-session（会话实现约束） | ✅ 覆盖 |
| 约束：手机号唯一性 | story-account-register | ✅ 覆盖 |
| 约束：禁用用户会话失效 | story-account-admin-users（禁用动作）+ story-account-session（会话校验拦截） | ✅ 覆盖 |

**对账结论**：14 项承诺项全部 ✅ 覆盖，无未覆盖项需补拆或降级。

## 治理映射对齐

- **Impacted Bounded Contexts**：`Order Context`（修改）、`Cart Context`（修改）、`Coupon Context`（修改）、**`User Context`（新增 taxonomy）**、`Shared / Cross`（复用）。
- **Impacted Process Nodes**：`L1-03 加购与准备`、`L1-04 下单结算`、`L1-06 履约与完成`；`L2-01 进入结算`；`L3-02 执行资格校验`（优惠券归属）。
- **Impacted Service Blueprint Nodes**：`SB-STAGE-01/02/03/04/06`、`SB-CUSTOMER-01/02/03/06`、`SB-BACKSTAGE-04`（归属查询改造）+ 新增 B 端用户管理泳道（待 Baseline Sync 落位）。
- **Sync Assessment**: **Yes** — 新增 `User Context` BC 与 3 个 capability taxonomy，属基线级变化；需在 Epic 全部 Story 归档后执行 Baseline Sync（本阶段仅预判，不执行）。

## 关联 Stories

- `epics/account-system/stories/story-account-register/story.md`
- `epics/account-system/stories/story-account-login/story.md`
- `epics/account-system/stories/story-account-session/story.md`
- `epics/account-system/stories/story-account-admin-users/story.md`
