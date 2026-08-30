# Design: 修复 B 端用户管理入口可见性与角色表达（fix-admin-user-mgmt-visibility）

## Context

当前 B 端运营后台（`ecommerce/ecommerce-mini-frontend/src/App.vue`）的侧边栏**恒渲染**「账户中心」分组标题（第 418 行），其下唯一「用户管理」链接被 `v-if="isOperator"`（第 419 行）控制。由于运行实例登录态为 `role=客户`（或未登录），`isOperator=false` → 链接消失，但分组标题仍在 → 空悬分组。同时顶部「运营专员: 王琳」（第 59 行）为硬编码兜底 `(isOperator && currentUser?.nickname) || '王琳'`，与真实角色脱节。此为纯前端 UI 改动，驱动见 proposal.md · Why。

## 根本原因分析 (RCA)

**现象**：账户中心下看不到「用户管理」；顶部显示"运营专员: 王琳"。

1. **直接原因**：侧边栏分组标题无条件渲染（`<div class="mt-8 px-6 ...">账户中心</div>`），而该分组唯一可操作链接 `用户管理` 带 `v-if="isOperator"`。非运营会话下分组标题存在但内容为空。
2. **深层原因**：`isOperator = currentUser.value?.role === '运营'`（第 1903 行）；真实运行 `currentUser` 为 `role=客户`（持久化测试），故 `isOperator=false`。功能未丢，是**可见性由角色正确门禁 + 无空态兜底**的组合缺陷。
3. **误导原因**：`运营专员: {{ (isOperator && currentUser?.nickname) || '王琳' }}` 用硬编码 `'王琳'` 兜底，导致顾客/未登录进入后台也看到"运营专员: 王琳"，误以为已具备运营身份、功能却缺失。

**为何非后端 bug**：`GET /api/admin/users*` 系列接口（R-ADM-001~007）与 `AdminUserService` 均已实现并通过归档验证（`archive/2026-08-29-story-account-system-admin-users/`）。本次不触碰后端契约。

## Goals / Non-Goals

**Goals:**
- 「账户中心」分组可见性由真实角色决定，非运营/未登录会话下**不空悬**，显示"仅运营角色可见"引导。
- 顶部「运营专员」标签基于真实 `currentUser` 渲染（运营→昵称；非运营/未登录→`—`），彻底移除硬编码"王琳"。
- 运营角色登录后「账户中心/用户管理」入口完整可达（沿用既有 R-ADM-002~007 契约，不改功能）。

**Non-Goals:**
- 不改顶部 header 的 C/B 入口信息架构（独立 change `fix-nav-cb-entry` 承接）。
- 不改后端 `user-admin` API、服务、仓储层（R-ADM-002~007 保持不变）。
- 新增/扩展角色体系（老板/客服）。

## Decisions

### Decision 1: 账户中心分组按会话角色条件渲染（非运营不空悬）

- **选择**：将「账户中心」分组标题与其下内容**一起**纳入可见性条件。运营 → 渲染分组 + 用户管理链接；非运营/未登录 → 渲染分组 + "仅运营角色可见"引导（不空悬）。若完全隐藏分组，会使非运营无法感知该后台能力；保留引导能消除"漏功能"误判并给出操作指向，比纯隐藏更符合"可视即价值"。
- **替代方案**：非运营时不渲染整个分组（含标题）。→ 否决：会让非运营完全看不到账户中心存在，仍感困惑。
- **替代方案**：恒渲染分组 + 链接置灰。→ 部分采纳为引导态（a11y 与极简规范下以文本引导更清晰）。

### Decision 2: 顶部运营专员标签真实化

- **选择**：删除 `'王琳'` 硬编码兜底，改为 `运营专员: {{ (isOperator && currentUser?.nickname) || '—' }}`。对齐 R-ADM-001 的"角色表达与权限一致"。
- **替代方案**：保留兜底但不写死 → 无合理兜底值，用 `—` 表达"非运营/未登录"更为诚实。

### Decision 3: 复用既有 user-admin tab 的无权限兜底面板

- **选择**：非运营会话下即使强行进入 `adminTab === 'user'`，复用既有 `v-if="!isOperator"` 面板（第 783 行）展示"无权限/仅运营"文案，与侧边栏引导一致。
- **理由**：避免重复实现权限面板，保持用户管理视图的单一数据源。

## Risks / Trade-offs

- **[幽灵入口疑云]**：若分组引导文案不清 → 缓解：引导文案明确"仅运营角色可见"+（未登录时）"请先使用运营账号登录"。
- **[角色跳变闪烁]**：`currentUser` 从 localStorage 异步读取导致入口短暂闪烁 → 缓解：沿用现有 `ref(localStorage...)` 同步初始化（第 1081 行），首帧即确定 `isOperator`。
- **[回归**]**：`isOperator` 语义变更影响其它 `v-if="isOperator"` 分支 → 缓解：仅本 change 改动账户中心分组与角色标签两处；其余（如用户管理 tab 内部）保持不变。

## Migration Plan

- 纯前端改动，无数据迁移。改动后需重启 Vite（`./init.sh vue:start`）观察 `App.vue` 生效；无需回滚数据库。

## Service Blueprint Sync Assessment

**Needs Sync: No（显式 No-op）**
- 理由：本次仅修正 `SB-OPS-05`（运营后台支撑泳道·用户管理活动）的**前端入口呈现**（角色标签、分组可见性、权限引导），capability 分布（`user-admin`）与状态（已落地）**均无变化**；未新增/移除后台活动节点，未改变 `SB-STAGE-*` / `SB-<LANE>-*` 结构。据此 `docs/baseline/service_blueprint.html` **无需回流**。

## Domain Model Sync Assessment

**Needs Sync: No（显式 No-op）**
- 理由：`user-admin` capability 在 `docs/baseline/domain_model.html` 已收录且状态为"已落地"。本次仅细化**前端入口可见性契约**，属 `User Context -> Capability` 既有映射的契约细化，**未新增/移除/改名任何 taxonomy，未改 BC 边界、Domain Event/Command/Policy、Aggregate/状态机**。据此 `docs/baseline/domain_model.html` **无需回流**。

## Open Questions

- 无阻断性开放问题。后端 `user-admin` 契约、角色模型、C/B 导航重组均已明确归属独立变更。

## 实现版本

- **Frontend（Vue）**：`ecommerce/ecommerce-mini-frontend/src/App.vue`
- **Node.js / Python**：无改动
