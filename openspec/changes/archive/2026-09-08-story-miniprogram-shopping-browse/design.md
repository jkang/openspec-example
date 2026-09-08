# Design: story-miniprogram-shopping-browse

> 关联 proposal：`openspec/changes/story-miniprogram-shopping-browse/proposal.md`
> 关联需求侧：story.md（R-MB-001~008）/ 原型 `miniprogram-shopping.html`（Epic 整体，已确认）
> 关联 specs：`specs/frontend-ui/spec.md`（增量）
> 依赖底座：6.1 已交付（渠道配置 / wechat-auth 登录 / 会话 channel）；既有 C 端通用 API（products/categories/cart）+ Vue Web 前端

## Context (上下文)

本 change 交付 **小程序商品发现旅程**（决策 B：独立小程序原生工程）。工程骨架（app/wxss/request 基建 + 首页 + 详情 + 加购）在本 change 创建；checkout/orders Story 在其上增量加页。**后端 100% 复用**——本 Epic 唯一代码产物是小程序原生工程 + 后端契约 E2E。

**关键约束（决策 B 验证降级）**：仓库无微信开发者工具/E2E 基建 → ① 小程序 UI 以「可交互 HTML 原型（已 HITL 确认）+ 原生工程代码（微信开发者工具可打开/人工验证）」交付；② **后端契约 E2E**（既有 Playwright 栈，fetch Node 3000）覆盖小程序工程将消费的全部 API 语义与 channel 链路，保证契约可复现；③ 真机需微信合法域名（部署阶段，仓库演示用开发者工具「不校验合法域名」）。

**关键约束（工程运行）**：小程序「微信一键登录」在开发者工具中无真实 code；仓库演示统一以 `NODE_ENV=test` 启动后端（mock 网关可用，code_demo_* → openid_demo_*，6.1 Q6），小程序体验登录以 dev code 走通链路（utils/auth.js「体验登录」入口，标注演示用途）。

## Domain Boundary Impact (领域边界影响)

- **Shared / Cross（修改）**：`frontend-ui` 横切支撑扩展——小程序商品发现旅程 UI（首页/搜索/分类/详情/加购）。`bc-shared → cap-ui` 既有 Cross-Context 边，无新 taxonomy。
- **Catalog Context（只读消费）**：商品/分类 API（搜索/排序/分类语义，`Product.status`/`priceCents`/`stock` 权威字段）。
- **Cart Context（只读消费）**：加购归属（会话 userId，复用既有购物车 API）。
- **User Context（只读消费）**：会话/微信登录底座（6.1）。
- 无新 BC/capability/aggregate/字段。

## Process Delta (流程影响)

- 交易主流程（L1-01~L1-06）语义**零改动**；小程序提供既有流程的移动触点。
- L1-01 触达与发现（浏览/搜索/分类/详情）、L1-02 评估与决策（选品比较）在小程序端复用既有 API 渲染。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **Needs Sync: No**（本 change 级；Epic 级轻量 Sync——理由如下）
- 触发项（Epic 级轻量）：本 Epic 无领域结构变化；Epic 收尾 Baseline Sync 时对 `frontend-ui` 的 C 端小程序旅程 UI 语义做轻量标注（SB-CUSTOMER-01~06 capability-desc 补充小程序触点；非结构性变更）。单个 change 不触发回写。

## Domain Model Sync Assessment (领域模型同步评估)

- **Needs Sync: No**（本 change 级；Epic 级无触发——本 Epic 无新 BC/capability/aggregate/字段，Domain Model 无需 Sync；Epic 收尾仅确认 no-op）

## 关键设计决策

1. **工程形态（决策 B）**：新建 `ecommerce/ecommerce-miniprogram/` 原生小程序工程（微信开发者工具可打开）：
   - `app.js / app.json / app.wxss / project.config.json / sitemap.json`：全局导航（tabBar：首页/购物车/我的）、ZAPP 暗黑令牌以 `app.wxss` CSS 变量映射（`--bg:#08080E; --card:#0F0F1C; --primary:#C8FF00; ...` 等价语义令牌）、`page` 统一 `box-sizing`。
   - `utils/request.js`：`wx.request` 封装（baseURL `http://localhost:3000`，读取 storage 的 sessionToken 注入 `Authorization: Bearer`，统一错误码解析）。
   - `utils/auth.js`：微信登录封装（wx.login → code → `POST /api/auth/wechat/login`）；**体验登录**（演示模式以 dev code 走 mock 网关；真实微信能力 +X）。
   - `pages/index`（首页列表 + 搜索 + 排序 + 分类 Tabs）、`pages/detail`（详情 + 加购）。
2. **数据同源**：页面全部经 `wx.request` 调既有 API（`GET /api/products` 带 `keyword/sort/categoryId`、`GET /api/products/{id}`、`GET /api/categories`、加购 `POST /api/cart/items`）；无独立数据源（R-MB-008）。
3. **会话与归属**：加购需要登录会话（6.1 登录后 storage 存 sessionToken/user）；未登录访问购物车/我的引导登录。
4. **ZAPP 视觉（小程序等价）**：无 Tailwind → 以 CSS 变量 + 页面级 class 实现暗黑令牌/无圆角/无阴影/全中文；价格以等宽强调色。
5. **后端契约 E2E（决策 B 降级）**：新增 `e2e-tests/features/miniprogram_shopping.feature`——用既有 Playwright/fetch 基建全链路断言小程序工程将消费的契约（微信登录会话 → 商品 API 同源 → 加购归属 → 下单 channel=MINIPROGRAM → 支付 → 我的订单；本 change 先落「浏览/搜索/分类/详情/加购」契约场景，checkout/orders Story 追加）。

## 目录结构变更

```
ecommerce/ecommerce-miniprogram/            # [NEW] 独立小程序原生工程（决策 B）
├── app.js / app.json / app.wxss
├── project.config.json / sitemap.json
├── utils/request.js  utils/auth.js  utils/format.js
└── pages/index/  pages/detail/            # Story browse
    pages/cart/  pages/checkout/  pages/orders/   # Story checkout/orders（后续 change）
e2e-tests/features/miniprogram_shopping.feature   # [NEW] 后端契约 E2E（跨 3 Story 共享）
```
