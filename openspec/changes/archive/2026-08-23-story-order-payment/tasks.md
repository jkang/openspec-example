# Tasks: 订单状态机与模拟支付 (story-order-payment)

> 版本标注：`[Node]` / `[Python]` / `[Frontend]` / `[全部]`。测试入口统一使用 `./init.sh`。
> 实现范围：Node.js + Frontend；Python 观察。

## 1. Domain 层：状态机与错误码

- [x] 1.1 `[Node]` 在 `ecommerce-mini/src/domain/logic.js` 新增订单状态机迁移表（TRANSITIONS）：PENDING_PAYMENT→PAID / CANCELLED、PAID→SHIPPED、SHIPPED→COMPLETED；`assertTransition(from, to)` 非法迁移抛 `ORDER_STATUS_INVALID`
- [x] 1.2 `[Node]` 在 `types.js` 扩展 Order status 枚举：`"PENDING_PAYMENT" | "PAID" | "SHIPPED" | "COMPLETED" | "CANCELLED"`
- [x] 1.3 `[Node]` 领域单元测试（`@unit`）：合法/非法迁移、取消边界

## 2. Service 层：OrderService 语义修正 + PaymentService 新增

- [x] 2.1 `[Node]` 修改 `order.js` `createOrder`：**移除库存扣减与券核销**；仅校验库存、生成订单（含快照/金额/券绑定）、清空购物车
- [x] 2.2 `[Node]` 修改 `order.js`：新增 `cancelOrder(orderId)`（仅 PENDING_PAYMENT → CANCELLED，否则 `ORDER_NOT_CANCELLABLE`）、`markShipped(orderId)`、`markCompleted(orderId)`（走状态机校验）
- [x] 2.3 `[Node]` 新增 `ecommerce-mini/src/services/payment.js` `PaymentService.pay(orderId)`：校验订单 PENDING_PAYMENT（否则 `ORDER_ALREADY_PAID` 幂等）→ 二次校验库存（不足 `OUT_OF_STOCK`，订单保持）→ 扣库存 → 核销券 → 状态→PAID
- [x] 2.4 `[Node]` Service 层测试（`@unit`）：下单不扣库存、支付扣库存+核销券、支付幂等、支付库存不足、取消语义

## 3. HTTP 层

- [x] 3.1 `[Node]` `server.js` 新增 `POST /api/payments/:orderId` 路由（成功 200；404/409/400 错误映射）
- [x] 3.2 `[Node]` `server.js` catch 增加 `ORDER_STATUS_INVALID` / `ORDER_NOT_CANCELLABLE` / `ORDER_ALREADY_PAID` 错误映射
- [x] 3.3 `[全部]` API 集成测试（`@api`）：支付成功全链路、重复支付幂等、支付库存不足、下单后库存不变

## 4. Frontend：C 端模拟支付

- [x] 4.1 `[Frontend]` `App.vue` 结算成功弹窗在 PENDING_PAYMENT 状态显示「模拟支付」按钮（对齐 `order-payment.html` 原型）
- [x] 4.2 `[Frontend]` 支付成功刷新弹窗为「已支付成功，库存已扣减，等待商家发货」；失败/幂等显示对应提示
- [x] 4.3 `[Frontend]` 极简规范自检：无圆角/阴影/slate 色系/1px 边框/全中文/真实数据
- [x] 4.4 `[Frontend]` 浏览器验证（FRONTEND.md 6.2/6.3）：下单 → 弹窗待支付 → 模拟支付 → 已支付反馈；DOM 无 border-radius/box-shadow

## 5. E2E 全链路验证

- [x] 5.1 `[全部]` 运行 `./init.sh test:all`，Node 与 Python 全量测试通过
- [x] 5.2 `[Frontend]` 浏览器闭环：下单（库存不变）→ 支付（库存扣减、C 端状态已支付）
- [x] 5.3 `[全部]` 运行 `openspec validate --change story-order-payment` 确认规格合规
- [x] 5.4 `[全部]` 运行 `./init.sh e2e:run` 全链路 E2E 通过

## 6. 基线同步（归档前）

- [x] 6.1 `[全部]` 执行 `/opsx:sync` 回写 `domain_model.html`：Order 状态机扩展 + 「库存扣减时机」Policy 修正为 PaymentConfirmed 后 + 优惠券核销时机（依据 design.md Domain Model Sync Assessment）
- [x] 6.2 `[全部]` 回写 `service_blueprint.html`：`SB-BACKSTAGE-05` 支付能力落地、`SB-BACKSTAGE-04` 下单语义修正、`SB-CUSTOMER-05` C 端支付交互（依据 design.md Service Blueprint Sync Assessment）
