# Idea: 小程序渠道接入与账户打通 (Mini Program Channel & Account Linking)

> 关联 Epic: `epic-miniprogram-channel`（来自 `docs/ROADMAP.md` Phase 6 Epic 6.1）
> 关联调研: `epics/epic-miniprogram-channel/research.md`（已 HITL 确认）
> 产出后需用户确认（HITL）

## 1. 澄清业务意图 (Clarify Business Intent)

- **目标用户**：
  - **C 端买家（下游采购员/老板，活跃于微信）**：希望微信内零安装完成"授权登录 → 看历史订单 →（6.2）下单"，拒绝重复注册与输密码表单。
  - **B 端运营（渠道/订单管理责任人）**：负责小程序渠道配置（appid / appsecret / 商户号 / 启用状态）与日常订单处理；需要一眼识别订单来源渠道（微信 vs 网页）。
  - **老板（决策者，只读看板角色）**：渠道状态需"看得见、可关停"，防止资质未办成时误导客户下单；微信单与网页单必须是**同一本账**。
- **核心业务价值**：把"生意搬进微信"的第一步落地——**渠道接入（可配置可停用）+ 同源账户打通（openid 登录因子复用既有 User/会话）**，为 Epic 6.2 小程序购物链路铺平底座；兑现 ROADMAP Phase 6"零安装、低门槛移动购物入口"承诺。
- **硬性业务限制**：
  - **同源账户（硬约束）**：小程序用户与 Web 用户同一 `User` 表，openid 是**新增登录因子**（不做独立用户池、不重复注册）；复用既有 `Session`（token→userId）会话底座（R-SES-001~006，禁用即失效）。
  - **openid 关联模型（已确认 Q1=方案 A）**：`User` 直接增加 `openid` 字段（单小程序场景一对一）；不做独立映射表。
  - **绑定撞号处理（已确认 Q2）**：微信授权后若该手机号已被既有账号占用 → **提示登录既有账号再绑定**（不自动合并、不静默拒绝）。
  - **商户号本期纯配置预留（已确认 Q3）**：不校验资质、不参与支付、不接真实回调（MVP 模拟支付，真实微信支付资质后置 +X）。
  - **appsecret 脱敏回显（已确认 Q4）**：写入回显掩码 + 「已配置」标记，不读回明文；支持重新配置覆盖。
  - **权限（扩展 R-ADM 门禁家族）**：渠道配置仅 `role=运营` 可写（`requireRole('运营')` 白名单基建）；客服/老板/客户/未登录无写权限。
  - **模拟支付边界**：本期不产生真实交易能力，订单仍走既有模拟支付链路。
- **B 端视角**：
  - 后台怎么配置？—— 渠道配置页（appid / appsecret / 商户号 / 启用状态开关），仅运营角色；低频写操作。
  - 生命周期如何？—— 渠道配置落盘（`data/channel-config.json` 类）；**启用状态控制小程序登录入口是否可用**；停用后新微信登录拒绝（CHANNEL_DISABLED）、既有会话照常（Q5 已确认）。
  - 谁有权限？—— 配置写权限仅运营（扩展 R-ADM）；老板可**只读查看渠道启用状态**（对齐老板"看得见、可关停"诉求——关停动作由运营执行，老板仅只读监督）。
- **C 端视角**：小程序端提供**微信授权登录**（`wx.login()` → 服务端 `code2session` 换 openid → 命中既有用户即建会话登录；未命中则引导**手机号绑定**：新手机号创建用户 / 撞号提示登录既有账号）；**Epic 6.1 含小程序登录入口 UI（已确认 Q8）**；购物旅程（浏览/加购/结算）属 Epic 6.2，不在本 Epic。

## 2. To-Be Process (目标流程)

本 Epic 不改变交易主流程（L1-01~L1-06 的语义/状态机），新增两条并行支流：

```
【支流 A：渠道配置（B 端，纯后台）】
运营登录（role 门禁）→ 进入「小程序渠道」配置页
  → 录入 appid / appsecret / 商户号（appsecret 脱敏回显）
  → 启用/停用渠道（启用状态控制登录入口可用性）
  → 落盘 channel-config.json（即时生效）

【支流 B：微信授权登录与同源账户打通（C/B 端衔接）】
买家在小程序内点击「微信授权登录」
  → wx.login() 取 code → 服务端 appid+appsecret 调 code2session 换 openid（mock 网关可模拟，Q6）
  → openid 命中既有 User.openid？
     ├─ 是 → 复用 user-session 创建会话 → 登录成功（同源账户直连）
     └─ 否 → 引导手机号绑定：
          ├─ 微信官方手机号组件取手机号（mock 可模拟）
          │    ├─ 手机号未注册 → 建新 User（写入 openid）→ 建会话
          │    └─ 手机号已注册 → 提示登录既有账号再绑定（Q2，不合并）→ 绑定后建会话
          └─ 会话标记来源渠道 channel=MINIPROGRAM（订单从会话继承写入，Q7 已确认）
  → 后续下单/查询复用既有 API（订单归属当前会话用户）
```

- **与现状差异**：现状仅 Web 单一渠道、手机号+密码单一登录因子（`/api/auth/register|login`）→ To-Be 增加微信渠道触点与 openid 登录因子，但**账户与订单归属仍是同一套 User/Order 语义**（同源账户）。
- **涉及角色**：C 端买家（小程序授权登录）、B 端运营（渠道配置/订单处理）、老板（渠道状态只读监督）。
- **流程节点引用**：
  - `L1-01 触达与发现`（新增渠道触点：微信小程序入口，渠道=MINIPROGRAM）
  - `L2-01 进入结算`（身份前置：未登录小程序用户先授权登录/绑定，再继续交易——本 Epic 打通该前置的身份因子）
  - `L1-04 下单结算`（订单渠道来源写入 `channel`：会话继承写入，Q7 已确认）
  - `L1-06 履约与完成`（B 端订单管理可见渠道来源，发货/取消流程不受渠道影响）
- **注意**：Epic 6.1 不引入小程序购物旅程节点（那是 Epic 6.2 的 L1-01~L1-06 移动端复刻）；本 Epic 交付"渠道 + 账户底座"，6.2 直接复用。

## 3. To-Be Journey (目标旅程)

### 旅程 1：买家首次微信授权登录（新手机号）
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 发现 | 微信内点开小程序 | 首页加载（渠道=MINIPROGRAM 触点） | 🙂 顺手 | 小程序首页 |
| 授权 | 点击「微信一键登录」 | `wx.login()` → 服务端换 openid → 未命中 → 引导手机号绑定 | 🙂 少填表 | 授权登录页 |
| 绑定 | 点「微信手机号快捷绑定」 | 官方组件取号 → 未注册 → 建 User(openid+phone) → 自动登录 | 🙂 无需输密码 | 绑定确认 |
| 回访 | 再次打开小程序 | openid 命中 → 直接登录（会话复用） | 🙂 无感登录 | 小程序 |

### 旅程 2：买家微信授权但手机号已注册（撞号）
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 授权 | 点击「微信一键登录」 | 换 openid → 未命中 → 取手机号 → **发现已注册** | 😐 略受阻 | 绑定页 |
| 处理 | 提示「该手机号已注册」 | 引导**登录既有账号再绑定**（不合并数据） | 🙂 数据安全 | 登录引导 |
| 绑定 | 用既有账号密码登录 | 校验通过 → openid 写入该 User → 自动登录 | 🙂 历史订单延续 | 登录页 |

### 旅程 3：运营配置小程序渠道
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 进入 | 运营登录 →「小程序渠道」 | 展示渠道配置（appid/appsecret/商户号/启用状态） | 🙂 | B 端渠道配置页 |
| 配置 | 录入 appid/appsecret/商户号 | secret 脱敏回显（掩码+已配置） | 🙂 凭证安全 | 配置表单 |
| 启用 | 打开「启用」开关 | 落盘即时生效；登录入口随状态可用/隐藏 | 🙂 可控 | 配置页 |
| 停用 | 关闭「启用」开关 | 小程序登录入口不可用（新登录拒绝） | 🙂 可关停 | 配置页 |

### 旅程 4：运营处理带渠道标识的订单
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 识别 | 运营查看订单列表 | 每单显示渠道标识（WEB / MINIPROGRAM） | 🙂 一眼知来源 | B 端订单管理 |
| 处理 | 发货/取消小程序订单 | 与网页单同流程，无差异 | 🙂 一致体验 | 订单操作 |

## 4. 产品设计思路 (Business Design Approach)

- **触发方式**：
  - C 端：小程序内「微信授权登录」按钮（`wx.login()` 引导）；已登录态无感进入。
  - B 端：后台导航新增「小程序渠道」入口（仅运营角色可见）。
- **核心交互**：
  - **小程序授权登录**：买家一键授权 → 服务端 `code2session` 换 openid → 命中即登录（同源）；未命中引导手机号绑定（微信官方组件取号或手输）；撞号引导登录既有账号。
  - **渠道配置（运营）**：appid / appsecret / 商户号三字段 + 启用开关；appsecret 脱敏回显、支持覆盖；保存即时生效。
  - **订单渠道标识（运营）**：B 端订单列表新增「渠道」列（WEB / MINIPROGRAM），标识来源但不改状态机。
- **价值提升**：买家少填表（授权即登录）、老客户跨端订单延续（同源账户）；运营一眼识别订单来源、渠道可配可停；老板渠道状态可见、生意"搬进微信"有据可依。
- **零依赖与测试约束**：微信网关（code2session / 手机号组件）在本地无法真实验证 → **mock 微信网关**（对齐既有 `NODE_ENV=test` 测试后门模式，Q6 已确认），保证 E2E 可复现；appsecret 服务端持有、严禁下发前端。

## 5. 任务类型与后续策略 (Task Type & Workflow Strategy)

- [x] **Epic**（大块需求、跨多能力/需拆分）：走需求侧漏斗 → 原型(Epic整体) → storymap 拆分 → Story → `/req:handoff`。
- [ ] Feature
- [ ] Bug Fix
- [ ] Tech Debt

确认的类型：**Epic**
后续策略说明：走需求侧完整漏斗；涉及 UI（渠道配置页 + 小程序登录入口页）→ 先 `/req:prototype`（Epic 整体）→ storymap 拆 3 Story → Story → handoff；创建 `openspec/epic-miniprogram-channel.story-list.json`（status=planned）。

**调研 10 项待澄清项 → 产品决策口径（10 条全部已确认，2026-09-08 HITL）**：
1. **openid 关联模型**（Q1）✅：`User` 增 `openid` 字段（方案 A，单小程序一对一）。
2. **绑定撞号处理**（Q2）✅：提示登录既有账号再绑定（不合并/不拒绝）。
3. **商户号语义**（Q3）✅：纯配置预留，不校验/不参与支付。
4. **appsecret 存储**（Q4）✅：写入回显脱敏（掩码+已配置标记），支持覆盖。
5. **mock 微信网关**（Q6）✅：对齐 `NODE_ENV=test` 测试后门模式。
6. **前端触点归属**（Q8）✅：Epic 6.1 含小程序登录入口 UI；6.2 承载完整购物旅程。
7. **渠道配置启用的生命周期**（Q5）✅ 已确认：停用后**小程序登录入口隐藏 + 新微信登录拒绝（CHANNEL_DISABLED）**；**既有会话访问照常**（MVP 只管新流量，停用主要控制新入口）；老板渠道状态只读查看见 §1 B 端视角口径。
8. **订单渠道标识写入与展示粒度**（Q7）✅ 已确认：写入 = 订单从**会话来源渠道继承**（openid 登录（wechat-auth）创建的会话下单 → `channel=MINIPROGRAM`，防客户端伪造；其余会话默认 WEB）；展示 = B 端订单列表**仅渠道标识列**（MVP 不做渠道筛选/统计，保持极简）。
9. **capability 边界**（Q9）✅ 已确认：新增 `wechat-auth`（User Context，openid 登录因子/手机号绑定/同源衔接）；新增 `miniprogram-channel`（新 Channel Context BC，渠道配置）；**会话创建/校验复用 `user-session` 既有能力**（不新增会话 capability）；`account-management` 保持手机号密码注册登录不扩展。
10. **UnionID**（Q10）✅ 已确认：MVP **不引入 unionid**（单小程序 openid 够用，`User.openid` 单值字段）；未来多端（公众号/App）接入时再评估 unionid/映射表。

## 6. 候选 Capabilities (Candidate Capabilities)

> 参考 `docs/baseline/domain_model.html` 的 BC→Capability 映射（bc-user 行 941 / cap-account 行 954 / cap-session 行 955 / Governs 边行 971-973 先例）。

- **新增 Capability**:
  - `wechat-auth`（**新增 taxonomy**）— 微信授权登录因子：`wx.login()` code 交换 openid（mock 网关可模拟）、`User.openid` 关联、手机号绑定（微信组件取号 / 撞号提示登录既有账号）、同源账户衔接（复用 user-session 建会话）。归属 **User Context**（bc-user → cap-wechat-auth 新 Governs 边）。理由：ROADMAP Phase 6 Guardrails 明确 "User Context 新增 `wechat-auth` capability"；openid 是既有 phone 之外的**新登录因子**，独立成能力便于复用与测试。
  - `miniprogram-channel`（**新增 taxonomy**）— B 端小程序渠道配置：appid / appsecret（脱敏回显）/ 商户号（纯预留）/ 启用状态；写权限仅运营（扩展 R-ADM 门禁家族）。归属 **新增 `Channel Context` BC**（ROADMAP Guardrails 明确"新增 `Channel Context`（B 端渠道配置）BC 与 `miniprogram-channel` capability"）。
- **修改 Capability**:
  - `order-management`（Order Context，复用 `openspec/specs/order-management/spec.md` 路径）— `Order` 增加 `channel` 渠道来源字段（默认 `WEB`；小程序来源会话下单 → `MINIPROGRAM`）；B 端订单管理列表展示渠道标识；**不改状态机与发货/取消流程**。
  - `frontend-ui`（Shared / Cross，`bc-shared → cap-ui` 行 970）— B 端新增「小程序渠道」配置视图 + 订单列表渠道标识列；小程序端登录入口 UI（技术栈未锁定，6.1 以可交互原型 + 登录 API 打通交付，原生工程化随 6.2 或按 lead/engineer 评估落地）。
- **只读消费（不修改语义）**: `user-session`（会话创建/校验复用——wechat-auth 登录调用既有会话能力，不新增会话字段）、`account-management`（手机号唯一约束与注册用户衔接被消费）、`user-admin`（B 端用户视角可显示 openid 绑定状态，可选展示，MVP 不强制）。
- **Impacted Bounded Contexts**: **新增 `Channel Context`**（渠道配置 BC）；`User Context`（扩展：新增 `wechat-auth` capability + User.openid 字段）；`Order Context`（修改：Order.channel 字段 + 展示）；`Shared / Cross`（frontend-ui 横切支撑）。

## 7. 分析制品索引 (Analysis Artifacts)

- OSM（目标-策略-度量）: `epics/epic-miniprogram-channel/analysis/osm/` — ❌ 未生成（Exit Criteria 锚点将随 storymap 覆盖对账 + E2E 断言落地，对齐既有 Epic 先例）
- To-Be Process（L1/L2 + 痛点）: `epics/epic-miniprogram-channel/analysis/process/` — ❌ 未生成（流程影响已在第 2 章结构化表达：渠道配置 + 微信登录双支流）
- To-Be Journey（体验旅程）: `epics/epic-miniprogram-channel/analysis/journey/` — ❌ 未生成（To-Be Journey 已在第 3 章结构化表达：授权登录/撞号绑定/渠道配置/订单渠道四旅程）
- 说明：分析制品均为可选；本 Epic 以 idea.md 内嵌的结构化表达为准，不额外生成 HTML 分析物（对齐 Epic 5.1/5.2 先例）。

## 8. 治理映射对齐 (Governance Mapping)

- **Impacted Process Nodes**（`docs/baseline/business_process.html`）：
  - `L1-01 触达与发现`（新增渠道触点：微信小程序入口，channel=MINIPROGRAM）
  - `L2-01 进入结算`（身份前置：未登录小程序用户先授权登录/绑定；本 Epic 新增微信登录因子供前置消费）
  - `L1-04 下单结算`（订单渠道来源写入 `Order.channel`：会话继承写入，Q7 已确认）
  - `L1-06 履约与完成`（B 端订单管理可见渠道标识；发货/取消流程不受渠道影响）
  - 不改变 L1-01~L1-06 交易语义/状态机；小程序购物旅程（L1-01~06 移动端复刻）属 Epic 6.2。
- **Impacted Service Blueprint Nodes**（`docs/baseline/service_blueprint.html`）：
  - `SB-STAGE-01`（用户进入）— 新增小程序渠道触点与「微信授权登录」入口
  - `SB-CUSTOMER-01`（登录/注册触点）— 扩展：微信授权登录 + 手机号绑定（openid 因子）
  - `SB-CUSTOMER-04`（提交订单）— 订单渠道来源写入（channel=MINIPROGRAM，会话继承候选）
  - `SB-OPS-04/05`（B 端运营泳道：订单/用户管理）— 订单列表渠道标识展示；渠道配置活动落位（新增 SB-OPS cell 或并入既有配置 cell，**Baseline Sync 时确认落位**，参照 account-system `SB-BACKSTAGE-07` 先例）
  - `SB-BACKSTAGE-*` — 渠道配置数据存储 + 微信网关对接为后台支撑活动（新增支撑节点，落位 Sync 时确认）
  - 不改变 SB-CUSTOMER-02/03/05/06 既有语义（本 Epic 不含购物旅程）
- **Potential Domain Model Sync Triggers**：新增 `Channel Context` BC + `miniprogram-channel` capability（新节点 + `bc-channel → cap-miniprogram-channel` Governs 边）；User Context 新增 `wechat-auth` capability（`bc-user → cap-wechat-auth` 边）；`User` Aggregate 增加 `openid` 字段（登录因子）；`Order` Aggregate 增加 `channel` 字段（渠道来源）→ **Domain Model 需 Sync**
- **Potential Service Blueprint Sync Triggers**：SB-STAGE-01 / SB-CUSTOMER-01 新增微信登录触点；B 端新增渠道配置后台活动/泳道节点；capability 分布变化 → **Service Blueprint 需 Sync**
- **Preliminary Sync Assessment**: **Yes** — 新增 Channel Context BC + 2 个 capability taxonomy（`wechat-auth` / `miniprogram-channel`）+ User/Order Aggregate 字段扩展，属基线级变化；按分层 Sync 机制在 Epic 全部 Story 归档后统一执行（本阶段仅预判不执行）。

## 9. 需求拆分建议 (Requirement Splitting)

- **Story 1 (P0)**: `story-miniprogram-channel-config` — B 端小程序渠道配置：
  - 渠道配置 API（appid / appsecret 脱敏回显 / 商户号纯预留 / 启用状态），仅 `role=运营`（扩展 R-ADM 门禁）。
  - 落盘 `data/channel-config.json`（类）即时生效；启用状态控制登录入口可用性。
  - B 端渠道配置视图（frontend-ui 修改）。
- **Story 2 (P0)**: `story-miniprogram-wechat-login` — 微信授权登录与同源账户打通：
  - `User.openid` 字段 + 微信 code2session 登录 API（mock 网关，`NODE_ENV=test` 后门）。
  - 手机号绑定：微信组件取号 / 手输；撞号提示登录既有账号（Q2）；绑定后建会话（复用 user-session）。
  - 小程序登录入口 UI（Q8：本 Epic 含）；同源账户：老用户历史订单延续可见。
- **Story 3 (P1)**: `story-miniprogram-order-channel` — 订单渠道标识：
  - `Order.channel` 字段（默认 WEB；小程序来源会话下单 → MINIPROGRAM，写入策略依 Q7）。
  - B 端订单管理列表渠道标识列展示（发货/取消流程不变）。
- **依赖关系**：Story 1（渠道启用状态）+ Story 2（微信登录）为 Story 3（渠道来源订单）的前置底座；Story 2 依赖既有 `user-session` 会话能力（只读消费）。
- **口径贯穿**：三 Story 共用口径（仅运营写渠道配置、openid 为 User 新因子、同源账户不建独立用户池、channel 默认 WEB、商户号纯预留）。
- **覆盖对账**：Epic In Scope（渠道配置 ✅ / 微信授权登录+手机号绑定 ✅ / B 端订单渠道标识 ✅）；Exit Criteria（ROADMAP EC 渠道可配可停 ✅ / 同源账户打通 ✅ / 小程序订单可发货取消 ✅）；B 端承诺项（谁配置=运营 / 生命周期=启用状态控制 / 权限=R-ADM 扩展 ✅）；候选 Capability `wechat-auth` ✅ / `miniprogram-channel` ✅ / `order-management` ✅ / `frontend-ui` ✅。

## 10. 架构影响分析 (Architectural Impact & Ideas)

- **后端服务（Node.js，权威实现）**：
  - 认证扩展：`User` 模型增 `openid` 字段（users.json 持久化）；新增微信登录路由 `POST /api/auth/wechat/login`（code → code2session 换 openid → 命中/未命中分支）与手机号绑定路由（撞号返回「已注册需登录」语义）；复用既有会话创建（AuthService / SessionRepo）。
  - 新增微信网关对接模块（code2session / 手机号组件），提供 **mock 实现**（`NODE_ENV=test` 后门，固定 code→openid 映射，对齐 `/api/__test/*` 既有模式）。
  - 渠道配置：新增 `channel-config` repo（`data/channel-config.json`）+ `GET/PUT /api/admin/channel/miniprogram`（仅运营）；appsecret 脱敏（写入不回显明文）。
  - 订单：`Order` 增 `channel` 字段（默认 WEB），下单时按会话来源写入（策略依 Q7）；B 端订单管理列表返回 `channel`。
  - 权限：复用 `requireRole('运营')` 白名单基建（扩展 R-ADM 家族规则号）。
- **Python 后端**：**无认证/渠道能力对齐**——Python 端仅覆盖 catalog/cart/order/coupon（无 auth/session/admin），本 Epic 认证与渠道以 Node.js 为权威；Python 保持既有冒烟范围，不做平行实现（差异在 Baseline Sync/测试策略中显式记录）。
- **前端 UI（Vue + 小程序）**：
  - Vue B 端：新增「小程序渠道」配置视图（appid/appsecret/商户号/启用开关）+ 订单列表「渠道」列；遵循 ZAPP 设计令牌、无圆角阴影、真实中文数据（`docs/FRONTEND.md`）。
  - 小程序端：登录入口 UI（授权登录 + 手机号绑定 + 撞号引导）；**技术栈（原生 WXML / uni-app / Taro）由 lead 与 engineer 评估后定**（ROADMAP 不锁定）；UI 规范沿用 FRONTEND 极简约束。
- **数据模型变化**：`User` + `openid`（可空，登录因子）；`Order` + `channel`（默认 WEB）；新增 `channel-config.json` 持久化文件；不改交易语义与状态机。
- **跨域/同步问题**：无新增跨域；mock 网关保证 E2E 可复现；真实微信回调（支付/登录态）本期不接入（商户号纯预留）。

## 11. 确认结论 (User Confirmation)

- 调研 10 项待澄清项全部收敛确认（2026-09-08 HITL）：Q1 openid=A / Q2 撞号提示登录 / Q3 商户号纯预留 / Q4 secret 脱敏 / Q5 停用拒绝新登录+既有会话照常 / Q6 mock 后门 / Q7 会话继承写入+仅标识列 / Q8 6.1 含小程序登录 UI / Q9 capability 边界（wechat-auth + miniprogram-channel + 复用 user-session）/ Q10 不引入 unionid。
- 方案：新增 `Channel Context` BC + `miniprogram-channel` capability、User Context 新增 `wechat-auth` capability；修改 `order-management`（Order.channel）+ `frontend-ui`（渠道配置视图/小程序登录 UI/渠道标识列）；3 个 Story 拆分（P0 渠道配置 / P0 微信登录+账户打通 / P1 订单渠道标识）。
- 涉及 UI → 下一步进入 **prototype（Epic 整体）**，产出可交互 HTML 原型待确认。
- [x] 已与用户确认探索结论（候选 Capabilities、10 条决策口径、Story 拆分建议），可进入 prototype
