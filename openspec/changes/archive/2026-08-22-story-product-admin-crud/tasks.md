# Tasks: B 端商品管理 CRUD 补齐（改/删）(story-product-admin-crud)

> 版本标注：`[Node]` / `[Python]` / `[Frontend]` / `[全部]`。测试入口统一使用 `./init.sh`。
> 实现范围：Node.js 主链路 + Frontend；Python 本次降级观察（不新增 CRUD）。

## 1. Domain 层：商品 status 与修改/删除校验

- [x] 1.1 `[Node]` 在 `ecommerce-mini/src/domain/types.js` 中扩展 Product 类型：新增可选 `status`（`active`/`deleted`），并为 `list`/`getProduct` 提供 `status ?? 'active'` 归一（JSDoc）
- [x] 1.2 `[Node]` 在 `ecommerce-mini/src/domain/logic.js` 中新增商品校验：`INVALID_PRICE`（priceCents ≤ 0）、`INVALID_STOCK`（stock < 0）、`PRODUCT_NOT_FOUND`（id 不存在或已 deleted）
- [x] 1.3 `[Node]` 编写领域单元测试（`@unit`）：status 归一、价格/库存越界校验、已删除商品视为不可修改/不可查询

## 2. Repository / 持久化层：真实商品数据与 status

- [x] 2.1 `[Node]` 在 `ecommerce-mini/data/products.json` 中填充真实商品数据（含 `status: "active"`），与前端兜底数据一致（极简机械键盘、无线办公鼠标等）
- [x] 2.2 `[Node]` 确认 `FileStore` 对 status 字段的读写透传（`set`/`saveAll` 序列化对象全字段，无需改动，验证即可）

## 3. Service 层：CatalogService 增加修改与删除

- [x] 3.1 `[Node]` 在 `ecommerce-mini/src/services/catalog.js` 中：
  - `list`/`getProduct` 默认只返回 `status !== 'deleted'` 的商品
  - 新增 `updateProduct(id, patch)`：局部更新（name/priceCents/stock/imageUrl/description），校验后持久化；返回更新后的商品
  - 新增 `deleteProduct(id)`：将商品 `status` 置为 `deleted` 并持久化（软删除）
- [x] 3.2 `[Node]` 为上述 Service 方法补充单元/集成测试（`@unit`/`@api`）：修改成功/非法被拒/不存在 404、删除后从列表消失/重复删除 404

## 4. HTTP 层：修改与删除路由

- [x] 4.1 `[Node]` 在 `ecommerce-mini/src/http/server.js` 中新增 `PUT /api/products/:id`（修改；校验失败返回 400 + INVALID_PRICE/INVALID_STOCK，不存在返回 404 + PRODUCT_NOT_FOUND）
- [x] 4.2 `[Node]` 在 `ecommerce-mini/src/http/server.js` 中新增 `DELETE /api/products/:id`（软删除；不存在或已删除返回 404 + PRODUCT_NOT_FOUND）
- [x] 4.3 `[Node]` 调整 `GET /api/products` 与 `GET /api/products/:id` 走 Service 过滤后的结果（仅 active）
- [x] 4.4 `[全部]` 为路由补充 API 测试（`@api`）：修改成功/各错误码、删除成功/404、列表不返回已删除

## 5. Frontend：B 端商品管理视图（对齐已确认原型）

- [x] 5.1 `[Frontend]` 在 `ecommerce-mini-frontend/src/App.vue` 的 admin 视图内新增商品管理入口/章节（左侧导航「商品管理」高亮，与「优惠券管理」并列切换）
- [x] 5.2 `[Frontend]` 实现商品列表表格：图片/名称/价格/库存/状态/操作，按 `active` 过滤
- [x] 5.3 `[Frontend]` 实现商品编辑表单：点击「编辑」回填，支持 name/priceCents/stock/imageUrl/description，内联校验（价格>0、库存>=0），保存后刷新列表
- [x] 5.4 `[Frontend]` 实现删除确认：点击「删除」展示确认区，确认后调用 DELETE 并从列表移除；取消则不变
- [x] 5.5 `[Frontend]` 严格遵循极简规范自检：无圆角 / 无阴影 / slate 色系 / 1px 实线边框 / 全中文 / 真实数据
- [x] 5.6 `[Frontend]` 用浏览器验证（FRONTEND.md 6.2/6.3 闭环）：进入商品管理 → 编辑商品 → 保存生效 → 删除商品 → 列表移除；确认 DOM 无 `border-radius`/`box-shadow`

## 6. E2E 全链路验证

- [x] 6.1 `[全部]` 运行 `./init.sh test:all`，确认 Node 与 Python 全量测试通过
- [x] 6.2 `[Frontend]` 运行 `./init.sh vue:start`，通过浏览器完成 B 端闭环：进入商品管理 → 编辑价格 → C 端首页同步更新 → 删除商品 → C 端消失
- [x] 6.3 `[Frontend]` 浏览器自检清单：DOM 无 `border-radius`/`box-shadow`、数据无占位符、单屏布局无卡片堆叠、全中文
- [x] 6.4 `[全部]` 运行 `openspec validate --change story-product-admin-crud` 确认变更规格合规

## 7. 基线同步（归档前）

- [x] 7.1 `[全部]` 执行 `/opsx:sync` 回写 `service_blueprint.html`：`SB-OPS-01/02/04` 补充“修改/删除（下架）”商品活动、`SB-BACKSTAGE-01/04/06` 补充商品 status 与软删除持久化（依据 design.md Service Blueprint Sync Assessment）
- [x] 7.2 `[全部]` 回写 `domain_model.html`：Product Aggregate 根实体补充 `status`（active/deleted）字段与上架/下架状态语义（依据 design.md Domain Model Sync Assessment）
