# Story: 商品/分类销售排行

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-sales-dashboard-ranking` | 优先级: P1 | 依赖: story-sales-dashboard-overview（看板框架与权限）
> 关联 Storymap: `epics/epic-sales-dashboard/storymap.md`
> 关联 Idea: `epics/epic-sales-dashboard/idea.md`
> 关联原型（Epic 整体）: `epics/epic-sales-dashboard/prototypes/sales-dashboard.html`

## 用户场景 (User Scenario)

- **目标用户（B 端）**：运营（选品/促销负责人）、老板（只读决策）。
- **使用动机**：识别爆款与疲软商品/分类，支撑选品、清库存与补货决策；评估各分类健康度。
- **关键目标**：在销售看板内查看商品销售 TOP10（销量/销售额）与分类销售排行（销售额/占比/订单数），数据口径与总览一致。
- **B 端视角**：
  - 后台怎么配置？—— 无配置项，排行随所选时间维度（今日/近7日/近30日）聚合。
  - 生命周期如何？—— 随订单实时聚合。
  - 谁有权限？—— 同看板：仅 `role=运营/老板`；老板只读。

## 范围 (Scope)

### In Scope
- 商品销售 TOP10 排行：按销售额降序，含销量与销售额列。
- 分类销售排行：按销售额降序，含销售额、占比、订单数列。
- 排行随时间维度（今日/近7日/近30日）联动刷新。
- 排行口径与总览一致（`actualPaidCents` 汇总、不含 CANCELLED、按 paidAt 时间归属）。
- 复用 story-sales-dashboard-overview 的看板框架与权限门禁（API 同级或同一聚合服务）。

### Out of Scope
- 排行导出、自定义排序字段、分页（TOP10 固定）。
- 排行与商品/分类详情页联动下钻。
- 分类下的二级商品明细（全局商品 TOP10 + 全局分类 TOP10 两级即可）。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-sales-dashboard/prototypes/sales-dashboard.html`
- 关键交互点：「商品销售 TOP10（按销售额）」表格（商品/销量/销售额）+「分类销售排行（按销售额）」表格（分类/销售额/占比/订单数），随时间切换联动。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-RANK-001 | 商品排行按销售额 = 该商品订单明细 `priceCents × quantity` 汇总（仅计 PAID/SHIPPED/COMPLETED） | 聚合任意时间维度 | 商品按销售额降序 TOP10，含销量 | 用订单快照价，非当前价 |
| R-RANK-002 | 分类排行：商品归属 `categoryId` 聚合销售额与订单数 | 聚合任意时间维度 | 分类按销售额降序，含占比 | 占比 = 分类销售额 ÷ 全类销售额 |
| R-RANK-003 | 排行时间口径与总览一致（paidAt 区间、不含 CANCELLED） | 时间切换 | 排行随区间刷新 | 对齐 R-DASH-005 |
| R-RANK-004 | 软删除商品（status=deleted）历史订单仍计入排行（按订单快照） | 存在历史订单 | 计入，排行不受商品下架影响 | |
| R-RANK-005 | 未分类商品（categoryId=null）计入「未分类」聚合行 | 存在未分类商品订单 | 归入「未分类」分类行 | |

## 验收标准 (E2E 用户旅程)

### 旅程 1：运营查看商品与分类排行 (Ref: L1-05, L1-06 | SB-STAGE-06, SB-BACKSTAGE-06)
#### 场景：正常主流程——商品 TOP10 与分类排行（近7日）
- @e2e
- **GIVEN** 系统存在真实订单数据（跨多商品、多分类、含软删除商品历史订单）
- **AND** 存在 `role=运营` 的登录会话
- **WHEN** 运营在销售看板（近7日）查看排行区
- **THEN** 返回商品 TOP10（按销售额降序，含销量）
- **AND** 商品销售额 = 该商品近7日成交订单 `priceCents × quantity` 之和（E2E 断言与订单明细一致）
- **AND** 返回分类排行（销售额/占比/订单数），占比合计 = 100%（含未分类行）
- **AND** CANCELLED / PENDING_PAYMENT 订单不计入排行

#### 场景：时间切换联动排行
- @e2e
- **GIVEN** 运营已进入销售看板（近7日）
- **WHEN** 切换到「今日」
- **THEN** 商品 TOP10 与分类排行均按「今日」区间重新聚合
- **AND** 排行口径与今日总览指标一致

### 旅程 2：软删除商品历史订单计入排行
#### 场景：下架商品的历史成交仍计入
- @api
- **GIVEN** 某商品已软删除（status=deleted），但其存在历史 PAID 订单
- **WHEN** 查询该时间维度的商品排行
- **THEN** 该商品仍出现在排行中（按订单快照价汇总）

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: `data-insights`（**新增，需显式标注**）；消费 Order Context（订单明细快照）
- Capability Taxonomy: `sales-dashboard`（**新增 taxonomy**，data-insights BC）
- Related Process Nodes: L1-05 支付确认、L1-06 履约与完成（只读数据来源）
- Related Service Blueprint Nodes: SB-STAGE-06、SB-BACKSTAGE-06
- Sync Assessment: **Yes** — 与 overview 同属 `sales-dashboard` capability 扩展；Epic 归档后 Baseline Sync

## 分析制品索引 (Analysis Artifacts)

- 故事详述: `epics/epic-sales-dashboard/analysis/narrative/story-sales-dashboard-ranking/narrative.md` — ❌ 未生成（本 Story 业务规则与 E2E 验收已完整，不额外生成）

## 交接状态 (Handoff Status)

- [ ] 待开发交接 (openspec-handoff)
- [ ] 已交接 (changeName: <change-name> 记录于 openspec/epic-<key>.story-list.json)
