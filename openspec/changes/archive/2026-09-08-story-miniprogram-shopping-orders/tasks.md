# Tasks: story-miniprogram-shopping-orders

> 关联 proposal/specs/design：见 `openspec/changes/story-miniprogram-shopping-orders/`
> 需求侧业务面：story.md（R-MO-001~006，已 HITL 确认）| 原型：`epics/epic-miniprogram-shopping/prototypes/miniprogram-shopping.html`（已确认）
> 实现版本标注：MP = 小程序原生工程（ecommerce/ecommerce-miniprogram，决策 B）｜E2E = 全局 e2e-tests（后端契约验证降级层）
> 依赖底座：browse/checkout Story（已归档——工程 + 页面 + `miniprogram_shopping.feature`）；6.1 会话底座

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：小程序买家订单追踪（我的订单列表 + 状态轨迹）——UI 为小程序原生工程（决策 B，验证降级）；后端契约 E2E 覆盖 API 语义。
- ① **smoke 主链路完整性**：smoke 覆盖 Web 核心交易；本 change 仅新增小程序页面 → 无影响。
- ② **新增功能覆盖**：`miniprogram_shopping.feature` orders 契约场景（我的订单归属 + B 端发货后状态推进）已在 browse Story 落齐并全绿（65 场景）。
- ③ **既有场景回归风险**：后端零改动 → 全量回归。
- **缺口落盘**：story 旅程 1 场景以契约 E2E 断言；UI 交互以 HTML 原型 HITL + 工程代码人工验证（决策 B）。

## 1. 我的订单页（MP）

- [x] 1.1 `pages/orders`：我的订单列表（订单号/状态徽标/商品摘要/金额，`GET /api/orders` 会话归属，时间倒序）
- [x] 1.2 展开详情：金额明细（总额/优惠券/折扣/实付）+ 状态轨迹步骤（待支付→已支付→已发货→已完成，当前高亮；已取消独立标注）
- [x] 1.3 未登录引导登录；C 端不展示渠道概念（Q3/R-MO-006）
- [x] 1.4 ZAPP 视觉自查（无圆角阴影/令牌/真实数据/空态）

## 2. 后端契约 E2E（orders 场景已在 browse Story 落齐）

- [x] 2.1 确认 `miniprogram_shopping.feature` 含 orders 契约场景（我的订单归属 + 发货后状态推进）
- [x] 2.2 运行 `./init.sh e2e:run`：全场景通过（65 场景，总数记录于 verify.md）

## 3. 验证与同步

- [x] 3.1 `openspec validate story-miniprogram-shopping-orders`（硬门禁）
- [x] 3.2 `./init.sh test:all`（Node 全绿——无后端改动；Python skip）+ 小程序工程静态检查（orders 页面齐备）
- [x] 3.3 按 apply 勾选 tasks；verify.md 记录
- [x] 3.4 Spec Sync（change 级）：frontend-ui 我的订单 UI 增量回流 `openspec/specs/`
- [x] 3.5 Archive + 更新 story-list.json（全部 done）→ Epic 收尾（归档 + Baseline Sync + Roadmap + 看板）
