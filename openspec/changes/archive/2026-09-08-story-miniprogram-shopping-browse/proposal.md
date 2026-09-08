# Proposal: 小程序商品发现（story-miniprogram-shopping-browse）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-miniprogram-shopping/stories/story-miniprogram-shopping-browse/story.md`（已 HITL 确认，用户授权全程自主，技术形态 B 已裁定）。
> Epic：`epic-miniprogram-shopping`（Phase 6 Epic 6.2 · P0，依赖链首）；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

6.1 交付了小程序渠道配置 / 微信授权登录 / channel 标识底座，但 C 端买家尚无法在微信内浏览选品。本变更交付 **小程序商品发现旅程**（首页真实 6 商品 / 关键词搜索 / 价格排序 / 分类筛选 / 商品详情 / 加入购物车），**后端 100% 复用**（既有 Catalog API），Web 与小程序同库实时一致。技术形态：**决策 B——独立小程序原生工程**（用户裁定）。

## What Changes (变更内容)

- **新建独立小程序原生工程**（如 `ecommerce/ecommerce-miniprogram/`，微信开发者工具可打开）：
  - 首页 `pages/index`：真实 6 商品卡片网格 + 关键词搜索 + 价格排序切换 + 分类 Tabs（全部/键鼠外设/显示设备/桌面收纳/音频设备）。
  - 详情页 `pages/detail`：商品占位图 + 名称 / 描述 / 价格（等价 `font-mono font-bold` primary）/ 库存状态（>10 成功 / ≤10 预警 / 0 accent「已售罄」）+ 「加入购物车」（售罄禁用）。
  - `wx.request` 指向仓库 Node 后端（开发环境 `http://localhost:3000`，复用 `GET /api/products`（搜索/排序/分类语义）、`GET /api/products/{id}`、`GET /api/categories`）。
  - ZAPP 暗黑令牌以 WXSS CSS 变量等价映射（小程序无 Tailwind）；真实中文数据。
- **加购动作**：详情页「加入购物车」→ 购物车 +1（会话 userId 归属，供 checkout Story 消费）。
- **后端契约 E2E（验证降级层，决策 B 关联）**：仓库无微信开发者工具/E2E 基建 → 小程序 UI 由既有 Playwright 栈的**后端契约 E2E** 验证（登录会话 + 商品 API 语义与 channel 继承链路），保证小程序工程消费的 API 契约可复现。

### Out of Scope（本 change 不实现）

- 购物车管理/结算/支付（checkout Story）；我的订单（orders Story）。
- C 端展示渠道概念；微信分享/转发（Q4）；收货地址（Q5）；B 端任何改动。

## Capabilities (系统能力)

### New Capabilities

- 无新增 taxonomy（本 Epic 后端零改动、纯前端旅程）。

### Modified Capabilities

- **`frontend-ui`（修改，横切支撑）**：`bc-shared → cap-ui`——小程序商品发现旅程 UI（首页/搜索/分类/详情/加购，独立小程序原生工程）。更新 `specs/frontend-ui/spec.md`（追加 Requirement）。

### 只读消费（不修改语义）

- `catalog-management` / `product-query`（商品/详情/分类 API）、`cart-management`（加购归属）、`user-session` / `wechat-auth`（会话/登录，6.1）。

## Impacted Bounded Contexts

- **`Shared / Cross`（修改）**：`frontend-ui` 小程序旅程 UI。
- **`Catalog Context` / `Cart Context` / `User Context`（只读消费）**：商品/加购/会话 API 与底座，语义零改动。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-01 触达与发现` | 小程序移动触点：浏览 / 搜索 / 分类 / 详情 |
| `L1-02 评估与决策` | 选品比较（价格/库存可见） |

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-01` | REUSE | 小程序触点（6.1 已标注），本 change 补浏览 UI |
| `SB-CUSTOMER-01` | MOD | 小程序首页/搜索/详情 UI（frontend-ui 增量） |
| `SB-BACKSTAGE-01` | REUSE | 商品/分类 API 消费（零改动） |

## Impact (影响面)

- **后端（Node.js / Python）**：**零改动**（100% 复用 C 端通用 API）。
- **前端 UI（小程序原生工程，决策 B）**：新增 `ecommerce/ecommerce-miniprogram/` 工程（app.js/json/wxss + pages/index、pages/detail）；`wx.request` → localhost:3000；ZAPP WXSS 变量；真实中文数据。
- **数据模型**：无变化。
- **跨域/同步**：小程序与 Web 同库同源 API；微信真机需合法域名（部署阶段，仓库演示用开发者工具「不校验合法域名」）。
- **测试影响**：后端契约 E2E（登录会话 + 商品 API 语义）；小程序 UI 人工/真机验证（决策 B 降级，见 verify.md）。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-miniprogram-shopping/stories/story-miniprogram-shopping-browse/story.md`
