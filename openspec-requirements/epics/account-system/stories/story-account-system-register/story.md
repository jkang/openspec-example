# Story: 用户注册

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-account-system-register` | 优先级: P0 | 依赖: 无
> 关联 Storymap: `epics/account-system/storymap.md`
> 关联 Idea: `epics/account-system/idea.md`
> 关联原型（Epic 整体）: `epics/account-system/prototypes/account-register.html`

## 用户场景 (User Scenario)

- **目标用户（C 端）**：新买家（如林晓明），首次在商城下单，当前无任何账户。
- **使用动机**：购物车已有商品，点击「去结算」时被引导登录——没有账户，只能先注册。
- **关键目标**：用最少的步骤完成注册并直接进入可用状态（自动登录），不要重复填表、不要二次登录。
- **B 端视角**：注册由 C 端自助发起，后台无配置项；注册产生的用户数据（昵称/手机号）成为 B 端用户管理（story-account-system-admin-users）与订单归属的基础。生命周期起点：`注册成功 → 状态正常`。

## 范围 (Scope)

### In Scope
- 注册表单：手机号（11 位）、昵称（默认"手机尾号用户"可改）、密码（≥6 位，单次输入 + 明文切换）。
- 手机号唯一性校验：已注册手机号提示「该手机号已注册，请直接登录」，不创建重复用户。
- 创建用户记录（`users.json` 持久化，对齐现有 JSON 存储风格）。
- 注册成功即自动登录（创建会话，见 story-account-system-login 的会话能力复用）。
- 密码安全：不落明文（存储哈希）。

### Out of Scope
- 密码找回 / 忘记密码（Q-1 默认暂不提供，见 idea.md）。
- 第三方 OAuth / 短信验证码。
- 个人资料修改（Q-5 默认本阶段只读）。
- 邮箱、实名认证等扩展信息。

## 原型参考 (Prototype Reference)

> ⚠️ UI 门禁：原型已生成并经 HITL 确认，满足交接条件。
- 原型链接：`epics/account-system/prototypes/account-register.html`
- 关键交互点：手机号/昵称/密码三栏表单、手机号唯一冲突提示（演示 13912345678 已注册）、注册成功自动登录横幅、「显示密码」切换。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-REG-001 | 手机号必须为 11 位中国大陆手机号 | 提交注册 | 非法格式提示「请输入 11 位有效手机号」，不提交 | 校验格式 `1\d{10}` |
| R-REG-002 | 手机号全局唯一 | 提交注册 | 已存在则提示「该手机号已注册，请直接登录」，不创建用户 | 唯一性约束 |
| R-REG-003 | 昵称必填，长度 ≤20 字，默认"手机尾号用户" | 提交注册 | 昵称为空提示「请输入昵称」；未填时采用默认昵称 | |
| R-REG-004 | 密码最少 6 位，最长 32 位 | 提交注册 | 长度不足提示「密码至少 6 位」，不提交 | 单次输入 + 明文可见切换 |
| R-REG-005 | 密码不得明文落库 | 创建用户 | 存储密码哈希，不存明文 | 安全约束 |
| R-REG-006 | 注册成功即自动登录 | 用户创建成功 | 创建会话凭证并跳转登录态；无需二次登录 | 与 story-account-system-login 会话能力复用 |
| R-REG-007 | 新用户默认状态为「正常」 | 用户创建 | status = 正常，可立即下单 | B 端用户管理数据来源 |

## 验收标准 (E2E 用户旅程)

> 聚焦于跨模块的端到端用户旅程，使用 Given/When/Then 描述。
> 必须映射到流程基线中的 L1 (价值流) 和 L2 (协同流) 节点；同时映射到 service_blueprint.html 中的 SB-STAGE-* 与 SB-CUSTOMER-* 节点。

### 旅程 1：新买家注册并自动登录后继续下单 (Ref: L1-03, L1-04 | SB-STAGE-01, SB-STAGE-03, SB-CUSTOMER-01, SB-CUSTOMER-03)
#### 场景：正常主流程——注册成功自动登录
- @e2e
- **GIVEN** 买家林晓明的购物车已加入 1 件「纯棉圆领T恤（白色 / M）」，点击「去结算」被引导登录，当前无任何账户
- **WHEN** 在注册页输入手机号 13888217536、昵称 林晓明、密码 123456，点击「注册并登录」
- **THEN** 系统创建用户 U00001（status=正常），自动登录并创建持久会话
- **AND** 页面显示「注册成功，已自动登录」，买家可直接继续结算并生成归属 U00001 的待支付订单

#### 场景：手机号已注册的冲突处理
- @e2e
- **GIVEN** 系统已存在用户（手机号 13912345678，昵称 陈晓芸）
- **WHEN** 新买家在注册页输入手机号 13912345678 并提交
- **THEN** 系统不创建新用户，提示「该手机号已注册，请直接登录」，并提供跳转登录入口（account-login.html）

#### 场景：非法输入校验
- @e2e
- **GIVEN** 买家在注册页
- **WHEN** 输入手机号 123、密码 123（不足 6 位）并提交
- **THEN** 系统分别提示「请输入 11 位有效手机号」与「密码至少 6 位」，不提交注册

## 治理映射对齐 (Governance Mapping)

- Source of Truth: `docs/baseline/domain_model.html`
- Bounded Context: **User Context（新增 taxonomy，domain_model 现无用户认证 BC）**；Shared / Cross（复用 error-handling）
- Capability Taxonomy: **`account-management`（新增 taxonomy）**——承载注册（本 Story）；`user-session`（新增，自动登录复用，详见 story-account-system-login）
- Related Process Nodes: `L1-03 加购与准备`（身份前置）、`L1-04 下单结算`（注册后继续下单，订单绑定真实 userId）
- Related Service Blueprint Nodes: `SB-STAGE-01`（顶部登录/注册入口）、`SB-STAGE-03`（结算引导注册）、`SB-CUSTOMER-01`（注册触点）、`SB-CUSTOMER-03`（结算前登录引导）
- Sync Assessment: **Yes** — 新增 `User Context` BC 与 `account-management` taxonomy，属基线级新增，需 Epic 归档后 Baseline Sync（本阶段预判不执行）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff) — 满足交接条件（UI 门禁已通过：原型已确认）
- [ ] 已交接 (changeName: <change-name> 记录于 openspec/epic-account-system.story-list.json)
