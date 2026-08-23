# Verify: B 端订单管理 (story-order-admin)

> 验证证据文件。实施 (apply) 过程中及完成后记录 Gate 证据。

## 硬门禁 (Hard Gates)

| Gate | 命令 | 状态 | 证据 |
| --- | --- | --- | --- |
| 规格合规 | `openspec validate story-order-admin` | ✅ PASS | `Change 'story-order-admin' is valid` |
| Node 测试 | `./init.sh test:all` (Node 部分) | ✅ PASS | 60 passed, 0 failed（新增 4 用例：admin 列表/发货/取消） |
| Python 测试 | `./init.sh test:all` (Python 部分) | ✅ PASS | 12 passed, 0 failed |
| 前端构建 | `./init.sh vue:start` | ✅ PASS | Vite ready, `npm run build` 通过 |
| E2E 全链路 | `./init.sh e2e:run` | ✅ PASS | 10 scenarios / 46 steps 全绿（含 Phase 3 订单生命周期 4 场景） |

## 证据记录

### 后端接口契约（curl 冒烟，NODE_ENV=test）
- `GET /api/admin/orders` → 返回 2 个订单（user_demo1 PENDING_PAYMENT / user_demo2 PAID）
- 状态过滤 `?status=PAID`、关键词搜索 → 由 integration.spec.js 覆盖
- `POST /api/admin/orders/:id/ship` → PAID→SHIPPED；非 PAID → `ORDER_STATUS_INVALID`
- `POST /api/admin/orders/:id/cancel` → PENDING→CANCELLED；已支付 → `ORDER_NOT_CANCELLABLE`

### 浏览器 E2E 闭环（FRONTEND.md 6.2/6.3）
- B 端「订单列表」tab：2 行订单渲染（订单号/用户/商品数/实付/状态/操作）
- 按钮显隐：待支付行「取消」、已支付行「发货」；「详情」展开订单详情（金额/券/商品明细）
- 发货：已支付 → 已发货（列表刷新）✅
- 取消：待支付 → 取消确认 → 已取消 ✅
- DOM 自检：无 border-radius / box-shadow、zh-CN、真实数据

### 说明
- `domain_model.html`：显式 **no-op**（无领域语义变化，见 design.md Domain Model Sync Assessment）。
- 基线回流（service_blueprint）已在 `/opsx:sync` 阶段完成；domain_model 显式 no-op。
