# Tasks: story-miniprogram-shopping-checkout

> 关联 proposal/specs/design：见 `openspec/changes/story-miniprogram-shopping-checkout/`
> 需求侧业务面：story.md（R-MC-001~008，已 HITL 确认）| 原型：`epics/epic-miniprogram-shopping/prototypes/miniprogram-shopping.html`（已确认）
> 实现版本标注：MP = 小程序原生工程（ecommerce/ecommerce-miniprogram，决策 B）｜E2E = 全局 e2e-tests（后端契约验证降级层）
> 依赖底座：Story 1（已归档 2026-09-08：工程骨架 + index/detail + `miniprogram_shopping.feature`）；6.1 channel/会话底座

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：小程序买家成交（购物车 → 结算最优券 → 下单 channel=MINIPROGRAM → 模拟支付）——UI 为小程序原生工程（决策 B，验证降级）；后端契约 E2E 覆盖 API 语义。
- ① **smoke 主链路完整性**：smoke 覆盖 Web 核心交易；本 change 仅新增小程序页面（后端零改动）→ 无影响。
- ② **新增功能覆盖**：`miniprogram_shopping.feature` 追加 checkout 契约场景（checkout 场景已在 browse Story 落齐：最优券结算 channel / 模拟支付 / 售罄下单被拒——已 65 场景全绿）。
- ③ **既有场景回归风险**：后端零改动 → 全量回归。
- **缺口落盘**：story 旅程 1 场景以契约 E2E 断言；UI 交互以 HTML 原型 HITL + 工程代码人工验证（决策 B）。

## 1. 购物车页（MP）

- [x] 1.1 `pages/cart`：购物车读取（qty=0 探测语义，服务端无独立 GET /api/cart，对齐 Web fetchCart）→ 行渲染（占位/名称/单价/数量）→ 合计（件数/金额）
- [x] 1.2 数量 + / −（下限 1，− 在 1 禁用）与移除（复用购物车 API）
- [x] 1.3 未登录引导登录（体验登录）；已登录会话归属
- [x] 1.4 ZAPP 视觉自查（无圆角阴影/令牌/真实数据）

## 2. 结算 + 模拟支付页（MP）

- [x] 2.1 `pages/checkout`：购物车合计预览 → 提交订单（复用 /api/orders，后端自动最优券 + channel 会话继承 MINIPROGRAM，UI 不传渠道）
- [x] 2.2 待支付态：「模拟支付」→ /api/payments/{id} → PAID 成功态（订单号/金额 + 查看订单/继续购物入口）
- [x] 2.3 售罄/空购物车边界（下单 OUT_OF_STOCK / 空购物车不可提交）
- [x] 2.4 ZAPP 视觉自查

## 3. 后端契约 E2E（checkout 场景已在 browse Story 落齐）

- [x] 3.1 确认 `miniprogram_shopping.feature` 含 checkout 契约场景（最优券结算 channel=MINIPROGRAM / 模拟支付库存扣减 / 售罄下单被拒）
- [x] 3.2 运行 `./init.sh e2e:run`：全场景通过（65 + 后续 orders 增量，场景总数记录于 verify.md）

## 4. 验证与同步

- [x] 4.1 `openspec validate story-miniprogram-shopping-checkout`（硬门禁）
- [x] 4.2 `./init.sh test:all`（Node 全绿——无后端改动；Python skip）
- [x] 4.3 小程序工程静态检查（cart/checkout 页面文件齐备）
- [x] 4.4 按 apply 勾选 tasks；verify.md 记录
- [x] 4.5 Spec Sync（change 级）：frontend-ui 购物车/结算/支付 UI 增量回流 `openspec/specs/`
- [x] 4.6 Archive：`openspec archive story-miniprogram-shopping-checkout --yes --skip-specs`；更新 story-list.json
