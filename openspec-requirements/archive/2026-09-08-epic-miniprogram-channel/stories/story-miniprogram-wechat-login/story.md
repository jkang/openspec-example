# Story: 微信授权登录与同源账户打通

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-miniprogram-wechat-login` | 优先级: P0 | 依赖: story-miniprogram-channel-config（渠道启用状态门禁底座）
> 关联 Storymap: `epics/epic-miniprogram-channel/storymap.md`
> 关联 Idea: `epics/epic-miniprogram-channel/idea.md`
> 关联原型（Epic 整体）: `epics/epic-miniprogram-channel/prototypes/miniprogram-wechat-login.html`（已 HITL 确认）

## 用户场景 (User Scenario)

- **目标用户（C 端）**：小程序买家（微信内活跃的下游采购员/老板，如林采购）；**既有网页客户**（如林晓明，已在网页注册下单）。
- **使用动机**：微信里买东西最烦"注册账号输密码"。买家期望**微信一键授权即登录**；已在网页买过货的老客户，在小程序里应直接关联既有账户、历史订单延续，绝不重复注册、不丢数据。
- **关键目标**：微信授权登录（openid 新登录因子）→ 命中既有用户直接登录 / 未命中引导手机号绑定（新手机号建号 / **撞号提示登录既有账号再绑定**）→ 复用既有会话体系（token→userId）；渠道停用时登录被拒绝（Q5）；小程序登录入口 UI 随本 Story 交付（Q8）。
- **B 端视角**：
  - 后台怎么配置？—— 本 Story 无独立后台配置项；依赖 Story 1 的渠道启用状态（停用即拒绝登录）。
  - 生命周期如何？—— openid 作为 User 新字段随绑定生命周期管理；绑定长期有效；用户被 B 端禁用（既有 R-ADM 启停）后微信登录与既有会话同样失效（对齐 R-SES-006"禁用即失效"）。
  - 谁有权限？—— 无新增写权限面（买家自主授权）；绑定与既有账户衔接由系统规则处理（撞号引导登录，不自动合并）。

## 范围 (Scope)

### In Scope
- `User` 增加 `openid` 字段（可空，微信登录因子；单小程序一对一，Q1 方案 A）。
- 微信授权登录 API：入参 = 小程序 `wx.login()` 的 code；服务端以配置的 appid+appsecret 调 **code2session** 换 openid（Q6：真实调用微信网关，测试环境走 mock 后门）。
  - openid **命中**既有 User → 复用 user-session 创建会话 → 登录成功（同源账户直连）。
  - openid **未命中** → 返回"需绑定手机号"语义，进入绑定流程。
- 手机号绑定：
  - 微信官方**手机号快速验证组件**取号（用户点授权，服务端解密/code 换取；测试环境 mock）。
  - 手机号**未注册** → 创建新 User（写入 phone + openid）→ 自动登录。
  - 手机号**已注册**（撞号，Q2）→ **提示登录既有账号再绑定**：引导既有账号（手机号+密码）登录 → 校验通过后 openid 写入该 User → 自动登录。**不自动合并、不静默拒绝**。
- 会话：复用既有 `user-session` 能力（服务端 token→userId，创建/校验/销毁/禁用即失效），不新增会话类型；**会话带渠道来源标记**（来源 = MINIPROGRAM），供 order-channel Story 消费（Q7）。
- 渠道门禁：渠道停用时微信登录返回 `CHANNEL_DISABLED`（Q5，联动 Story 1）。
- mock 微信网关（`NODE_ENV=test`）：固定 code→openid 映射 + 手机号组件返回，对齐既有 `/api/__test/*` 测试后门模式（Q6），保证 E2E 可复现。
- 小程序登录入口 UI（Q8）：授权登录页 + 手机号绑定页 + 撞号引导（对齐原型 `miniprogram-wechat-login.html`：微信一键登录 / 快捷绑定 / 手输绑定 / 撞号提示登录）。

### Out of Scope
- 渠道配置读写（story-miniprogram-channel-config）。
- 订单渠道标识展示（story-miniprogram-order-channel）。
- unionid / 开放平台绑定（Q10：MVP 不引入）。
- 真实微信支付（+X 评估项）。
- 小程序购物旅程 UI（Epic 6.2）。
- 网页端密码找回 / 修改绑定手机号（未列入 Phase 6 承诺）。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-miniprogram-channel/prototypes/miniprogram-wechat-login.html`
- 关键交互点：
  - 手机模拟器画面：小程序首页 →「微信一键登录」（绿色授权按钮，模拟 wx.login）。
  - 4 个演示场景（左侧控制）：老客户微信直接登录（openid 命中自动登录 + 历史订单延续）/ 新客户首次（微信快捷绑定建号）/ **撞号 → 提示登录既有账号（Q2）** / 渠道停用拒绝（Q5）。
  - 渠道开关联动：停用后授权被拒（CHANNEL_DISABLED）。
  - 绑定页：微信手机号快捷绑定 或 手动输入手机号；撞号后进入"手机号+密码登录既有账号再绑定"。
  - 登录成功态：用户卡片（user_1002 · 林晓明）+「我的订单 · 历史延续（同源账户）」列表（含小程序渠道标识）。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-WX-001 | 微信授权登录入参为小程序 `wx.login()` 的 code | 小程序发起登录 | 服务端以 appid+appsecret 调 code2session 换取 openid | appsecret 严禁下发前端（服务端持有） |
| R-WX-002 | openid 是 `User` 的新登录因子（可空字段，单小程序一对一） | 绑定/登录时关联 | `User.openid` 唯一对应一个小程序用户 | Q1 方案 A；不做独立映射表 |
| R-WX-003 | openid 命中既有 User → 直接复用会话登录 | openid 已绑定 | 创建会话并返回登录态；历史订单延续可见（同源账户） | 不重复注册、不建第二用户池 |
| R-WX-004 | openid 未命中 → 需绑定手机号后才能登录 | 新 openid | 返回"需绑定"语义，引导手机号绑定 | 微信官方手机号组件取号（或手输） |
| R-WX-005 | 绑定手机号未注册 → 建新 User 并自动登录 | 新手机号 | 创建用户（phone + openid + role=客户）→ 建会话登录 | 默认昵称沿用既有规则（手机尾号用户） |
| R-WX-006 | **撞号（Q2）**：微信手机号已被既有账号注册 → 提示登录既有账号再绑定 | 绑定手机号已存在 | 引导既有账号（手机号+密码）登录；校验通过后 openid 写入既有 User；**不自动合并、不静默拒绝** | Q2 已确认；防重复建户破坏 phone 唯一 |
| R-WX-007 | 会话复用既有 user-session（token→userId） | 任意登录成功 | 创建/校验/销毁/禁用即失效沿用 R-SES-001~006 | 不新增会话类型 |
| R-WX-008 | 会话带渠道来源（channel=MINIPROGRAM） | 微信授权登录创建会话 | 会话记录来源渠道，供下单写入 Order.channel（Q7，order-channel Story 消费） | 服务端判定，不信任客户端传参 |
| R-WX-009 | 渠道停用 → 微信登录拒绝 `CHANNEL_DISABLED` | 渠道为停用状态 | 返回渠道停用错误，不进入登录/绑定流程 | Q5；联动 Story 1 启用状态 |
| R-WX-010 | 用户被 B 端禁用后，微信登录与既有会话均失效 | 用户 status=禁用 | 登录拒绝、会话访问被拒（对齐 R-SES-006） | 同源账户生命周期与既有规则一致 |
| R-WX-011 | mock 微信网关（测试环境） | `NODE_ENV=test` | code2session / 手机号组件由 mock 后门模拟（固定 code→openid 映射），E2E 可复现 | Q6；对齐 `/api/__test/*` 既有测试后门模式 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：老客户微信一键登录（同源账户直连） (Ref: L1-01, L2-01 | SB-STAGE-01, SB-CUSTOMER-01)
#### 场景：正常主流程——openid 命中既有用户直接登录
- @e2e
- **GIVEN** 小程序渠道已启用（Story 1），买家林晓明（user_1002，手机号 13888217536）已在网页注册且其 User 已绑定 openid=`openid_demo_001`
- **AND** 买家在小程序内点击「微信一键登录」，`wx.login()` 返回 code=`code_demo_001`
- **WHEN** 服务端以 appid+appsecret 调 code2session（测试环境 mock）换取 openid=`openid_demo_001`
- **THEN** 系统命中既有 User 林晓明，创建会话并返回登录成功
- **AND** 小程序展示登录成功态，买家可见其历史订单（网页下单延续可见，同源账户）

#### 场景：openid 未命中——引导手机号绑定后登录
- @e2e
- **GIVEN** 小程序渠道已启用，买家王倩首次使用（微信 openid=`openid_demo_002` 未绑定）
- **WHEN** 点击「微信一键登录」→ openid 未命中
- **THEN** 系统引导绑定手机号（展示微信手机号快捷绑定入口）
- **AND** 买家使用微信手机号组件授权（mock 返回手机号 13700005678，未注册）
- **THEN** 系统创建新用户（phone=13700005678, openid=openid_demo_002, role=客户）并自动登录
- **AND** 会话来源标记 channel=MINIPROGRAM（供 order-channel Story 消费）

### 旅程 2：撞号——提示登录既有账号再绑定 (Ref: L1-01, L2-01 | SB-STAGE-01, SB-CUSTOMER-01)
#### 场景：绑定手机号已被既有账号注册（Q2）
- @e2e
- **GIVEN** 买家首次使用微信（openid=`openid_demo_003` 未绑定），微信手机号组件返回手机号 13888217536（**已注册**林晓明 user_1002）
- **WHEN** 系统检测到绑定手机号已注册
- **THEN** 不自动合并账户，提示「该手机号已注册：请登录既有账号完成微信绑定」
- **AND** 引导输入既有账号（手机号 13888217536 + 密码）
- **WHEN** 既有账号登录校验通过
- **THEN** openid=`openid_demo_003` 写入既有用户 user_1002（微信绑定完成）并自动登录
- **AND** 该用户仍只有**一个账户**（无重复 user 记录），历史订单未丢失、未被合并出重复数据

#### 场景：撞号后既有账号密码错误
- @api
- **GIVEN** 撞号绑定流程进行中（目标手机号 13888217536 已注册）
- **WHEN** 输入错误密码登录既有账号
- **THEN** 返回统一失败提示「手机号或密码不正确」（对齐 R-LOG-002 防枚举），不泄露账户差异信息
- **AND** openid 未写入任何用户，绑定未完成

### 旅程 3：渠道停用与禁用联动 (Ref: L1-01 | SB-STAGE-01)
#### 场景：渠道停用——新微信登录被拒绝（Q5）
- @e2e
- **GIVEN** 渠道处于停用状态（Story 1 关闭启用开关）
- **WHEN** 买家在小程序内点击「微信一键登录」
- **THEN** 返回 `CHANNEL_DISABLED` 拒绝，小程序展示"渠道已停用"提示，不进入登录/绑定流程
- **AND** 既有会话访问受保护 API 仍正常（渠道停用不影响既有会话，Q5）

#### 场景：用户被禁用——微信登录与既有会话均失效
- @api
- **GIVEN** 用户 user_1002（林晓明）已被 B 端禁用（status=禁用，R-ADM-005）
- **WHEN** 该用户以微信授权登录（openid 命中）
- **THEN** 登录被拒绝（USER_DISABLED 语义，对齐 R-SES-006）
- **AND** 其既有会话访问受保护 API 亦被拒（禁用即失效）

### 旅程 4：mock 网关可复现性 (Ref: — | SB-BACKSTAGE-*)
#### 场景：测试环境 mock code2session 返回固定 openid
- @api
- **GIVEN** `NODE_ENV=test`，渠道已启用
- **WHEN** 携带固定测试 code（如 `code_demo_001`）调用微信登录 API
- **THEN** mock 网关返回其映射的固定 openid（不访问真实微信服务器）
- **AND** 重复调用结果一致（E2E 可复现，Q6）

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: `User Context`（**扩展**：新增 `wechat-auth` capability + `User.openid` 字段）；`Channel Context`（**新增**，只读消费启用状态门禁）；`Shared / Cross`（frontend-ui 小程序登录 UI 横切支撑）
- Capability Taxonomy: **`wechat-auth`（新增 taxonomy）**——`bc-user → cap-wechat-auth` Governs 边（Baseline Sync 时落位）；`frontend-ui`（**修改**：小程序登录入口 UI）；`user-session`（只读消费复用，不新增会话能力）
- Related Process Nodes: L1-01 触达与发现（新增微信小程序登录触点）；L2-01 进入结算（身份前置：小程序用户先微信授权登录/绑定）；本 Story 不改变交易节点语义
- Related Service Blueprint Nodes: SB-STAGE-01（新增微信授权登录入口触点）；SB-CUSTOMER-01（登录触点扩展：微信授权登录 + 手机号绑定 + 撞号引导，新增能力节点）；SB-BACKSTAGE-*（微信网关对接为后台支撑活动，落位 Sync 时确认）
- Sync Assessment: **Yes** — `User` Aggregate 新增 `openid` 字段、User Context 新增 `wechat-auth` capability（Domain Model 节点 + Governs 边）、蓝图登录触点扩展（Epic 级变化）；按分层 Sync 机制在 Epic 全部 Story 归档后统一执行 Baseline Sync（本阶段仅预判不执行）

## 分析制品索引 (Analysis Artifacts)

- 故事详述: `epics/epic-miniprogram-channel/analysis/narrative/story-miniprogram-wechat-login/narrative.md` — ❌ 未生成（业务规则与 E2E 验收已完整，不额外生成，对齐既有 Story 先例）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff)
- [x] 已交接 (changeName: `story-miniprogram-wechat-login` 记录于 openspec/epic-miniprogram-channel.story-list.json)
