# Story: 用户登录

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-account-login` | 优先级: P0 | 依赖: story-account-register（用户池）
> 关联 Storymap: `epics/account-system/storymap.md`
> 关联 Idea: `epics/account-system/idea.md`
> 关联原型（Epic 整体）: `epics/account-system/prototypes/account-login.html`

## 用户场景 (User Scenario)

- **目标用户（C 端）**：已注册买家（如林晓明），更换设备或清理浏览器后再次访问商城。
- **使用动机**：购物车跟随账户、查看「我的订单」、继续下单都需要恢复身份。
- **关键目标**：用手机号 + 密码快速恢复登录态；错误场景（密码错误/禁用）给出明确反馈。
- **B 端视角**：登录是会话生命周期的一部分，无后台配置；被 B 端禁用的用户（见 story-account-admin-users）登录时被拦截。登录凭证校验失败次数策略（Q-1 默认不限次，待确认）。

## 范围 (Scope)

### In Scope
- 登录表单：手机号 + 密码。
- 凭证校验：手机号存在 + 密码哈希匹配。
- 登录成功：创建持久会话凭证（文件/内存会话，零第三方依赖）。
- 登录失败：统一提示「手机号或密码不正确」，不区分账号不存在与密码错误（安全惯例）。
- 禁用用户拦截：状态为「已禁用」的用户登录时提示「该账户已被禁用，如有疑问请联系平台客服」。
- 「显示密码」切换、忘记密码引导（跳转客服，本阶段无自助找回）。

### Out of Scope
- 短信验证码登录、第三方 OAuth、扫码登录。
- 自动登录 token 刷新策略的轮换机制（本阶段为静态凭证）。
- 多设备会话管理（仅支持单会话模型，待确认）。

## 原型参考 (Prototype Reference)

> ⚠️ UI 门禁：原型已生成并经 HITL 确认，满足交接条件。
- 原型链接：`epics/account-system/prototypes/account-login.html`
- 关键交互点：手机号+密码表单、错误提示（凭证错误/禁用拦截）、登录成功横幅、演示账号 13888217536 / 123456。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-LOG-001 | 手机号格式校验 11 位 | 提交登录 | 非法格式提示，不提交 | 与注册校验一致 |
| R-LOG-002 | 凭证不区分账号不存在/密码错误 | 校验失败 | 统一提示「手机号或密码不正确，请重试」 | 安全惯例，防账号枚举 |
| R-LOG-003 | 已禁用用户禁止登录 | 用户 status=已禁用 时提交 | 提示「该账户已被禁用，如有疑问请联系平台客服」，不创建会话 | 与 story-account-admin-users 的禁用动作联动 |
| R-LOG-004 | 登录成功创建持久会话 | 凭证校验通过 | 生成会话凭证，前端持久化存储；刷新不掉 | 会话能力详见 story-account-session |
| R-LOG-005 | 会话凭证零第三方依赖 | 会话创建 | 使用文件/内存会话存储 | 对齐 ROADMAP Explore 护栏 |
| R-LOG-006 | 登录后回跳原页面 | 从受保护页（我的订单/结算）跳转登录 | 登录成功后回到原目标页面 | Q-4 默认整页跳转 + 回跳 |

## 验收标准 (E2E 用户旅程)

> 聚焦于跨模块的端到端用户旅程，使用 Given/When/Then 描述。
> 必须映射到流程基线中的 L1 (价值流) 和 L2 (协同流) 节点；同时映射到 service_blueprint.html 中的 SB-STAGE-* 与 SB-CUSTOMER-* 节点。

### 旅程 1：已注册买家登录后恢复身份 (Ref: L1-03 | SB-STAGE-01, SB-STAGE-03, SB-CUSTOMER-01, SB-CUSTOMER-03)
#### 场景：正常主流程——凭证正确登录成功
- @e2e
- **GIVEN** 已注册用户林晓明（手机号 13888217536）在浏览器中会话已失效，购物车为空
- **WHEN** 在登录页输入手机号 13888217536 与正确密码 123456，点击「登录」
- **THEN** 系统校验通过并创建持久会话凭证
- **AND** 页面显示「登录成功，林晓明」，导航出现「我的订单」入口，购物车可跟随该用户

#### 场景：凭证错误
- @e2e
- **GIVEN** 已注册用户林晓明在登录页
- **WHEN** 输入手机号 13888217536 与错误密码 654321，点击「登录」
- **THEN** 系统提示「手机号或密码不正确，请重试」，不创建会话
- **AND** 无任何会话凭证写入，受保护页面仍不可访问

#### 场景：禁用用户登录拦截
- @e2e
- **GIVEN** 用户王强（手机号 15876543210）已被运营禁用（status=已禁用）
- **WHEN** 王强在登录页输入正确凭证并提交
- **THEN** 系统提示「该账户已被禁用，如有疑问请联系平台客服」，不创建会话

## 治理映射对齐 (Governance Mapping)

- Source of Truth: `docs/baseline/domain_model.html`
- Bounded Context: **User Context（新增 taxonomy）**；Shared / Cross（复用 error-handling）
- Capability Taxonomy: **`account-management`（新增 taxonomy，登录部分）**、**`user-session`（新增 taxonomy，会话创建）**
- Related Process Nodes: `L1-03 加购与准备`（身份确认前置）、`L2-01 进入结算`（结算前登录校验）
- Related Service Blueprint Nodes: `SB-STAGE-01`（登录入口）、`SB-STAGE-03`（结算前登录引导）、`SB-CUSTOMER-01`（登录触点）、`SB-CUSTOMER-03`（未登录引导）
- Sync Assessment: **Yes** — 新增 `user-session` taxonomy，基线级新增，需 Epic 归档后 Baseline Sync（本阶段预判不执行）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff) — 满足交接条件（UI 门禁已通过：原型已确认）
- [ ] 已交接 (changeName: <change-name> 记录于 openspec/epic-account-system.story-list.json)
