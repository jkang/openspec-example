# Idea: 用户账户体系（注册 / 登录 / 会话 + B 端用户管理）

> Idea Key: `account-system`
> 关联 Epic: `account-system`（Phase 4 用户资产与账户体系）

## 1. 澄清业务意图 (Clarify Business Intent)

**目标用户（C 端）**：贸易型中小企业的采购买家「核心买家」。他们需要快速定位商品、明确价格与优惠、完成下单，并能在「我的订单」看到属于自己的订单与实时状态。当前系统把一切归属硬编码为 `user_dev`，导致所有用户共享同一份订单/优惠券归属，无法感知"我的"。

**目标用户（B 端）**：系统管理员/运营人员。他们需要后台能查看用户列表、掌握账户生命周期，以便追踪"谁是真实买家""这张券/这笔订单属于谁"，为营销与后续回款对账提供依据。

**核心业务价值**：让订单、优惠券、回款拥有真实归属主体，替换 `user_dev` 占位，兑现「订单驱动库存 + 回款驱动账款看板」的数据主体基础。

**硬性业务限制（真实）**：

- 注册采用 **邮箱 + 密码**，邮箱全局唯一（重复注册拦截）；密码 ≥6 位且需同时包含字母与数字；补充 **昵称**（如"张采购"）与 **手机号**（如 `13800001234`）。
- 账户默认状态 `ACTIVE`（可用）。被 B 端禁用后不可登录（提示"账户已被禁用，请联系管理员"）。
- 登录凭 **邮箱 + 密码**，登录成功授予会话；失败给出明确错误（"邮箱或密码错误，请重试"）。
- 会话令牌随登录生成，30 天有效（与买家"1 天跑通主流程"的低门槛磨合）；刷新页面不掉登录态；退出登录立即失效。
- **存量 `user_dev` 数据处置决策（本阶段明确）**：**不做存量迁移**。历史存量订单/优惠券仍挂在 `user_dev` 下，保留原样、视为**无归属**，不显示在任何真实用户的「我的订单」中；**登录后新下的订单**使用真实 userId 归属本人；新发券的实例 userId 必须非空归属真实用户。杜绝"存量订单隐式迁移到新账户"的幻觉语义，避免用户看到不属于自己的历史订单。

**B 端视角（强约束）**：

- **后台怎么配置**：后台「用户管理」入口展示用户列表（邮箱 / 昵称 / 手机号 / 状态 / 注册时间），支持按邮箱搜索；列表数据来自 C 端注册自动入池，无需预配。
- **生命周期**：`ACTIVE`（可用）→ `DISABLED`（禁用，B 端手动，立即禁止登录，已颁发会话失效）→ 可重新 `ACTIVE`。
- **谁有权限**：系统管理员（Admin 单一后台角色，与现有商品/订单管理同权），在其「用户管理」页执行查看与启停操作。

## 2. 业务设计思路 (Business Design Approach)

**用户触发**：游客访问商城，触发任意需登录动作（点击加购/下单/「我的订单」）时，系统引导先登录/注册；注册成功后自动登录并返回原流程。

**核心交互流程（C 端）**：

1. 首页/商品页右上角显示「登录 / 注册」入口；未登录时显示游客态。
2. 注册表单：邮箱 + 密码 + 确认密码 + 昵称 + 手机号；前端即时校验（邮箱格式、密码强度、两次密码一致）。
3. 登录表单：邮箱 + 密码；成功后落地个人区。
4. 会话保持：登录态写入会话令牌（JSON 文件持久化），刷新保留；顶部显示当前用户昵称与「退出登录」。
5. 未登录拦截：点击「提交订单」或「我的订单」时，弹出登录引导，登录后返回原操作。
6. 订单归属：登录后新下单 `Order.userId` = 当前用户；「我的订单」仅返回本人订单。

**核心交互流程（B 端）**：后台侧边栏新增「用户管理」，加载用户列表，支持按邮箱搜索、查看状态、执行启用/禁用；禁用后 C 端该用户立即无法登录。

**用户价值**：买家获得"我的订单"的真实归属感，取消 `user_dev` 造成的混乱；运营获得用户视角，为发券、回款对账提供主体。

## 3. 任务类型与后续策略 (Task Type & Workflow Strategy)

- [ ] Epic (大块模糊需求)：需拆分为多个 Story，可能更新 Roadmap。
- [x] Feature (具体功能)：**大块复杂功能，走需求侧漏斗**（idea → storymap → story → openspec-handoff）。
- [ ] Bug Fix (缺陷修复)：⚠️ 直走交付侧，不走需求侧漏斗。
- [ ] Tech Debt (技术债/重构)：⚠️ 直走交付侧，不走需求侧漏斗。

确认的类型：**Feature（大块复杂功能，走需求侧漏斗）**
后续策略说明：全流程执行——先 storymap 拆为 **4 个独立可交付的 Story**（注册/登录/会话/B 端用户管理），再逐个产出冻结交付物 `story.md`（业务面，不含行为规格），最终通过 `openspec-handoff` 交接给开发侧，由开发侧在 proposal 后生成 specs。

## 4. 需求拆分建议 (Requirement Splitting)

本需求（Feature）拆为 4 个可独立交付、可独立验收的 Story：

- **Story 1: `account-system-01-register` 用户注册（P0）**：游客注册获得账户，为登录/会话提供身份前提。
- **Story 2: `account-system-02-login` 用户登录（P0，依赖 register）**：已注册用户登录进入个人区；登录后新下单归属本人；我的订单仅返回本人订单。
- **Story 3: `account-system-03-session` 会话保持（P1，依赖 login）**：登录态刷新不掉、退出失效、未登录拦截下单/查看我的订单。
- **Story 4: `account-system-04-admin-users` B 端用户管理（P0，依赖 login）**：后台用户列表/按邮箱搜索/启用禁用（ACTIVE/DISABLED），禁用后无法登录。

拆分原则：每个 Story 都是独立需求单元，可单独交付验收；依赖呈线性（register → login → session / admin-users）。

## 5. 治理映射对齐 (Governance Mapping)

- **Impacted Bounded Contexts**: `account`（**新增 BC**，认证/会话/账户生命周期与用户管理）、`cart`（Cart Context：Session 归属一致性，登录态作为购物车身份来源）、`order`（Order Context：订单 `userId` 真实归属 + 按 userId 查询）、`coupon`（Coupon Context：发券实例 `userId` 非空化）、`shared`（Shared/Cross：`frontend-ui` 登录 UI、`domain-model` 用户归属语义）。
- **新增 Capability Taxonomy**: `account-management`、`user-session`、`user-admin`（需在基线标注「新增 taxonomy」）。
- **Candidate Capabilities (复用)**: `frontend-ui`（登录/注册/会话交互，横切）、`domain-model`（`User` 聚合与 `userId` 归属基线）、`order-management`（按 userId 查「我的订单」）、`cart-management`（Session 一致性）、`coupon-management`（发券归属 userId）。
- **Impacted Process Nodes**: `L1-03 加购与准备`（用户会话前置、禁用账户登录准入）、`L1-04 下单结算`（未登录下单拦截）、`L1-06 履约与完成`（我的订单按登录用户查询）、`L2-02 加载结算上下文`（身份上下文读取）、`L2-06 发起支付`（订单归属校验）。
- **Impacted Service Blueprint Nodes**: `SB-STAGE-01`~`SB-STAGE-06`（账户横切贯穿买家旅程）、`SB-LANE-CUSTOMER`（登录/注册交互）、`SB-LANE-OPS`（B 端用户管理入口）、`SB-LANE-BACKSTAGE`（认证/会话接口）、`SB-CUSTOMER-01`（入口登录/注册）、`SB-CUSTOMER-04`（下单拦截）、`SB-CUSTOMER-06`（我的订单按用户）、`SB-OPS-06`（用户管理活动）、`SB-BACKSTAGE-02`（Session 一致性）、`SB-BACKSTAGE-04`（订单按 userId 查询）。
- **Potential Domain Model Sync Triggers**: 新增 `account` Bounded Context；`User` 聚合（id / email / nickname / phone / status）；`ACTIVE/DISABLED` 状态机；`Order.userId` 从 `user_dev` 到真实 id（新订单归属本人）；`Coupon.userId` 非空归属。
- **Potential Service Blueprint Sync Triggers**: `frontend-ui` 增加登录/注册/会话；`SB-BACKSTAGE-*` 增加认证与会话校验；`SB-OPS-06` 增加用户管理活动；capability mapping table 补 `account-management`/`user-session`/`user-admin`。
- **Preliminary Sync Assessment**: **Yes**（账户体系为全新 BC 与新 capability 集，Phase 完成后须回流 `domain_model.html`、`business_process.html`、`service_blueprint.html` 三份基线）。

## 6. 架构影响分析 (Architectural Impact & Ideas)

- **后端服务**：Node.js 后端。新增 `user` 文件持久化（JSON，与 products/categories/coupons/orders/carts 一致）；新增认证路由（注册/登录/退出/当前用户）与 B 端用户管理路由（用户列表/搜索/启停）。
- **会话实现（零依赖）**：会话令牌以内存/文件 JSON 存储（`sessions.json`），`token → { userId, expiresAt }`；有效期 30 天，刷新页面读取当前用户接口校验。
- **数据模型变化**：
  - 新增 `User`（id / email / nickname / phone / passwordHash（本项目可明文+演示，但留 hash 语义）/ status / createdAt）。
  - `Order.userId` 新订单使用真实用户 id（存量 `user_dev` 订单保留、无归属、不迁移）；`Cart` 归属由 session 关联 userId；`Coupon.userId` 新发券非空。
- **前端 UI 调整（Vue）**：新增登录/注册/会话组件；顶部用户区（昵称 + 退出登录）；「我的订单」按登录用户拉取；未登录加购/下单弹登录引导；后台侧边栏新增「用户管理」。遵循 `docs/FRONTEND.md`：无圆角、slate 色系、真实数据、全中文。
- **CORS / 同步**：无新增跨域问题（同一后端服务）；会话状态跨组件共享，需一个全局 auth store。
- **验收**：E2E 覆盖注册→登录→新下单归属本人→刷新会话保持→未登录拦截→退出失效→B 端禁用/启用联动；标签 @e2e。

## 7. 确认结论 (User Confirmation)

**结论**：本次以 **Feature（大块复杂功能，走需求侧漏斗）** 任务类型进入需求漏斗。已确认业务意图（注册需邮箱+密码≥6位含字母数字+昵称+手机号）、B/C 双端逻辑（C 端注册/登录/会话；B 端后台用户管理与 ACTIVE/DISABLED 生命周期）、订单/优惠券真实归属（新数据用真实 userId，**存量 user_dev 不做迁移、视为无归属**）。

**下一步**：进入 storymap 拆分为 **4 个独立 Story**（`account-system-01-register` / `-02-login` / `-03-session` / `-04-admin-users`），随后逐个产出冻结交付物 `story.md`（业务面），最终通过 `openspec-handoff` 交接给开发侧。等待用户对本品 idea 的 **HITL 确认**后方可进入 storymap。
