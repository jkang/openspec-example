# sales-dashboard Specification

## Purpose
销售报表看板（Sales Dashboard）：为老板与运营提供**只读经营分析视图**——销售总览（销售额/订单量/客单价/优惠让利 4 指标 + 时间维度切换 + 销售趋势）与商品/分类排行（TOP10）。数据实时聚合自订单明细（`actualPaidCents` 口径），属于新增 `data-insights` Bounded Context。治理归属：data-insights（新增 taxonomy）。

## ADDED Requirements

### Requirement: 看板权限门禁

系统 SHALL 提供 `GET /api/admin/dashboard/sales`（B 端运营/老板角色）：解析 Bearer 会话 → 归属用户须 `role=运营` 或 `role=老板`，否则返回 403；缺失/无效会话统一按 403 处理（对齐 R-ADM-001 拒绝访问语义，不区分未登录与越权）。看板接口 SHALL 为只读聚合，不产生任何写操作。

- **Rationale**: 销售数据是经营敏感信息；老板新增为只读看板角色（无管理权限），运营可访问；客户/客服禁止访问（story.md 旅程 2：客服 403、未登录 403）。

#### Scenario: 运营角色可访问销售总览
- @api
- **GIVEN** 存在 `role=运营` 的登录会话
- **WHEN** 运营携带会话凭证请求 `GET /api/admin/dashboard/sales`
- **THEN** 返回状态码 200
- **AND** 返回销售指标与趋势数据

#### Scenario: 老板角色可访问销售总览（只读）
- @api
- **GIVEN** 存在 `role=老板` 的登录会话
- **WHEN** 老板携带会话凭证请求 `GET /api/admin/dashboard/sales`
- **THEN** 返回状态码 200

#### Scenario: 客服角色访问被拒绝
- @api
- **GIVEN** 存在 `role=客服` 的登录会话
- **WHEN** 客服请求 `GET /api/admin/dashboard/sales`
- **THEN** 返回状态码 403
- **AND** 响应不包含任何销售数据

#### Scenario: 未登录访问被拒绝
- @api
- **GIVEN** 请求未携带会话凭证
- **WHEN** 访问 `GET /api/admin/dashboard/sales`
- **THEN** 返回状态码 403

### Requirement: 销售总览指标聚合

系统 SHALL 按时间区间聚合销售指标：销售额 = 区间内 `status ∈ {PAID, SHIPPED, COMPLETED}` 订单 `actualPaidCents` 之和；订单量 = 同集合订单计数；客单价 = 销售额 ÷ 订单量（订单量=0 时客单价=0）；优惠让利 = 同集合 `discountCents` 之和（独立字段，单列展示，不计入销售额）。时间归属 SHALL 按订单 `paidAt` 落入 `[from, to)` 区间；`CANCELLED` 与 `PENDING_PAYMENT` 订单 SHALL 不计入任何指标。

- **Rationale**: 财务硬约束——销售额必须用实付金额，优惠让利单列不可混淆（research 访谈记录 4）；时间归属基于支付时间（R-DASH-001~005）。

#### Scenario: 近7日销售总览指标与订单一致
- @e2e
- **GIVEN** 系统存在真实订单数据（含 PAID/SHIPPED/COMPLETED 与 CANCELLED 混合、部分订单带优惠券）
- **AND** 存在 `role=运营` 的登录会话
- **WHEN** 运营请求 `GET /api/admin/dashboard/sales?from=<7天前>&to=<今天>`
- **THEN** 返回状态码 200
- **AND** 销售额 = 区间内 PAID/SHIPPED/COMPLETED 订单 `actualPaidCents` 之和（E2E 断言与订单明细一致）
- **AND** 优惠让利 = 同集合 `discountCents` 之和，且为独立字段
- **AND** 客单价 = 销售额 ÷ 订单量
- **AND** CANCELLED / PENDING_PAYMENT 订单不计入任何指标

#### Scenario: 空数据区间返回零指标
- @api
- **GIVEN** 时间区间内没有任何成交订单
- **WHEN** 请求 `GET /api/admin/dashboard/sales` 覆盖该区间
- **THEN** 返回销售额=0、订单量=0、客单价=0、优惠让利=0
- **AND** 不报错（200）

### Requirement: 时间维度与趋势序列

系统 SHALL 支持时间维度 `today / week(近7日，默认) / month(近30日)`，按维度换算 `from/to` 区间并返回趋势序列（按日粒度返回销售额序列与对应日期标签）；切换维度 SHALL 返回对应区间的完整指标集与趋势。

- **Rationale**: 老板首屏速览 + 运营趋势判断（story.md 旅程 1）；默认近7日（调研定稿项 3）。

#### Scenario: 默认近7日并返回趋势序列
- @api
- **GIVEN** 运营进入看板未指定维度
- **WHEN** 请求 `GET /api/admin/dashboard/sales`（无 dimension 参数）
- **THEN** 返回近7日指标
- **AND** 返回按日粒度的销售额趋势序列（含日期标签）

#### Scenario: 切换今日维度刷新指标
- @e2e
- **GIVEN** 运营已在销售看板（近7日）
- **WHEN** 切换到「今日」并请求 `GET /api/admin/dashboard/sales?dimension=today`
- **THEN** 指标卡、趋势图均按今日区间刷新
- **AND** 切换后销售额 = 今日 PAID/SHIPPED/COMPLETED 订单实付之和

### Requirement: 优惠券效果统计

系统 SHALL 返回所选时间区间内的优惠券效果：优惠让利总额（同 R-DASH-002）、使用优惠券订单数（区间内 `couponId` 非空的成交订单计数）、用券订单占比（用券订单数 ÷ 订单量 × 100，订单量=0 时占比=0）。

- **Rationale**: 运营评估发券 ROI（research 访谈记录 2：发券后带来多少单、让了多少利）。

#### Scenario: 返回让利总额与用券订单数
- @api
- **GIVEN** 区间内部分订单使用了优惠券
- **WHEN** 请求 `GET /api/admin/dashboard/sales`
- **THEN** 返回优惠让利总额、使用优惠券订单数、用券订单占比
- **AND** 用券订单占比 = 用券订单数 ÷ 订单量 × 100

## Governance Mapping

- **Bounded Context**: `data-insights`（新增 BC，需标注新增 taxonomy；`domain_model.html` 现有 BC→Capability 映射表需在 Baseline Sync 补充）
- **Capability Taxonomy**: `sales-dashboard`（新增 taxonomy，归属 data-insights BC）
- **Process Alignment**: L1-05 支付确认（数据来源）；L1-06 履约与完成（数据来源 + B 端聚合回查）
- **Service Blueprint**: SB-STAGE-06（成功回流 / B 端聚合回查）、SB-BACKSTAGE-06（新增「销售数据聚合」后台活动）；SB-CUSTOMER-* 无变化
- **实现版本**: Node.js（后端只读聚合 API）＋ Frontend（B 端销售看板视图）
