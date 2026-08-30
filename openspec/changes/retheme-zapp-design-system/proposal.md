# Proposal: 采用 ZAPP Design System（retheme-zapp-design-system）

> 类型：**Tech Debt / 跨切面前端重排**（含外部可见行为变化——整体视觉呈现）。直走交付侧（`/opsx:propose` 起）。**跳过 Prototype**，以已确认的 `docs/baseline/design-system/`（ZAPP）为视觉唯一事实来源。

## Why (背景原因)

电商前端当前采用"现代扁平 slate 极简"视觉（浅色 `slate-50` 背景 + `slate-900` 主色 + `border-slate-200`），与产品定位不符，且缺乏品牌一致性。已新增权威设计系统 **ZAPP（Memphis × Zine × Dark Premium 暗黑高端）** 于 `docs/baseline/design-system/`。本变更新旧设计系统替换：让**整个电商系统**（C 端店铺 + B 端运营后台）按 ZAPP 呈现，并使后续 Feature 均遵循 ZAPP（经 `docs/FRONTEND.md` + `openspec/config.yaml` `rules.prototype` + `skills/prod/prototype` + `skills/opsx/verify` 在阶段1已同步锚定为 ZAPP）。

## What Changes (变更内容)

- **ZAPP 设计令牌注入**：`ecommerce/ecommerce-mini-frontend/src/index.css` 以 `@theme inline` 注入 ZAPP 语义令牌（`bg-background #08080E`、`bg-card #0F0F1C`、`text-foreground #EFEFFA`、`text-muted-foreground #6E6E9A`、`border-border #222238`；`bg-primary #C8FF00`、`bg-accent #FF2D6B`、`bg-electric #3B6DFF`、`bg-warning #FF9A00`、`bg-success #00E5A0`）与三字体（Exo 2 / DM Sans / JetBrains Mono），并移除硬编码 hex 依赖。
- **`App.vue` 全量视觉重排**：将现有 `slate`/浅色/极简类名**整体映射**为 ZAPP 暗黑语义令牌：
  - 页面地面 `bg-white`/`bg-slate-50` → `bg-background`；面板/卡片 → `bg-card`。
  - 主文本 `text-slate-900` → `text-foreground`；次级 → `text-muted-foreground`。
  - 主色/CTA `bg-slate-900 text-white` → `bg-primary text-primary-foreground`（荧光绿）。
  - 促销/紧迫 → `bg-accent`；热门 → `bg-electric`；限定 → `bg-warning`；有货/成功 → `bg-success`。
  - 边框 `border-slate-200`/`border-slate-900` → `border-border`（hover 用 `hover:border-primary`）。
  - 标题加 `font-display font-black uppercase tracking-tight`；价格改为 `font-mono font-bold text-primary`；标签用 `font-mono uppercase tracking-widest text-muted-foreground`。
  - 保持 `rounded-none`/`rounded-sm`（禁大圆角）、无 `box-shadow`、无 `linear-gradient`。
- **C/B 双端视觉统一**：C 端店铺（商品网格/购物车/注册/登录/我的订单）与 B 端运营后台（销售看板/订单/商品/分类/优惠券/用户）全部按 ZAPP 呈现，色彩语义、字体、价格展示、徽章与导航激活态一致。
- **治理锚定**（阶段1已落地，本提案一并反映）：`docs/FRONTEND.md`、`openspec/config.yaml` `rules.prototype`、`skills/prod/prototype`、`skills/opsx/verify`、`skills/prod/product-vision` 均改为 ZAPP 语义令牌/暗黑规范；后续任何 Feature 原型/实现/验证自动遵循。

### Out of Scope（本变更不实现）

- **不改业务行为**：不改变任何后端能力、API 契约、状态机、数据模型（Node.js / Python 零改动）。
- **不改 baseline HTML 文档自身的排版"风格"**：`service_blueprint.html` / `domain_model.html` / `business_process.html` / `delivery_board.html` 的**页面排版（slate 渲染）**保持不变；仅当域模型/蓝图**内容**需要回流时在 design 的 Sync Assessment 中单独判定。
- **不新增功能**：不新增任何页面/交互，仅做视觉层重排。
- **不做 C 端品牌文案改版**：仅重构视觉令牌映射，不重写产品文案（保留真实中文数据）。

## Capabilities (系统能力)

### Modified Capabilities

- **`frontend-ui`（修改）**：将前端 UI 的视觉规范从"现代扁平 slate 极简"更新为 **ZAPP（Memphis × Zine × Dark Premium）暗黑高端**，覆盖 C/B 双端所有页面（商品卡片、导航、购物车、注册/登录、订单、运营后台各 tab）。更新 `openspec/specs/frontend-ui/spec.md`（同步 ZAPP 语义令牌/字体/价格/徽章/导航激活态）。
  - 无新增 taxonomy（`frontend-ui` 归属 `bc-shared` 已有，见 Domain Model）。

## Impacted Bounded Contexts

- **`bc-shared`（Shared / Cross，横切支撑）**：承载 `frontend-ui`（`cap-ui`）。`domain_model.html` 映射：`bc-shared → cap-ui`，规则"全局 UI 组件库与视觉规范"。本变更更新该规范的**内容**（slate → ZAPP），BC 边界与 capability 映射不变。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-01 商品发现` ～ `L1-06 履约与完成` | 视觉层贯穿 C 端全旅程（商品浏览、注册/登录、购物车、结算、订单），本变更仅改呈现，不改 L1 语义 |
| B 端 `L2` 运营各子流程 | 运营后台（订单/商品/分类/优惠券/用户/销售看板）统一 ZAPP 呈现 |

> 说明：本变更为**纯视觉层**改动，不修改既有的 L1/L2/L3 流程节点语义，只影响流程的 UI 呈现。

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-CUSTOMER-01` | 复用（视觉层） | C 端顾客活动（商品发现/浏览/结算）统一 ZAPP 呈现 |
| `SB-OPS-01` ～ `SB-OPS-06` | 复用（视觉层） | B 端运营活动（订单/商品/分类/优惠券/用户/看板）统一 ZAPP 呈现 |

> **Sync 预判**：本变更仅重排视觉层，**不改变** `SB-STAGE-*` / `SB-<LANE>-*` 的覆盖、capability 分布或能力状态；`frontend-ui` 作为横切支撑能力状态不变。故**服务蓝图显式 No-op**。详见 design.md `Service Blueprint Sync Assessment`。

## Impact (影响范围)

- **前端（Vue）**：`ecommerce/ecommerce-mini-frontend/src/index.css`（令牌注入）、`ecommerce/ecommerce-mini-frontend/src/App.vue`（全量类名重映射）。构建产物 `dist/` 随之重建。
- **依赖**：不新增第三方依赖（零新库）。三种 Google Fonts 通过 `@import` 引入。
- **治理**（阶段1已同步）：`docs/FRONTEND.md`、`openspec/config.yaml`、`.agents|.trae|.cursor/skills/{prod/prototype,opsx/verify,prod/product-vision}`、`AGENTS.md`。
- **测试**：功能性 E2E（`smoke`/`mvp_trading`/`sales_dashboard` 等）依赖文案与交互，不依赖颜色，视觉重排不破坏功能性 E2E；`verify` 的浏览器视觉自检已更新为 ZAPP 清单。
