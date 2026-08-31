# stock-insight Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/stock-insight/spec.md`（本 change 对既有能力的增量扩展）。基准：Story 1 已建立「低库存预警列表（只读聚合）」「阈值配置（全局默认 + 商品级覆盖）」「预警与配置接口权限门禁」3 个 Requirement，其 `dailyAvg`（近7日销量 ÷ 7）/`daysToSellout`（预计售罄天数）/`risk`（超卖风险）为**既有底座**，本 delta **不重复声明**已存在行为，仅追加「补货建议」行为。治理归属：`data-insights` → `stock-insight`（既有 taxonomy，`bc-data-insights → cap-stock-insight` Governs 边 Story 1 已声明，Epic 归档后统一 Baseline Sync 回流）。

## ADDED Requirements

### Requirement: 补货建议（日均销量 · 售罄天数 · 建议补货量 · 老板健康度总览）

系统 SHALL 在既有 `GET /api/admin/dashboard/stock` 只读聚合响应上**增量扩展补货建议行为**（R-STOCK-101~107，复用 Story 1 已建立的近7日销量聚合与预计售罄天数底座）：

- **近7日日均销量（R-STOCK-101/102，口径延续既有底座）**：`dailyAvg = 近7日成交订单 Σ(items.quantity) ÷ 7`；仅 `status ∈ {PAID, SHIPPED, COMPLETED}` 计入，按订单 `paidAt` 落入近7日窗口；CANCELLED / PENDING_PAYMENT 不计入。聚合返回时 SHALL 将 `dailyAvg` **向上取整到 0.1 件/日**（如 8 件 ÷ 7 → 1.2），保证日均销量 → 售罄天数 → 建议补货量数值链与业务验收口径一致。
- **预计售罄天数（R-STOCK-103，复用既有底座）**：`daysToSellout = stock ÷ dailyAvg`（日维度，可小数）；`stock=0` → 0 天；近7日无销量（`dailyAvg=0`）→ `null`（不计算天数）。
- **建议补货量（R-STOCK-104，新增字段 `replenish`）**：`replenish = max(0, ⌈dailyAvg × 7⌉ − stock)`（到货周期 MVP 固定 7 天，不在后台暴露）；结果以整数件返回。
- **口径铁律（R-STOCK-106）**：无超卖风险 ⇔ 补货量公式结果为 0 ⇔ UI 展示「无需补货」；公式结果为 0 的商品 SHALL 以 `replenish=0` 返回并展示「无需补货」（不以演示区分度为优先）。
- **无销量处理（R-STOCK-105）**：近7日无成交订单的商品 `dailyAvg=0` → `daysToSellout=null`、`replenish=0`（公式天然落 0）；该商品若 `stock ≤ 有效阈值` 仍按库存水位入列预警，但不计算售罄天数/超卖风险。
- **老板健康度总览（R-STOCK-107，新增字段 `healthOverview`）**：响应顶层新增只读统计 `healthOverview = { warningCount: 预警商品数, soldOutCount: 已售罄数（stock=0）, riskCount: 超卖风险数 }`，与预警列表同源同口径（对入列预警项统计，后端权威聚合、前端只读渲染）；运营/老板均可只读访问。
- **只读语义延续**：本扩展 SHALL NOT 引入任何写操作（纯计算字段扩展，无实体/聚合变更、无新增路由/中间件）。

- **Priority**: P1
- **Rationale**: 补货从"拍脑袋/Excel"转向"销量速度驱动"（story.md 用户场景）；到货周期 MVP 固定 7 天（决策口径④）；无超卖风险 ⇔ 补货量 0 ⇔ 「无需补货」为口径铁律（原型裁决）；老板只读健康度总览支撑断货与压资金双向决策（决策口径②⑦）。

#### Scenario: 建议补货量公式逐项吻合（真实业务数据）
- @unit
- **GIVEN** 近7日真实成交订单与库存：极简机械键盘(stock=3, 近7日 8 件)、无线办公鼠标(8, 14 件)、桌面收纳架(0, 28 件)、高清显示器(5, 2 件)
- **WHEN** 聚合计算 dailyAvg（向上取整到 0.1）与建议补货量 `max(0, ⌈dailyAvg×7⌉ − stock)`
- **THEN** 极简机械键盘：`dailyAvg=1.2`、`daysToSellout=2.5`、`replenish=6`（⌈1.2×7⌉−3 = 9−3）
- **AND** 无线办公鼠标：`dailyAvg=2.0`、`daysToSellout=4`、`replenish=6`（14−8）
- **AND** 桌面收纳架（已售罄）：`dailyAvg=4.0`、`daysToSellout=0`、`replenish=28`（28−0）
- **AND** 高清显示器：`dailyAvg=0.3`、`daysToSellout=16.7`、`replenish=0`（⌈0.3×7⌉−5 = max(0,−2)）
- **AND** 全部建议补货量与公式 `max(0, ⌈日均销量×7⌉ − stock)` 逐一吻合

#### Scenario: 无销量商品补货语义（R-STOCK-105）
- @unit
- **GIVEN** 商品 A 近7日无成交订单（sales7d=0）且 stock=5（≤ 全局阈值 10）；商品 B 有销量（sales7d=28）且 stock=0
- **WHEN** 聚合计算补货字段
- **THEN** 商品 A `dailyAvg=0`、`daysToSellout=null`、`replenish=0`（无销量不计算天数/风险，仍按 `5 ≤ 10` 入列预警）
- **AND** 商品 B `daysToSellout=0`、`replenish=28`（已售罄仍按公式给出建议补货量）

#### Scenario: 补货建议 API 响应扩展（replenish + healthOverview 字段）
- @api
- **GIVEN** 存在 `role=运营` 的登录会话与真实商品/订单数据
- **WHEN** 运营请求 `GET /api/admin/dashboard/stock`
- **THEN** 返回状态码 200
- **AND** 预警列表每项包含 `replenish`（整数件）字段；无销量商品 `replenish=0`
- **AND** 响应顶层包含 `healthOverview = { warningCount, soldOutCount, riskCount }`（与列表统计一致）
- **AND** 本次请求后商品库存、订单与配置文件均无任何变更（只读聚合）

#### Scenario: 老板只读健康度总览上下文写阈值配置被拒
- @api
- **GIVEN** 存在 `role=老板` 的登录会话（可只读访问预警聚合与 `healthOverview`）
- **WHEN** 携带老板会话凭证请求 `PUT /api/admin/stock-config`（或 `PUT /api/admin/products/{id}/stock-config`）
- **THEN** 返回状态码 403（错误码 `FORBIDDEN`，复用 R-STOCK-006/007/009 门禁）
- **AND** 配置文件不发生任何变更（老板只读最小权限，无配置入口，R-STOCK-107 决策口径②）

#### Scenario: 运营查看补货建议主流程（E2E 旅程 1 场景 1：公式与订单明细一致）
- @e2e
- **GIVEN** 存在近7日真实成交订单（含 PAID/SHIPPED/COMPLETED，排除 CANCELLED/PENDING_PAYMENT）与库存数据：极简机械键盘(stock=3, 近7日 8 件)、无线办公鼠标(8, 14 件)、高清显示器(5, 2 件)、桌面收纳架(0, 28 件)
- **AND** 存在 `role=运营` 登录会话，已进入库存预警页（阈值=全局默认 10）
- **WHEN** 运营查看「近7日日均销量 / 预计售罄天数 / 建议补货量」列
- **THEN** 极简机械键盘：日均 1.2 件/日、售罄 2.5 天、建议补货量 6 件（`⌈1.2×7⌉ − 3`）
- **AND** 无线办公鼠标：日均 2.0 件/日、售罄 4 天、建议补货量 6 件（`⌈2.0×7⌉ − 8`）
- **AND** 桌面收纳架（已售罄）：日均 4.0 件/日、售罄 0 天、建议补货量 28 件（`⌈4.0×7⌉ − 0`）
- **AND** 高清显示器：日均 0.3 件/日、售罄 16.7 天、建议补货量 = 0 → UI 展示「无需补货」（无超卖风险 ⇔ 公式为 0 ⇔ 无需补货，R-STOCK-106 铁律）
- **AND** 全部建议补货量与公式 `max(0, ⌈日均销量×7⌉ − stock)` 逐一吻合（E2E 断言与订单明细一致）

#### Scenario: 无销量商品处理（E2E 旅程 1 场景 2：仍按水位入列，不计算天数/风险）
- @e2e
- **GIVEN** 某商品近7日无成交订单且 stock=5（≤ 全局阈值 10）；另有一健康水位商品（stock=40）不入列
- **WHEN** 运营查看预警列表
- **THEN** 无销量商品仍按 `stock ≤ 阈值` 入列预警，日均销量列显示「暂无销量」
- **AND** 售罄天数列显示「—」、无超卖风险 Badge（不计算天数/风险）
- **AND** 建议补货量列展示「无需补货」（公式结果为 0，符合 R-STOCK-106 铁律）

#### Scenario: 老板查看全局库存健康度总览（E2E 旅程 2 场景 1）
- @e2e
- **GIVEN** 存在 `role=老板` 登录会话（user_1003 保全种子）与真实库存/订单数据（预警 4 项：含已售罄 1 项、超卖风险 2 项——memory 模式保全版）
- **WHEN** 老板进入「库存预警」
- **THEN** 展示全局库存健康度总览：预警商品数 = 4、已售罄数 = 1、超卖风险数 = 2（数值与 API `healthOverview` 一致）
- **AND** 预警列表可见（含已售罄置顶与超卖风险标识）
- **AND** 页面无任何阈值配置区（标题旁展示「纯只读 · 无配置入口」标识）

## Governance Mapping

- **Bounded Context**: `data-insights`（**扩展既有 capability**：`bc-data-insights → cap-stock-insight` Governs 边 Story 1 已声明，`domain_model.html` mappingGraph 待 Epic 归档后 Baseline Sync 回流；本 change 补充补货建议行为语义）；只读消费 `Catalog Context`（`Product.stock` 库存事实）、`Order Context`（近7日订单销量聚合，复用 `buildProductRanking`/`aggregateSales` 底座）；`Shared / Cross`（`frontend-ui` 横切支撑，`bc-shared → cap-ui`）
- **Capability Taxonomy**: `stock-insight`（既有 taxonomy，Story 1 已建；本 change 在既有 Requirement 之上追加「补货建议」Requirement——日均销量/售罄天数/建议补货量/健康度总览，非新增 taxonomy）；复用既有前瞻 ReadModel `Operator 库存看板`（`domain_model.html` readModels 行 877：运营查看销量与补货状态）
- **Process Alignment**: L1-05 支付确认（只读数据来源：PAID 订单 `paidAt` 时间归属）；L1-06 履约与完成（只读数据来源：Product.stock 库存扣减事实 + SHIPPED/COMPLETED 订单）；**L1-07 经营分析（只读支流，扩展）**——「库存洞察」支流内新增销量速度聚合（日均销量/售罄天数/建议补货量）与老板健康度总览，不作为交易节点修改；**L3 交易规则节点（L3-01~L3-06，下单结算）零改动**
- **Service Blueprint**: `SB-STAGE-06`（成功回流 / B 端聚合回查，补货建议数据来源）；`SB-BACKSTAGE-01`（`Product.stock` 库存事实来源，只读消费）；`SB-BACKSTAGE-06`（「库存数据聚合与补货建议」后台活动扩展——Story 1 已声明 `stock-insight` 支撑节点，本 change 补充补货建议与健康度聚合语义）；`SB-OPS-05`（B 端库存预警界面，补货建议列 + 老板健康度卡片）；`SB-CUSTOMER-*` 无变化
- **实现版本**: Node.js（`GET /api/admin/dashboard/stock` 响应扩展：`replenish`/`healthOverview` 字段；`StockInsightService` 复用三源聚合底座追加计算）＋ Frontend（B 端库存预警视图补货建议列 + 老板健康度总览）
