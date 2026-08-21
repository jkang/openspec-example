# Idea: C 端首页及全站 UI 英文文案中文化 (Bug Fix)

## 1. 澄清业务意图 (Clarify Business Intent)

**问题**：电商系统首页（C 端店铺视图）存在多处英文按钮/文案，违反硬性约束 `docs/FRONTEND.md` 第 4 节「UI 交互界面必须完全使用中文」及 `openspec/config.yaml` prototype 规则「交互界面：必须完全使用中文」。

**目标用户**：C 端买家（浏览/加购/结算）与 B 端运营专员（发券后台）。

**核心价值**：中文 UI 是「可视即价值」极简电商的基本体验底线，英文残留破坏产品一致性并造成认知负担。

**硬性限制**：
- UI 所有用户可见文案 MUST 为中文（FRONTEND.md 强制）。
- 仅允许保留技术类型/状态代码（如 `FLAT`、`PERCENTAGE`、`user_1003`、订单号）作为数据值展示，不作为按钮/标签文案。

## 2. Roadmap Alignment

- **状态**：对齐 Phase 2（运营闭环与营销增强）质量基线。
- **说明**：Phase 2 刚落地 B 端运营后台（`story-coupon-admin-panel` 已归档），其 UI 实现中混入英文状态文本（`{{ coupon.status }}`、`UNUSED`），与 frontend-ui 规范存在偏离。本次修复属于既有功能的合规性修正，不改变 Phase 2 范围（In Scope / Out of Scope 均不变）。

## 3. 业务设计思路 (Business Design Approach)

纯文案本地化，无交互逻辑与视觉布局变化。按「用户可见面」逐层清理：

```
┌─ index.html ──────────────┐
│  lang="en" → zh-CN        │
│  <title>Ecommerce Mini</title> → 中文标题
└───────────────────────────┘
┌─ App.vue C 端店铺首页 ────┐
│  BAG            → 购物车   │
│  ADD TO CART    → 加入购物车
│  Cart (n)       → 购物车 (n)
│  CLOSE          → 关闭     │
│  Empty          → 购物车为空
│  Del            → 删除     │
│  Complete Checkout → 确认结算
│  Processing...  → 处理中...
│  No Results Found → 删除(已有中文"未找到相关商品")
│  Minimal Store  → 品牌名(待确认)
└───────────────────────────┘
┌─ 结算成功弹窗 ────────────┐
│  SUCCESS → 下单成功        │
└───────────────────────────┘
┌─ B 端运营后台 ────────────┐
│  {{ coupon.status }} → 中文枚举映射
│  UNUSED → 未使用           │
└───────────────────────────┘
```

## 4. 任务类型与后续策略 (Task Type & Workflow Strategy)

- **任务类型**：**Bug Fix**
- **策略**：
  - 跳过 Prototype（纯文案替换，无需视觉原型；修复本身即 UI 变更，按 FRONTEND.md 走浏览器验证闭环）。
  - 更新 `specs/frontend-ui`：新增「UI 文案语言约束」Requirement（所有用户可见文案 SHALL 为中文）。
  - `design.md` 侧重根本原因分析 (RCA) 与修复方案。
  - `tasks.md` 含浏览器验证任务（`init.sh vue:start` + 快照核对）。
  - 后续 `verify.md` 检查点。

## 5. 需求拆分建议 (Requirement Splitting)

无需拆分。单文件（`App.vue` + `index.html`）文案替换，一个变更闭环即可覆盖。

## 6. 治理映射对齐 (Governance Mapping)

- **Impacted Bounded Contexts**: `bc-shared`（Shared / Cross）→ `cap-ui`（frontend-ui），Cross-Context（`domain_model.html` 映射表：共享极简 UI 视觉规范）。
- **Candidate Capabilities**: `frontend-ui`（既有横切支撑映射，无新增 taxonomy）。
- **Impacted Process Nodes**:
  - `L1-01 触达与发现`（首页浏览/搜索）、`L1-03 加购与准备`（购物车）、`L1-04 下单结算`（结算上下文）
  - `L2-02 加载结算上下文`、`L2-03 选择优惠方案`
- **Impacted Service Blueprint Nodes**:
  - `SB-STAGE-01 触达与发现`、`SB-STAGE-02 选购与加购`、`SB-STAGE-03 结算确认`、`SB-STAGE-06 成功回流`
  - `SB-CUSTOMER-01`（商品栅格与搜索交互）、`SB-CUSTOMER-02`（加购/购物车）、`SB-CUSTOMER-03`（结算/优惠券）、`SB-CUSTOMER-06`（成功反馈）
- **Potential Domain Model Sync Triggers**: 无（无领域对象/状态机/BC 映射变化）。
- **Potential Service Blueprint Sync Triggers**: 无（frontend-ui 能力已存在于 `SB-CUSTOMER-01`，职责不变）。
- **Preliminary Sync Assessment**: **No**（纯 UI 文案合规修正，基线无需回写）。

## 7. 架构影响分析 (Architectural Impact & Ideas)

- **前端 (Vue)**：仅 `ecommerce/ecommerce-mini-frontend/src/App.vue` 与 `index.html` 的文案替换。
  - C 端首页：`BAG`/`ADD TO CART`/`Cart`/`CLOSE`/`Empty`/`Del`/`Complete Checkout`/`Processing...`/`No Results Found`/`Minimal Store`。
  - 成功弹窗：`SUCCESS`。
  - B 端后台：`{{ coupon.status }}` 增加中文枚举映射（`UNUSED→未使用`、`USED→已使用`、`ACTIVE→生效中`、`EXPIRED→已过期`），`UNUSED` 静态文本改中文。
  - `index.html`：`lang="zh-CN"` + 中文 `<title>`。
- **后端 (Node.js / Python)**：无影响，接口契约与返回数据不变。
- **数据模型**：无变化。
- **风险点**：品牌名 `Minimal Store`（Logo 区）与类型代码括号标注（`满减券 (FLAT)`、`(ACTIVE)`）是否一并中文化，需用户确认口径。

## 8. 确认结论 (User Confirmation)

- [x] **修复范围**：全站中文化（首页 + 结算成功弹窗 + B 端运营后台状态列 + `index.html`）。
- [x] **品牌名**：`Minimal Store` 保留英文，视为品牌标识豁免，不纳入中文约束。
- [x] **类型/状态代码**：`(FLAT)`、`(PERCENTAGE)`、`(ACTIVE)` 等括号标注保留，便于与后端契约对齐；主体文案中文化。

**结论**：用户已确认口径。按 Bug Fix 流程创建变更并实施（跳过 Prototype，更新 `specs/frontend-ui`，走浏览器验证闭环）。
