# Design: story-sales-dashboard-ranking

> 关联 proposal：`openspec/changes/story-sales-dashboard-ranking/proposal.md`
> 依赖：story-sales-dashboard-overview（看板框架与权限已交付）

## Context (上下文)

商品/分类销售排行（P1 Story）：在销售总览看板内追加排行区块（商品 TOP10 + 分类 TOP10），数据口径与总览完全一致。复用 overview 已建的看板框架、权限门禁与订单只读聚合服务。

## Domain Boundary Impact (领域边界影响)

- **`data-insights`（新增 BC）**：`sales-dashboard` capability 扩展排行需求（同一 capability，追加 Requirement 场景）。
- **Order Context（只读消费）**：`order-management` 聚合服务扩展按商品/分类分组聚合（快照价），写入语义不变。

## Process Delta (流程影响)

- 交易主流程零改动；排行同属 L1-06 后经营分析支流（只读）。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **Needs Sync: Yes**（与 overview 同一触发项：SB-BACKSTAGE-06 销售数据聚合节点；Epic 归档后统一执行，change 级只做 Spec Sync）

## Domain Model Sync Assessment (领域模型同步评估)

- **Needs Sync: Yes**（与 overview 同一触发项：`data-insights` BC + `sales-dashboard` taxonomy；Epic 归档后统一执行）

## Goals / Non-Goals

- **Goals**：商品 TOP10（销售额/销量）+ 分类 TOP10（销售额/占比/订单数）；排行与总览时间口径一致；软删除商品历史订单计入；未分类归入「未分类」。
- **Non-Goals**：不做排行导出/分页/下钻联动；不做分类二级明细。

## Decisions (技术决策)

1. **聚合复用**：排行数据在 `order-management` 同一聚合方法内扩展（`aggregateSales` 增加 `groupBy: 'product' | 'category'` 模式），保证与总览同源同口径；路由 `GET /api/admin/dashboard/ranking` 复用 `requireRole('运营','老板')`。
2. **快照价**：排行一律用订单明细快照价（`priceCents × quantity`），非商品当前价——保证历史订单口径稳定。
3. **软删除与未分类**：商品聚合按订单快照（含 deleted 商品）；分类聚合 `categoryId=null` 归「未分类」。
4. **前端**：看板视图追加两个排行区块（表格），时间切换联动复用 overview 的状态管理。

## Risks / Trade-offs

- 排行与总览若分开实现易口径漂移 → 由同一聚合方法保证。
- 分类占比精度：用整数 cents 计算占比，展示保留 1 位小数，合计可能 ±0.1（可接受，E2E 断言用四舍五入容差）。

## Open Questions

- 无。
