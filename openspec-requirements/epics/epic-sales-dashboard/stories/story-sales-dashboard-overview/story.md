# Story: 销售总览（指标卡 + 时间切换 + 趋势）

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-sales-dashboard-overview` | 优先级: P0 | 依赖: 无
> 关联 Storymap: `epics/epic-sales-dashboard/storymap.md`
> 关联 Idea: `epics/epic-sales-dashboard/idea.md`
> 关联原型（Epic 整体）: `epics/epic-sales-dashboard/prototypes/sales-dashboard.html`

## 用户场景 (User Scenario)

- **目标用户（B 端）**：老板（决策者，只读）、运营（销售/促销负责人）。
- **使用动机**：每天/每周快速掌握销售全貌，判断经营涨跌，无需手动统计 Excel。
- **关键目标**：登录后台即见销售总览——销售额 / 订单量 / 客单价 / 优惠让利 4 项指标 + 今日/近7日/近30日时间切换 + 销售趋势。
- **B 端视角**：
  - 后台怎么配置？—— 无配置项，时间维度在前端切换；数据实时聚合自订单。
  - 生命周期如何？—— 随订单数据实时聚合，无独立生命周期。
  - 谁有权限？—— 仅 `role=运营` 或 `role=老板` 可访问；`客户 / 客服` 403。老板为只读看板视角（无管理权限）。

## 范围 (Scope)

### In Scope
- B 端后台导航新增「销售看板」入口（仅运营/老板角色可见）。
- 看板权限门禁：`客户 / 客服` 访问看板 API 返回 403。
- 4 指标卡：销售额（`SUM(actualPaidCents)`，主指标）、订单量（计数）、客单价（销售额÷订单量）、优惠让利（`SUM(discountCents)`，单列）。
- 时间切换：今日 / 近7日（默认）/ 近30日；各维度指标随切换刷新。
- 销售趋势图：按所选时间维度绘制（CSS/SVG，零第三方图表库）。
- 优惠券效果区：优惠让利总额 + 使用优惠券订单数 + 用券订单占比（同一时间维度）。
- 口径标注：「销售额为实付金额（actualPaidCents），优惠让利单列，不含已取消订单」。
- 只读聚合：看板 API 不产生任何写操作。

### Out of Scope
- 商品/分类排行（归属 story-sales-dashboard-ranking）。
- 库存预警与补货建议（Epic 5.2）。
- 数据导出、自定义报表、回款看板。
- C 端任何页面改动。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-sales-dashboard/prototypes/sales-dashboard.html`
- 关键交互点：时间切换按钮（今日/近7日/近30日）联动 4 指标卡 + 趋势标题 + 优惠券效果区；趋势图为 SVG 折线（无圆角阴影）。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-DASH-001 | 销售额 = `SUM(actualPaidCents)`，仅统计 `status ∈ {PAID, SHIPPED, COMPLETED}` 的订单 | 聚合任意时间维度 | 返回实付总额 | 财务硬约束，不含 CANCELLED |
| R-DASH-002 | 优惠让利 = `SUM(discountCents)`，与销售额单列展示 | 聚合任意时间维度 | 返回让利总额，独立指标卡 | 不得计入销售额 |
| R-DASH-003 | 订单量 = 计入订单计数（同 R-DASH-001 状态集） | 聚合任意时间维度 | 返回订单数 | |
| R-DASH-004 | 客单价 = 销售额 ÷ 订单量（订单量>0） | 聚合任意时间维度 | 返回客单价（分精度） | 订单量=0 时客单价=0 |
| R-DASH-005 | 时间归属：按订单 `paidAt` 落入 [起始, 结束) | 时间切换 | 仅统计支付时间在区间内的订单 | 未支付不统计 |
| R-DASH-006 | 权限门禁：仅 `role=运营/老板` 可访问看板 API | 任何看板请求 | 客户/客服 403，运营/老板 200 | 对齐 R-ADM 模式 |
| R-DASH-007 | 看板 API 只读，不产生写操作 | 任意请求 | 无数据变更 | |
| R-DASH-008 | 时间切换默认近7日 | 进入看板 | 默认展示近7日指标与趋势 | |

## 验收标准 (E2E 用户旅程)

### 旅程 1：老板查看销售总览 (Ref: L1-05, L1-06 | SB-STAGE-06, SB-BACKSTAGE-06)
#### 场景：正常主流程——近7日销售总览
- @e2e
- **GIVEN** 系统存在真实订单数据（含 PAID/SHIPPED/COMPLETED 与 CANCELLED 混合、部分订单带优惠券）
- **AND** 存在 `role=运营` 的登录会话
- **WHEN** 运营访问 `GET /api/admin/dashboard/sales`（默认近7日）
- **THEN** 返回 200
- **AND** 销售额 = 区间内 PAID/SHIPPED/COMPLETED 订单 `actualPaidCents` 之和（E2E 断言与订单明细一致）
- **AND** 优惠让利 = 同集合 `discountCents` 之和，且独立字段展示
- **AND** 客单价 = 销售额 ÷ 订单量
- **AND** CANCELLED / PENDING_PAYMENT 订单不计入任何指标

#### 场景：时间切换联动刷新
- @e2e
- **GIVEN** 运营已进入销售看板（近7日）
- **WHEN** 切换到「今日」
- **THEN** 指标卡、趋势图、优惠券效果区均按「今日」区间重新聚合
- **AND** 切换后销售额 = 今日 PAID/SHIPPED/COMPLETED 订单实付之和

### 旅程 2：看板权限门禁 (Ref: SB-BACKSTAGE-06)
#### 场景：客服角色被拒绝访问
- @e2e
- **GIVEN** 存在 `role=客服` 的登录会话
- **WHEN** 访问 `GET /api/admin/dashboard/sales`
- **THEN** 返回 403
- **AND** 不返回任何销售数据

#### 场景：未登录访问被拒绝
- @api
- **GIVEN** 无有效会话凭证
- **WHEN** 访问 `GET /api/admin/dashboard/sales`
- **THEN** 返回 401

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: `data-insights`（**新增，需显式标注**）；消费 Order Context / User Context
- Capability Taxonomy: `sales-dashboard`（**新增 taxonomy**，data-insights BC）；`user-admin` 扩展 `role=老板`（修改）
- Related Process Nodes: L1-05 支付确认、L1-06 履约与完成（只读数据来源）
- Related Service Blueprint Nodes: SB-STAGE-06、SB-BACKSTAGE-06
- Sync Assessment: **Yes** — 新增 `data-insights` BC + `sales-dashboard` capability + `role=老板`；Epic 归档后 Baseline Sync

## 分析制品索引 (Analysis Artifacts)

- 故事详述: `epics/epic-sales-dashboard/analysis/narrative/story-sales-dashboard-overview/narrative.md` — ❌ 未生成（本 Story 业务规则与 E2E 验收已完整，不额外生成）

## 交接状态 (Handoff Status)

- [ ] 待开发交接 (openspec-handoff)
- [ ] 已交接 (changeName: <change-name> 记录于 openspec/epic-<key>.story-list.json)
