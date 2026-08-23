## Why

Phase 2 的 Exit Criteria ② 要求「商品管理后台支持**增删改查**」。当前 `catalog-management` 仅具备「增（上架）+ 查（列表/搜索/排序/按 ID 查询）」，**缺失「改」与「删」**：后端 `CatalogService` 无 `updateProduct` / `deleteProduct`，`server.js` 无 `PUT/DELETE` 商品路由，前端「商品管理」仅为占位链接。这导致运营无法修改在售商品（价格/库存/图片）或下架失效商品，商品目录只能依赖种子/兜底数据，阻断阶段放行。本变更补齐商品 CRUD 闭环，让运营能真实维护目录。

## What Changes

- **商品修改（改）**：新增 `PUT/PATCH /api/products/:id`，支持编辑 `name`、`priceCents`、`stock`、`imageUrl`、`description`；校验 `priceCents > 0`、`stock >= 0`，价格修改不溯及历史订单（`actualPaidCents` 在支付确认后锁定）。
- **商品删除（删，软删除）**：新增 `DELETE /api/products/:id`，将商品标记为 `status = deleted`，**不做物理移除**；历史订单/购物车引用（商品快照）不受影响。
- **商品状态字段**：商品对象新增 `status`（`active` / `deleted`）；存量无 `status` 的数据默认视为 `active`。
- **列表/搜索过滤**：`GET /api/products`（含 name 过滤、sort 排序）默认只返回 `active` 商品；已删除项不展示在 C 端与后台列表。
- **B 端商品管理界面（前端）**：复用「运营后台」，新增**商品管理**页 = 商品列表 + 编辑表单 + 删除按钮（带确认），遵循极简 UI（slate 色系、无圆角/阴影、全中文、真实数据）。
- **范围说明**：
  - 仅 Node.js 主链路；Python 降级为观察，不新增 CRUD。
  - **不含**商品分类管理（Phase 2 In Scope 另一独立项，后续独立变更）、不含履约/退款。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `catalog-management`：新增 **商品修改** 与 **商品删除（软删除）** 需求，为商品引入 `status`（active/deleted）状态，并约定列表/搜索默认过滤已删除项、价格修改不溯及历史订单。位置沿用 `openspec/specs/catalog-management` 既有路径。

## Impacted Bounded Contexts

- **Catalog Context**（主影响）：治理 `catalog-management`，负责任商品元数据与库存管理事实。本变更在既有边界内扩展商品「改/删」行为，不改变 CRUD 之外的下单/扣减语义。
- 说明：本次变更商品对象新增状态字段，属于 Catalog 聚合内部属性扩展，**不跨 BC**，无新增边界映射。

无新增 taxonomy：`catalog-management` 复用 `domain_model.html` 既有映射（`bc-catalog → cap-catalog`，Governs 规则“Catalog 边界负责商品元数据与库存管理”）。

## Process Alignment

- `L1-01 触达与发现`：商品列表/搜索默认只返回 `active` 商品，保障 C 端可见性。
- `L1-02 评估与决策`：商品元数据（价格/库存）作为评估输入；后台改价/下架直接影响 C 端元数据。既有 `L1-02` 的语义覆盖。
- 说明：`business_process.html` 当前以 C 端交易主流程（L1-01~L1-06）为骨架，B 端商品维护是其**上游供给动作**，不新增独立价值段，仅供给既有节点；若后续运营流复杂化再评估下沉建模。

## Service Blueprint Alignment

- **主要阶段**：`SB-STAGE-01`（触达与发现）、`SB-STAGE-02`（选购与加购）——C 端消费商品数据。
- **影响节点**：
  - `SB-OPS-01` / `SB-OPS-02` / `SB-OPS-04`（**修改**）：运营泳道中「商品管理」活动从“仅创建/查询”扩展为“创建 / 查询 / **修改** / **删除（下架）**”，获得实际 UI 与 API 支撑。
  - `SB-BACKSTAGE-01` / `SB-BACKSTAGE-04` / `SB-BACKSTAGE-06`（**修改**）：后台支撑活动补充商品状态（active/deleted）维护与软删除持久化逻辑。
  - `SB-CUSTOMER-01`（**复用**）：C 端商品展示能力不变，仅依托过滤规则展示 `active` 商品。
- **布局口径**：复用既有 `catalog-management` capability 布局，**不新增阶段、泳道或 capability**；无新增 taxonomy。因运营泳道能力发生扩展，`/opsx:sync` 阶段预计需回流 `service_blueprint.html` 相关 `SB-OPS-*` / `SB-BACKSTAGE-*` 描述（详见 design 阶段的 Sync Assessment 精确判定）。

## Impact

- **后端（Node.js，主版本）**：`src/services/catalog.js` 新增 `updateProduct` / `deleteProduct`、列表默认过滤 `active`；`src/http/server.js` 新增 `PUT /api/products/:id` 与 `DELETE /api/products/:id`；`src/domain/types.js` / `logic.js` 补充 `status` 字段与校验（priceCents>0、stock>=0）；`data/products.json` 补充真实商品数据并落 `status`。落在既有 HTTP → Service → Domain → Repo 四层结构内。
- **前端（Vue）**：`App.vue` 的「运营后台」下扩展商品管理页（列表 + 编辑 + 删除确认）。
- **后端（Python，观察）**：不新增 CRUD（此次不满足双端对齐目标，后续如需再立项）。
- **基线同步**：`/opsx:sync` 预计需回流 `service_blueprint.html`（`SB-OPS-*`/`SB-BACKSTAGE-*` 商品管理能力扩展）；`domain_model.html` 评估是否记录商品 `status` 状态枚举。
- **后续流程**：本变更含 UI 变更，下一步执行 `/opsx:prototype` → `/opsx:Story` → `/opsx:spec-design`。
