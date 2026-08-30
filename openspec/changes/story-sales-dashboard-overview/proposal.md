# Proposal: 销售总览（story-sales-dashboard-overview）

> 来源：需求侧 handoff（`/req:handoff`），业务评审依据：`openspec-requirements/epics/epic-sales-dashboard/stories/story-sales-dashboard-overview/story.md`（已 HITL 确认）。
> Epic：`epic-sales-dashboard`（Phase 5 销售报表看板）；本提案由需求侧 story.md + idea.md 合成，开发侧不重复探索/评审。

## Why (背景原因)

老板与运营无法快速掌握销售全貌：销售额/订单量/客单价/优惠让利靠手动统计 Excel，慢且易错；促销（优惠券）ROI 不可见。本变更新增 **B 端销售总览看板**（纯只读）：老板/运营登录后台首屏即见 4 项指标 + 今日/近7日/近30日时间切换 + 销售趋势，数据实时聚合自订单明细，兑现「可视即价值」，无需任何手动统计。

## What Changes (变更内容)

- **看板导航与权限门禁**：B 端后台导航新增「销售看板」入口（仅 `role=运营`/`role=老板` 可见）；新增 `role=老板`（只读看板视角，无管理权限）。
- **看板 API（后端只读聚合）**：新增 `GET /api/admin/dashboard/sales?from=&to=&dimension=`：
  - 4 指标：销售额（`SUM(actualPaidCents)`）、订单量、客单价（销售额÷订单量）、优惠让利（`SUM(discountCents)` 单列）。
  - 口径：仅统计 `status ∈ {PAID, SHIPPED, COMPLETED}`，按 `paidAt` 落入时间区间；CANCELLED / PENDING_PAYMENT 不计入。
  - 时间维度：今日 / 近7日（默认）/ 近30日。
  - 优惠券效果：让利总额 + 用券订单数 + 用券订单占比。
  - 趋势序列：按时间粒度（日）返回销售额序列。
- **看板前端（Vue）**：App.vue 新增「销售看板」视图（对齐已确认原型 `epics/epic-sales-dashboard/prototypes/sales-dashboard.html`）：4 指标卡 + 时间切换 + SVG 趋势图 + 优惠券效果区（零第三方图表库，slate 色系、无圆角阴影）。
- **口径标注**：UI 显示「销售额为实付金额（actualPaidCents），优惠让利单列，不含已取消订单」。

### Out of Scope（本 Story 不实现）

- 商品/分类排行（`story-sales-dashboard-ranking` 承接）。
- 库存预警与补货建议（Epic 5.2 `epic-stock-insight`）。
- 数据导出、自定义报表、回款看板（Phase 6）。
- C 端任何页面改动。

## Capabilities (系统能力)

### New Capabilities

- **`sales-dashboard`（新增 taxonomy）**：销售看板指标聚合与查询。生成 `specs/sales-dashboard/spec.md`。
  - **理由（新增标注）**：`domain_model.html` 现有 BC→Capability 映射无销售分析能力；销售看板归属新增 `data-insights` Bounded Context（与交易 BC 解耦），承载指标聚合（销售额/订单量/客单价/优惠让利）、时间维度聚合、趋势序列。

### Modified Capabilities

- **`user-admin`（修改）**：User Context 扩展 `role=老板` 角色 + 看板访问门禁（对齐 R-ADM 权限门禁模式）。更新 `specs/user-admin/spec.md`。
- **`order-management`（修改·只读扩展）**：Order Context 新增只读聚合查询方法（按时间/状态过滤订单集合并汇总），供 `sales-dashboard` 消费；**不改变订单写入语义**。更新 `specs/order-management/spec.md`。

## Impacted Bounded Contexts

- **`data-insights`（新增 BC，需标注）**：承载 `sales-dashboard` capability。`domain_model.html` 现无数据洞察 Bounded Context，本变更新增该边界，属**基线级新增**，Epic 归档后由 `/opsx:baseline/sync` 统一回流（本阶段预判不执行，见 design.md Sync Assessment）。
- **User Context（修改）**：`role=老板` 角色扩展。
- **Order Context（只读消费）**：提供聚合查询数据源，不改订单行为。

## Process Alignment (流程对齐)

| 流程节点 | 关联说明 |
| --- | --- |
| `L1-05 支付确认` | 数据来源：PAID 订单（时间归属基于支付时间） |
| `L1-06 履约与完成` | 数据来源：SHIPPED/COMPLETED 订单 + B 端聚合回查（SB-BACKSTAGE-06 语义） |

> 说明：本变更为 **L1-06 之后的经营分析支流**（只读），不修改既有 L1/L2/L3 交易节点语义。

## Service Blueprint Alignment (服务蓝图对齐)

| 蓝图节点 | 动作类型 | 说明 |
| --- | --- | --- |
| `SB-STAGE-06 成功回流` | 只读消费 | 看板数据来源（订单聚合回查） |
| `SB-BACKSTAGE-06` | 新增后台活动 | 新增「销售数据聚合」后台能力节点（看板）；`SB-CUSTOMER-*` 无变化 |

## Impact (影响面)

- **后端服务（Node.js）**：新增 `GET /api/admin/dashboard/sales` 只读聚合路由；`order-management` service 增加聚合查询；`user-admin` 增加 `role=老板` 与看板门禁中间件；复用现有 repo（fileRepo/memoryRepo）。
- **前端 UI（Vue）**：App.vue 新增「销售看板」视图（仅运营/老板角色可见）；趋势图 CSS/SVG 手写（零第三方图表库）。
- **数据模型**：无实体表新增，仅新增只读聚合查询。
- **跨域/同步**：无新增跨域；数据实时聚合自当前持久化存储。
- **测试影响**：新增 E2E 旅程（销售总览主流程 + 时间切换 + 权限 403/401）。

## 需求侧回链

- story.md：`openspec-requirements/epics/epic-sales-dashboard/stories/story-sales-dashboard-overview/story.md`
- idea.md：`openspec-requirements/epics/epic-sales-dashboard/idea.md`
- 原型：`openspec-requirements/epics/epic-sales-dashboard/prototypes/sales-dashboard.html`（已 HITL 确认）
