# Idea: 用户账户体系（注册 / 登录 / 会话 + B 端用户管理）

> 关联 Epic: `account-system`（来自 `docs/ROADMAP.md` 下一阶段「用户资产与账户体系」）
> 关联调研: `research/account-system.md`
> 产出后需用户确认（HITL）

<!--
探索是需求漏斗的第 2 步：把调研信息【转化】为产品设计思路。
输入：research.md（需求调研收集的原始信息）；输出：本 idea.md（产品设计思路 + 业务设计 + 候选 Capabilities）。
-->

## 1. 澄清业务意图 (Clarify Business Intent)

**目标用户（C 端）**：贸易型中小企业的采购买家「核心买家」（代表：采购专员"张采购"，邮箱 `buyer@trade-demo.com`，手机 `13800001234`）。他们需要快速定位商品、明确价格与优惠、完成下单，并能在「我的订单」看到属于自己的订单与实时状态。当前系统把一切归属硬编码为 `user_dev`，导致所有用户共享同一份订单/优惠券归属，无法感知"我的"。

**目标用户（B 端）**：系统管理员 / 运营人员（代表：后台运营"王运营"，邮箱 `ops@trade-demo.com`，手机 `13900005678`）。他们需要后台能查看用户列表、掌握账户生命周期，以便追踪"谁是真实买家""这张券/这笔订单属于谁"，为营销与后续回款对账提供依据。

**核心业务价值**：让订单、优惠券、回款拥有真实归属主体，替换 `user_dev` 占位，兑现「订单驱动库存 + 回款驱动账款看板」的数据主体基础（阶段 D `epic-accounts-receivable` 的前置条件）。

**硬性业务限制（真实）**：

- 注册采用 **邮箱 + 密码**，邮箱全局唯一（重复注册拦截）；密码 ≥6 位且需同时包含字母与数字；补充 **昵称**（如"张采购"，≤20 字符）与 **手机号**（如 `13800001234`，11 位格式校验，无短信验证）。
- 账户默认状态 `ACTIVE`（可用）。被 B 端禁用（`DISABLED`）后不可登录（提示"账户已被禁用，请联系管理员"）。
- 登录凭 **邮箱 + 密码**，登录成功授予会话；失败给出明确错误（"邮箱或密码错误，请重试"，不泄露具体字段）。
- 会话令牌随登录生成，30 天有效（与买家"1 天跑通主流程"的低门槛磨合）；刷新页面不掉登录态；退出登录立即失效；无滑动续期。
- **存量 `user_dev` 数据处置决策（本阶段明确）**：**不做存量迁移**。历史存量订单/优惠券仍挂在 `user_dev` 下，保留原样、视为**无归属**，不显示在任何真实用户的「我的订单」中；**登录后新下的订单**使用真实 userId 归属本人；新发券的实例 userId 必须非空归属真实用户。杜绝"存量订单隐式迁移到新账户"的幻觉语义，避免用户看到不属于自己的历史订单。

**B 端视角（强约束）**：

- **后台怎么配置**：后台「用户管理」入口展示用户列表（邮箱 / 昵称 / 手机号 / 状态 / 注册时间），支持按邮箱搜索；列表数据来自 C 端注册自动入池，无需预配。
- **生命周期**：`ACTIVE`（可用，注册默认）→ `DISABLED`（禁用，B 端手动，立即禁止登录，已颁发会话失效）→ 可重新 `ACTIVE`（恢复登录）。启停双向，闭环完整。
- **谁有权限**：系统管理员（Admin 单一后台角色，与现有商品/订单管理同权），无细粒度 RBAC。

## 2. To-Be Process (目标流程)

目标流程覆盖「游客注册 → 登录 → 下单归属 → B 端管理」整条链路（基于调研痛点 1/2/3 的转化设计）：

| 步骤 | 业务动作 | 角色 | 关联流程节点 |
| --- | --- | --- | --- |
| ① 身份前置 | 游客触发需登录动作（加购/下单/「我的订单」），系统引导登录或注册 | 游客（张采购） | L1-03 加购与准备（身份前置） |
| ② 注册 | 填写邮箱+密码+昵称+手机号 → 唯一性/强度/格式校验 → 创建 `User(status=ACTIVE)` → **自动登录**（下发会话令牌）→ 返回原操作 | 游客 | L1-03 / L2-02 加载结算上下文（身份上下文读取） |
| ③ 登录 | 邮箱+密码校验 → `DISABLED` 拒绝（"账户已被禁用"）→ 下发会话令牌 → 进入个人区 | 已注册用户 | L1-03（登录准入） |
| ④ 下单归属 | 登录后新提交订单，`Order.userId` 绑定当前登录用户；未登录提交被拦截引导登录 | 已登录买家 | L1-04 下单结算（归属校验）、L2-05 提交订单（固化订单快照含 userId） |
| ⑤ 我的订单 | 「我的订单」按 `userId` 查询，仅返回本人订单（归属隔离） | 已登录买家 | L1-06 履约与完成（按登录用户查询） |
| ⑥ B 端管理 | 后台「用户管理」列表/按邮箱搜索/启用禁用（`ACTIVE` ↔ `DISABLED`）→ 禁用即时禁止登录、已颁发会话鉴权失效 | 王运营（Admin） | L1-03（登录准入联动）、L2-02（身份校验兜底） |

**与现状（As-Is）的差异点**：

- As-Is：订单/优惠券归属 `user_dev`，无身份概念，无注册/登录/会话，「我的订单」人人共享 → To-Be：真实 `userId` 归属主体，「我的订单」按人隔离。
- As-Is：B 端无用户管理入口 → To-Be：后台「用户管理」+ `ACTIVE/DISABLED` 生命周期管控。

## 3. To-Be Journey (目标旅程)

目标用户体验旅程（新用户"张采购"从触达到下单回流）：

| 旅程阶段 | 用户动作 | 系统反应 | 情绪 | 触点 | 关联节点 |
| --- | --- | --- | --- | --- | --- |
| ① 触达发现 | 浏览首页、搜索商品、打开商品详情（MacBook Pro 14英寸，priceCents 1299900） | 展示商品与价格、真实库存 | 兴趣 | 首页/商品详情页 | L1-01 / SB-STAGE-01, SB-CUSTOMER-01 |
| ② 尝试加购 | 点击「加入购物车」 | 弹出登录引导（提示先登录/注册） | 轻微阻碍（被引导） | 登录引导弹窗 | L1-03 / SB-STAGE-02, SB-CUSTOMER-02 |
| ③ 快速注册 | 填写邮箱 `buyer@trade-demo.com`、密码 `trade1234`、确认密码、昵称"张采购"、手机号 `13800001234` | 前端即时校验（格式/强度/两次一致），提交后创建 ACTIVE 账户并**自动登录** | 顺畅、低门槛 | 注册表单 | L1-03 / SB-STAGE-01, SB-CUSTOMER-01, SB-BACKSTAGE-02 |
| ④ 首次下单 | 自动登录返回商品页 → 加购 → 结算页「提交订单」 | 新订单 `userId` 归属本人，进入待支付 | 成就感 | 结算页/提交订单 | L1-04, L2-02, L2-05 / SB-STAGE-03~04 |
| ⑤ 回流查看 | 支付后进入「我的订单」，刷新页面 | 订单按本人 userId 返回，刷新不掉登录态，顶部显示昵称"张采购" | 安心、归属感 | 我的订单页 | L1-06 / SB-STAGE-06, SB-CUSTOMER-06, SB-BACKSTAGE-04 |
| ⑥ 再次回访 | 次日直接打开商城 | 免重复登录（会话 30 天有效），继续下单 | 省心 | 顶部用户区（昵称 + 退出登录） | 会话横切 / SB-BACKSTAGE-02 |

**关键交互与反馈**：注册/登录表单即时校验与明确错误提示（"该邮箱已注册，请直接登录""密码需至少 6 位，且同时包含字母和数字""账户已被禁用，请联系管理员"）；未登录下单被拦截后登录成功自动返回原操作。

## 4. 产品设计思路 (Business Design Approach)

**用户如何触发**：游客访问商城，触发任意需登录动作（点击加购/下单/「我的订单」）时，系统引导先登录/注册；注册成功后自动登录并返回原流程。

**核心交互流程（C 端）**：

1. 首页/商品页右上角显示「登录 / 注册」入口；未登录时显示游客态。
2. 注册表单：邮箱 + 密码 + 确认密码 + 昵称 + 手机号；前端即时校验（邮箱格式、密码强度、两次密码一致）。
3. 登录表单：邮箱 + 密码；成功后落地个人区。
4. 会话保持：登录态写入会话令牌（JSON 文件持久化 `sessions.json`），刷新保留；顶部显示当前用户昵称与「退出登录」。
5. 未登录拦截：点击「提交订单」或「我的订单」时，弹出登录引导，登录后返回原操作。
6. 订单归属：登录后新下单 `Order.userId` = 当前用户；「我的订单」仅返回本人订单。

**核心交互流程（B 端）**：后台侧边栏新增「用户管理」，加载用户列表（邮箱/昵称/手机号/状态/注册时间），支持按邮箱搜索、查看状态、执行启用/禁用；禁用后 C 端该用户立即无法登录、已颁发会话鉴权失效。

**用户价值**：买家获得"我的订单"的真实归属感，取消 `user_dev` 造成的混乱；运营获得用户视角，为发券、回款对账提供主体。

## 5. 任务类型与后续策略 (Task Type & Workflow Strategy)

- [x] Epic (大块需求，跨多能力/需拆分)：走需求侧漏斗 → 原型(Epic整体) → storymap 拆分 → Story → /req:handoff。
- [x] Feature (具体功能，独立可交付)：若为简单功能修改（如单个 UI 优化）→ 直走交付侧；若为大块复杂功能 → 走需求侧漏斗。
- [ ] Bug Fix (缺陷修复)：⚠️ 直走交付侧，不走需求侧漏斗。
- [ ] Tech Debt (技术债/重构)：⚠️ 直走交付侧，不走需求侧漏斗。

确认的类型：**Epic/Feature（大块复杂功能，走需求侧漏斗）**——本需求来自 `docs/ROADMAP.md` 下一阶段条目（阶段条目即 Epic），跨注册/登录/会话/B 端管理多个能力面，需拆分。

后续策略说明：全流程执行——先产出 Epic 整体原型 `prototypes/account-system/*.html`（UI 门禁，需用户 HITL 确认），再 storymap 拆为 **4 个独立可交付的 Story**（注册/登录/会话/B 端用户管理），逐个产出冻结交付物 `story.md`（业务面，不含行为规格），最终通过 `/req:handoff` 交接给开发侧，由开发侧在 proposal 后按 capability 生成 specs。

## 6. 候选 Capabilities (Candidate Capabilities)

> 参考 `docs/baseline/domain_model.html` 的 Bounded Context → Capability 映射。该表是 handoff 合成 proposal 的 Capabilities 契约与开发侧 `specs/<capability>/` 落位的依据。

| Capability | 类型 | 归属 Bounded Context | 理由 / 变更点 |
| --- | --- | --- | --- |
| `account-management` | **新增 taxonomy** | `account`（**新增 BC**） | 账户 CRUD 与生命周期（注册创建 `User(status=ACTIVE)`、邮箱唯一性、密码强度、`ACTIVE/DISABLED` 状态机）。基线无此 taxonomy。 |
| `user-session` | **新增 taxonomy** | `account`（**新增 BC**） | 认证与会话（登录下发令牌、刷新保持、退出失效、30 天有效期、禁用账户会话失效）。基线无此 taxonomy。 |
| `user-admin` | **新增 taxonomy** | `account`（**新增 BC**） | B 端用户管理入口（用户列表/按邮箱搜索/启用禁用），Admin 单一角色。基线无此 taxonomy。 |
| `order-management` | **修改（复用）** | `order`（Order Context） | 新增/调整：登录后新订单 `userId` 归属当前用户；`GET /api/orders?userId=` 按登录用户查询「我的订单」（归属隔离、倒序）。基线已有此 capability（service_blueprint SB-BACKSTAGE-04 已有 userId= 查询线索）。 |
| `frontend-ui` | 复用（横切） | `shared`（Shared/Cross） | 登录/注册/会话交互、顶部用户区、后台用户管理列表 UI；遵循 `docs/FRONTEND.md`（无圆角、slate 色系、真实数据、全中文）。 |
| `domain-model` | 复用（横切） | `shared`（Shared/Cross） | `User` 聚合（id/email/nickname/phone/status/createdAt）与 `userId` 归属语义基线。 |

**Impacted Bounded Contexts**：`account`（**新增**）、`order`（Order Context：订单 `userId` 真实归属 + 按 userId 查询）、`cart`（Cart Context：会话归属一致性）、`coupon`（Coupon Context：发券 `userId` 非空）、`shared`（`frontend-ui` / `domain-model`）。

## 7. 治理映射对齐 (Governance Mapping)

- **Impacted Process Nodes**（`docs/baseline/business_process.html`）：`L1-03 加购与准备`（用户会话前置、禁用账户登录准入）、`L1-04 下单结算`（未登录下单拦截、新订单归属校验）、`L1-06 履约与完成`（「我的订单」按登录用户查询）、`L2-02 加载结算上下文`（身份上下文读取）、`L2-06 发起支付`（订单归属校验）。注册/登录/会话/用户管理为**新增 L3 环节**（基线补充，设计中）。
- **Impacted Service Blueprint Nodes**（`docs/baseline/service_blueprint.html`）：`SB-STAGE-01`~`SB-STAGE-06`（账户横切贯穿买家旅程）、`SB-LANE-CUSTOMER`（登录/注册交互）、`SB-LANE-OPS`（B 端用户管理入口）、`SB-LANE-BACKSTAGE`（认证/会话接口）、`SB-CUSTOMER-01`（入口登录/注册）、`SB-CUSTOMER-02`（加购身份校验）、`SB-CUSTOMER-04`（下单拦截）、`SB-CUSTOMER-06`（我的订单按用户）、`SB-OPS-06`（用户管理活动，新增）、`SB-BACKSTAGE-02`（Session 一致性）、`SB-BACKSTAGE-04`（订单按 userId 查询）。
- **Potential Domain Model Sync Triggers**：新增 `account` Bounded Context；`User` 聚合（id / email / nickname / phone / status）；`ACTIVE/DISABLED` 状态机；`Order.userId` 从 `user_dev` 到真实 id（新订单归属本人）；`Coupon.userId` 非空归属。
- **Potential Service Blueprint Sync Triggers**：`frontend-ui` 增加登录/注册/会话；`SB-BACKSTAGE-*` 增加认证与会话校验；`SB-OPS-06` 增加用户管理活动；capability mapping table 补 `account-management`/`user-session`/`user-admin` 三行。
- **Preliminary Sync Assessment**：**Yes**（全新 BC + 新 capability 集，Phase 完成后回流 `domain_model.html`、`business_process.html`、`service_blueprint.html` 三份基线）。

## 8. 需求拆分建议 (Requirement Splitting)

本需求（Epic/Feature 级）拆为 4 个可独立交付、可独立验收的 Story（完整端到端功能粒度）：

- **Phase 1 核心链路 (P0)**：
  - Story 1: `account-system-01-register` 用户注册（无依赖）——游客注册获得 ACTIVE 账户并自动登录，为登录/会话提供身份前提。
  - Story 2: `account-system-02-login` 用户登录（依赖 register）——已注册用户登录进入个人区；登录后新下单归属本人；「我的订单」仅返回本人订单。
  - Story 4: `account-system-04-admin-users` B 端用户管理（依赖 login，可与 session 并行）——后台用户列表/按邮箱搜索/启用禁用（ACTIVE/DISABLED），禁用后无法登录。
- **Phase 2 体验优化 (P1)**：
  - Story 3: `account-system-03-session` 会话保持（依赖 login）——登录态刷新不掉、退出失效、未登录拦截下单/查看我的订单、禁用账户会话失效。
- **Phase 3 异常边界 (P2)**：随各 Story 的异常场景覆盖（重复邮箱、弱密码、禁用登录、会话过期），不单独拆 Story。

依赖呈线性：register → login → session / admin-users。

## 9. 架构影响分析 (Architectural Impact & Ideas)

- **后端服务**：Node.js 后端。新增 `user` 文件持久化（JSON，与 products/categories/coupons/orders/carts 一致）；新增认证路由（注册/登录/退出/当前用户）与 B 端用户管理路由（用户列表/搜索/启停）。
- **会话实现（零依赖）**：会话令牌以内存/文件 JSON 存储（`sessions.json`），`token → { userId, expiresAt }`；有效期 30 天，刷新页面读取当前用户接口校验；禁用账户在鉴权时校验 `status`。
- **数据模型变化**：
  - 新增 `User`（id / email / nickname / phone / passwordHash（本项目可明文+演示，但留 hash 语义）/ status / createdAt）。
  - `Order.userId` 新订单使用真实用户 id（存量 `user_dev` 订单保留、无归属、不迁移）；`Cart` 归属由 session 关联 userId；`Coupon.userId` 新发券非空。
- **前端 UI 调整（Vue）**：新增登录/注册/会话组件；顶部用户区（昵称 + 退出登录）；「我的订单」按登录用户拉取；未登录加购/下单弹登录引导；后台侧边栏新增「用户管理」。遵循 `docs/FRONTEND.md`：无圆角、slate 色系、真实数据、全中文。
- **CORS / 同步**：无新增跨域问题（同一后端服务）；会话状态跨组件共享，需一个全局 auth store。
- **验收**：E2E 覆盖注册→登录→新下单归属本人→刷新会话保持→未登录拦截→退出失效→B 端禁用/启用联动；标签 @e2e。

## 10. 确认结论 (User Confirmation)

**结论**：本次以 **Epic/Feature（大块复杂功能，走需求侧漏斗）** 任务类型进入需求漏斗。已确认业务意图（注册需邮箱+密码≥6位含字母数字+昵称+手机号）、B/C 双端逻辑（C 端注册/登录/会话；B 端后台用户管理与 ACTIVE/DISABLED 生命周期）、订单/优惠券真实归属（新数据用真实 userId，**存量 user_dev 不做迁移、视为无归属**）。

**下一步**：产出 Epic 整体原型 `prototypes/account-system/*.html`（注册/登录/会话/B 端用户管理四页，UI 门禁需用户 HITL 确认），随后进入 storymap 拆分为 **4 个独立 Story**（`account-system-01-register` / `-02-login` / `-03-session` / `-04-admin-users`），逐个产出冻结交付物 `story.md`（业务面），最终通过 `/req:handoff` 交接给开发侧。等待用户对本品 idea 的 **HITL 确认**后方可进入原型。
