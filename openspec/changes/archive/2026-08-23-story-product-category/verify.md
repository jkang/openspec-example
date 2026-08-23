# Verify: 商品分类管理 (story-product-category)

> 验证证据文件。实施 (apply) 过程中及完成后记录 Gate 证据。每个证据项对应 `tasks.md` 中的验证项。

## 硬门禁 (Hard Gates)

| Gate | 命令 | 状态 | 证据 |
| --- | --- | --- | --- |
| 规格合规 | `openspec validate story-product-category` | ✅ PASS | `Change 'story-product-category' is valid` |
| Node 测试 | `./init.sh test:all` (Node 部分) | ✅ PASS | 47 passed, 0 failed (新增 12 用例：分类 CRUD/唯一性/软删除/过滤) |
| Python 测试 | `./init.sh test:all` (Python 部分) | ✅ PASS | 12 passed, 0 failed |
| 前端构建 | `./init.sh vue:start` | ✅ PASS | Vite ready, `npm run build` 通过 |

## 证据记录

### 后端接口契约（curl 冒烟，NODE_ENV=test）
- `GET /api/categories` → `['键鼠外设', '显示设备', '桌面收纳', '音频设备']`
- `GET /api/products?categoryId=cat-keyboard` → `['极简机械键盘', '无线办公鼠标']`
- 分类 CRUD 全流程、同名 409、删除后商品 categoryId 置空 → 由 integration.spec.js 覆盖

### 浏览器 E2E 闭环（FRONTEND.md 6.2/6.3）
- C 端首页分类筛选条渲染（全部/键鼠外设/显示设备/桌面收纳/音频设备）；点击「键鼠外设」→ 商品仅显示 2 件
- B 端「分类管理」tab：4 行分类（含商品数统计），新增「数码配件」成功
- 删除「音频设备」分类 → 从列表移除；后端集成测试验证关联商品 categoryId 置空
- DOM 自检：`border-radius=0`、`box-shadow=none`、zh-CN、真实数据

### 说明
- E2E Cucumber（`./init.sh e2e:run`）未纳入本次硬门禁；浏览器视觉闭环已通过 FRONTEND.md 6.2/6.3 亲自验证。
- 基线回流（task 7：service_blueprint / domain_model）属 `/opsx:sync` 阶段。
