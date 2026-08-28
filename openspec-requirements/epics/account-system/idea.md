# Idea: 用户账户体系

> 关联 Epic: `account-system`（来自 `docs/ROADMAP.md` 下一阶段「用户资产与账户体系」）
> 关联调研: `epics/account-system/research.md`
> 产出后需用户确认（HITL）

<!--
探索是需求漏斗的第 2 步：把调研信息【转化】为产品设计思路。
输入：research.md（需求调研收集的原始信息）；输出：本 idea.md（产品设计思路 + 业务设计 + 候选 Capabilities）。
-->

## 1. 澄清业务意图 (Clarify Business Intent)

- **目标用户**：
  - **C 端买家**：林晓明这类普通消费者（手机号+密码即可完成注册/登录，查看我的订单，购物车跟随账号）。
  - **B 端运营**：陈运营这类后台使用者（需要真实用户归属、用户管理入口、权限受限的用户资料查看）。
- **核心业务价值**：让订单/优惠券/购物车拥有**真实归属主体**，替换 `user_dev` 占位用户，为「回款与应收账款闭环」（Phase D）奠定账户基础。
- **业务范围（In Scope，来自 ROADMAP）**：
  1. 用户账户：注册 / 登录 / 会话（基础认证，无第三方依赖）。
  2. 订单与优惠券按真实用户归属；「我的订单」按登录用户查询。
  3. 用户基础信息（昵称/联系方式）。
- **Out of Scope**：第三方 OAuth、多地址管理、积分/会员等级、支付渠道（仍模拟）、个人资料编辑（Q-5 默认本阶段只读，待确认）。
- **硬性业务限制**：
  - 手机号作为唯一标识（登录凭证），唯一性校验。
  - 未登录不可下单 / 查看我的订单（引导登录）。
  - 会话保持（刷新不掉登录态）。
  - B 端用户管理仅运营/管理员角色可见（权限约束）。
- **B 端视角（运营配置/生命周期/权限）**：
  - **后台怎么配置**：用户体系无需运营配置项，注册由 C 端自助发起；B 端仅需「用户管理」查看入口（列表/检索/详情）。
  - **生命周期**：用户注册 → 登录 → 会话保持 → 退出；B 端可查看活跃/禁用状态（Q-3 默认含"禁用用户"能力，禁用后其会话失效）。
  - **谁有权限**：用户管理入口限「运营」角色；客服不可查看全量用户资料（敏感信息保护）。
- **C 端视角**：极简注册/登录表单（手机号+密码），登录后导航出现「我的订单」与用户标识。

## 2. To-Be Process (目标流程)

### 用户注册/登录（新链路，前置子流程）
```
L1-03 加购与准备（身份前置）延伸出：
  买家触发注册/登录 → 提交手机号+密码 → 系统校验唯一性/凭证
    → 生成用户记录 + 创建会话 → 前端持有会话凭证 → 刷新/跨页保持
```
- **引用流程节点**：`L1-03 加购与准备`（owner 含"用户会话"）为身份前置入口；登录态在 `L1-04 下单结算`、`L1-06 履约与完成`（我的订单查询）中被消费。
- **与现状（As-Is）差异点**：
  | 维度 | As-Is（现状） | To-Be（目标） |
  | --- | --- | --- |
  | 用户标识 | 固定 `user_dev` | 真实注册用户 `userId` |
  | 身份验证 | 无（无需登录） | 手机号+密码 + 会话凭证 |
  | 会话 | 无会话（sessionId 仅购物车用） | 登录会话，刷新保持 |
  | 我的订单 | 无归属概念 | 按登录用户查询 |
  | B 端用户视角 | 无 | 用户管理入口（运营权限） |
- **涉及角色**：买家（注册/登录/下单）、运营（用户管理查看）、系统（认证与会话校验）。

### 核心交易链路（订单归属改造）
```
下单结算（L1-04）: 读取当前登录会话 userId → Order.userId 绑定真实用户
我的订单（L1-06）: GET /api/orders?userId=当前登录用户 → 归属隔离查询
```

## 3. To-Be Journey (目标旅程)

### 旅程 A：新买家完成首次购买（含注册）
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 触达 | 浏览商品加入购物车 | 商品列表/加购正常（无需登录） | 顺畅 | 首页/详情页 |
| 结算触发 | 点击「去结算」 | 弹层引导登录：「登录后可继续下单」 | 轻微打断 | 结算页入口 |
| 注册 | 输入手机号+密码+昵称 | 校验通过，自动创建账户并登录 | 快捷 | 注册页 |
| 下单 | 继续结算 | 订单绑定当前 userId，生成待支付订单 | 完成感 | 结算/订单页 |
| 回访 | 查看「我的订单」 | 按登录用户展示历史订单与状态 | 放心 | 我的订单页 |

### 旅程 B：运营定位某买家订单
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 查询 | 进入用户管理，按手机号搜索 | 返回匹配用户列表 | 高效 | 后台用户管理 |
| 下钻 | 点击用户查看详情 | 展示基础信息 + 该用户订单列表 | 清晰 | 用户详情 |
| 处理 | 配合订单管理发货/取消 | 订单归属真实用户 | 可追溯 | 订单管理 |

## 4. 产品设计思路 (Business Design Approach)

- **触发**：买家在结算或访问「我的订单」时触发登录/注册；运营在后台侧边栏进入「用户管理」。
- **核心交互流程**：
  1. **注册**：手机号 + 密码 + 昵称（昵称默认"手机尾号用户"可改）；校验手机号唯一；成功即自动登录（减少一步）。
  2. **登录**：手机号 + 密码；错误提示「手机号或密码不正确」；成功后写入持久会话。
  3. **会话**：登录后返回会话凭证，前端持久化存储；所有需登录接口携带凭证；刷新/重开浏览器不掉登录态；退出即销毁会话。
  4. **我的订单**：登录后可见；未登录访问 → 引导登录。
  5. **B 端用户管理**：列表 + 手机号/昵称检索 + 详情（基础信息 + 订单聚合）+ 禁用/启用。
- **用户价值**：对 C 端——身份资产可累积（订单可追溯）；对 B 端——运营效率提升（告别对聊天记录认人），为回款闭环铺路。
- **视觉/交互**：遵循 FRONTEND.md 极简规范（无圆角/slate 色系/1px 实线边框/全中文）。

## 5. 任务类型与后续策略 (Task Type & Workflow Strategy)

- 确认的类型：**[x] Epic**（大块需求，跨多能力、需拆分：认证 + 会话 + 订单归属改造 + B 端用户管理）。
- 后续策略说明：走需求侧漏斗 → 原型（Epic 整体 4 页）→ storymap 拆分 → Story ×4 → `/req:handoff`。
- 路由确认：非 Bug Fix / 非 Tech Debt / 非简单功能修改。

## 6. 候选 Capabilities (Candidate Capabilities)

> 参考 `docs/baseline/domain_model.html` 的 Bounded Context → Capability 映射（6. Bounded Context -> Capability Mapping）。

| Capability | 类型 | 说明 | 理由 |
| --- | --- | --- | --- |
| `account-management` | **新增 taxonomy** | 用户注册 / 登录 / 用户资料基础信息 | domain_model 现有 10 个 capability（catalog/product-query/cart/coupon/order/checkout/payment/domain-model/error-handling/frontend-ui）均无账户认证能力；新增以承载注册/登录与用户档案 |
| `user-session` | **新增 taxonomy** | 会话创建 / 校验 / 保持 / 销毁 | 现有 Cart Context 的 `user/session` 仅作为购物车归属字段，无认证会话管理能力；新增承载会话生命周期 |
| `user-admin` | **新增 taxonomy** | B 端用户管理（列表/检索/详情/禁用） | 运营后台目前仅有商品/订单/优惠券管理，无用户管理能力；新增承载 B 端用户视角 |
| `order-management` | **修改**（复用 `openspec/specs/` 已有路径） | 订单创建绑定真实 userId；`GET /api/orders?userId=` 归属查询 | 现有 SB-BACKSTAGE-04 已声明 `GET /api/orders?userId=`，但实际 `user_dev` 占位；需改造为真实用户归属 |

- **Impacted Bounded Contexts**：
  - `Order Context`（修改）—— 订单归属逻辑改造。
  - `Cart Context`（修改）—— 购物车归属从 sessionId 扩展为登录 userId（`Cart (userId, sessionId, items)` 字段已预留）。
  - `Coupon Context`（修改）—— 发券/核销归属基于真实 userId（`Coupon.userId` 已存在）。
  - **新增** `User Context`（新增 taxonomy，需标注）—— 用户账户与认证边界。
  - `Shared / Cross`（复用）—— `error-handling`（登录/注册错误提示）、`frontend-ui`（登录/注册/用户管理界面）。

## 7. 治理映射对齐 (Governance Mapping)

- **Impacted Process Nodes**（`docs/baseline/business_process.html`）：
  - `L1-03 加购与准备`（新增"身份确认"前置环节：登录/注册触发点）
  - `L1-04 下单结算`（订单创建绑定真实 userId）
  - `L1-06 履约与完成`（我的订单按登录用户查询）
  - `L2-01 进入结算`（结算前身份校验；未登录引导登录）
  - `L3-02 执行资格校验`（优惠券资格校验含用户归属匹配，`Coupon.userId`）
- **Impacted Service Blueprint Nodes**（`docs/baseline/service_blueprint.html`）：
  - `SB-STAGE-01`（用户进入）— 顶部登录/注册入口
  - `SB-STAGE-02`（选购与加购）— 登录态下购物车跟随用户
  - `SB-STAGE-03`（结算确认）— 登录引导入口
  - `SB-STAGE-04`（提交订单）— 订单归属真实用户
  - `SB-STAGE-06`（成功回流）— 我的订单入口
  - `SB-CUSTOMER-01` — 登录/注册触点
  - `SB-CUSTOMER-02` — 购物车用户归属
  - `SB-CUSTOMER-03` — 结算前登录引导
  - `SB-CUSTOMER-06` — 我的订单查看
  - `SB-BACKSTAGE-04` — `GET /api/orders?userId=` 归属查询（改造）
  - **新增** `SB-BACKSTAGE-07`（用户管理）或纳入 `SB-BACKSTAGE-01` 之前的前置泳道——需 Baseline Sync 时确认落位
- **Potential Domain Model Sync Triggers**：新增 `User` Aggregate + `User Context` BC；BC→Capability 映射新增 `account-management`/`user-session`/`user-admin` 三条边；Cart/Order/Coupon 归属字段语义更新。
- **Potential Service Blueprint Sync Triggers**：新增登录/注册触点；`SB-BACKSTAGE-*` 新增用户管理泳道；capability 分布变化。
- **Preliminary Sync Assessment**: **Yes**（新增 User Context 与 3 个 capability taxonomy，属基线级变化，需在 Epic 归档后执行 Baseline Sync；本阶段仅预判不执行）。

## 8. 需求拆分建议 (Requirement Splitting)

- **Phase 1 (P0) 核心认证链路**：
  - Story: 用户注册（表单 → 校验 → 创建用户 → 自动登录）
  - Story: 用户登录（凭证校验 → 创建会话）
  - Story: 会话保持与退出（刷新不掉登录态；退出销毁）
- **Phase 2 (P0) 归属改造与闭环**：
  - Story: B 端用户管理（列表/检索/详情/禁用 + 权限约束）
  - Story: 订单/优惠券/购物车归属真实用户（可并入上述 Story 或单列）
- **建议拆分**：4 个 Story（register / login / session / admin-users），归属改造（order-management）作为横切约束写入各 Story 验收，避免拆散端到端链路。

## 9. 架构影响分析 (Architectural Impact & Ideas)

- **后端服务（Node.js）**：
  - 新增用户数据模型 `User`（id, phone, passwordHash, nickname, status, createdAt），JSON 文件持久化（对齐现有风格）。
  - 新增认证模块：注册 API `POST /api/auth/register`、登录 `POST /api/auth/login`、会话校验中间件、退出 `POST /api/auth/logout`。
  - 会话存储：文件/内存 session（token → userId），持久化防刷新丢失。
  - 订单/购物车/优惠券接口：从 `user_dev` 迁移为读取会话 userId；`GET /api/orders?userId=` 从会话获取归属。
  - 新增用户管理 API：`GET /api/admin/users`、`GET /api/admin/users/:id`（含订单聚合）、`PATCH /api/admin/users/:id/status`（禁用/启用）。
- **前端 UI（Vue）**：
  - 新增注册页、登录页（或弹层）、用户会话状态管理（store + 持久化）、「我的订单」登录拦截。
  - 后台新增「用户管理」菜单页。
- **数据模型变化**：
  - 新增 `users.json`；订单/购物车/优惠券的 `userId` 由占位 `user_dev` 迁移为真实用户 ID（历史数据迁移策略见 Q-6）。
- **跨域/同步**：无新增第三方依赖（零 OAuth），无 CORS 新增风险；支付仍模拟不受影响。

## 10. 确认结论 (User Confirmation)

- 本 idea 建议进入**原型阶段（Epic 整体）**：产出 4 页原型（注册 / 登录 / 会话 / B 端用户管理），遵循 FRONTEND.md。
- 待确认默认方案：
  - Q-1：注册密码单次输入 + 明文切换（极简优先）。
  - Q-2：手机号已注册 → 提示「该手机号已注册，请直接登录」。
  - Q-3：B 端含"禁用用户"，禁用后该用户会话失效。
  - Q-4：未登录访问「我的订单」→ 整页跳转登录（带回跳）。
  - Q-5：个人资料本阶段只读（注册时录入）。
  - Q-6：历史 `user_dev` 订单不做归属迁移（仅新订单绑定真实用户），B 端按"未归属"标记。
- [ ] 已与用户确认探索结论（候选 Capabilities、拆分建议、默认方案）
