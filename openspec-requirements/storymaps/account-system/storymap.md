# Storymap: 用户账户体系（注册 / 登录 / 会话）

> 关联 Epic: `account-system` | 来源 Idea: `ideas/idea-account-system.md`

## 需求背景 (Background)

现有系统将订单、优惠券归属硬编码为 `user_dev` 占位用户，导致所有买家共享同一份身份，无法回答"这笔订单/这张券属于哪个真实买家"。本 storymap 把「用户账户体系」拆为 3 个可独立交付、可独立验收的 Story，替换 `user_dev`，让「我的订单」按登录用户查询、未登录不可下单，为回款闭环奠基。

## Story 拆分明细

| Story ID | 标题 | 角色 (Role) | 价值 (Value) | 目标 (Goal) | 依赖 | 优先级 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| account-system-01-register | 用户注册 | 游客（新买家） | 快速创建自己的账户 | 注册后获得状态为 ACTIVE 的账户并自动登录，可继续逛/下单 | - | P0 | planned |
| account-system-02-login | 用户登录 | 已注册用户 | 安全访问自己的账户与订单 | 用邮箱+密码登录进入个人区，订单/优惠券按登录用户归属 | account-system-01-register | P0 | planned |
| account-system-03-session | 会话保持 | 已登录用户 | 免重复登录、时刻知道"我是谁" | 刷新不掉登录态，退出即失效，未登录下单/看订单被拦截引导 | account-system-02-login | P1 | planned |

## 拆分原则

- 每个 Story 都是**可独立交付、可独立验收**的需求单元：注册可单独验收（注册成功/邮箱唯一/密码规则），登录可单独验收（登录成功/错误提示），会话可单独验收（刷新保持/退出失效/未登录拦截）。
- 遵循三要素：**角色 (Role) - 价值 (Value) - 目标 (Goal)**。
- 依赖线性清晰：register（无依赖，P0）→ login（依赖 register，P0）→ session（依赖 login，P1）。无并行冲突。
- 验收链路逐级叠加：注册为登录提供身份，登录为会话提供令牌，会话为订单归属/未登录拦截提供守卫。

## 治理映射对齐

- **Impacted Bounded Contexts**: `account`（新增 BC：注册/登录/会话）、`cart`（Session 归属一致性）、`order`（订单 `userId` 真实归属）、`coupon`（发券 `userId` 非空）、`shared`（`frontend-ui` / `domain-model`）。
- **新增 Capability Taxonomy**: `account-management`（register story 使用）、`user-session`（login/session story 使用）、`user-admin`（B 端用户管理，赋能全链路）。
- **Candidate Capabilities (复用)**: `frontend-ui`、`domain-model`、`order-management`、`cart-management`、`coupon-management`。
- **Impacted Process Nodes**: `L1-03 加购与准备`（注册/登录前置身份）、`L1-06 履约与完成`（我的订单按用户）、`L2-02 加载结算上下文`（身份上下文）、`L2-06 发起支付`（归属校验）。
- **Impacted Service Blueprint Nodes**: `SB-STAGE-01`（登录/注册入口，CUSTOMER-01）、`SB-STAGE-02`（加购身份校验，CUSTOMER-02）、`SB-STAGE-06`（我的订单按用户，CUSTOMER-06）、`SB-OPS-06`（B 端用户管理）、`SB-BACKSTAGE-02`（Session 一致性）、`SB-BACKSTAGE-04`（订单 `userId=` 查询）；账户体系为横切新增，贯穿 `SB-LANE-CUSTOMER` / `SB-LANE-OPS` / `SB-LANE-BACKSTAGE`。
- **Preliminary Sync Assessment**: **Yes**（新增 `account` BC 与 `account-management`/`user-session`/`user-admin` taxonomy，Phase 完成后回流三份基线）。

## 关联 Stories

- stories/account-system-01-register/story-specs.md（用户注册，P0）
- stories/account-system-02-login/story-specs.md（用户登录，P0，依赖 register）
- stories/account-system-03-session/story-specs.md（会话保持，P1，依赖 login）
