# Design: 修复 C 端 / B 端入口导航信息架构（fix-nav-cb-entry）

## Context

当前顶部 header（`ecommerce/ecommerce-mini-frontend/src/App.vue` 第 28~60 行）用一个工具条同时承载顾客操作（店铺搜索、购物车、我的订单、注册/登录、退出登录）与运营操作（运营后台入口），并以「店铺 | 运营后台」分段切换控件（第 30~39 行）强制切换。同一 header 承载两种身份、两种业务空间且无作用域分隔，呈现不专业。驱动见 proposal.md · Why。此为纯前端 UI 改动。

## 根本原因分析 (RCA)

**现象**：首页导航混乱，C 端/B 端入口表达诡异。

1. **直接原因**：header 内 `viewMode` 用 `store / admin / orders / register / login` 等条件渲染大量按钮（第 28~60 行），其中「店铺 | 运营后台」分段控件（第 30-39 行）与「我的订单 / 购物车 / 登录退出」等顾客操作**并列**，C/B 身份混叠。
2. **深层原因**：`viewMode` 从 C 端 store 切换到 B 端 admin 时，header 只是**条件性隐藏**部分按钮（如 `v-if="viewMode !== 'admin'"`），而非**切换作用域**——导致 B 端仍套用 C 端 header 结构，仅部分按钮被 `v-if` 屏蔽，语义不清晰。
3. **路径文案问题**：顶部`当前路径`（第 24-26 行）用 `{{ { order: '交易管理 / 订单列表', ... }[adminTab] }}` 单行映射，B 端 admin 时依赖 `adminTab`，而 store/orders 等 C 端视图路径无统一口径，造成文案冗杂不一致。

**为何非后端 bug**：`viewMode`/`adminTab` 均为前端状态（App.vue 第 1075/1556 行），无后端契约参与。

## Goals / Non-Goals

**Goals:**
- C 端 header 仅承载顾客操作，B 端入口为独立「运营后台」按钮（移除分段切换控件）。
- B 端 header 为独立运营作用域：面包屑「运营后台 / 当前模块」+ 「运营专员」真实角色标签 + 「返回店铺」出口；不混排购物车/我的订单/退出登录。
- 顶部路径统一为分层面包屑口径（C 端视图与 B 端模块各自清晰）。

**Non-Goals:**
- 不改侧边栏「账户中心/用户管理」可见性（Change A 承接）。
- 不改后端 API、服务、路由、数据模型。
- 新增/扩展角色体系。

## Decisions

### Decision 1: 用作用域分支替代条件性 v-if 屏蔽

- **选择**：C 端 header（store/orders/register/login/checkout 等 viewMode 分支）与 B 端 header（admin）拆成**两套独立的作用域条**，各自渲染，不再通过 `v-if="viewMode !== 'admin'"` 在 C 端结构上做负向屏蔽。
- **替代方案**：继续在同一 header 内用 v-if 隐藏/显示。→ 否决：语义仍混叠，维护易碎。
- **替代方案**：引入路由库。→ 否决：项目当前为单 `App.vue` 单屏 SPA 逻辑，为导航重构引入路由库超出范围。

### Decision 2: 「运营后台」入口从分段切换改为独立按钮

- **选择**：C 端 header 中移除「店铺 | 运营后台」分段控件，改放一个独立「运营后台」入口按钮（`@click="switchViewMode('admin')"`）。B 端 header 右侧提供「返回店铺」出口（`@click="switchViewMode('store')"`）。B 端不再需要「店铺」切换钮，因为「返回店铺」即表达出口。
- **替代方案**：保留分段切换但调整样式。→ 否决：分段切换本身即「同一工具条双身份」的根源，保留即未根治。

### Decision 3: 顶部路径分层面包屑

- **选择**：B 端 header 用 `运营后台 / {{ pathMap[adminTab] }}` 分层呈现；C 端各视图用统一口径（store→「C 端店铺」、orders→「我的订单」、login/register→「账户 / 登录|注册」）。替代现有单行映射文案。
- **替代方案**：保留 `{{ {...}[adminTab] }}`。→ 否决：无法区分 C/B 上下文，breadcrumb 语义缺失。

## Risks / Trade-offs

- **[回归风险]**：拆分 header 作用域可能影响既有 `smoke.feature` / `mvp_trading.feature` 中对 header 元素的断言（如「顶部导航显示用户昵称」）→ 缓解：`@e2e` 断言已按真实行为校对；重构时保留既有 `renderHeader` 的登录态/昵称/退出能力，仅调整布局作用域。
- **[B 端入口可达性]**：C 端移除分段切换后，「运营后台」按钮若被误隐藏 → 缓解：该按钮在 C 端视图恒渲染（无条件），入口稳定。
- **[面包屑文案与侧边栏不同步]**：`pathMap` 若与侧边栏 module 标题不一致 → 缓解：pathMap 与侧边栏分组标题（交易管理/营销中心/账户中心）严格对齐。

## Migration Plan

- 纯前端改动，无数据迁移。改动后重启 Vite（`./init.sh vue:start`）观察 `App.vue` 生效。无回滚数据库。

## Service Blueprint Sync Assessment

**Needs Sync: No（显式 No-op）**
- 理由：本次仅重组 `SB-STAGE-01 触达与发现`（C 端 header 入口层）与 `SB-OPS-06`（电商运营层·运营后台与返回店铺入口）的**前端 header 呈现**，capability 分布（`catalog`/`frontend-ui`/`user-admin`/`order-management`）与状态均不变；未新增/移除幕后活动节点，未改变 `SB-STAGE-*` / `SB-<LANE>-*` 结构。据此 `docs/baseline/service_blueprint.html` **无需回流**。

## Domain Model Sync Assessment

**Needs Sync: No（显式 No-op）**
- 理由：`frontend-ui` capability 在 `docs/baseline/domain_model.html` 已收录（`bc-shared → cap-ui`，Cross-Context）且状态"已落地"。本次仅细化 **C/B 顶部导航作用域契约**，属 `BC -> Capability` 既有映射的契约细化，**未新增/移除/改名 taxonomy，未改 BC 边界、Domain Event/Command/Policy、Aggregate/状态机**。据此 `docs/baseline/domain_model.html` **无需回流**。

## Open Questions

- 无阻断性开放问题。侧边栏账户中心可见性（Change A）、C/B 导航作用域（本变更）均已明确归属。

## 实现版本

- **Frontend（Vue）**：`ecommerce/ecommerce-mini-frontend/src/App.vue`
- **Node.js / Python**：无改动
