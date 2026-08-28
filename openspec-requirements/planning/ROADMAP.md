# Product Plan: 用户资产与账户体系 (Phase 4)

> 阶段名：用户资产与账户体系（替换 `user_dev` 占位用户，为回款闭环奠基）
> 对齐 `docs/ROADMAP.md` 下一阶段 (Next Phase)：用户资产与账户体系。

## 阶段目标 (Phase Goal)

让订单、优惠券与未来的回款拥有**真实归属主体**——建立「用户账户体系（注册/登录/会话）」，替换当前硬编码的 `user_dev` 占位用户，使「我的订单」按登录用户查询、订单/优惠券按真实 userId 归属，为阶段 D「回款与应收账款闭环」奠定数据主体基础。

## 价值承诺 (Value Proposition)

对照 `docs/PRODUCT_SENSE.md` 的核心价值承诺：

- **业务闭环优先 (Operational Completeness)**：当前订单与优惠券都挂在 `user_dev` 占位用户上，无法回答"这笔订单属于哪个真实买家""这张券发给了谁"。本阶段把"用户"从占位提升为真实业务实体，兑现"可实际运营的中小型电商系统"。
- **B 端管理后台必须具备对所有业务实体的增删改查与状态流转控制**：用户不再只是 C 端登录令牌，而是一个可被后台查看/启停/分组的受治理实体，运营人员能够对账户做生命周期管理。
- **可视即价值**：C 端新增登录/注册/会话交互界面，B 端新增「用户管理」入口，用户能直观感知"我是谁、我在哪、我的单属于我"。

## Explore 护栏 (Exploration Guardrails)

- **B/C 双端视角（强约束）**：任何关于账户的探索必须同时澄清 B 端运营逻辑——后台怎么配置用户列表、账户生命周期（ACTIVE/DISABLED）如何管理、谁有权限查看/启停用户；以及 C 端交互——注册/登录表单、会话保持、退出登录。
- **严禁第三方 UI 组件库**：零依赖极简认证（内存/文件会话），沿用 slate 色系、无圆角、无阴影、真实数据、全中文。
- **真实业务数据**：拒绝空洞占位符。注册示例使用真实买家（如"张采购 / buyer@trade-demo.com / 13800001234"），订单示例使用真实商品（如"MacBook Pro 14英寸"），不出现 foo/test。
- **会话实现零依赖**：会话令牌采用内存/文件存储（JSON 持久化与现有 products/carts/orders 一致），不引入外部认证服务。

## 产出的 Epics (Epics Groomed)

本阶段规划拆分为**一个** Epic：

- [x] Epic: `account-system` - 用户账户体系（注册/登录/会话 + B 端用户管理） (P0) → `planning/epics/account-system/epic.md`

## Exit Criteria (阶段退出标准)

- ① 注册/登录 E2E 通过：登录后可下单，订单归属当前登录用户（`userId` 不再为 `user_dev`）。
- ② 未登录不可下单 / 不可查看「我的订单」，系统引导登录。
- ③ 会话保持：刷新页面不掉登录态，退出登录后会话失效。
- ④ B 端可查看用户列表，并支持启用/禁用账户（ACTIVE/DISABLED 状态流转）。

## Non-Goals

- 不支持第三方 OAuth（Google / 微信 / 支付宝授权登录）。
- 不支持多收货地址管理（本阶段仅一个默认联系人字段）。
- 不支持积分 / 会员等级体系。
- 不引入真实支付渠道（仍为模拟支付）。
- 不支持多租户权限（仅单企业私有部署，Admin 单一后台角色即可，不区分细粒度 RBAC）。

## 治理映射对齐

- **Impacted Bounded Contexts**: `account`（**新增 Bounded Context**，账户/认证/会话）、`cart`（Cart Context 的 user/session 归属）、`order`（Order Context：订单 `userId` 真实归属）、`coupon`（Coupon Context：发券归属真实 userId）、`shared`（Shared / Cross：`frontend-ui`、`domain-model` 承接登录 UI 与用户归属语义）。
- **新增 Capability Taxonomy**: `account-management`（账户 CRUD 与生命周期）、`user-session`（认证与会话）、`user-admin`（B 端用户管理入口）。需在 `domain_model.html` 与 `service_blueprint.html` 中标注为「新增 taxonomy」。
- **Candidate Capabilities (复用)**: `frontend-ui`（登录/注册/会话 UI，横切支撑）、`domain-model`（用户归属语义基线）、`order-management`（按 userId 查询「我的订单」）、`cart-management`（Session 一致性归属校验）、`coupon-management`（发券归属 userId 的非空化）。
- **Impacted Process Nodes (business_process.html)**: `L1-03 加购与准备`（用户会话前置，登录准入）、`L1-06 履约与完成`（「我的订单」按登录用户查询）、`L2-02 加载结算上下文`（读取身份上下文）、`L2-06 发起支付`（订单归属校验）。
- **Impacted Service Blueprint Nodes (service_blueprint.html)**: `SB-STAGE-01`~`SB-STAGE-06`（账户作为横切前置，贯穿买家旅程）、`SB-LANE-CUSTOMER`（登录/注册交互）、`SB-LANE-OPS`（B 端用户管理入口）、`SB-LANE-BACKSTAGE`（认证/会话接口）、`SB-CUSTOMER-01`、`SB-CUSTOMER-06`、`SB-OPS-06`、`SB-BACKSTAGE-02`、`SB-BACKSTAGE-04`。
- **Potential Domain Model Sync Triggers**: 新增 `account` Bounded Context 与 `account-management` / `user-session` / `user-admin` Capability taxonomy；`Order` 聚合的 `userId` 从占位变真实归属；`Coupon` 发券归属 `userId` 非空化；新增 `User` 聚合与 `ACTIVE/DISABLED` 状态机。
- **Potential Service Blueprint Sync Triggers**: 新增账户「阶段/泳道」节点；`frontend-ui` 增加登录/注册/会话交互；`SB-BACKSTAGE-*` 增加 `/api/auth/*` 与 `/api/admin/users` 接口；新增 `account-management` / `user-session` / `user-admin` capability 分布；`capability mapping table` 需补充三行。
- **Preliminary Sync Assessment**: **Yes**（账户体系是全新 Bounded Context 与一套新 capability，需在 Phase 完成后将三份基线同步回流）。
