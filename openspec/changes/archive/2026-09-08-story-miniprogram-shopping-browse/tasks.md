# Tasks: story-miniprogram-shopping-browse

> 关联 proposal/specs/design：见 `openspec/changes/story-miniprogram-shopping-browse/`
> 需求侧业务面：story.md（R-MB-001~008，已 HITL 确认）| 原型：`epics/epic-miniprogram-shopping/prototypes/miniprogram-shopping.html`（已确认）
> 实现版本标注：MP = 小程序原生工程（ecommerce/ecommerce-miniprogram，决策 B）｜E2E = 全局 e2e-tests（后端契约验证降级层）
> 依赖底座（6.1 已交付）：渠道配置 / wechat-auth 登录（sessionToken）/ 会话 channel / C 端通用 API（products/categories/cart）

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：小程序买家浏览选品（首页/搜索/分类/详情/加购）——本 change 的 UI 为小程序原生工程（决策 B，仓库无微信开发者工具可驱动）；**验证降级**：小程序工程消费的全部 API 契约以后端契约 E2E（fetch Node 3000）覆盖，UI 形态以已确认 HTML 原型 + 工程代码（开发者工具人工验证）交付。
- ① **smoke 主链路完整性**：`smoke.feature` 覆盖核心交易主链路；本 change 仅新增**小程序前端工程**（后端零改动、新增 E2E feature 为只读契约验证）→ 既有 smoke/44 场景不受影响。
- ② **新增功能覆盖**：新建 `e2e-tests/features/miniprogram_shopping.feature`（跨 3 Story 共享，本 change 落 browse 契约场景）：微信登录会话 + 商品 API 同源（6 商品真实数据）+ 搜索/分类语义 + 加购归属；checkout/orders Story 后续追加场景。
- ③ **既有场景回归风险**：后端零改动 → 全量回归必须保持（smoke / order_lifecycle / mvp_trading / miniprogram_* / account_* 等）。
- **缺口落盘**：story.md 旅程 1 场景 1/2（浏览搜索 + 售罄不可加购）以后端契约 E2E 断言（商品 API 售罄语义 + 加购拒绝）；小程序 UI 交互以 HTML 原型 HITL + 工程代码人工验证（决策 B 降级）。

## 1. 小程序工程骨架（MP，决策 B）

- [x] 1.1 `ecommerce/ecommerce-miniprogram/app.json`：全局配置（pages 注册、tabBar：首页/购物车/我的、window 暗黑导航）
- [x] 1.2 `app.js`（App 启动，读 storage 会话）；`app.wxss`（ZAPP 暗黑令牌 CSS 变量：--bg #08080E / --card #0F0F1C / --border #222238 / --primary #C8FF00 / --accent #FF2D6B / --muted-fg #6E6E9A / 无圆角阴影基线；等宽价格类）
- [x] 1.3 `project.config.json` + `sitemap.json`（微信开发者工具可打开；appid 占位 `touristappid` 注释）
- [x] 1.4 `utils/request.js`：wx.request 封装（baseURL http://localhost:3000、Authorization Bearer sessionToken 注入、错误码透传）
- [x] 1.5 `utils/auth.js`：微信登录（wx.login code → POST /api/auth/wechat/login）+ 体验登录（演示 dev code 走 mock 网关，真实微信 +X 注释）
- [x] 1.6 `utils/format.js`：金额（分 → ¥x.xx）

## 2. 首页 + 详情 + 加购页面（MP）

- [x] 2.1 `pages/index`（首页）：商品卡片网格（真实 6 商品，来自 GET /api/products）+ 搜索框（keyword）+ 价格排序切换（sort）+ 分类 Tabs（GET /api/categories 全部分类）
- [x] 2.2 `pages/detail`（详情）：GET /api/products/{id} → 占位图 + 名称/描述/价格（等宽 primary）/库存状态（有货/低库存/售罄 accent「已售罄」）+ 「加入购物车」（售罄禁用；wx:if 库存 >0）
- [x] 2.3 加购动作：POST /api/cart/items（Bearer 会话）；成功 toast + tabBar 购物车角标（本地会话状态）；未登录引导登录
- [x] 2.4 ZAPP 视觉自查（等价约束）：无圆角/无阴影/CSS 变量令牌/真实中文数据/无占位符

## 3. 后端契约 E2E（E2E，验证降级层）

- [x] 3.1 新建 `e2e-tests/features/miniprogram_shopping.feature`（本 change 落 browse 契约场景 2 个 @e2e + 1 @api）：
  - 微信登录会话后小程序商品 API 同源（6 商品/价格/库存与 Web 一致；搜索「键盘」过滤；分类「显示设备」过滤）
  - 售罄商品不可加购（stock=0 → OUT_OF_STOCK 语义；@api 断言）
  - 加购归属（微信登录会话加购 → 购物车跟 userId）
- [x] 3.2 新建 `e2e-tests/steps/miniprogram_shopping.js`（`miniprogramShopping_` 前缀）：微信登录（mock code）、商品 API 断言、加购/售罄断言
- [x] 3.3 运行 `./init.sh e2e:run`：新增场景通过，既有场景全部通过（场景总数记录于 verify.md）

## 4. 验证与同步

- [x] 4.1 运行 `openspec validate story-miniprogram-shopping-browse`（硬门禁）
- [x] 4.2 运行 `./init.sh test:all`（Node 全绿——本 change 无后端代码；Python skip）+ 小程序工程静态检查（app.json/pages 路径存在、wxss 令牌齐备）
- [x] 4.3 按 apply 流程逐项勾选 tasks.md；verify 证据写入 `verify.md`
- [x] 4.4 Spec Sync（change 级）：frontend-ui 小程序发现旅程增量回流 `openspec/specs/`；Baseline Sync 在 Epic 全部 Story 归档后统一执行<!-- ⏸ 由 lead 执行 -->
- [x] 4.5 Archive：`openspec archive story-miniprogram-shopping-browse --yes --skip-specs`；更新 story-list.json
