# Verify: C 端订单状态展示 (story-order-customer)

> 验证证据文件。实施 (apply) 过程中及完成后记录 Gate 证据。

## 硬门禁 (Hard Gates)

| Gate | 命令 | 状态 | 证据 |
| --- | --- | --- | --- |
| 规格合规 | `openspec validate story-order-customer` | ✅ PASS | `Change 'story-order-customer' is valid` |
| Node 测试 | `./init.sh test:all` (Node 部分) | ✅ PASS | 65 passed, 0 failed（新增 5 用例：按用户查询/归属隔离/倒序） |
| Python 测试 | `./init.sh test:all` (Python 部分) | ✅ PASS | 12 passed, 0 failed |
| 前端构建 | `./init.sh vue:start` | ✅ PASS | Vite ready, `npm run build` 通过 |
| E2E 全链路 | `./init.sh e2e:run` | ✅ PASS | 10 scenarios / 46 steps 全绿（含 Phase 3 订单生命周期 4 场景） |

## 证据记录

### 后端接口契约（curl 冒烟，NODE_ENV=test）
- `GET /api/orders?userId=user_dev` → 返回该用户 1 个订单（PAID ¥269.10，含 createdAt）
- 无 userId → 400；无订单用户 → 空数组（integration 覆盖）
- 归属隔离 + 倒序 → integration.spec.js 覆盖

### 浏览器 E2E 闭环（FRONTEND.md 6.2/6.3）
- header「我的订单」入口 → 我的订单视图：订单行（订单号/状态「已支付」/实付）+ 详情展开（商品总额/券/折扣/实付 + 商品明细）+ 状态轨迹（待支付→已支付→已发货→已完成）
- B 端发货（PAID→SHIPPED）后，C 端重新进入我的订单 → 状态更新为「已发货」
- DOM 自检：无 border-radius / box-shadow、zh-CN、真实数据

### 说明
- `domain_model.html`：显式 **no-op**（无领域语义变化，见 design.md Domain Model Sync Assessment）。
- 基线回流（service_blueprint）已在 `/opsx:sync` 阶段完成；domain_model 显式 no-op。
