# Storymap: 小程序渠道接入与账户打通 需求拆分

> Epic Key: `epic-miniprogram-channel`
> 关联调研: `epics/epic-miniprogram-channel/research.md`
> 关联 Idea: `epics/epic-miniprogram-channel/idea.md`
> 关联原型: `epics/epic-miniprogram-channel/prototypes/miniprogram-wechat-login.html` + `prototypes/miniprogram-channel-admin.html`（Epic 整体，UI 唯一事实来源）
> 产出后需用户确认（HITL）

## 需求背景 (Background)

贸易型中小企业的买家活跃于微信，网页下单门槛高导致订单流失。本 Epic（Phase 6 前置底座）把"生意搬进微信"的第一步落地：**小程序渠道接入（B 端可配置/可停用）+ 微信授权登录与同源账户打通（openid 新登录因子复用既有 User/会话）+ 订单渠道来源标识**，为 Epic 6.2 小程序购物链路铺平底座。同源账户为硬约束（不建独立用户池）；商户号本期纯配置预留（模拟支付，真实微信支付资质后置）。

## 拆分粒度原则 (Granularity)

- Story = 一个**完整端到端功能**的粒度，按"渠道配置 / 微信登录与账户打通 / 订单渠道标识"切分，避免破坏上下文：
  - `miniprogram-channel-config`（B 端配置）：渠道配置页 → 角色门禁（仅运营写）→ appid/appsecret 脱敏/商户号纯预留/启用开关 → 落盘即时生效 → 启用状态控制登录入口可用性 整条链路。
  - `miniprogram-wechat-login`（账户打通）：微信授权（wx.login code → code2session 换 openid）→ openid 命中/未命中 → 手机号绑定（微信组件取号 / 撞号提示登录既有账号）→ 复用 user-session 建会话 → 小程序登录入口 UI 整条链路。
  - `miniprogram-order-channel`（订单渠道标识）：Order.channel 字段（会话来源继承）→ B 端订单列表渠道标识列展示（流程与网页单一致）整条链路。
- 不拆到行为/UI 细节级（掩码交互样式、渠道开关 UI、Badge 样式等归入对应 Story 内实现），避免破坏上下文。
- 每个 Story 必须可独立交付、可独立验收。
- 三要素：角色 (Role) / 价值 (Value) / 目标 (Goal)。
- **口径贯穿（三 Story 共用，来自 idea.md 第 5/9 章全部 10 条已确认决策）**：openid 直接存 User（Q1）、撞号提示登录既有账号（Q2）、商户号纯预留（Q3）、appsecret 脱敏回显（Q4）、停用拒绝新登录 + 既有会话照常（Q5）、mock 微信网关（Q6）、channel 会话来源继承 + 仅标识列（Q7）、6.1 含小程序登录 UI（Q8）、capability 边界 = wechat-auth + miniprogram-channel + 复用 user-session（Q9）、不引入 unionid（Q10）。

## Story 拆分明细

| Story ID | 标题 | 角色 (Role) | 价值 (Value) | 目标 (Goal) | 依赖 | 优先级 | 状态(注1) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| story-miniprogram-channel-config | 小程序渠道配置（B 端） | 运营（可写）/ 老板（只读监督） | 渠道真实可用且可停用——老板可监督、运营可关停，防止资质未办成时误导客户下单 | 渠道配置（appid / appsecret 脱敏回显 / 商户号纯预留 / 启用状态），仅 `role=运营` 可写（扩展 R-ADM 门禁家族）；落盘 `data/channel-config.json` 即时生效；停用后小程序登录入口隐藏、新微信登录拒绝（CHANNEL_DISABLED，Q5）；老板只读查看渠道启用状态（无配置入口）；B 端渠道配置视图 | 无 | P0 | ready |
| story-miniprogram-wechat-login | 微信授权登录与同源账户打通 | 买家（小程序用户）/ 既有网页客户 | 微信一键授权即登录（少填表）；老客户跨端订单延续（同源账户，不重复注册） | `User.openid` 字段 + 微信授权登录 API（wx.login code → code2session 换 openid，mock 网关 `NODE_ENV=test` 后门）；openid 命中既有用户直接建会话登录 / 未命中引导手机号绑定（微信官方组件取号或手输；撞号提示登录既有账号再绑定，Q2）；复用 user-session 会话能力（token→userId，禁用即失效）；渠道停用时拒绝登录（Q5）；小程序登录入口 UI（Q8：授权登录 + 手机号绑定 + 撞号引导） | story-miniprogram-channel-config（启用状态控制登录入口；仅运营可写前置） | P0 | ready |
| story-miniprogram-order-channel | 订单渠道标识（channel） | 运营（订单处理）/ 买家（无感知） | B 端一眼识别订单来源（微信 vs 网页），客户电话询单不懵；处理流程与网页单一致 | `Order.channel` 字段（默认 WEB）；下单从**会话来源**继承写入（wechat-auth 登录创建的会话 → `channel=MINIPROGRAM`，服务端判定不信任客户端传参，Q7）；B 端订单管理列表「渠道」标识列展示（仅展示，不做筛选/统计，Q7）；发货/取消流程与网页单完全一致 | story-miniprogram-wechat-login（MINIPROGRAM 渠道来源会话底座） | P1 | ready |

## 覆盖对账 (Coverage Reconciliation)

⚠️ 拆分前承诺项（来自 idea/research 的 In Scope + ROADMAP Guardrails + 候选 Capabilities + B/C 端承诺 + 10 条产品决策口径）：

| Epic 承诺项（来自 idea/research） | 承接 Story | 覆盖状态 |
| --- | --- | --- |
| In Scope: B 端小程序渠道配置（appid / appsecret / 商户号 / 启用状态） | story-miniprogram-channel-config | ✅ 覆盖 |
| In Scope: 微信授权登录（openid）→ 手机号绑定 → 复用现有 User 账户/会话体系（同源账户，不做独立用户池） | story-miniprogram-wechat-login | ✅ 覆盖 |
| In Scope: B 端订单管理展示订单渠道标识（channel=MINIPROGRAM），小程序订单可正常发货/取消 | story-miniprogram-order-channel | ✅ 覆盖 |
| ROADMAP Guardrails: B/C 双端视角（强约束）——渠道配置/渠道标识/绑定管理是 B 端承诺项，严禁只设计 C 端 | story-miniprogram-channel-config（B 端配置）+ story-miniprogram-order-channel（B 端标识）+ story-miniprogram-wechat-login（C 端登录 + B 端绑定管理语义） | ✅ 覆盖 |
| ROADMAP Guardrails: 同源账户——同一 User 表，openid/手机号只是新登录因子，不做数据孤岛 | story-miniprogram-wechat-login | ✅ 覆盖 |
| ROADMAP Guardrails: 模拟支付——MVP 保持模拟支付，真实微信支付（商户资质/证书）作为交付后 +X 评估项 | story-miniprogram-channel-config（商户号字段纯配置预留，Q3） | ✅ 覆盖 |
| ROADMAP Guardrails: 治理映射——User Context 新增 `wechat-auth` capability；新增 `Channel Context` BC 与 `miniprogram-channel` capability；Order 增加渠道来源；domain_model/service_blueprint 显式标注"新增" | story-miniprogram-wechat-login（wechat-auth）+ story-miniprogram-channel-config（Channel Context / miniprogram-channel）+ story-miniprogram-order-channel（Order.channel） | ✅ 覆盖 |
| Candidate Capability: `wechat-auth`（新增 taxonomy，User Context） | story-miniprogram-wechat-login | ✅ 覆盖 |
| Candidate Capability: `miniprogram-channel`（新增 taxonomy，Channel Context） | story-miniprogram-channel-config | ✅ 覆盖 |
| Candidate Capability: `order-management`（修改，Order.channel + B 端标识展示） | story-miniprogram-order-channel | ✅ 覆盖 |
| Candidate Capability: `frontend-ui`（修改，bc-shared → cap-ui：渠道配置视图 + 小程序登录 UI + 渠道标识列） | story-miniprogram-channel-config（B 端渠道视图）+ story-miniprogram-wechat-login（小程序登录 UI）+ story-miniprogram-order-channel（渠道标识列） | ✅ 覆盖 |
| B 端承诺: 谁配置？——渠道配置仅运营可写（扩展 R-ADM 门禁家族） | story-miniprogram-channel-config | ✅ 覆盖 |
| B 端承诺: 生命周期？——落盘即时生效；启用状态控制登录入口；停用拒绝新登录、既有会话照常（Q5） | story-miniprogram-channel-config（配置生命周期）+ story-miniprogram-wechat-login（登录门禁联动） | ✅ 覆盖 |
| B 端承诺: 权限？——配置写仅运营；老板只读监督渠道状态（无配置入口） | story-miniprogram-channel-config | ✅ 覆盖 |
| C 端承诺: 授权即登录（openid 一键，少填表） | story-miniprogram-wechat-login | ✅ 覆盖 |
| C 端承诺: 老客户跨端订单延续可见（同源账户） | story-miniprogram-wechat-login | ✅ 覆盖 |
| 决策口径 Q1: `User` 增 `openid` 字段（一对一，方案 A） | story-miniprogram-wechat-login | ✅ 覆盖 |
| 决策口径 Q2: 撞号 → 提示登录既有账号再绑定（不合并/不静默拒绝） | story-miniprogram-wechat-login | ✅ 覆盖 |
| 决策口径 Q3: 商户号本期纯配置预留（不校验/不参与支付） | story-miniprogram-channel-config | ✅ 覆盖 |
| 决策口径 Q4: appsecret 写入回显脱敏（掩码+已配置标记），支持覆盖 | story-miniprogram-channel-config | ✅ 覆盖 |
| 决策口径 Q5: 停用 → 小程序登录入口隐藏 + 新微信登录拒绝（CHANNEL_DISABLED）；既有会话照常 | story-miniprogram-channel-config（状态生命周期）+ story-miniprogram-wechat-login（登录门禁） | ✅ 覆盖 |
| 决策口径 Q6: mock 微信网关（code2session / 手机号组件），对齐 `NODE_ENV=test` 测试后门 | story-miniprogram-wechat-login | ✅ 覆盖 |
| 决策口径 Q7: channel 从会话来源继承（防客户端伪造）；B 端仅渠道标识列（不做筛选） | story-miniprogram-order-channel | ✅ 覆盖 |
| 决策口径 Q8: Epic 6.1 含小程序登录入口 UI | story-miniprogram-wechat-login | ✅ 覆盖 |
| 决策口径 Q9: capability 边界 = wechat-auth + miniprogram-channel 新增；复用 user-session（不新增会话 capability）；account-management 不扩展 | story-miniprogram-wechat-login（复用 user-session）+ story-miniprogram-channel-config（独立 capability） | ✅ 覆盖 |
| 决策口径 Q10: MVP 不引入 unionid（User.openid 单值） | story-miniprogram-wechat-login | ✅ 覆盖 |

**闭环校验**：全部承诺项（In Scope 3 项 / ROADMAP Guardrails 4 项 / 候选 Capability 4 项 / B 端承诺 3 项 / C 端承诺 2 项 / 决策口径 10 条）均有 ≥1 个 Story 承接，**无 ❌ 未覆盖项**，无需补拆或降级。

## 分析制品索引 (Analysis Artifacts)

- 用户故事地图（4 层）: `epics/epic-miniprogram-channel/analysis/storymap/` — ❌ 未生成（本 Epic 3 个 Story 依赖链清晰（配置 → 登录 → 订单渠道），storymap.md 已完整表达；覆盖对账以本 storymap.md 为唯一权威，对齐既有 Epic 先例）

## 治理映射对齐

- Impacted Bounded Contexts: **新增 `Channel Context`**（`miniprogram-channel` capability taxonomy，`bc-channel → cap-miniprogram-channel` Governs 边，待 Baseline Sync 落位）；`User Context`（**扩展**：新增 `wechat-auth` capability + `User.openid` 字段，`bc-user → cap-wechat-auth` 边）；`Order Context`（修改：`Order.channel` 字段）；`Shared / Cross`（`frontend-ui` 横切支撑：渠道配置视图 / 小程序登录 UI / 渠道标识列）
- Impacted Process Nodes: `L1-01 触达与发现`（新增微信小程序渠道触点）；`L2-01 进入结算`（身份前置：小程序用户先微信授权登录/绑定）；`L1-04 下单结算`（Order.channel 会话来源继承写入）；`L1-06 履约与完成`（B 端订单管理可见渠道标识；发货/取消不受渠道影响）；不改变交易语义/状态机
- Impacted Service Blueprint Nodes: `SB-STAGE-01`（新增小程序触点 + 微信授权登录入口）；`SB-CUSTOMER-01`（登录触点扩展：微信授权登录 + 手机号绑定）；`SB-CUSTOMER-04`（提交订单：Order.channel 写入）；`SB-OPS-04/05`（B 端订单列表渠道标识展示；渠道配置活动落位——新增 SB-OPS/或 SB-BACKSTAGE cell，**Baseline Sync 时确认**，参照 account-system SB-BACKSTAGE-07 先例）；`SB-BACKSTAGE-*`（渠道配置存储 + 微信网关对接为后台支撑活动）
- Sync Assessment: **Yes** — 新增 Channel Context BC + 2 个 capability taxonomy（`wechat-auth` / `miniprogram-channel`）+ User/Order Aggregate 字段扩展（`openid` / `channel`）+ 蓝图触点/后台活动扩展，属 Epic 级基线变化；按分层 Sync 机制在 Epic 全部 Story 归档后统一执行 Baseline Sync（本阶段仅预判不执行）

## 关联 Stories

- `epics/epic-miniprogram-channel/stories/story-miniprogram-channel-config/story.md`
- `epics/epic-miniprogram-channel/stories/story-miniprogram-wechat-login/story.md`
- `epics/epic-miniprogram-channel/stories/story-miniprogram-order-channel/story.md`

> 注1：Story 状态由需求侧 STATUS.md 维护（ready/handoff/dev-in-progress/done）；storymap 中仅记录初始状态 ready，in_progress/done 由开发侧归档后 lead 回填。
