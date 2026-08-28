# Epic: account-system - 用户资产与账户体系

> Epic Key: `account-system`
> 阶段：Phase 4 用户资产与账户体系（替换 `user_dev` 占位用户）

## 目标 (Goal)

建立「用户账户体系（注册/登录/会话 + B 端用户管理）」，让订单、优惠券、未来的回款拥有真实归属主体（真实 `userId`），替换硬编码的 `user_dev` 占位用户，使「我的订单」按登录用户查询、未登录不可下单/查看订单，为阶段 D 回款闭环奠定数据主体基础。

## 范围 (Scope)

### In Scope

- **C 端认证**：用户注册（邮箱 + 密码 ≥6 位含字母数字 + 昵称 + 手机号）、用户登录（邮箱 + 密码）、会话保持（刷新不掉登录态）、退出登录。
- **订单/优惠券真实归属**：下单订单 `userId` 绑定当前登录用户；「我的订单」按 `userId` 查询；优惠券发券实例 `userId` 非空归属真实用户。
- **用户基础信息**：昵称、联系方式（手机号/邮箱）。
- **B 端用户管理**：后台「用户管理」入口，可查看用户列表（邮箱/昵称/状态/注册时间），支持启用/禁用账户（ACTIVE/DISABLED 状态流转）。

### Out of Scope

- 第三方 OAuth（Google / 微信 / 支付宝）。
- 多收货地址管理。
- 积分 / 会员等级体系。
- 真实支付渠道（仍模拟支付）。
- 细粒度 RBAC 权限（仅单一 Admin 后台角色）。

## Exit Criteria (退出标准)

- ① 注册 E2E 通过：新买家注册成功后获得可用账户（状态 ACTIVE），可进入登录。
- ② 登录 E2E 通过：买家登录后跳转个人区，可下单，订单 `userId` 归属当前登录用户。
- ③ 会话保持 E2E 通过：刷新页面不掉登录态；退出登录后会话失效。
- ④ 未登录拦截 E2E 通过：未登录点击下单/「我的订单」触发登录引导。
- ⑤ B 端用户管理可用：后台可查看用户列表并启停账户（ACTIVE/DISABLED），禁用用户无法登录。

## 治理映射对齐 (Governance Mapping)

- **Impacted Bounded Contexts**: `account`（**新增**：账户/认证/会话）、`cart`（Cart Context：用户会话归属）、`order`（Order Context：订单 `userId` 真实归属）、`coupon`（Coupon Context：发券 `userId` 非空）、`shared`（`frontend-ui` / `domain-model` 承接登录 UI 与归属语义）。
- **新增 Capability Taxonomy**: `account-management`（账户 CRUD 与生命周期）、`user-session`（认证与会话）、`user-admin`（B 端用户管理入口）。基线中标注「新增 taxonomy」。
- **Candidate Capabilities (复用)**: `frontend-ui`、`domain-model`、`order-management`（按 userId 查「我的订单」）、`cart-management`（Session 一致性）、`coupon-management`（发券归属 userId）。
- **Impacted Process Nodes**: `L1-03 加购与准备`（用户会话前置）、`L1-06 履约与完成`（我的订单查询）、`L2-02 加载结算上下文`（身份上下文）、`L2-06 发起支付`（归属校验）。
- **Impacted Service Blueprint Nodes**: `SB-STAGE-01`~`SB-STAGE-06`、`SB-LANE-CUSTOMER`、`SB-LANE-OPS`、`SB-LANE-BACKSTAGE`、`SB-CUSTOMER-01`、`SB-CUSTOMER-06`、`SB-OPS-06`、`SB-BACKSTAGE-02`、`SB-BACKSTAGE-04`。
- **Potential Domain Model Sync Triggers**: 新增 `account` BC；`User` 聚合（id/email/nickname/phone/status）；`ACTIVE/DISABLED` 状态机；`Order.userId` 真实化；`Coupon.userId` 非空化。
- **Potential Service Blueprint Sync Triggers**: 新增账户阶段/泳道节点；`frontend-ui` 增加登录/注册/会话交互；`SB-BACKSTAGE-*` 增加 `/api/auth/*` 与 `/api/admin/users`；capability mapping table 补 `account-management`/`user-session`/`user-admin` 三行。
- **Preliminary Sync Assessment**: **Yes**（全新 BC + 新 capability 集，Phase 完成后回流三份基线）。

## 拆分状态 (Breakdown Status)

- [x] 未启动
- [x] 已 explore (idea 产出) → `ideas/idea-account-system.md`
- [x] 已拆分 (storymap 产出) → `storymaps/account-system/storymap.md`
- [ ] 已完成 (所有 story-specs 交付) → `stories/account-system-01-register`、`-02-login`、`-03-session`

## 关联 Storymap / Stories

- storymaps/account-system/storymap.md
- stories/account-system-01-register/story-specs.md（用户注册，P0）
- stories/account-system-02-login/story-specs.md（用户登录，P0，依赖 register）
- stories/account-system-03-session/story-specs.md（会话保持，P1，依赖 login）
