# stock-insight Specification

## Purpose

库存洞察（Stock Insight）：为运营/老板提供**低库存预警列表 + 阈值两级配置**——`stock ≤ 有效阈值` 的商品自动入列（含 `stock=0` 已售罄置顶与超卖风险琥珀标识），运营可按商品设置个性水位线（全局默认 10 件 + 商品级覆盖优先），配置写操作落盘即时生效。只读聚合 `Product.stock` 与近7日订单销量，兑现"售罄前主动预警"（Phase 5 目标）。治理归属：`data-insights`（新增 taxonomy，对齐 `sales-dashboard` 先例）。

## ADDED Requirements

### Requirement: 低库存预警列表（只读聚合）

系统 SHALL 提供 `GET /api/admin/dashboard/stock`（B 端运营/老板角色）：遍历**在售商品**（`status=active`），按 **R-STOCK-001~010** 计算并返回预警聚合：

- **入列判定（R-STOCK-001）**：`stock ≤ 有效阈值` 的商品进入预警列表；有效阈值 = 商品级覆盖阈值优先，否则取全局默认阈值。
- **已售罄（R-STOCK-002）**：`stock = 0` 的在售商品以「已售罄」特殊状态**恒入列并置顶**，不可静默消失。
- **超卖风险（R-STOCK-003）**：有销量且 `0 < stock < 日均销量 × 7`（等价预计售罄天数 < 7 天到货周期）→ 置琥珀 `--warning` Badge「超卖风险」；不纳入 PENDING_PAYMENT 未支付订单占用。
- **有效阈值标注（R-STOCK-004/005）**：无覆盖商品取全局默认阈值 10 并标注「全局」；有覆盖商品取覆盖值并标注「覆盖」。
- **排序（R-STOCK-010）**：已售罄置顶 → 其余按预计售罄天数升序（最紧迫在前）→ 无销量商品（不计算天数）置底。
- **只读语义**：只读消费 `Product.stock` 与近7日订单销量（`status ∈ {PAID, SHIPPED, COMPLETED}` 且 `paidAt` 落入近7日，商品销量 = 订单明细 `quantity` 之和，日均销量 = 近7日销量 ÷ 7）；本次巡检 SHALL NOT 产生任何写操作。

- **Priority**: P0
- **Rationale**: 运营/老板需要售罄前主动发现低库存风险（story.md 用户场景）；售罄商品不可静默消失（决策口径⑧）；超卖风险提前到货周期可预警（决策口径⑤）；只读聚合保证不与交易 BC 产生写入耦合。

#### Scenario: 入列判定与有效阈值取值（覆盖优先）
- @unit
- **GIVEN** 全局默认阈值=10；商品 A stock=8 无覆盖配置，商品 B stock=15 有覆盖配置 15，商品 C stock=40 无覆盖配置
- **WHEN** 请求预警聚合
- **THEN** 商品 A 按全局阈值 10 入列（`effectiveThreshold=10`，标注 `thresholdSource=global`）
- **AND** 商品 B 按覆盖阈值 15 入列（`effectiveThreshold=15`，标注 `thresholdSource=override`）
- **AND** 商品 C（40 > 10）不入列，`listed=false`

#### Scenario: 已售罄恒入列并置顶
- @unit
- **GIVEN** 商品 D stock=0、商品 A stock=3 均有销量
- **WHEN** 请求预警聚合
- **THEN** 商品 D 以「已售罄」状态入列（`listed=true`、`status=sold_out`）
- **AND** 列表排序中商品 D 恒排在最前（先于任何 `stock > 0` 的预警商品）

#### Scenario: 超卖风险判定（预计售罄天数 < 7）
- @unit
- **GIVEN** 商品 A stock=3、日均销量=1.2（预计售罄 2.5 天）；商品 B stock=8、日均销量=2.0（预计售罄 4 天）；商品 C stock=5、日均销量=0.3（预计售罄 16.7 天）
- **WHEN** 请求预警聚合
- **THEN** 商品 A 与商品 B 的 `risk=true`（2.5 天与 4 天均 < 7 天）
- **AND** 商品 C 的 `risk=false`（16.7 天 ≥ 7 天）
- **AND** 已售罄商品（stock=0）不置超卖风险标识（`risk=false`，状态为 `sold_out`）

#### Scenario: 列表排序——已售罄置顶、售罄天数升序、无销量置底
- @unit
- **GIVEN** 预警商品含：已售罄 D、键盘（售罄 2.5 天）、鼠标（售罄 4 天）、显示器（售罄 16.7 天）、支架（无销量）
- **WHEN** 请求预警聚合
- **THEN** 列表顺序为：D（已售罄）→ 键盘（2.5）→ 鼠标（4）→ 显示器（16.7）→ 支架（无销量置底）

#### Scenario: 预警巡检为只读聚合（无写操作）
- @api
- **GIVEN** 存在 `role=运营` 的登录会话与真实商品/订单数据
- **WHEN** 运营请求 `GET /api/admin/dashboard/stock`
- **THEN** 返回状态码 200
- **AND** 响应包含预警列表（商品名/当前库存/有效阈值/日均销量/预计售罄天数/超卖风险/状态）与全局默认阈值
- **AND** 本次请求后商品库存、订单与配置文件均无任何变更（只读聚合）

#### Scenario: 运营巡检预警列表主流程（真实数据）
- @e2e
- **GIVEN** 存在真实商品与库存数据：极简机械键盘(stock=3)、无线办公鼠标(8)、高清显示器(5)、桌面收纳架(0)、铝合金笔记本支架(15, 商品级覆盖阈值15)、桌面拾音氛围灯(40)，全局默认阈值=10
- **AND** 存在 `role=运营` 的登录会话，已进入「库存预警」页面（预警中 Tab）
- **WHEN** 运营查看预警列表
- **THEN** 返回 200，预警中列表共 5 项：桌面收纳架、极简机械键盘、无线办公鼠标、高清显示器、铝合金笔记本支架
- **AND** 桌面收纳架（stock=0）以「已售罄」状态置顶（accent Badge）
- **AND** 极简机械键盘（3 ≤ 10）与无线办公鼠标（8 ≤ 10）展示琥珀「超卖风险」Badge（预计售罄天数 < 7 天）
- **AND** 铝合金笔记本支架（15 ≤ 覆盖阈值15）以「覆盖」阈值入列；桌面拾音氛围灯（40 > 10）不入列，位于健康水位 Tab
- **AND** 列表排序：已售罄置顶 → 其余按预计售罄天数升序（最紧迫在前）
- **AND** 预警 API 为只读聚合，本次巡检无任何写操作发生

### Requirement: 阈值配置（全局默认 + 商品级覆盖，唯一写操作）

系统 SHALL 提供两级阈值配置写操作，**本 Epic 内唯一写操作**（R-STOCK-006/007）：

- `PUT /api/admin/stock-config`：设置**全局默认阈值**（默认 10 件，可调整）。
- `PUT /api/admin/products/{id}/stock-config`：设置**商品级覆盖阈值**（覆盖优先于全局默认）。
- **权限**：仅 `role=运营` 可写；`role=老板` 只读（无配置入口）。
- **持久化与生效**：配置落盘 `data/stock-config.json`；写操作**即时生效**（下一次预警查询立即反映新阈值）；长期有效、无过期概念。
- **软删除语义（R-STOCK-008）**：商品软删除（`status=deleted`）后其覆盖配置保留在配置文件中，但 SHALL NOT 参与预警聚合。

- **Priority**: P0
- **Rationale**: 阈值两级配置是"售罄前主动预警"的运营抓手（跑量款调高、慢销款调低）；配置低频写、长期有效（决策口径①⑥）；仅运营可写是最小权限（决策口径②，对齐 domain_model 行 869 看板权限门禁）。

#### Scenario: 运营设置全局默认阈值并即时生效
- @api
- **GIVEN** 全局默认阈值当前为 10
- **WHEN** 运营请求 `PUT /api/admin/stock-config`，body `{ "threshold": 20 }`
- **THEN** 返回状态码 200
- **AND** 配置落盘 `data/stock-config.json`（`globalThreshold=20`）
- **AND** 下一次 `GET /api/admin/dashboard/stock` 立即按新阈值 20 重新入列

#### Scenario: 运营设置商品级覆盖阈值并即时生效
- @api
- **GIVEN** 商品「无线办公鼠标」stock=8、全局阈值 10（当前按全局入列）
- **WHEN** 运营请求 `PUT /api/admin/products/2/stock-config`，body `{ "threshold": 5 }` 并保存
- **THEN** 返回状态码 200，配置落盘 `data/stock-config.json`
- **AND** 预警列表立即刷新：无线办公鼠标（8 > 5）移出预警列表
- **AND** 再次将该商品覆盖阈值改回 10 并保存后，该商品重新按 `8 ≤ 10` 入列（即时生效、长期有效、可双向调整）

#### Scenario: 阈值配置即时生效（商品级覆盖 + 全局默认）E2E 旅程
- @e2e
- **GIVEN** 运营已进入库存预警页（全局默认阈值 10，无线办公鼠标以全局阈值 10 入列）
- **WHEN** 将「无线办公鼠标」的商品级覆盖阈值设为 5 并保存
- **THEN** 保存成功提示「✓ 已保存 · 阈值已即时生效」，配置落盘 `data/stock-config.json`
- **AND** 预警列表立即刷新：无线办公鼠标（8 > 5）移出预警列表
- **AND** 再次将该商品覆盖阈值改回 10 并保存
- **THEN** 该商品重新按 `8 ≤ 10` 入列（即时生效、长期有效、可双向调整）

#### Scenario: 老板/客服角色写配置被拒绝
- @api
- **GIVEN** 存在 `role=老板`（或 `role=客服`）的登录会话
- **WHEN** 携带会话凭证请求 `PUT /api/admin/stock-config` 或 `PUT /api/admin/products/{id}/stock-config`
- **THEN** 返回状态码 403（错误码 `FORBIDDEN`）
- **AND** 配置文件不发生任何变更

#### Scenario: 覆盖阈值优先于全局默认
- @unit
- **GIVEN** 全局默认阈值=10，商品「铝合金笔记本支架」有覆盖阈值 15
- **WHEN** 计算该商品有效阈值
- **THEN** 有效阈值取覆盖值 15（而非全局 10）
- **AND** stock=15 的商品因此入列（15 ≤ 15），行内标注「覆盖」

#### Scenario: 软删除商品覆盖配置保留但不参与聚合
- @unit
- **GIVEN** 商品「铝合金笔记本支架」有覆盖阈值 15，其后被软删除（`status=deleted`）
- **WHEN** 请求预警聚合并读取配置文件
- **THEN** 配置文件中该商品覆盖阈值仍保留（15）
- **AND** 预警聚合结果 SHALL NOT 包含该已删除商品（覆盖配置不参与聚合计算）

### Requirement: 预警与配置接口权限门禁

系统 SHALL 对预警/配置 API 施加 **B 端角色门禁（R-STOCK-009，对齐 R-DASH-006 白名单模式）**：

- `GET /api/admin/dashboard/stock`（只读预警）SHALL 仅 `role=运营 / 老板` 会话可访问。
- 配置写接口（`PUT /api/admin/stock-config`、`PUT /api/admin/products/{id}/stock-config`）SHALL 仅 `role=运营` 会话可写。
- `role=客户 / 客服` 访问预警或配置接口 SHALL 返回 403 且**不返回任何库存/预警数据**。
- 未登录（缺失/无效会话）访问预警或配置接口 SHALL 返回 401（错误码 `UNAUTHORIZED`，提示「请先登录」）。

- **Priority**: P0
- **Rationale**: 库存数据是经营敏感信息；仅运营可写防止越权篡改水位线；未登录 401 与越权 403 语义区分（story.md R-STOCK-009 明确要求未登录返回 401，区别于 sales-dashboard 的兜底 403 口径——见 design.md 决策 3）。

#### Scenario: 运营/老板角色可访问预警列表
- @api
- **GIVEN** 存在 `role=运营` 的登录会话（或 `role=老板`）
- **WHEN** 携带会话凭证请求 `GET /api/admin/dashboard/stock`
- **THEN** 返回状态码 200
- **AND** 返回预警列表数据（运营与老板均可只读访问）

#### Scenario: 客服/客户角色访问预警接口被拒绝（E2E 旅程）
- @e2e
- **GIVEN** 存在 `role=客服`（或 `role=客户`）的登录会话
- **WHEN** 访问 `GET /api/admin/dashboard/stock`
- **THEN** 返回 403，且不返回任何库存/预警数据
- **AND** B 端导航不展示「库存预警」入口（客户/客服不可见）

#### Scenario: 未登录访问预警接口被拒绝
- @api
- **GIVEN** 请求未携带会话凭证
- **WHEN** 访问 `GET /api/admin/dashboard/stock`
- **THEN** 返回状态码 401（错误码 `UNAUTHORIZED`）
- **AND** 不返回任何库存/预警数据

## Governance Mapping

- **Bounded Context**: `data-insights`（**新增 taxonomy**：`bc-data-insights → cap-stock-insight` Governs 边，参照既有 `bc-data-insights → cap-sales-dashboard` 先例，`domain_model.html` mappingGraph 行 970）；只读消费 `Catalog Context`（`Product.stock` 库存事实，不变量 `stock≥0` 不动）、`Order Context`（近7日订单销量聚合数据来源，复用 `buildProductRanking` 底座）；`Shared / Cross`（`frontend-ui` 横切支撑，`bc-shared → cap-ui`）
- **Capability Taxonomy**: `stock-insight`（**新增 taxonomy**，归属 data-insights BC；ROADMAP Phase 5 Guardrails 预留命名）；复用既有前瞻 ReadModel `Operator 库存看板`（`domain_model.html` readModels 行 877：运营查看销量与补货状态）
- **Process Alignment**: L1-05 支付确认（只读数据来源：PAID 订单时间归属）；L1-06 履约与完成（只读数据来源：Product.stock 库存扣减事实 + SHIPPED/COMPLETED 订单）；**L1-07 经营分析（只读支流，扩展）**——在"销售看板"旁新增「库存洞察」平行支流（预警列表 + 阈值配置）；**L3 交易规则节点（L3-01~L3-06，下单结算）零改动**，本 capability 不修改任何 L2/L3 交易节点语义
- **Service Blueprint**: `SB-STAGE-06`（成功回流 / B 端聚合回查，预警数据来源）；`SB-BACKSTAGE-01`（`Product.stock` 库存事实来源，只读消费）；`SB-BACKSTAGE-06`（**新增**「库存数据聚合」后台活动 + `stock-insight` 支撑 capability 节点，参照 `sales-dashboard` 支撑节点先例行 1046-1049）；`SB-CUSTOMER-*` 无变化
- **实现版本**: Node.js（后端只读聚合 API + 阈值配置写路由 + stock-config repo）＋ Frontend（B 端库存预警视图）
