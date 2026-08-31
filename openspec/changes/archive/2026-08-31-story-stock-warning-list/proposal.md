# Proposal: 低库存预警列表 + 阈值配置（story-stock-warning-list）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-stock-insight/stories/story-stock-warning-list/story.md`（已 HITL 确认，lead 授权全程自主）。
> Epic：`epic-stock-insight`（Phase 5 库存预警与补货建议 · P0）；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

运营与老板无法主动发现低库存风险：断货靠买家提醒、超卖靠赔付兜底，补货靠拍脑袋。本变更交付 **B 端库存预警列表 + 阈值配置**：`stock ≤ 阈值` 的商品自动入列（含 `stock=0` 已售罄状态与超卖风险标识），运营可按商品设置个性水位线（全局默认 10 件 + 商品级覆盖），配置即时生效落盘 `data/stock-config.json`。兑现"售罄前主动预警"（Phase 5 目标）。

## What Changes (变更内容)

- **导航与权限门禁**：B 端后台导航「经营分析」分组新增「库存预警」入口（与「销售看板」并列），仅 `role=运营 / 老板` 可见；客户/客服不可见；预警 API `客户/客服 → 403`、未登录 → 401。
- **预警列表 API（后端只读聚合）**：新增 `GET /api/admin/dashboard/stock`：
  - 入列判定：`stock ≤ 有效阈值`（有效阈值 = 商品级覆盖优先，否则全局默认 10 件）。
  - `stock=0` 以「已售罄」特殊状态入列（置顶、醒目）。
  - 超卖风险标识：预计售罸天数 < 7 天（到货周期）→ 琥珀 `--warning` Badge「超卖风险」（不纳入 PENDING_PAYMENT 占用）。
  - 排序：已售罄置顶 → 其余按预计售罸天数升序（无销量商品置底）。
  - 只读聚合：只读消费 `Product.stock` 与近7日订单销量，不产生写操作。
- **阈值配置 API（本 Epic 唯一写操作）**：
  - 全局默认阈值：`PUT /api/admin/stock-config`（默认 10 件）。
  - 商品级覆盖：`PUT /api/admin/products/{id}/stock-config`（覆盖优先于全局）。
  - 仅 `role=运营` 可写；`role=老板` 只读（无配置入口）。
  - 落盘 `data/stock-config.json`、写操作即时生效、长期有效；商品软删除后覆盖配置保留但不参与聚合。
- **库存预警前端（Vue）**：App.vue 新增「库存预警」视图（对齐已确认原型 `epics/epic-stock-insight/prototypes/stock-insight.html`）：预警列表（8 列：商品名/当前库存/预警阈值/近7日日均销量/预计售罸天数/超卖风险标识/建议补货量/状态）+「预警中 / 健康水位」Tabs + 阈值配置区（仅运营渲染）+ 已售罄/超卖风险 Badge；ZAPP 暗黑令牌、无圆角无阴影、真实中文数据。
- **补充 `user_1003`（role=老板）种子演示账号**（对齐 Epic 5.1 老板角色，补齐种子缺口，供 E2E 与演示）。

### Out of Scope（本 Story 不实现）

- 补货建议（预计售罸天数 / 建议补货量 /「无需补货」列）——归属 `story-stock-replenish-suggestion`（P1，依赖本 Story 底座）。
- C 端任何页面改动。
- PENDING_PAYMENT 未支付订单占用纳入超卖判定（P2 候选）。
- 品类差异化默认阈值、自动补货执行、安全库存/个性化到货周期（P2 候选）。

## Capabilities (系统能力)

### New Capabilities

- **`stock-insight`（新增 taxonomy）**：库存洞察——低库存预警聚合（`stock ≤ 阈值` 入列 + 已售罄状态 + 超卖风险标识）、阈值配置读写（全局默认 + 商品级覆盖，仅运营可写，即时生效落盘）。生成 `specs/stock-insight/spec.md`。
  - **理由（新增标注）**：`domain_model.html` 现有 BC→Capability 映射无库存洞察能力；归属 `data-insights` Bounded Context（与交易 BC 解耦，参照 `sales-dashboard` 先例）；ROADMAP Phase 5 Guardrails 明确 `sales-dashboard` / `stock-insight` 双 capability 命名预留；复用既有前瞻 ReadModel `Operator 库存看板`（运营查看销量与补货状态）。

### Modified Capabilities

- **`frontend-ui`（修改，横切支撑）**：`bc-shared → cap-ui`——B 端新增「库存预警」视图 + 阈值配置表单，复用 ZAPP 设计令牌（`--warning` #FF9A00 低库存警示色）。更新 `specs/frontend-ui/spec.md`。
- **`user-admin`（修改·轻量）**：User Context 补充 `user_1003`（role=老板）种子演示账号（角色体系不变）。更新 `specs/user-admin/spec.md`。

### 只读消费（不修改语义）

- `catalog-management`（Product.stock 库存事实来源）、`order-management`（近7日订单销量聚合来源，复用 `buildProductRanking` 底座）、`sales-dashboard`（同支流导航/数据底座复用）。

## Impacted Bounded Contexts

- **`data-insights`（扩展，需标注）**：新增 `stock-insight` capability taxonomy（`bc-data-insights → cap-stock-insight` Governs 边）。属**基线级新增**，Epic 归档后由 `/opsx:baseline/sync` 统一回流（本阶段预判不执行，见 design.md Sync Assessment）。
- **Shared / Cross（修改）**：`frontend-ui` 横切支撑扩展（库存预警视图）。
- **Catalog Context（只读消费）**：`Product.stock` 库存事实（不变量 `stock≥0` 不动）。
- **Order Context（只读消费）**：近7日订单销量聚合数据来源（不改订单行为）。
- **User Context（轻量）**：补充 `role=老板` 种子账号。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-05 支付确认` | 数据来源：PAID 订单（时间归属基于支付时间） |
| `L1-06 履约与完成` | 数据来源：SHIPPED/COMPLETED 订单 + 库存扣减事实（Product.stock） |
| `L1-07 经营分析（只读支流）` | **扩展**：在"销售看板"旁新增「库存洞察」平行支流（预警列表 + 阈值配置），不作为交易节点修改 |

> 说明：本变更为 **L1-07 经营分析只读支流扩展**，不修改既有 L1/L2/L3 交易节点语义。

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-06 成功回流` | 只读消费 | 预警数据来源（库存与订单聚合回查） |
| `SB-BACKSTAGE-01` | 只读消费 | `Product.stock` 库存事实来源（catalog-management） |
| `SB-BACKSTAGE-06` | 新增后台活动 | 新增「库存数据聚合」后台能力节点 + `stock-insight` 支撑节点（参照 sales-dashboard 支撑节点先例）；`SB-CUSTOMER-*` 无变化 |

## Impact (影响面)

- **后端服务（Node.js）**：新增 `GET /api/admin/dashboard/stock` 只读聚合路由 + `PUT /api/admin/stock-config` / `PUT /api/admin/products/{id}/stock-config` 配置写路由；新建 `stock-config` repo（JSON 文件持久化 `data/stock-config.json`，对齐既有 fileRepo/memoryRepo 模式）；复用 `requireRole('运营','老板')` 白名单中间件与 `resolveDashboardRange` / 销量聚合底座。
- **前端 UI（Vue）**：App.vue 新增「库存预警」视图（仅运营/老板角色渲染）；预警列表表格 + 阈值配置表单 + Badge；ZAPP 暗黑令牌、零第三方图表库、无圆角无阴影。
- **数据模型**：无实体/聚合变更；新增独立配置持久化文件 `stock-config.json`。
- **跨域/同步**：无新增跨域；阈值配置写入后即时生效，无缓存/同步负担。
- **测试影响**：新增 E2E 旅程（运营巡检预警列表 + 阈值配置即时生效 + 权限 403/401）；`user_1003` 种子账号用于老板视角验证。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-stock-insight/stories/story-stock-warning-list/story.md`
- idea.md：`openspec-requirements/epics/epic-stock-insight/idea.md`
- 原型：`openspec-requirements/epics/epic-stock-insight/prototypes/stock-insight.html`（已确认）
