# Story: 用户注册

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 openspec-handoff 以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `account-system-01-register` | 优先级: P0 | 依赖: 无
> 关联 Storymap: `storymaps/account-system/storymap.md`
> 关联 Idea: `ideas/idea-account-system.md`
> 关联原型（Epic 整体）: `prototypes/account-system/account-register.html`（待生成并经用户 HITL 确认）

## 用户场景 (User Scenario)

**目标用户（C 端）**：首次访问商城、想建立自己账户的游客买家（如贸易公司采购专员"张采购"，邮箱 `buyer@trade-demo.com`，手机 `13800001234`）。

**使用动机**：需要下单/查看「我的订单」时被系统要求"先建立账户"，从而获得属于自己的订单与优惠券归属，替代 `user_dev` 占位。

**关键目标**：用邮箱+密码快速注册，成功后获得状态 `ACTIVE` 的账户并自动登录，可无缝继续原操作（加购/下单）。

**B 端视角**：后台在「用户管理」页看到该新注册账户出现在列表中（邮箱/昵称/手机/状态 `ACTIVE`/注册时间）；管理员可将其 `DISABLED`，禁用后该用户无法登录。注册不需要后台预配，账户随 C 端注册自动进入用户池，运营可随时在后台查看与启停。

## 范围 (Scope)

### In Scope
- 注册表单：邮箱（全局唯一，如 `buyer@trade-demo.com`）、密码（≥6 位且含字母+数字）、确认密码（两次一致）、昵称（如"张采购"）、手机号（如 `13800001234`）。
- 邮箱唯一性校验（重复注册拦截，提示"该邮箱已注册，请直接登录"）。
- 密码强度校验（不足 6 位或纯数字/纯字母则拒绝）。
- 注册成功后：账户状态 `ACTIVE`，自动登录（下发会话令牌），跳转/返回原操作。
- 注册的账户进入 B 端「用户管理」用户池（状态 `ACTIVE`，可被运营查看/禁用）。

### Out of Scope
- 第三方 OAuth（微信/Google 等）注册。
- 邮箱验证码 / 手机短信验证。（本阶段仅纯账号注册）
- 密码找回/重置。
- 多收货地址收集。
- 存量 `user_dev` 订单/优惠券的归属迁移（详见 idea 存量数据处置决策，本阶段不迁移）。

## 原型参考 (Prototype Reference)

> ⚠️ UI 门禁：本 Story 涉及前端注册表单 UI，Epic 整体原型尚未生成（`/req:prototype` 未产出），故「交接状态」不勾选待开发交接。原型经用户 HITL 确认后补充链接。

- 原型链接：`prototypes/account-system/account-register.html`（Epic 整体原型，待 `/req:prototype` 生成并经用户 HITL 确认后链接）
- 关键交互点：注册表单（邮箱/密码/确认密码/昵称/手机号）、前端即时校验、错误态提示、注册成功自动登录并返回原流程。
- UI 约束（`docs/FRONTEND.md`）：无圆角、无阴影、slate 色系、真实数据、全中文。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-REG-001 | 邮箱全站唯一 | 注册提交邮箱 | 邮箱已存在 → 提示"该邮箱已注册，请直接登录"；不存在 → 放行 | 唯一性索引约束 |
| R-REG-002 | 密码 ≥6 位且含字母+数字 | 注册提交密码 | 不满足 → 提示"密码需至少 6 位，且同时包含字母和数字" | 前端即时 + 后端兜底 |
| R-REG-003 | 确认密码需与密码一致 | 注册提交确认密码 | 不一致 → 提示"两次输入的密码不一致" | 前端即时校验 |
| R-REG-004 | 昵称非空，≤20 字符 | 注册提交昵称 | 空/超长 → 提示"请填写昵称（≤20 字符）" | 如"张采购" |
| R-REG-005 | 手机号格式校验（11 位） | 注册提交手机号 | 非法 → 提示"请输入正确的 11 位手机号" | 如 `13800001234` |
| R-REG-006 | 注册成功默认状态 ACTIVE | 注册通过校验 | 创建 `User(status=ACTIVE)` 并自动登录，返回账户信息 | B 端可见 |
| R-REG-007 | 注册成功即自动登录 | 注册成功事件 | 下发会话令牌，跳转回原操作 | 衔接 login/session story |

## 验收标准 (E2E 用户旅程)

### 旅程 1：游客注册获得账户并可无缝继续 (Ref: L1-03 加购与准备 | SB-STAGE-01, SB-CUSTOMER-01, SB-BACKSTAGE-02)
#### 场景：正常注册主流程
- @e2e
- **GIVEN** 游客"张采购"正在商品详情页（商品：MacBook Pro 14英寸，priceCents 1299900，库存 12）点击「加入购物车」，系统提示需登录
- **WHEN** 他点击「注册」，填写邮箱 `buyer@trade-demo.com`、密码 `trade1234`、确认密码 `trade1234`、昵称"张采购"、手机号 `13800001234` 并提交
- **THEN** 系统创建账户状态为 `ACTIVE`，自动登录并下发会话令牌，跳转回商品页；当前登录用户为 `buyer@trade-demo.com`；B 端「用户管理」列表出现该账户（状态 ACTIVE）

#### 场景：邮箱重复注册拦截
- @e2e
- **GIVEN** 邮箱 `buyer@trade-demo.com` 已注册（状态 ACTIVE）
- **WHEN** 游客再次用该邮箱+新密码 `trade9999` 提交注册
- **THEN** 系统拒绝注册，提示"该邮箱已注册，请直接登录"，不创建新账户，不覆盖原账户

#### 场景：弱密码注册拦截
- @e2e
- **GIVEN** 游客填写注册表单，昵称"李运营"
- **WHEN** 提交密码 `123456`（纯数字，不满足含字母+数字）
- **THEN** 系统拒绝注册，提示"密码需至少 6 位，且同时包含字母和数字"

## 治理映射对齐 (Governance Mapping)

- **Source of Truth**: docs/baseline/domain_model.html
- **Bounded Context**: `account`（**新增 BC**，账户生命周期与认证）；`shared`（`domain-model` 承载 `User` 聚合与 `userId` 归属语义）。
- **Capability Taxonomy**: `account-management`（**新增**）；复用 `domain-model`、`frontend-ui`。
- **Related Process Nodes**: `L1-03 加购与准备`（身份前置）、`L2-02 加载结算上下文`（身份上下文读取）；注册/认证为新增 L3 环节（基线补充，设计中）。
- **Related Service Blueprint Nodes**: `SB-STAGE-01`（触达与发现）、`SB-CUSTOMER-01`（注册入口交互）、`SB-BACKSTAGE-02`（Session 一致性）；账户 `frontend-ui` 注册交互为横切新增，`SB-CUSTOMER-01` 作为入口。
- **Sync Assessment**: **Yes**（新增 `account` BC / `account-management` taxonomy / `User` 聚合 / `ACTIVE-DISABLED` 状态机，Phase 完成后回流基线）。

## 交接状态 (Handoff Status)

<!--
UI 门禁：本 Story 涉及前端 UI（注册表单），原型未生成并经用户 HITL 确认，禁止勾选「待开发交接」。
-->

- [ ] 待开发交接 (openspec-handoff)
- [ ] 已交接 (changeName: <change-name> 记录于 epic/storymap/story-list.json)
