# Story: 会话保持

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 openspec-handoff 以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `account-system-03-session` | 优先级: P1 | 依赖: `account-system-02-login`
> 关联 Storymap: `epics/account-system/storymap.md`
> 关联 Idea: `epics/account-system/idea.md`
> 关联原型（Epic 整体）: `epics/account-system/prototypes/account-session.html`（待生成并经用户 HITL 确认）

## 用户场景 (User Scenario)

**目标用户（C 端）**：已登录、正在浏览/下单/查看订单的买家（如"张采购"）。

**使用动机**：希望登录一次后持续保持身份，刷新、切页、去支付都无需反复登录；同时期望"未登录时被明确告知并引导登录"。

**关键目标**：刷新页面不掉登录态；退出登录立即失效；未登录点击下单/「我的订单」被拦截并引导登录。

**B 端视角**：会话是 B 端感知"活跃用户"的窗口。后台无需配置会话，但会话绑定真实 `userId`，因此 B 端禁用账户（`DISABLED`）后，该用户已颁发的会话在下次鉴权时立即失效（拒绝访问）。这是 B 端生命周期控制对活跃会话的兜底。

## 范围 (Scope)

### In Scope
- 会话令牌下发与校验：登录成功下发 token，校验并返回当前用户。
- 刷新保持：刷新页面后当前用户身份仍可读取，登录态不丢失。
- 退出登录：使会话令牌立即失效，回到游客态。
- 未登录拦截：未登录点击「提交订单」/「我的订单」/「加购」触发登录引导，登录后自动返回原操作。
- 会话有效期：30 天，过期后视为未登录。
- 禁用账户会话失效：B 端 `DISABLED` 后，已颁发会话在鉴权时被拒。

### Out of Scope
- 跨设备多端会话同步。
- 记住密码 / 免密登录。
- 会话续期（sliding expiration）——本阶段固定 30 天。

## 原型参考 (Prototype Reference)

> ⚠️ UI 门禁：本 Story 涉及前端 UI（顶部用户区/登录引导弹窗），Epic 整体原型尚未生成（`/req:prototype` 未产出），故「交接状态」不勾选待开发交接。原型经用户 HITL 确认后补充链接。

- 原型链接：`epics/account-system/prototypes/account-session.html`（Epic 整体原型，待 `/req:prototype` 生成并经用户 HITL 确认后链接）
- 关键交互点：顶部用户区（昵称 + 退出登录）、刷新保持登录态、未登录点击下单弹登录引导、退出后回到游客态。
- UI 约束（`docs/FRONTEND.md`）：无圆角、无阴影、slate 色系、真实数据、全中文。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-SESS-001 | 登录成功下发会话令牌 | 登录校验通过 | 返回 `token`，有效期 30 天 | 文件/内存存储 |
| R-SESS-002 | 刷新保持登录态 | 任意页面加载校验当前用户 | token 有效 → 返回当前用户，登录态保持 | 刷新不掉登录态 |
| R-SESS-003 | 退出登录立即失效 | 顶部「退出登录」 | 删除/失效 token，回到游客态 | 退出即失效 |
| R-SESS-004 | 未登录下单被拦截 | 未登录点击「提交订单」 | 弹登录引导，登录成功返回下单 | 下单守卫 |
| R-SESS-005 | 未登录查看我的订单被拦截 | 未登录访问「我的订单」 | 弹登录引导 | 订单守卫 |
| R-SESS-006 | 会话过期视为未登录 | token 超过 30 天 | 视为未登录，触发登录引导 | 有效期兜底 |
| R-SESS-007 | 禁用账户会话失效 | 账户被 B 端置 `DISABLED` | 已颁发 token 鉴权时被拒，拒绝访问 | B 端负向兜底 |

## 验收标准 (E2E 用户旅程)

### 旅程 1：登录刷新保持 + 退出失效 (Ref: L1-03 加购与准备 | SB-STAGE-02, SB-CUSTOMER-02, SB-BACKSTAGE-02)
#### 场景：刷新页面登录态保持
- @e2e
- **GIVEN** 买家"张采购"已登录（token 有效期 30 天）
- **WHEN** 他在商品详情页（商品：MacBook Pro 14英寸）刷新页面
- **THEN** 页面加载后仍为登录态，返回当前用户 `buyer@trade-demo.com`，顶部保持昵称"张采购"，无需重新登录

### 旅程 2：未登录下单被拦截引导登录 (Ref: L1-04 下单结算 | SB-STAGE-04, SB-CUSTOMER-04, SB-BACKSTAGE-02)
#### 场景：未登录点击提交订单被拦截
- @e2e
- **GIVEN** 游客"李运营"未登录，购物车含 MacBook Pro 14英寸（数量 1）
- **WHEN** 他在结算页点击「提交订单」
- **THEN** 系统拦截下单并弹出登录引导；登录成功后自动返回结算页继续下单

### 旅程 3：退出登录后会话失效 (Ref: L1-06 履约与完成 | SB-STAGE-06, SB-CUSTOMER-06, SB-BACKSTAGE-02)
#### 场景：退出登录后会话失效
- @e2e
- **GIVEN** 买家"张采购"已登录，顶部显示昵称
- **WHEN** 他点击「退出登录」
- **THEN** 会话令牌立即失效，页面回到游客态；再次访问「我的订单」被引导登录

## 治理映射对齐 (Governance Mapping)

- **Source of Truth**: docs/baseline/domain_model.html
- **Bounded Context**: `account`（**新增 BC**，会话管理）；`cart`（Cart Context：Session 一致性，购物车归属与登录态绑定）；`order`（Order Context：下单守卫）；`shared`（`domain-model` / `frontend-ui`）。
- **Capability Taxonomy**: `user-session`（**新增**）；复用 `cart-management`、`order-management`、`frontend-ui`。
- **Related Process Nodes**: `L1-03 加购与准备`（会话身份前置）、`L1-04 下单结算`（未登录下单拦截）、`L1-06 履约与完成`（我的订单守卫）、`L2-02 加载结算上下文`（身份强校验）；会话为新增 L3 环节（基线补充，设计中）。
- **Related Service Blueprint Nodes**: `SB-STAGE-02`、`SB-CUSTOMER-02`（Session 一致性）、`SB-STAGE-04`、`SB-CUSTOMER-04`（下单拦截）、`SB-STAGE-06`、`SB-CUSTOMER-06`（未登录看我的订单拦截）、`SB-BACKSTAGE-02`（会话校验）。
- **Sync Assessment**: **Yes**（新增 `user-session` capability；Cart/Order 归属与会话守卫影响 service_blueprint 与 domain_model）。

## 交接状态 (Handoff Status)

<!--
UI 门禁：本 Story 涉及前端 UI（顶部用户区/登录引导弹窗），原型未生成并经用户 HITL 确认，禁止勾选「待开发交接」。
-->

- [ ] 待开发交接 (openspec-handoff)
- [ ] 已交接 (changeName: <change-name> 记录于 openspec/epic-<key>.story-list.json)
