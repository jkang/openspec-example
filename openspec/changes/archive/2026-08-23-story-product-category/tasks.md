# Tasks: 商品分类管理 (story-product-category)

> 版本标注：`[Node]` / `[Python]` / `[Frontend]` / `[全部]`。测试入口统一使用 `./init.sh`。
> 实现范围：Node.js 主链路 + Frontend；Python 观察（不实现）。

## 1. Domain 层：Category 实体与校验

- [x] 1.1 `[Node]` 在 `ecommerce-mini/src/domain/types.js` 中新增 `Category` typedef（id/name/sortOrder/status）；Product typedef 新增可选 `categoryId`
- [x] 1.2 `[Node]` 在 `ecommerce-mini/src/domain/logic.js` 中新增分类校验：`CATEGORY_NAME_EXISTS`（同名 active 分类）、`CATEGORY_NOT_FOUND`（id 不存在或已 deleted）、名称非空校验
- [x] 1.3 `[Node]` 编写领域单元测试（`@unit`）：分类唯一性、软删除、商品挂分类、删除清空关联

## 2. Repository / 持久化层

- [x] 2.1 `[Node]` 新增 `CategoryRepo`（MemoryRepo 模式：save/findAll/findById/delete）
- [x] 2.2 `[Node]` 新建 `ecommerce-mini/data/categories.json`（种子分类：键鼠外设/显示设备/桌面收纳/音频设备，含 status/sortOrder）
- [x] 2.3 `[Node]` 更新 `ecommerce-mini/data/products.json`：6 个商品补 `categoryId`

## 3. Service 层

- [x] 3.1 `[Node]` 新增 `ecommerce-mini/src/services/category.js`：`list`（active 按 sortOrder）、`create`（唯一性校验）、`update`、`delete`（软删除 + 清空商品 categoryId）
- [x] 3.2 `[Node]` 修改 `ecommerce-mini/src/services/catalog.js`：`list` 支持 `categoryId` 过滤参数（与 name/sort 组合）；`addProduct`/`updateProduct` 校验 categoryId 存在（可空）
- [x] 3.3 `[Node]` 补充 Service 层测试（`@unit`）：分类 CRUD、过滤组合、删除清空关联

## 4. HTTP 层

- [x] 4.1 `[Node]` 在 `ecommerce-mini/src/http/server.js` 新增 `GET/POST /api/categories`、`PUT/DELETE /api/categories/:id`（错误码 400/404/409）
- [x] 4.2 `[Node]` 调整 `GET /api/products` 支持 `categoryId` 查询参数
- [x] 4.3 `[Node]` 在 catch 增加 `CATEGORY_NAME_EXISTS` / `CATEGORY_NOT_FOUND` 错误映射
- [x] 4.4 `[全部]` 补充 API 测试（`@api`）：分类 CRUD 全流程、同名拒绝、删除后商品 categoryId 置空、商品列表按分类过滤

## 5. Frontend：分类管理 + C 端筛选

- [x] 5.1 `[Frontend]` `App.vue` admin 左侧导航新增「分类管理」入口（`adminTab` 增加 `'category'`），实现分类列表表格（排序/名称/商品数/状态/操作）
- [x] 5.2 `[Frontend]` 实现分类新增/编辑表单（名称 + 排序号，内联校验）+ 删除确认（提示该分类下商品数，确认后商品变未分类）
- [x] 5.3 `[Frontend]` 商品编辑表单增加「分类」下拉（active 分类 + 未分类），保存后刷新商品列表
- [x] 5.4 `[Frontend]` C 端 store 首页商品区顶部分类筛选条（「全部」+ active 分类），点击过滤商品；与关键词搜索/价格排序组合
- [x] 5.5 `[Frontend]` 严格遵循极简规范自检：无圆角/阴影/slate 色系/1px 边框/全中文/真实数据
- [x] 5.6 `[Frontend]` 浏览器验证（FRONTEND.md 6.2/6.3 闭环）：分类管理 CRUD → 商品挂分类 → C 端分类筛选；DOM 无 `border-radius`/`box-shadow`

## 6. E2E 全链路验证

- [x] 6.1 `[全部]` 运行 `./init.sh test:all`，Node 与 Python 全量测试通过
- [x] 6.2 `[Frontend]` 运行 `./init.sh vue:start`，浏览器完成闭环：后台新增分类 → 商品挂分类 → C 端筛选条出现并可过滤
- [x] 6.3 `[Frontend]` 浏览器自检清单：DOM 无 `border-radius`/`box-shadow`、数据无占位符、全中文、单屏无卡片堆叠
- [x] 6.4 `[全部]` 运行 `openspec validate --change story-product-category` 确认变更规格合规

## 7. 基线同步（归档前）

- [x] 7.1 `[全部]` 执行 `/opsx:sync` 回写 `service_blueprint.html`：`SB-OPS-01` 补充分类维护活动、`SB-BACKSTAGE-01` 补充 `/api/categories`、`SB-CUSTOMER-01` 补充分类筛选条（依据 design.md Service Blueprint Sync Assessment）
- [x] 7.2 `[全部]` 回写 `domain_model.html`：新增 `Category` Aggregate（id/name/sortOrder/status），Product `categoryId` 显式化为对 Category 的引用（依据 design.md Domain Model Sync Assessment）
