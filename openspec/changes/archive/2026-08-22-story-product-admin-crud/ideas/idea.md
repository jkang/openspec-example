# Idea: B 端商品管理后台 CRUD 补齐（改/删）

## 1. 澄清业务意图 (Clarify Business Intent)

**问题**：Phase 2 的 Exit Criteria ② 要求「商品管理后台支持**增删改查**」。当前 `catalog-management` 能力仅覆盖「增（上架 `POST /api/products`）+ 查（列表/搜索/排序/按 ID 查询）」，**缺失「改（update）」与「删（delete）」**，后端 `CatalogService` 无对应方法、`server.js` 无 `PUT/DELETE` 路由，前端 App.vue 的「商品管理」仅为占位链接，无 CRUD 界面。

**目标用户**：B 端运营专员（系统管理员）。他们需要维护商品目录：修改价格/库存/图片、下架失效商品。

**核心价值**：补齐商品生命周期闭环，使运营能真实管理在售目录，而非依赖种子/兜底数据。

**硬性限制**：
- 所有数据模型保持 `priceCents` 格式（财务精确性，PRODUCT_SENSE 关键目标）。
- UI 必须遵循 `docs/FRONTEND.md` 极简约束（无圆角、无阴影、slate 色系、1px 边框、全中文）。
- 严禁空洞占位符，商品数据必须真实 (PRODUCT_SENSE 原则 3)。

## 2. Roadmap Alignment

- **状态**：**对齐 Phase 2（运营闭环与营销增强）**，直接支撑 **Exit Criteria ②**「商品管理后台支持增删改查」。
- **说明**：本变更仅补齐既有 `catalog-management` 能力的「改/删」缺口，不改变 Phase 2 的 In Scope / Out of Scope 边界。支付、分销、推荐算法仍为 Out of Scope。

## 3. 业务设计思路 (Business Design Approach)

**软删除（下架语义）状态机**：
```
┌────────┐      修改(改)       ┌────────┐
│ active ├──────────────────▶ │ active │
└───┬────┘                     └────▲───┘
    │ 删除(删/软删除)                │ 列表/搜索默认过滤 deleted
    ▼                                │
┌────────┐                            │
│deleted │────────────────────────────┘
└────────┘   (不再出现在 C 端列表)
```

- **删除 = 软删除**：给商品增加 `status` 字段（`active` / `deleted`）。「删除」动作将商品标记为 `deleted`，**历史订单/购物车引用不受影响**（订单保存商品快照）。
- **列表/搜索默认过滤**：`GET /api/products` 及搜索默认只返回 `active` 商品；已删除商品不展示在 C 端与后台列表（或后台列表单独标注）。
- **修改范围**：`name`、`priceCents`、`stock`、`imageUrl`、`description` 可编辑；校验 `priceCents > 0`、`stock >= 0`。
- **前端界面**：复用现有「运营后台」，新增**商品管理**页 = 商品列表 + 编辑表单 + 删除按钮（带确认）；极简 UI。

## 4. 任务类型与后续策略 (Task Type & Workflow Strategy)

- **任务类型**：**功能（Feature，Story）**，含 UI 变更。
- **策略**：
  - 必须走 `/opsx:prototype` 生成 B 端商品管理交互原型，经 HITL 确认后进入 `/opsx:Story` 业务评审。
  - 涉及 `specs` 更新：在 `catalog-management` 中新增「商品修改」「商品删除（软删除）」Requirement。
  - `design.md` 含状态机 / 软删除设计、Domain Model Sync Assessment（评估是否需新增商品状态枚举）。
  - `tasks.md` 覆盖 Node.js 后端 + 前端界面，含 `@unit` / `@api` 测试。

## 5. 需求拆分建议 (Requirement Splitting)

单变更闭环即可覆盖，无需再拆：
- **改**：`updateProduct(id, patch)` + `PUT/PATCH /api/products/:id`
- **删**：`deleteProduct(id)` + `DELETE /api/products/:id`（软删除）
- **前端**：商品管理 CRUD 界面

> 注：**商品分类管理**（Phase 2 In Scope 的另一独立项）与本次「商品 CRUD」解耦，建议作为后续独立变更推进，不混入本变更。

## 6. 治理映射对齐 (Governance Mapping)

- **Impacted Bounded Contexts**: `bc-catalog`（Catalog Context）
- **Candidate Capabilities**: `catalog-management`（**复用既有映射，无新增 taxonomy**；仅扩展能力）
- **Process Nodes**:
  - `L1-01 触达与发现`（商品数据支撑）、`L1-02 评估与决策`（商品元数据）
  - B 端商品运营配置归属运营侧 L2/L3 规则流（后台商品维护），以 `business_process.html` 实操核对为准
- **Service Blueprint Nodes**:
  - `SB-STAGE-01 触达与发现`、`SB-STAGE-02 选购与加购`（C 端消费商品数据）
  - 新增 B 端商品管理能力挂载于运营泳道 `SB-OPS-*`（后台配置），以 `service_blueprint.html` 实操核对为准
- **Potential Domain Model Sync Triggers**: 商品新增 `status` 状态字段（`active/deleted`），属于对象属性/状态机变化 → 评估是否需回写 `domain_model.html`（待 spec-design 阶段 Sync Assessment 判定）
- **Potential Service Blueprint Sync Triggers**: 运营泳道 `SB-OPS-*` 新增「商品管理」capability → 评估是否需回写 `service_blueprint.html`（待 spec-design 阶段 Sync Assessment 判定）
- **Preliminary Sync Assessment**: **待 spec-design 阶段判定**（大概率需 Sync，因泳道能力与状态字段发生变化）

## 7. 架构影响分析 (Architectural Impact & Ideas)

- **Node.js（主实现，本次全量落地）**：
  - `src/services/catalog.js`：新增 `updateProduct(id, patch)` 与 `deleteProduct(id)`（软删除置 `status: deleted`）；`list`/`getProduct` 默认只返回 `active`。
  - `src/http/server.js`：新增 `PUT /api/products/:id` 与 `DELETE /api/products/:id`；商品校验（`priceCents>0`、`stock>=0`）。
  - `src/domain/types.js` / `logic.js`：商品类型增加 `status` 字段与校验规则。
- **前端 (Vue)**：`App.vue` 的「运营后台」下扩展**商品管理**页：列表 + 编辑表单 + 删除确认；复用既有交互与 `API_BASE`。
- **Python（本次降级为观察）**：不新增 CRUD，保持现状（后续如需双端对齐再立项）。
- **数据**：`data/products.json` 补充真实商品数据（当前为空数组，App.vue 依赖硬编码兜底），落库以符合「真实数据」底线；商品增加 `status`。
- **风险点**：软删除后旧数据无 `status` 字段的兼容处理（默认视为 `active`）。

## 8. 确认结论 (User Confirmation)

用户已确认（按推荐默认方案）：

- [x] **删除语义**：软删除（下架语义），商品加 `status`（`active`/`deleted`），列表/搜索默认过滤已删除项，历史订单引用不受影响。
- [x] **修改字段范围**：`name`、`priceCents`、`stock`、`imageUrl`、`description`；校验 `priceCents > 0`、`stock >= 0`。
- [x] **界面形态**：复用现有「运营后台」，新增商品管理页（列表 + 编辑 + 删除确认），极简 UI。
- [x] **实现版本**：先只补 **Node.js 主链路**；Python 降级为观察。

**结论**：按功能（Story）流程创建变更并推进（Prototype → Story → Spec-Design → Apply → Verify → Sync → Archive）。
