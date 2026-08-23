## Why

Phase 2 In Scope「商品分类管理」尚未落地。当前商品无分类概念：C 端只能关键词搜索/价格排序，无法按品类浏览；B 端无法结构化组织商品目录。`frontend-ui` 主规格「实时商品搜索」已声明支持"名称和**分类**"过滤、`domain_model.html` 的 Product 聚合已预留 `categoryId`，但均无实现闭环。本变更补齐该空白项，使 C 端演进为"按品类浏览"，运营可分类管理商品，完成 Phase 2 In Scope 全落地。

## What Changes

- **分类实体**：新增 `Category { id, name, sortOrder, status: active|deleted }`（平铺单层，不做多级树）。
- **B 端分类管理**：运营后台新增「分类管理」入口 —— 分类列表（名称/排序/商品数/状态/操作）+ 新增/编辑表单 + 删除确认（软删除）。
- **商品挂分类**：Product 增加可选 `categoryId`；商品编辑表单增加「分类」下拉（可空 = 未分类）。
- **C 端分类筛选**：首页商品区顶部分类筛选条（「全部」+ active 分类），点击按 `categoryId` 过滤商品；与既有关键词搜索/价格排序组合。
- **删除语义**：分类软删除（`status=deleted`）；删除后该分类下商品 `categoryId` 置空（未分类），不影响可售。
- **范围说明**：
  - 仅 Node.js + Frontend；Python 观察（不实现）。
  - 不做多级分类树、分类图片/图标、批量移动商品。

## Capabilities

### New Capabilities

- 无

### Modified Capabilities

- `catalog-management`：新增 **分类管理（CRUD + 软删除）** 与 **商品挂分类（categoryId）** 需求；商品列表查询支持 `categoryId` 过滤参数。位置沿用 `openspec/specs/catalog-management` 既有路径。
- `frontend-ui`：新增 **B 端分类管理界面** 与 **C 端分类筛选条** 需求。位置沿用 `openspec/specs/frontend-ui` 既有路径。

## Impacted Bounded Contexts

- **Catalog Context**（主影响）：治理 `catalog-management`，负责任商品元数据与库存事实。分类是商品目录的组织维度，`domain_model.html` 的 Product 聚合已含 `categoryId`，本次将其落为显式实现，仍属 Catalog 边界内部扩展。
- 说明：不新增 BC 映射；分类不属于跨边界能力。

无新增 taxonomy：`catalog-management` 复用既有映射（`bc-catalog → cap-catalog`）；Product `categoryId` 已存在于 domain model Product 字段定义。

## Process Alignment

- `L1-01 触达与发现`：C 端新增按分类浏览/筛选入口，是发现商品的主要新路径。
- `L1-02 评估与决策`：商品元数据增加分类维度，作为买家决策输入之一。
- 说明：B 端分类维护为交易主流程的上游供给动作，不新增价值段，仅供给既有节点。

## Service Blueprint Alignment

- **主要阶段**：`SB-STAGE-01`（触达与发现）—— C 端分类浏览/筛选。
- **影响节点**：
  - `SB-CUSTOMER-01`（**修改**）：商品栅格/搜索交互增加「分类筛选条」，`catalog-management` 描述追加分类过滤。
  - `SB-OPS-01`（**修改**）：运营活动新增「分类管理（CRUD/软删除）与商品挂分类」。
  - `SB-BACKSTAGE-01`（**修改**）：后台活动补充 `/api/categories` 分类持久化接口与商品 `categoryId` 关联。
- **布局口径**：复用既有 `catalog-management` capability 布局，**不新增阶段、泳道或 capability**；无新增 taxonomy。因泳道能力变化，`/opsx:sync` 预计需回流 `service_blueprint.html`（详见 design 的 Sync Assessment）。

## Impact

- **后端（Node.js）**：新增 `CategoryService`（list/CRUD/软删除 + 删除清空关联）；`catalog.js` 支持 `categoryId` 过滤与校验；`server.js` 新增 `/api/categories` 路由；`data/categories.json` 新增 + `products.json` 补 `categoryId`。落在 HTTP → Service → Domain → Repo 四层。
- **前端（Vue）**：`App.vue` admin 新增「分类管理」tab；商品编辑加分类下拉；C 端加分类筛选条。
- **后端（Python）**：观察（不实现）。
- **基线同步**：`/opsx:sync` 预计需回流 `service_blueprint.html`（SB-OPS-01 / SB-BACKSTAGE-01 分类管理能力）与 `domain_model.html`（新增 Category 聚合 + Product categoryId 关联显式化）。
- **后续流程**：含 UI 变更，下一步 `/opsx:prototype` → `/opsx:Story` → `/opsx:spec-design`。
