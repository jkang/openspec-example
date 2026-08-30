# sales-dashboard Specification (Delta: Ranking)

> 增量文件：追加于本 Epic `sales-dashboard` capability（overview 已生成主 spec，本 change 追加排行需求）。治理归属：data-insights（新增 taxonomy）。

## ADDED Requirements

### Requirement: 商品销售 TOP10 排行

系统 SHALL 提供 `GET /api/admin/dashboard/ranking?from=&to=&dimension=`（B 端运营/老板角色，同看板权限门禁）返回**商品销售 TOP10**：按销售额降序（销售额 = 该商品订单明细快照 `priceCents × quantity` 汇总，仅计 `status ∈ {PAID, SHIPPED, COMPLETED}` 且 `paidAt ∈ [from, to)` 的订单），每项含商品名、销量、销售额。软删除商品（`status=deleted`）的历史订单 SHALL 仍计入排行（按订单快照价）。

- **Rationale**: 运营定位爆款/滞销（research 访谈记录 2）；排行口径与总览一致（快照价、状态集、时间归属），复用同一聚合语义（R-RANK-001/004）。

#### Scenario: 近7日商品 TOP10 按销售额降序
- @e2e
- **GIVEN** 系统存在跨多商品的真实成交订单（含软删除商品历史订单）
- **AND** 存在 `role=运营` 的登录会话
- **WHEN** 运营请求 `GET /api/admin/dashboard/ranking`（近7日）
- **THEN** 返回商品 TOP10（≤10 项）
- **AND** 按销售额降序排列
- **AND** 商品销售额 = 该商品近7日成交订单 `priceCents × quantity` 之和（E2E 断言与订单明细一致）
- **AND** 软删除商品的历史成交仍计入

#### Scenario: CANCELLED 订单不计入排行
- @api
- **GIVEN** 某商品既有成交订单也有取消订单
- **WHEN** 请求排行
- **THEN** 该商品排行值仅含成交订单汇总，取消订单不计入

### Requirement: 分类销售排行

系统 SHALL 返回**分类销售排行**：按销售额降序，每项含分类名、销售额、占比（分类销售额 ÷ 全类销售额 × 100）、订单数。商品归属按其 `categoryId` 聚合；未分类商品（`categoryId=null`）归入「未分类」聚合行；占比合计 SHALL = 100%（含未分类行）。

- **Rationale**: 运营评估类目健康度（research 访谈记录 2）；占比用于类目结构判断（R-RANK-002/005）。

#### Scenario: 分类排行含占比且合计 100%
- @api
- **GIVEN** 订单跨多个分类且含未分类商品
- **WHEN** 请求分类排行
- **THEN** 返回分类按销售额降序（含销售额/占比/订单数）
- **AND** 未分类商品归入「未分类」行
- **AND** 各分类占比合计 = 100%

### Requirement: 排行时间维度联动

排行 SHALL 支持 `today / week(默认) / month` 维度，与销售总览**同一时间口径**（同一 from/to 换算），切换维度 SHALL 返回对应区间的排行。

- **Rationale**: 看板内总览与排行一致联动（story.md 旅程：时间切换联动排行）。

#### Scenario: 切换今日维度排行联动刷新
- @e2e
- **GIVEN** 运营已在销售看板（近7日）
- **WHEN** 切换到「今日」
- **THEN** 商品 TOP10 与分类排行均按今日区间重新聚合
- **AND** 排行口径与今日总览指标一致

## Governance Mapping

- **Bounded Context**: `data-insights`（新增 BC，需标注新增 taxonomy）
- **Capability Taxonomy**: `sales-dashboard`（新增 taxonomy，本 change 追加排行需求）
- **Process Alignment**: L1-05 支付确认、L1-06 履约与完成（只读数据来源）
- **Service Blueprint**: SB-STAGE-06、SB-BACKSTAGE-06（销售数据聚合能力节点）
- **实现版本**: Node.js（排行只读聚合 API，复用 overview 聚合服务）＋ Frontend（看板排行区块）
