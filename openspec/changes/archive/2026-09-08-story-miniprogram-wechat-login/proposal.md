# Proposal: 微信授权登录与同源账户打通（story-miniprogram-wechat-login）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-miniprogram-channel/stories/story-miniprogram-wechat-login/story.md`（已 HITL 确认，用户授权全程自主）。
> Epic：`epic-miniprogram-channel`（Phase 6 Epic 6.1 · P0，依赖 `story-miniprogram-channel-config` 渠道启用状态底座）；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

微信里买东西最烦"注册账号输密码"。买家期望**微信一键授权即登录**；网页老客户进入小程序应直接关联既有账户、历史订单延续，绝不重复注册、不丢数据。本变更交付 **微信授权登录（openid 新登录因子）+ 手机号绑定 + 同源账户打通**：openid 命中既有用户直连登录，未命中引导手机号绑定（新号建户 / **撞号提示登录既有账号再绑定**），全程复用既有 User/会话底座（不建独立用户池）。

## What Changes (变更内容)

- **`User.openid` 字段（Q1 方案 A，R-WX-002）**：`User` 实体增加可空 `openid`（单小程序一对一，不做独立映射表）。
- **微信授权登录 API（新增）**：小程序 `wx.login()` code → 服务端以渠道配置的 appid+appsecret 调 **code2session** 换 openid。
  - openid **命中**既有 User（R-WX-003）→ 复用 user-session 创建会话 → 登录成功（同源直连）。
  - openid **未命中**（R-WX-004）→ 返回"需绑定手机号"，进入绑定流程。
- **手机号绑定（R-WX-005/006）**：
  - 微信官方**手机号快速验证组件**取号（服务端解密/code 换取）。
  - 手机号未注册 → 建新 User（phone + openid + role=客户）→ 自动登录。
  - 手机号**已注册（撞号，Q2，R-WX-006）**→ 提示登录既有账号再绑定：既有账号（手机号+密码）校验通过后 openid 写入该 User；**不自动合并、不静默拒绝**。
- **会话复用与渠道来源（R-WX-007/008）**：会话沿用既有 user-session（token→userId，禁用即失效 R-SES-006）；**会话标记来源渠道 MINIPROGRAM**（供 order-channel Story 下单写 Order.channel，Q7）。
- **渠道门禁（R-WX-009，Q5）**：渠道停用时微信登录返回 `CHANNEL_DISABLED`（联动 Story 1 启用状态）。
- **mock 微信网关（R-WX-011，Q6）**：`NODE_ENV=test` 下 code2session / 手机号组件由 mock 后门模拟（固定 code→openid 映射），对齐既有 `/api/__test/*` 测试后门模式，E2E 可复现。
- **小程序登录入口 UI（Q8）**：对齐原型 `miniprogram-wechat-login.html`——微信一键登录 / 手机号绑定（快捷+手输）/ 撞号引导登录既有账号 / 登录成功态（历史订单延续）。

### Out of Scope（本 change 不实现）

- 渠道配置读写（story-miniprogram-channel-config）。
- 订单渠道标识展示（story-miniprogram-order-channel）。
- unionid / 开放平台绑定（Q10 不引入）。
- 真实微信支付（+X 评估项）；小程序购物旅程 UI（Epic 6.2）；网页端密码找回 / 修改绑定手机号。

## Capabilities (系统能力)

### New Capabilities

- **`wechat-auth`（新增 taxonomy）**：微信授权登录因子——code2session 换 openid（mock 网关可模拟）、`User.openid` 关联、手机号绑定（微信组件取号 / 撞号提示登录既有账号）、同源账户衔接（复用 user-session 建会话）、渠道来源会话标记。
  - **理由（新增标注）**：ROADMAP Phase 6 Guardrails 明确"User Context 新增 `wechat-auth` capability"；openid 是既有 phone 之外的**新登录因子**，独立成能力便于复用与测试；`docs/baseline/domain_model.html` 现有 `bc-user → cap-account/cap-session/cap-admin` 边（行 971-973）无此能力——Baseline Sync 时落位 `bc-user → cap-wechat-auth`。

### Modified Capabilities

- **`frontend-ui`（修改，横切支撑）**：`bc-shared → cap-ui`——小程序登录入口 UI（授权登录 + 手机号绑定 + 撞号引导）；更新 `specs/frontend-ui/spec.md`。

### 只读消费（不修改语义）

- `user-session`（会话创建/校验/销毁复用——wechat-auth 调用既有会话能力，不新增会话类型；R-SES-001~006 沿用）、`account-management`（手机号唯一约束与注册用户衔接被消费）、`miniprogram-channel`（渠道启用状态门禁只读，Story 1 底座）。

## Impacted Bounded Contexts

- **`User Context`（扩展）**：新增 `wechat-auth` capability（`bc-user → cap-wechat-auth` 边）+ `User.openid` 字段。
- **`Channel Context`（新增，只读消费）**：启用状态门禁来源。
- **`Shared / Cross`（修改）**：`frontend-ui` 小程序登录 UI。
- 其余 BC 只读复用（会话/账户规则），无交易语义改动。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-01 触达与发现` | 新增微信小程序登录触点 |
| `L2-01 进入结算` | 身份前置：小程序用户先微信授权登录/绑定，再继续交易 |

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-01` | MOD | 新增微信授权登录入口触点 |
| `SB-CUSTOMER-01` | MOD | 登录触点扩展：微信授权登录 + 手机号绑定 + 撞号引导（新增能力节点） |
| `SB-BACKSTAGE-*` | NEW | 微信网关对接为后台支撑活动（mock 网关，落位 Sync 时确认） |

## Impact (影响面)

- **后端服务（Node.js）**：`User` 模型增 `openid` 字段（users.json 持久化，可空）；新增路由 `POST /api/auth/wechat/login`（code → code2session 换 openid → 命中/未命中分支）与手机号绑定语义（撞号返回"已注册需登录"）；复用既有 `SessionRepo` / 会话创建（AuthService 模式）；会话载体增加渠道来源标记（`channel`），供下单写 Order.channel 消费；新增微信网关对接模块（**mock 实现** `NODE_ENV=test` 后门，固定 code→openid 映射，对齐 `/api/__test/*` 模式）；appid+appsecret 从 Story 1 的渠道配置读取（服务端持有，严禁下发前端）。**零第三方依赖**。
- **Python 后端**：**不对齐**——无认证能力（仅 catalog/cart/order/coupon），以 Node.js 为权威实现。
- **前端 UI（Vue + 小程序）**：小程序登录入口 UI（授权登录 + 绑定 + 撞号引导）；技术栈未锁定（原生 WXML / uni-app / Taro 由 lead 与 engineer 评估），UI 规范沿用极简约束；Vue B 端无新增（渠道配置视图在 Story 1）。
- **数据模型**：`User` + `openid`（可空）；会话载体 + 渠道来源（实现层）；`users.json` 结构扩展（兼容存量无 openid 用户）。
- **跨域/同步**：无新增跨域；mock 网关保证 E2E 可复现；真实微信回调（登录态）本期不接入。
- **测试影响**：新增 E2E 旅程（老客户 openid 直连 / 新号绑定 / 撞号提示登录 / 停用拒绝 / 禁用失效 / mock 可复现）。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-miniprogram-channel/stories/story-miniprogram-wechat-login/story.md`
