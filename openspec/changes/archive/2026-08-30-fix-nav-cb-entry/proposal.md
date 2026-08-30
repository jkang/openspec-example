# Proposal: 修复 C 端 / B 端入口导航信息架构（fix-nav-cb-entry）

> 源起：用户反馈「首页功能导航混乱，表达 C 端和 B 端入口的地方很诡异，看起来很不专业」。经 lead 诊断：顶部单一 header 把 **C 端**（店铺 / 我的订单 / 购物车 / 注册登录 / 退出登录）与 **B 端**（运营后台）**混排进一个工具条序列**，叠加突兀的「店铺 | 运营后台」分段切换钮，同一个 header 承载两种身份、两种业务空间且无作用域分隔，信息架构(IA)混乱。
> 任务类型：Bug Fix（涉及 UI 变更）→ 直走交付侧 `/opsx:propose`，不经过需求漏斗。

## Why

当前顶部 header 用一个工具条同时承载顾客操作（C 端：搜索、购物车、我的订单、注册/登录、退出登录）与运营操作（B 端：运营后台入口），且以「店铺 | 运营后台」分段控件强制切换，缺乏清晰的作用域边界。这导致：① 顾客与运营的**身份场**混叠；② C/B 入口**语义不清**（店铺切换钮与购物车等顾客操作并列）；③ 顶部「当前路径」在多个 adminTab 下文案冗杂。整体呈现不专业，违背 PRODUCT.md「逻辑驱动、效率优先」与 FRONTEND.md「左侧导航 + 右侧内容」的极简单屏规范。

## What Changes

- **C/B 作用域分离**：顶部 header 拆分为**清晰的作用域条**——C 端（store/orders/register/login/checkout 等）保留顾客操作（搜索、我的订单、购物车、登录态用户信息、退出登录）；B 端（admin）不再复用 C 端 header 的顾客操作序列，改为独立的「运营后台」作用域标题（如「运营后台 / 当前模块」面包屑）与运营侧操作（如返回店铺）。
- **入口表达专业化**：将「店铺 | 运营后台」的**分段切换控件**改为**明确的入口按钮**（如「返回店铺」能力归入 B 端作用域，店铺视图下 B 端入口收敛为独立「运营后台」按钮），避免同一 header 内出现「当前是店铺 / 当前是后台」的双身份切换暗示。
- **顶部路径文案收敛**：`当前路径` 展示改为**分层面包屑**（如 `运营后台 / 营销中心 / 优惠券管理`、`C 端店铺`），替代现有单行 `{{ {order:...}[adminTab] }}` 的映射文案；C 端各视图（store/orders/login/register）路径文案统一口径。
- **角色标签融合**：B 端作用域下的「运营专员」标签按真实 `currentUser` 角色渲染（与 Change A 联动，但本变更只负责 header 作用域布局，不重复角色取数逻辑）。

### Out of Scope（本变更不实现）

- 侧边栏「账户中心」分组与用户管理入口的可见性逻辑（由独立 change `fix-admin-user-mgmt-visibility` 承接）。
- 后端 API、服务、路由、数据模型的任何改动。
- 新增角色或权限模型。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- **`frontend-ui`（修改）**：C 端与 B 端顶部导航信息架构（header 作用域分离 + 入口表达 + 顶部路径分层）。更新 `openspec/specs/frontend-ui/spec.md`：新增「C/B 顶部导航作用域」需求（@unit/@e2e：C 端 store 视图不出现运营后台顾客混排；B 端 admin 视图展示独立作用域标题 + 返回店铺入口）；修改「B 端运营后台布局」需求以纳入 header 作用域边界。

## Impacted Bounded Contexts

- **Shared / Cross（修改·仅前端导航契约）**：`frontend-ui` capability（`bc-shared → cap-ui`，Cross-Context「全局极简 UI 组件库与视觉规范」）覆盖 C/B 双端 UI 布局与导航；本次仅调整 header 信息架构（作用域分离、面包屑、入口表达），不改变任何后端能力。该 capability 在 `docs/baseline/domain_model.html` 已收录（前端 UI），本次属**契约细化**，非新增 taxonomy。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-01 触达与发现` | C 端 header 入口（店铺 / 搜索 / 我的订单 / 购物车）作用域重组，影响顾客首次进入路径的表达 |
| `L1-06 履约与完成` | B 端（运营后台）入口与返回店铺动作的作用域分离，属于履约后的后台导航 |

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-01 触达与发现` | 修改（前端入口层） | 顾客侧 header 入口（店铺/搜索/购物车/我的订单）的作用域化表达；不改变 CUSTOMER 泳道行为序列 |
| `SB-OPS-06` | 修改（前端入口层） | 电商运营层·运营后台与返回店铺入口的 header 作用域分离；capability 分布与状态不变，属**前端呈现重组**，不触发 blueprint 回流 |

## Impact (影响面)

- **后端服务（Node.js）**：无改动。
- **前端 UI（Vue）**：`ecommerce/ecommerce-mini-frontend/src/App.vue` 顶部 header 的作用域条、C/B 入口按钮、顶部路径面包屑、B 端角色标签融合。
- **数据模型**：无。
- **跨域/同步**：无新增跨域。`frontend-ui` capability 已落地，无 Domain Model 回流；Service Blueprint 无能力分布变化，**预判 sync 阶段为显式 No-op**（见 design.md Sync Assessment）。
- **测试影响**：新增 C/B header 作用域场景；`frontend-ui` 规格导航需求补强（@unit/@e2e「C 端 header 不混排运营后台」「B 端 header 独立作用域 + 返回店铺」）。
