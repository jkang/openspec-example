# Idea: 商品分类管理 (story-product-category)

## 1. 澄清业务意图 (Clarify Business Intent)

**问题**：Phase 2 In Scope「商品分类管理」尚未实现。当前商品无分类概念：`catalog-management` 不支持分类、C 端首页只有关键词搜索与价格排序、B 端商品管理无分类配置。`frontend-ui` 主规格「实时商品搜索」已声明"基于商品名称和**分类**的搜索过滤"，`domain_model.html` 的 Product 聚合已预留 `categoryId` 字段，但均无实现闭环。

**目标用户**：
- **B 端运营专员**：维护商品分类目录（新增/编辑/下架分类），并在商品编辑时给商品挂分类。
- **C 端买家**：按分类浏览/筛选商品，快速定位目标品类。

**核心价值**：补齐 Phase 2 In Scope 空白项；让 C 端从"全量商品列表"演进为"按品类浏览"，运营可结构化组织商品目录。

**硬性限制**：
- 极简 UI（无圆角/阴影/slate 色系/1px 边框/全中文/真实数据）。
- `priceCents` 财务格式不变。
- 分类属于 Catalog Context 治理（`domain_model.html` Product 已含 `categoryId`）。

## 2. Roadmap Alignment

- **状态**：**对齐 Phase 2（运营闭环与营销增强）** In Scope「商品分类管理」。
- **说明**：本变更是 Phase 2 最后一个 In Scope 功能项。完成后 Phase 2 In Scope 全部落地（优惠券闭环 ✅、文件/数据库持久化 ✅、商品分类管理 ✅），进入阶段收尾（Exit Criteria 验证、看板刷新）。

## 3. 业务设计思路 (Business Design Approach)

**平铺单层分类模型**（极简，不做多级树）：
```
Category: { id, name, sortOrder, status: active|deleted }
Product:  { ..., categoryId?: string | null }
```

- **B 端分类管理**：运营后台新增「分类管理」tab —— 分类列表（名称/排序/商品数/状态/操作）+ 新增/编辑表单 + 删除确认。
- **商品挂分类**：商品编辑表单增加「分类」下拉（可空 = 未分类）。
- **C 端分类筛选**：首页商品区顶部增加分类筛选条（「全部」+ 各 active 分类），点击按 `categoryId` 过滤商品；与既有关键词搜索/价格排序可组合。
- **删除语义**：分类删除采用软删除（`status=deleted`）；删除后该分类下商品 `categoryId` 置空（变为未分类，不影响可售）。

## 4. 任务类型与后续策略 (Task Type & Workflow Strategy)

- **任务类型**：**功能（Feature，Story）**，含 UI 变更。
- **策略**：
  - 走 `/opsx:prototype`（B 端分类管理 + C 端分类筛选原型）→ HITL → `/opsx:Story`。
  - 更新 `specs/catalog-management`（商品挂分类 + 分类 CRUD）与 `specs/frontend-ui`（分类管理界面 + C 端筛选条）。
  - Node.js + Frontend 实现；Python 观察。
  - `design.md` 含 Sync Assessment（大概率 Needs Sync：Product 增加 categoryId 关联 + 蓝图 OPS 泳道新增分类管理能力）。

## 5. 需求拆分建议 (Requirement Splitting)

单变更闭环即可：
- **B 端分类 CRUD**：`GET/POST/PUT/DELETE /api/categories`（软删除）
- **商品挂分类**：Product 增加 `categoryId`；商品编辑支持选择分类
- **C 端分类筛选**：`GET /api/categories`（active）+ 商品列表支持 `categoryId` 过滤
- **前端**：B 端分类管理页 + C 端分类筛选条 + 商品表单分类下拉

## 6. 治理映射对齐 (Governance Mapping)

- **Impacted Bounded Contexts**: `bc-catalog`（Catalog Context）
- **Candidate Capabilities**: `catalog-management`（**复用既有映射**，分类属商品目录管理能力扩展；`domain_model.html` Product 已含 `categoryId`，无新增 taxonomy）
- **Process Nodes**:
  - `L1-01 触达与发现`（C 端分类浏览/筛选）、`L1-02 评估与决策`（商品元数据含分类）
- **Service Blueprint Nodes**:
  - `SB-STAGE-01`（分类浏览入口）、`SB-CUSTOMER-01`（商品栅格 + 分类筛选条）
  - `SB-OPS-01`（运营商品/分类管理）、`SB-BACKSTAGE-01`（分类持久化接口）
- **Potential Domain Model Sync Triggers**: Product 聚合 `categoryId` 关联语义显式化；新增 Category 聚合 → 评估回写 `domain_model.html`（待 design 阶段精确判定）
- **Potential Service Blueprint Sync Triggers**: 运营泳道新增「分类管理」活动、C 端新增分类筛选能力 → 评估回写 `service_blueprint.html`
- **Preliminary Sync Assessment**: **大概率 Needs Sync: Yes**

## 7. 架构影响分析 (Architectural Impact & Ideas)

- **Node.js**：
  - `src/domain/types.js`：新增 `Category` typedef；Product 增加可选 `categoryId`。
  - `src/services/category.js`：新增 `CategoryService`（list/CRUD，软删除，删除时清空关联商品 categoryId）。
  - `src/services/catalog.js`：`list` 支持 `categoryId` 过滤参数；`addProduct`/`updateProduct` 校验 `categoryId` 存在性（或允许空）。
  - `src/http/server.js`：新增 `/api/categories` 路由；`GET /api/products` 支持 `categoryId` 参数。
  - `data/categories.json` + `data/products.json`（商品补 categoryId）。
- **前端 (Vue)**：`App.vue` admin 新增「分类管理」tab；商品编辑加分类下拉；C 端 store 加分类筛选条。
- **Python**：观察（不实现）。
- **风险点**：删除分类时关联商品处理（置空即可，不阻塞）；存量商品无分类（视为未分类，兼容）。

## 8. 确认结论 (User Confirmation)

用户已授权 lead 按推荐决策 HITL 点。本变更采用以下推荐决策（记录于此，无需逐项确认）：

- [x] **分类模型**：平铺单层（不做多级树），`Category { id, name, sortOrder, status }`。
- [x] **B 端**：运营后台新增「分类管理」tab（列表 + 新增/编辑 + 删除确认）；商品编辑增加分类下拉（可空）。
- [x] **C 端**：首页商品区顶部分类筛选条（「全部」+ active 分类），与搜索/排序组合。
- [x] **删除语义**：分类软删除；删除后该分类商品 `categoryId` 置空，不影响可售。
- [x] **实现版本**：Node.js + Frontend；Python 观察。
- [x] **无分类兼容**：存量商品无分类视为「未分类」，正常展示在「全部」。

**结论**：按功能（Story）流程创建变更并推进（Prototype → Story → Spec-Design → Apply → Verify → Sync → Archive）。
