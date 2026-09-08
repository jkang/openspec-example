# Tasks: story-miniprogram-order-channel

> 关联 proposal/specs/design：见 `openspec/changes/story-miniprogram-order-channel/`
> 需求侧业务面：story.md（R-ORDCH-001~005 + E2E 旅程 1/2/3，已 HITL 确认）| 原型：`epics/epic-miniprogram-channel/prototypes/miniprogram-channel-admin.html`（订单管理「渠道」列，已确认）
> 实现版本标注：Node.js = 后端（ecommerce/ecommerce-mini）｜Frontend = 前端（ecommerce/ecommerce-mini-frontend）｜E2E = 全局 e2e-tests
> 依赖底座（Story 1/2 已归档 2026-09-08）：`SessionRepo.create(userId, channel)`（会话 channel=MINIPROGRAM，Story 2）、`Order` 聚合既有状态机、`GET /api/admin/orders` 列表

## E2E 覆盖审查（spec-design 强制步骤）

- **受影响用户旅程**：MINIPROGRAM 会话下单 → `Order.channel=MINIPROGRAM`；WEB 会话下单 → WEB；B 端订单列表渠道标识展示；小程序订单发货/取消与网页单一致；客户端伪造 channel 传参不被信任。
- ① **smoke 主链路完整性**：`smoke.feature` 已覆盖注册→选购→加购→结算→支付→我的订单；本 change 在既有下单链路**增加 channel 字段**（服务端从会话解析），不改交易语义与既有断言 → smoke 无需改动（全量回归必须保持）。
- ② **新增功能覆盖**：本 change 新增 @e2e 场景 =「MINIPROGRAM 会话下单带渠道标识」「WEB 会话默认」「B 端列表渠道标识展示」「小程序订单发货一致」「存量兼容」「防伪造传参」→ **新建 `e2e-tests/features/miniprogram_order_channel.feature`**（独立 feature + steps 命名空间 `miniprogramOrderChannel_`），复用既有登录/下单基建。
- ③ **既有场景回归风险**：`Order` 增加 channel（默认 WEB）为向后兼容增量（既有测试构造订单不传 channel → WEB）；`POST /api/orders`/`/api/checkout` 行为不变（channel 仅为新字段）→ 全量回归（order_lifecycle / smoke / persistence / mvp_trading 等）必须保持通过。
- **缺口落盘**：story.md 旅程 1 场景 1/2（MINIPROGRAM + WEB 默认）需 @e2e（含 API 断言 channel）；旅程 3 防伪造场景以 @api 断言落盘；存量兼容场景以 @api 断言。

## 1. 后端：Order.channel 字段 + 会话来源继承（Node.js）

- [x] 1.1 `src/domain/types.js`：`Order` 增加 `channel` 字段（`'WEB'` | `'MINIPROGRAM'`，默认 WEB）
- [x] 1.2 `src/services/order.js`：`createOrder(userId, couponId = null, channel = 'WEB')` 写入订单 `channel`；`checkout(userId, couponId, channel)` 透传（缺省 WEB 存量兼容）
- [x] 1.3 `server.js`：`POST /api/orders` + `POST /api/checkout` 从会话解析来源——`sessionRepo.findByToken(token).channel || 'WEB'` 传入 service；**忽略客户端 body.channel（防伪造）**
- [x] 1.4 单元测试（`__tests__/orderChannel.spec.js` @unit）：createOrder 默认 channel=WEB；显式 channel=MINIPROGRAM 写入订单；状态机流转不改 channel
- [x] 1.5 API 测试（@api）：MINIPROGRAM 会话（微信登录）下单 → channel=MINIPROGRAM；WEB 会话下单 → WEB；请求体伪造 channel=MINIPROGRAM 被忽略（仍 WEB）；存量订单（直接 repo 构造无 channel）listAdmin 返回可视为 WEB
- [x] 1.6 运行 `./init.sh node:test` 全量 Node 测试全绿

## 2. 前端：订单列表「渠道」标识列（Frontend）

- [x] 2.1 App.vue 订单管理表 thead 增加「渠道」列（`colspan` 6 → 7）
- [x] 2.2 行渲染渠道徽标（对齐原型 `miniprogram-channel-admin.html`）：`o.channel === 'MINIPROGRAM'` → `border-electric text-electric`「小程序」；否则（WEB/缺省）→ `border-border text-muted-foreground`「网页」
- [x] 2.3 页眉或表头旁说明「渠道标识仅展示 · 不改变订单流程（Q7）」（可选）
- [x] 2.4 前端极简约束自查（ZAPP：无圆角阴影/语义令牌/真实中文数据）
- [x] 2.5 运行 `./init.sh vue:build` 前端构建通过

## 3. E2E 覆盖（新建 feature + 回归）

- [x] 3.1 新建 `e2e-tests/features/miniprogram_order_channel.feature`（4 个 @e2e + 2 @api 场景）：
  - MINIPROGRAM 会话下单带渠道标识（微信登录王倩 → 下单 → channel=MINIPROGRAM）
  - WEB 会话下单默认渠道（网页登录林晓明 → 下单 → channel=WEB）
  - B 端运营订单列表渠道标识展示（小程序单「小程序」/ 网页单「网页」）
  - 小程序订单发货与网页单一致（channel=MINIPROGRAM 待发货 → 发货 SHIPPED）
  - @api 防伪造：WEB 会话 + body.channel=MINIPROGRAM → 仍 WEB
  - @api 存量兼容：无 channel 订单 → listAdmin 展示 WEB 语义
- [x] 3.2 新建 `e2e-tests/steps/miniprogram_order_channel.js`（`miniprogramOrderChannel_` 前缀）：登录辅助（网页 + 微信 bind-openid 或直建）、下单、断言 channel、B 端列表断言
- [x] 3.3 运行 `./init.sh e2e:run`：新增场景通过，既有场景全部通过（场景总数记录于 verify.md）
- [x] 3.4 既有回归：order_lifecycle / smoke / persistence / mvp_trading / account_* / sales_dashboard / stock_warning / miniprogram_channel / miniprogram_wechat_login 全部通过

## 4. 验证与同步

- [x] 4.1 运行 `openspec validate story-miniprogram-order-channel`（硬门禁）
- [x] 4.2 运行 `./init.sh test:all`（Node 全绿；Python skip：本 change 仅 Node.js + 前端，Python 无改动）
- [x] 4.3 前端构建通过
- [x] 4.4 按 apply 流程逐项勾选 tasks.md；完成后 verify 证据写入 `verify.md`
- [x] 4.5 Spec Sync（change 级）：`order-management`（Order.channel 增量）+ `frontend-ui`（渠道标识列增量）回流 `openspec/specs/`；Baseline Sync 在 Epic 全部 Story 归档后统一执行（本 change 为末 Story，归档后提示执行 `/opsx:baseline/sync`）<!-- ⏸ 由 lead 执行 -->
- [x] 4.6 Archive：`openspec archive story-miniprogram-order-channel --yes --skip-specs`；更新 `epic-miniprogram-channel.story-list.json`（全部 done）→ 触发 Epic 收尾（需求侧归档 + Baseline Sync + Roadmap + 交付看板）
