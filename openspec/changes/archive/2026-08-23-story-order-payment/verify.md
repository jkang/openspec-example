# Verify: 订单状态机与模拟支付 (story-order-payment)

> 验证证据文件。实施 (apply) 过程中及完成后记录 Gate 证据。

## 硬门禁 (Hard Gates)

| Gate | 命令 | 状态 | 证据 |
| --- | --- | --- | --- |
| 规格合规 | `openspec validate story-order-payment` | ✅ PASS | `Change 'story-order-payment' is valid` |
| Node 测试 | `./init.sh test:all` (Node 部分) | ✅ PASS | 56 passed, 0 failed（新增 10 用例：状态机/支付/取消/幂等） |
| Python 测试 | `./init.sh test:all` (Python 部分) | ✅ PASS | 12 passed, 0 failed |
| 前端构建 | `./init.sh vue:start` | ✅ PASS | Vite ready, `npm run build` 通过 |
| E2E 全链路 | `./init.sh e2e:run` | ✅ PASS | 6 scenarios / 25 steps 全绿 |

## 证据记录

### 后端接口契约（curl 冒烟，NODE_ENV=test）
- 下单：`POST /api/orders` → 订单 `PENDING_PAYMENT`，**库存保持 99（不扣减）**
- 支付：`POST /api/payments/:orderId` → 订单 `PAID`，**库存扣减 99 → 98**
- 重复支付 → `ORDER_ALREADY_PAID`（幂等，200）
- 支付不存在订单 → `ORDER_NOT_FOUND`（404）

### 浏览器 E2E 闭环（FRONTEND.md 6.2/6.3）
- 结算成功弹窗显示「订单状态 待支付」「实付金额」+「模拟支付」按钮
- 点击「模拟支付」→ 状态更新为「已支付」、显示「已支付成功，库存已扣减，等待商家发货」、支付按钮消失
- 实付金额正确（¥299 - ¥10 券 = ¥289.00）
- DOM 自检：无 border-radius / box-shadow、zh-CN、真实数据

### 说明
- 库存/券扣减时机已按用户确认语义修正：**下单不扣、支付成功后扣**（domain_model Policy 对齐）。
- 基线回流（task 6：domain_model / service_blueprint）属 `/opsx:sync` 阶段。
