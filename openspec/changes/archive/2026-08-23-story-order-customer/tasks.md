# Tasks: C 端订单状态展示 (story-order-customer)

> 版本标注：`[Node]` / `[Python]` / `[Frontend]` / `[全部]`。测试入口统一使用 `./init.sh`。
> 实现范围：Node.js + Frontend；Python 观察。

## 1. Service 层：按用户查询订单

- [x] 1.1 `[Node]` 在 `order.js` 新增 `listByUser(userId)`：按 userId 过滤，创建倒序（无 createdAt 兜底）
- [x] 1.2 `[Node]` `createOrder` 写入 `createdAt`（ISO 时间）
- [x] 1.3 `[Node]` Service 层测试（`@unit`）：归属隔离、倒序、无订单空数组

## 2. HTTP 层

- [x] 2.1 `[Node]` `server.js` 新增 `GET /api/orders` 分支（带 `userId` 查询参数时走 `listByUser`；否则回落到 `:id` 路由）
- [x] 2.2 `[全部]` API 集成测试（`@api`）：按用户查询、归属隔离、倒序、空数组

## 3. Frontend：C 端我的订单视图

- [x] 3.1 `[Frontend]` `App.vue` `viewMode` 增加 `'orders'`；header 增加「我的订单」按钮（切到 orders 并拉取我的订单）
- [x] 3.2 `[Frontend]` 实现订单列表（订单号/状态中文/实付/商品摘要）+ 详情展开（金额/券/商品明细）+ 状态轨迹（待支付→已支付→已发货→已完成，取消单独标注）
- [x] 3.3 `[Frontend]` 结算成功弹窗增加「查看订单」按钮 → 跳转 orders 视图
- [x] 3.4 `[Frontend]` 极简规范自检：无圆角/阴影/slate 色系/1px 边框/全中文/真实数据
- [x] 3.5 `[Frontend]` 浏览器验证（FRONTEND.md 6.2/6.3）：下单 → 支付 → 查看订单 → 我的订单显示已支付；B 端发货后 C 端显示已发货；DOM 无 border-radius/box-shadow

## 4. E2E 全链路验证

- [x] 4.1 `[全部]` 运行 `./init.sh test:all`，Node 与 Python 全量测试通过
- [x] 4.2 `[Frontend]` 浏览器闭环：C 端下单支付 → 我的订单可见 → B 端发货 → C 端刷新显示已发货
- [x] 4.3 `[全部]` 运行 `openspec validate --change story-order-customer` 确认规格合规
- [x] 4.4 `[全部]` 运行 `./init.sh e2e:run` 全链路 E2E 通过

## 5. 基线同步（归档前）

- [x] 5.1 `[全部]` 执行 `/opsx:sync` 回写 `service_blueprint.html`：`SB-CUSTOMER-06` 查看我的订单、`SB-BACKSTAGE-04` 按用户查询接口（依据 design.md Service Blueprint Sync Assessment）
- [x] 5.2 `[全部]` `domain_model.html`：显式 **no-op**（无领域语义变化，依据 design.md Domain Model Sync Assessment）
