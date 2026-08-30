# Proposal: 修复 B 端用户管理入口可见性与角色表达（fix-admin-user-mgmt-visibility）

> 源起：用户反馈「运营后台账户中心下面没有用户管理功能」。经 lead 诊断，用户管理功能**代码早已实现并归档**（`openspec/changes/archive/2026-08-29-story-account-system-admin-users/`，verify 全 PASS），非功能缺失，而是**信息架构(IA)与角色可见性缺陷**：侧边栏恒渲染「账户中心」分组标题，其下唯一「用户管理」链接被 `v-if="isOperator"` 隐藏；顶部「运营专员: 王琳」为硬编码兜底，与真实登录角色脱节，造成「像是漏了功能」的错觉。
> 任务类型：Bug Fix（涉及 UI 变更）→ 直走交付侧 `/opsx:propose`，不经过需求漏斗。

## Why

当前 B 端运营后台的「账户中心」分组在顾客/未登录视角下**空悬**（分组标题在、链接不在），且顶部角色标签「运营专员: 王琳」为硬编码占位、与真实 `currentUser` 角色脱节。这让非运营身份进入后台时产生「用户管理功能丢失」的误判；同时因缺乏明确的权限引导，顾客账号无法理解为何看不到该入口。

## What Changes

- **侧边栏「账户中心」分组角色感知**：`账户中心`分组及其「用户管理」链接的可见性由**当前会话真实角色**决定（`isOperator`），非运营/未登录时**不再渲染空悬的分组标题**；运营登录时正常展示并可下钻。
- **顶部角色标签真实化**：删除硬编码 `'王琳'` 兜底，顶部「运营专员」展示真实 `currentUser.role === '运营' ? currentUser.nickname : '—'`（R-ADM-001 语义）。
- **非运营身份进入 B 端后台的权限引导**：当非运营持有会话进入运营后台时，对「账户中心/用户管理」区域给出明确的**无权限提示**（对齐既有 user-admin tab 的 `v-if="!isOperator"` 兜底面板语义），不再以「标题存在但链接消失」的隐性方式呈现。
- **不改变** `user-admin` API 与 R-ADM-002~007 的任何后端行为（列表/检索/详情/启停/门禁契约保持不变）。

### Out of Scope（本变更不实现）

- 顶部 header 的 C/B 入口信息架构重组（由独立 change `fix-nav-cb-entry` 承接）。
- 后端 `user-admin` 服务、路由、仓储层的任何行为改动。
- 新增角色（老板 / 客服）的扩展。

## Capabilities

### New Capabilities

- 无。

### Modified Capabilities

- **`user-admin`（修改）**：B 端用户管理入口与角色表达的前端契约细化。更新 `openspec/specs/user-admin/spec.md` 中 **R-ADM-001 权限门禁** 相关场景，扩展「入口可见性」的边界：新增非运营/未登录时「账户中心」分组不空悬 + 显式权限引导的场景（@e2e / @unit）；其余 R-ADM-002~007 需求与场景**不变**。

## Impacted Bounded Contexts

- **User Context（修改·仅前端入口契约）**：承载 `user-admin` capability 的 B 端入口可见性语义；后端行为不涉及，故不新增/移除 taxonomy。该能力在 `docs/baseline/domain_model.html` 已收录（`user-admin` 已落地），本次属**契约细化**，非新增 taxonomy，无需 Domain Model 批量回流（见 design.md Sync Assessment）。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-06 履约与完成` | 用户管理是订单履约后的**后台支撑活动**（B 端运营对用户生命周期的管控），入口可见性与角色表达为其前端呈现；不改变 L1/L2/L3 交易节点语义 |
| `L3-06` | 后台运营动作（用户管理）的入口可见性遵循「仅运营角色」规则，对齐既有 R-ADM-001 |

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-OPS-05` | 修改（前端呈现） | 运营后台支撑泳道中「用户管理」活动；本次仅修正其前端入口可见性（账户中心分组 + 角色标签），capability 分布与状态不变，属**前端呈现修正**，不触发 blueprint 回流 |

## Impact (影响面)

- **后端服务（Node.js）**：无改动。
- **前端 UI（Vue）**：`ecommerce/ecommerce-mini-frontend/src/App.vue` 的侧边栏「账户中心」分组可见性、顶部运营角色标签、非运营权限引导面板。
- **数据模型**：无。
- **跨域/同步**：无新增跨域。`user-admin` capability taxonomy 已落地，无 Domain Model 回流；Service Blueprint 无能力分布变化，**预判 sync 阶段为显式 No-op**（见 design.md Sync Assessment）。
- **测试影响**：新增/调整前端入口可见性场景；`user-admin` 规格 R-ADM-001 场景补强（@e2e「非运营进入后台账户中心不空悬/显示权限引导」）。
