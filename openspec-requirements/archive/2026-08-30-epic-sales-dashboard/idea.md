# Idea: 销售报表看板 (Sales Dashboard)

> 关联 Epic: `epic-sales-dashboard`（来自 `docs/ROADMAP.md` Phase 5 Epic 5.1）
> 关联调研: `epics/epic-sales-dashboard/research.md`
> 产出后需用户确认（HITL）

## 1. 澄清业务意图 (Clarify Business Intent)

- **目标用户**：
  - **老板（决策者）**：首屏即见销售全貌与趋势，判断经营好坏。
  - **运营（选品/促销负责人）**：定位商品/分类销售表现，评估优惠券让利效果。
  - **财务（边缘只读）**：月底对账确认实付与让利口径一致。
- **核心业务价值**：把散落在订单数据中的经营信息转化为**一眼可读**的销售洞察，降低人工统计成本、支撑选品与促销决策（"可视即价值"）。
- **硬性业务限制**：
  - 口径：销售额 = `SUM(actualPaidCents)`；优惠让利 = `SUM(discountCents)`；两者**单列不混淆**（财务硬约束）。
  - 时间归属：按支付时间（`paidAt`）统计，PAID 及之后状态计入；`PENDING_PAYMENT` 与 `CANCELLED` 不计入销售。
  - 权限：看板仅 `role=运营` 或新增 `老板` 角色可访问；`客户 / 客服` 403。
  - 只读：看板为聚合只读，不产生写操作。
- **B 端视角**：
  - 后台怎么配置？—— 本 Epic 无配置项（时间维度在前端切换）；预警阈值配置属 Epic 5.2。
  - 生命周期如何？—— 看板数据随订单实时聚合，无独立生命周期。
  - 谁有权限？—— 扩展 R-ADM 权限门禁：`运营` 与新增 `老板` 角色可访问；老板为**只读看板视角**（无管理权限）。

## 2. To-Be Process (目标流程)

销售看板是**纯 B 端只读聚合**，不改变交易主流程（L1-01~L1-06 保持不变），在 L1-06「履约与完成」之后新增**经营分析支流**：

```
L1-06 履约与完成（交易闭环）
   │
   ▼
经营分析支流（本 Epic，只读）
   ├─ ① 老板/运营进入看板（role 门禁：运营/老板可入，客户/客服 403）
   ├─ ② 系统按时间维度聚合 Order（paidAt ∈ [起始, 结束]，status ∈ {PAID, SHIPPED, COMPLETED}）
   ├─ ③ 计算指标：销售额(actualPaidCents 汇总) / 订单量(计数) / 客单价(销售额÷订单量) / 优惠让利(discountCents 汇总)
   ├─ ④ 按商品、分类聚合排行（TOP10）
   └─ ⑤ 展示：指标卡 + 趋势 + 排行（C 端与既有交易流程完全无关）
```

- **与现状差异**：现状无任何销售统计视图，运营手动导 Excel 统计 → To-Be 系统实时聚合、一眼可见。
- **涉及角色**：老板（只读）、运营（只读）、财务（只读对账）。
- **流程节点引用**：交易主流程引用 L1-01~L1-06；本 Epic 挂接 L1-06 之后的经营分析支流，不作为 L1/L2 交易节点修改。

## 3. To-Be Journey (目标旅程)

### 旅程：老板的经营周复盘
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 登录进入 | 老板登录系统，进入「销售看板」 | 展示近7日销售总览 | 😐 期待 | B 端看板页 |
| 首屏速览 | 看指标卡：销售额/订单量/客单价/优惠让利 | 4 项指标 + 与上周期对比 | 🙂 快速获得全局感 | 指标卡 |
| 趋势判断 | 切换 今日/近7日/近30日 看销售趋势 | 趋势折线/柱状随维度刷新 | 🙂 判断涨跌 | 趋势图 |
| 定位问题 | 看商品/分类 TOP10 排行 | 排行列表（销量/销售额） | 🙂 定位热点与疲软 | 排行表 |
| 复盘促销 | 查看优惠让利 | 总让利 + 用券订单数 | 🙂 评估促销 ROI | 指标卡/明细 |

### 旅程：运营的选品决策
| 阶段 | 用户动作 | 系统反应 | 情绪 | 触点 |
| --- | --- | --- | --- | --- |
| 登录进入 | 运营进入「销售看板」 | 近7日总览 | 😐 | 看板页 |
| 商品分析 | 看商品 TOP10 排行 | 按销售额/销量排序商品 | 🙂 识别爆款/滞销 | 排行表 |
| 分类分析 | 切到分类维度 | 分类聚合销售额与占比 | 🙂 判断类目健康度 | 排行表 |
| 促销评估 | 查看优惠让利指标 | 让利金额 + 用券订单数 | 🙂 判断发券是否有效 | 指标卡 |

## 4. 产品设计思路 (Business Design Approach)

- **触发方式**：B 端后台导航新增「销售看板」入口（仅 `运营/老板` 角色可见）。
- **核心交互**：
  - 顶部时间切换：`今日 / 近7日 / 近30日`（默认近7日）。
  - 指标卡 ×4：销售额（主指标，大字号）、订单量、客单价、优惠让利（副指标）。
  - 趋势图：按所选时间维度绘制销售趋势（CSS/SVG，无第三方图表库）。
  - 排行：商品 TOP10（按销售额，含销量）、分类 TOP10（销售额 + 占比）。
- **价值提升**：首屏即价值——老板无需翻页即得经营全貌；运营无需手工统计即得选品依据。
- **口径透明**：UI 上标注「销售额=实付金额，优惠让利单列」，对齐财务口径。

## 5. 任务类型与后续策略 (Task Type & Workflow Strategy)

- [x] **Epic**（跨多能力、需拆分）：走需求侧漏斗 → 原型(Epic整体) → storymap 拆分 → Story → `/req:handoff`。
- [ ] Feature
- [ ] Bug Fix
- [ ] Tech Debt

确认的类型：**Epic**
后续策略说明：走需求侧完整漏斗；storymap 拆 2 个 Story（overview + ranking）。

**调研待澄清项定稿（本 Epic）**：
1. 订单量口径：**不计入 CANCELLED**（销售=成交，PAID/SHIPPED/COMPLETED）。
2. 「老板」角色：**新增 `role=老板`**，只读看板，无管理权限（最小权限）。
3. 时间默认值：**默认近7日**（趋势更有意义）。
4. 排行粒度：**全局商品 TOP10 + 全局分类 TOP10**，不做联动下钻（保持极简）。
5. 优惠维度：**总让利金额 + 用券订单数**，不按券类型拆解（简单有效）。

## 6. 候选 Capabilities (Candidate Capabilities)

参考 `docs/baseline/domain_model.html` 的 BC→Capability 映射：

- **新增 BC**: `data-insights`（数据洞察）— 标注"新增 taxonomy"，理由：销售分析是全新领域，从既有交易 BC 中独立出来，避免污染 Order BC 职责。
- **新增 Capability**:
  - `sales-dashboard`（**新增 taxonomy**）— 销售报表看板：指标聚合（销售额/订单量/客单价/优惠让利）、时间维度聚合、商品/分类排行。归属 `data-insights` BC。
- **修改 Capability**:
  - `user-admin`（User Context）— 增加 `role=老板` 角色支持与看板访问门禁（R-ADM 扩展）。
  - `order-management`（Order Context）— 提供只读聚合查询能力（按时间/状态过滤的订单集合），供 `sales-dashboard` 消费；不改变订单写入语义。
- **Impacted Bounded Contexts**: `data-insights`（**新增**）、`Order Context`（只读消费）、`User Context`（角色扩展）。

## 7. 分析制品索引 (Analysis Artifacts)

- OSM（目标-策略-度量）: `epics/epic-sales-dashboard/analysis/osm/` — ❌ 未生成（本 Epic 度量已含在 Exit Criteria，OSM 在 Epic 5.2 库存洞察中更必要）
- To-Be Process（L1/L2 + 痛点）: `epics/epic-sales-dashboard/analysis/process/` — ❌ 未生成（本 Epic 为纯只读支流，流程影响小）
- To-Be Journey（体验旅程）: `epics/epic-sales-dashboard/analysis/journey/` — ❌ 未生成（To-Be Journey 已在第 3 章结构化表达）
- 说明：分析制品均为可选；本 Epic 业务结构清晰，以 idea.md 内嵌的结构化表达为准，不额外生成 HTML 分析物。

## 8. 治理映射对齐 (Governance Mapping)

参考 `docs/baseline/business_process.html` 与 `docs/baseline/service_blueprint.html`：

- **Impacted Process Nodes**:
  - 消费（只读）：L1-05 支付确认、L1-06 履约与完成（订单数据来源）
  - 挂接（新支流）：L1-06 之后的经营分析支流（不作为交易节点修改）
- **Impacted Service Blueprint Nodes**:
  - SB-STAGE-06（成功回流 / B 端聚合回查）— 看板数据来源
  - SB-BACKSTAGE-06（后台核心活动）— 新增「销售数据聚合」后台活动
  - 新增看板属于 B 端支撑视角，不改变 SB-CUSTOMER-*（C 端旅程无变化）
- **Potential Domain Model Sync Triggers**: 新增 `data-insights` BC + `sales-dashboard` capability taxonomy；新增 ReadModel `Operator 销售看板`（复用既有 `Operator 库存看板` 模式）→ **Domain Model 需 Sync**
- **Potential Service Blueprint Sync Triggers**: SB-BACKSTAGE-06 新增「销售数据聚合」能力节点 → **Service Blueprint 需 Sync**
- **Preliminary Sync Assessment**: **Yes** — 新增 BC/capability taxonomy 与蓝图后台节点，Epic 归档后需 Baseline Sync。

## 9. 需求拆分建议 (Requirement Splitting)

- **Story 1 (P0)**: `story-sales-dashboard-overview` — 销售总览：4 指标卡 + 时间切换（今日/近7日/近30日）+ 趋势图。
- **Story 2 (P1)**: `story-sales-dashboard-ranking` — 商品 TOP10 / 分类 TOP10 排行。
- **依赖关系**：Story 2 依赖 Story 1 的看板框架（导航/时间切换/权限门禁基础设施）。
- **口径贯穿**：两个 Story 共用口径（销售额=actualPaidCents 汇总、不含 CANCELLED、按 paidAt 时间归属）。

## 10. 架构影响分析 (Architectural Impact & Ideas)

- **后端服务 (Node.js)**：
  - 新增只读聚合路由：`GET /api/admin/dashboard/sales?from=&to=&dimension=`（返回指标 + 趋势 + 排行）。
  - `order-management` service 增加聚合查询方法（按时间/状态过滤订单集合并汇总）；复用现有 repo（fileRepo/memoryRepo）。
  - `user-admin` 增加 `role=老板` 角色支持 + 看板权限门禁中间件（对齐 R-ADM-001）。
- **前端 UI (Vue)**：
  - App.vue 新增「销售看板」视图（运营/老板角色可见）。
  - 趋势图用 CSS/SVG 手写（零第三方图表库，遵循极简约束）。
- **数据模型变化**：无实体表新增；仅新增只读聚合查询（不改 Order/Product 写语义）。
- **跨域/同步问题**：无新增跨域；看板数据实时聚合自当前持久化存储。

## 11. 确认结论 (User Confirmation)

- 调研 5 个待澄清项已在第 5 章定稿（口径/角色/默认时间/粒度/优惠维度）。
- 方案：**纯 B 端只读看板**，新增 `data-insights` BC 与 `sales-dashboard` capability，2 个 Story 拆分。
- 涉及 UI → 下一步进入 **prototype（Epic 整体）**，产出可交互 HTML 原型待确认。
- [ ] 已与用户确认，可进入 prototype
