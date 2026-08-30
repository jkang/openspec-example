# Design: story-sales-dashboard-overview

> 关联 proposal：`openspec/changes/story-sales-dashboard-overview/proposal.md`
> 关联需求侧：story.md / idea.md / 原型 `sales-dashboard.html`（已 HITL 确认）

## Context (上下文)

销售总览看板（P0 Story）：老板/运营登录 B 端后台首屏即见 4 指标 + 时间切换 + 趋势 + 优惠券效果，数据实时聚合自订单明细。复用现有 `server.js` 路由体系（`requireAdmin` 门禁、adminUserService 模式）与 repo 层（memoryRepo/fileRepo 双实现），新增只读聚合查询。

## Domain Boundary Impact (领域边界影响)

- **`data-insights`（新增 BC）**：承载 `sales-dashboard` capability。销售分析是全新领域，独立成 BC 避免污染 Order BC 的写入职责；`domain_model.html` 的 BC→Capability 映射表需新增 `bc-data-insights → cap-sales-dashboard`。
- **Order Context（只读消费）**：`order-management` 仅新增只读聚合查询，订单写入语义（下单/支付/发货/取消）零改动。
- **User Context（修改）**：`user-admin` 角色模型新增 `role=老板`，最小权限（只读看板，无管理写权限）。

## Process Delta (流程影响)

- 交易主流程（L1-01~L1-06）**零改动**。
- 在 L1-06 之后新增**经营分析支流**（只读）：看板访问（L1-06 数据来源）→ 指标聚合 → 趋势/排行展示。不修改任何 L2/L3 交易节点语义。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **Needs Sync: Yes**
- 触发项：SB-BACKSTAGE-06（后台核心活动）新增「销售数据聚合」能力节点；SB-STAGE-06 的 B 端聚合回查语义扩展（只读销售看板）。
- 计划更新部位：`docs/baseline/service_blueprint.html` 的 SB-BACKSTAGE-06 单元格加入「销售数据聚合（看板）」活动；capability mapping table 增加 `sales-dashboard`。
- 时机：Epic（sales-dashboard 2 Story）全部归档后统一执行（分层 Sync：change 级只做 Spec Sync）。

## Domain Model Sync Assessment (领域模型同步评估)

- **Needs Sync: Yes**
- 触发项：
  - 新增 Bounded Context `data-insights`（BC 层新增边界）。
  - 新增 capability taxonomy `sales-dashboard`（映射 `bc-data-insights → cap-sales-dashboard`）。
  - 角色枚举扩展：`User.role ∈ {客户, 运营, 客服, 老板}`。
  - 新增 ReadModel `Operator 销售看板`（对齐既有 `Operator 库存看板` 模式）。
- 计划更新部位：`docs/baseline/domain_model.html` 的 BC 图、BC→Capability 映射表、ReadModel 列表、User 聚合角色字段说明。
- 时机：Epic 全部归档后统一执行。

## Goals / Non-Goals

- **Goals**：4 指标聚合正确（口径严格）；时间切换（今日/近7日/近30日）；趋势序列；优惠券效果；权限门禁（运营/老板 200，客服/未登录 403）；零第三方图表库（CSS/SVG 趋势图）；slate 极简 UI。
- **Non-Goals**：不做商品/分类排行（ranking Story）；不做导出/自定义报表；不做自动补货；不改变 C 端任何行为。

## Decisions (技术决策)

1. **聚合实现位置**：在 `order-management` service 新增只读聚合方法（`aggregateSales({from, to, statuses, granularity})`），而非新开 service——数据源是 OrderRepo，保持 Order BC 内聚；sales-dashboard 侧只做路由 + 响应组装。
2. **路由设计**：`GET /api/admin/dashboard/sales`（requireAdmin 门禁扩展为 运营/老板 白名单）→ 调用 order service 聚合 → 返回 `{ metrics, trend, coupon, range }`。
3. **权限门禁改造**：`requireAdmin` 目前硬编码 `role !== '运营'`；改为 `requireRole('运营','老板')` 白名单参数化，用户管理接口沿用 `requireRole('运营')`（老板不可访问），看板接口用 `requireRole('运营','老板')`。测试辅助 `__test/user-role` 增加 `老板` 合法值。
4. **时间维度换算**：`today` = 今日 00:00 ~ now；`week` = 7 天前 ~ now；`month` = 30 天前 ~ now；趋势按日分桶（对齐 memoryRepo 中订单 `paidAt` 字段）。
5. **前端趋势图**：Vue `computed` 生成 SVG polyline 坐标（无第三方图表库），复用原型 `sales-dashboard.html` 的实现。
6. **数据精度**：金额一律 cents 整数运算；前端展示转元（`(cents/100).toFixed(2)`）。

## Risks / Trade-offs

- **聚合性能**：当前为内存/file 级存储，全量 `findAll()` 聚合可接受（单机中小规模）；若数据量增长，后续可加索引/物化视图（Phase 7+ 评估）。
- **口径漂移风险**：多 Story（overview/ranking）共用同一聚合服务 → 由 order-management 单一聚合方法保证口径一致，避免各 Story 各自实现导致漂移。
- **老板角色权限**：新增角色需同步测试辅助与 E2E；若遗漏 `__test/user-role` 扩展会导致 E2E 无法构造老板会话（已在 user-admin delta spec 覆盖）。

## Open Questions

- 无（调研 5 项待澄清已在 idea.md 定稿；实现细节按决策执行）。
