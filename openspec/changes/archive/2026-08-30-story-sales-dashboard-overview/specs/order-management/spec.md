# order-management Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/order-management/spec.md`（本 change 对既有能力的修改）。治理归属：Order Context。

## MODIFIED Requirements

### Requirement: 只读聚合查询（销售分析消费）

Order Context SHALL 提供**只读聚合查询**能力，供 `sales-dashboard`（data-insights BC）消费：按时间区间（`paidAt ∈ [from, to)`）与状态集合（`{PAID, SHIPPED, COMPLETED}`）过滤订单，并支持 ① 销售指标聚合（`actualPaidCents` 汇总 / 订单计数 / `discountCents` 汇总 / 用券订单计数）② 时间序列聚合（按日分桶的销售额序列）③ 商品/分类聚合（订单明细快照 `priceCents × quantity` 汇总，按 `productId` / `categoryId` 分组——供 ranking Story 复用）。该查询 SHALL 为只读，**不改变订单写入语义、不触发任何写操作**。

- **Rationale**: 销售看板数据源（story.md 旅程 1）；聚合在 Order 数据之上执行，复用订单快照价保证与历史一致；保持 Order BC 单一职责（只读对外暴露，写入语义不动）。

#### Scenario: 按区间与状态过滤聚合销售指标
- @api
- **GIVEN** 系统中存在 PAID/SHIPPED/COMPLETED 与 CANCELLED/PENDING_PAYMENT 混合订单
- **WHEN** 调用只读聚合查询（区间近7日，状态集合 PAID/SHIPPED/COMPLETED）
- **THEN** 返回销售额 = `actualPaidCents` 之和
- **AND** 返回订单量、优惠让利汇总、用券订单计数
- **AND** CANCELLED / PENDING_PAYMENT 订单不计入

#### Scenario: 按日返回时间序列
- @api
- **GIVEN** 区间内订单分布在多个日期
- **WHEN** 调用按日分桶聚合
- **THEN** 返回每个日期的销售额序列与日期标签
- **AND** 序列合计 = 区间销售额总额

## Governance Mapping

- **Bounded Context**: Order Context（`domain_model.html` BC → Capability 映射表：`bc-order → cap-order`）
- **Capability Taxonomy**: `order-management`（修改：新增只读聚合查询能力，写入语义不变）
- **Process Alignment**: L1-05 支付确认、L1-06 履约与完成（只读消费）
- **Service Blueprint**: SB-STAGE-06、SB-BACKSTAGE-06（B 端聚合回查）
- **实现版本**: Node.js（order service 新增只读聚合方法，复用 fileRepo/memoryRepo 的 findAll）
