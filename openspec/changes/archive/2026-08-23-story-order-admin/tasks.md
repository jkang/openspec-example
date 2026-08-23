# Tasks: B 端订单管理 (story-order-admin)

> 版本标注：`[Node]` / `[Python]` / `[Frontend]` / `[全部]`。测试入口统一使用 `./init.sh`。
> 实现范围：Node.js + Frontend；Python 观察。

## 1. Service 层：B 端订单列表查询

- [x] 1.1 `[Node]` 在 `order.js` 新增 `listAdmin({ status, keyword })`：状态过滤（白名单，非法忽略）+ 关键词搜索（订单号/用户 ID，包含匹配）
- [x] 1.2 `[Node]` Service 层测试（`@unit`）：全量/状态过滤/关键词搜索/组合过滤

## 2. HTTP 层

- [x] 2.1 `[Node]` `server.js` 新增 `GET /api/admin/orders`（status/keyword 参数）
- [x] 2.2 `[Node]` `server.js` 新增 `POST /api/admin/orders/:id/ship`（复用 markShipped）
- [x] 2.3 `[Node]` `server.js` 新增 `POST /api/admin/orders/:id/cancel`（复用 cancelOrder）
- [x] 2.4 `[全部]` API 集成测试（`@api`）：列表全量/过滤/搜索、发货成功/非法状态/404、取消成功/已支付拒绝

## 3. Frontend：B 端订单列表 tab

- [x] 3.1 `[Frontend]` `App.vue` admin `adminTab` 增加 `'order'`；左侧导航「订单列表」绑定切换并高亮
- [x] 3.2 `[Frontend]` 实现订单列表表格（订单号/用户/商品数/实付/状态/操作）+ 状态过滤条（含计数）+ 搜索框
- [x] 3.3 `[Frontend]` 实现订单详情展开（金额明细/优惠券/商品明细）+ 「发货」（仅 PAID）+「取消」（仅 PENDING_PAYMENT，带确认）
- [x] 3.4 `[Frontend]` 极简规范自检：无圆角/阴影/slate 色系/1px 边框/全中文/真实数据
- [x] 3.5 `[Frontend]` 浏览器验证（FRONTEND.md 6.2/6.3）：订单列表渲染 → 过滤/搜索 → 详情 → 发货 → 取消；DOM 无 border-radius/box-shadow

## 4. E2E 全链路验证

- [x] 4.1 `[全部]` 运行 `./init.sh test:all`，Node 与 Python 全量测试通过
- [x] 4.2 `[Frontend]` 浏览器闭环：C 端下单 → B 端订单列表可见 → 发货 → 状态更新
- [x] 4.3 `[全部]` 运行 `openspec validate --change story-order-admin` 确认规格合规
- [x] 4.4 `[全部]` 运行 `./init.sh e2e:run` 全链路 E2E 通过

## 5. 基线同步（归档前）

- [x] 5.1 `[全部]` 执行 `/opsx:sync` 回写 `service_blueprint.html`：`SB-OPS-04` 订单查看、`SB-OPS-06` 发货/取消、`SB-BACKSTAGE-04` admin 订单接口（依据 design.md Service Blueprint Sync Assessment）
- [x] 5.2 `[全部]` `domain_model.html`：显式 **no-op**（无领域语义变化，依据 design.md Domain Model Sync Assessment）
