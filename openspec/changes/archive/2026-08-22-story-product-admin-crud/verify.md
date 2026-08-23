# Verify: B 端商品管理 CRUD 补齐（改/删）(story-product-admin-crud)

> 验证证据文件。实施 (apply) 过程中及完成后记录 Gate 证据。每个证据项对应 `tasks.md` 中的验证项。

## 硬门禁 (Hard Gates)

| Gate | 命令 | 状态 | 证据 |
| --- | --- | --- | --- |
| 规格合规 | `openspec validate story-product-admin-crud` | ✅ PASS | `Change 'story-product-admin-crud' is valid` |
| Node 测试 | `./init.sh test:all` (Node 部分) | ✅ PASS | 35 passed, 0 failed (新增 12 用例：status 归一/改/删/校验) |
| Python 测试 | `./init.sh test:all` (Python 部分) | ✅ PASS | 12 passed, 0 failed |
| 前端构建 | `./init.sh vue:start` | ✅ PASS | Vite ready, `npm run build` 通过 (dist 生成) |

## 证据记录

### 后端接口契约（curl 冒烟，NODE_ENV=test）
- `GET /api/products` → 返回 5 个 active 商品（已删除的 4 号收纳架不在其中）；键盘 priceCents=25900（改价生效）
- `GET /api/products/4` → 404（已删除视为不存在）
- `PUT /api/products/1 {priceCents:0}` → 400 `INVALID_PRICE`
- `PUT /api/products/nope {priceCents:100}` → 404 `PRODUCT_NOT_FOUND`
- `DELETE /api/products/4`（再删已删除）→ 404 `PRODUCT_NOT_FOUND`

### 浏览器 E2E 闭环（FRONTEND.md 6.2/6.3，改 admin 视图验证）
- 进入「运营后台」→「商品管理」：6 行真实商品数据渲染，路径「交易管理 / 商品管理」
- 编辑「极简机械键盘」→ 表单回填（标题「编辑商品」、价格 299.00）→ 改价 ¥259.00 保存 → 列表更新为 ¥259.00
- 删除「桌面收纳架」→ 确认区文案「该商品将从 C 端商店与列表中移除，历史订单不受影响」→ 确认后列表 6→5、商品移除、确认区关闭
- 切回「店铺」→ 收纳架消失、键盘价格 ¥259.00（C 端实时同步改价/下架）
- DOM 自检：`border-radius=0`、`box-shadow=none`、无占位符、`lang=zh-CN`

### 说明
- E2E Cucumber（`./init.sh e2e:run`）未纳入本次硬门禁（需要浏览器依赖，单独在 sync/archive 阶段按需执行）。浏览器视觉闭环已通过 FRONTEND.md 6.2/6.3 亲自验证。
- 基线回流（task 7：service_blueprint / domain_model）属 `/opsx:sync` 阶段，未在 apply 完成。
