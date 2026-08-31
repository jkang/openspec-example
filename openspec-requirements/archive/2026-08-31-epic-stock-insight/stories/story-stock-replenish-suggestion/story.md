# Story: 补货建议（预计售罸天数 + 建议补货量）+ 老板健康度总览

<!--
Story 是需求侧唯一冻结交付物（业务面）。
开发侧通过 /req:handoff（skill: handoff）以本 Story 为输入，在 openspec/changes/<name>/ 合成 proposal.md，
随后在开发侧按 capability 拆分生成行为规格 specs（Story-specs）。
需求侧不生成 specs/，行为规格一律由开发侧在 proposal 之后产出。
-->

> Story Key: `story-stock-replenish-suggestion` | 优先级: P1 | 依赖: story-stock-warning-list（库存洞察聚合底座 + 权限门禁 + 预警列表框架）
> 关联 Storymap: `epics/epic-stock-insight/storymap.md`
> 关联 Idea: `epics/epic-stock-insight/idea.md`
> 关联原型（Epic 整体）: `epics/epic-stock-insight/prototypes/stock-insight.html`

## 用户场景 (User Scenario)

- **目标用户（B 端）**：运营（补货决策负责人）、老板（决策者，只读全局库存健康度）。
- **使用动机**：补货有据可依——从"拍脑袋/Excel"转向"销量速度驱动"；老板一眼看到库存健康度（断货与压资金双向权衡），与销售看板形成经营决策闭环。
- **关键目标**：按近7日销量速度计算预计售罸天数与建议补货量；无销量商品展示「暂无销量」；老板只读全局库存健康度总览（预警商品数 / 已售罄数 / 超卖风险数）。
- **B 端视角**：
  - 后台怎么配置？—— 无新增配置项；到货周期 MVP 固定 7 天（不在后台暴露）；安全库存/个性化到货周期为 P2 候选。
  - 生命周期如何？—— 随订单与库存数据实时聚合，无独立生命周期；复用 story-stock-warning-list 的阈值配置底座（口径贯穿）。
  - 谁有权限？—— 复用预警 API 门禁：仅 `role=运营 / 老板`；老板只读总览（无配置入口）。

## 范围 (Scope)

### In Scope
- 近7日日均销量：`Σ(items.quantity) ÷ 7`，仅统计 `status ∈ {PAID, SHIPPED, COMPLETED}` 的成交订单（复用 sales-dashboard 销量聚合底座：`buildProductRanking` items.quantity 聚合 + `resolveDashboardRange` 近7日窗口换算）。
- 预计售罸天数 = `stock ÷ 日均销量`（日维度，可小数；`stock=0` → 0 天）。
- 建议补货量 = `max(0, ⌈日均销量 × 7⌉ − stock)`（到货周期 MVP 固定 7 天，不在后台暴露）。
- **口径铁律**：无超卖风险 ⇔ 补货量公式结果为 0 ⇔ UI 展示「无需补货」（不以演示区分度为优先）。
- 无销量商品：日均销量列展示「暂无销量」，不计算预计售罸天数/超卖风险；但 `stock ≤ 阈值` 仍按库存水位入列预警。
- 老板只读全局库存健康度总览：预警商品数 / 已售罄数 / 超卖风险数（无配置入口）。
- 口径透明标注：「日均销量 = 近7日销量 ÷ 7」「建议补货量按 7 天到货周期估算」（UI 脚注，对齐决策链）。

### Out of Scope
- 自动补货执行（触发采购/下单）。
- 安全库存、个性化到货周期（P2 候选）。
- 真实供应链/供应商集成、在途库存。
- C 端任何改动；PENDING_PAYMENT 占用纳入判定（P2 候选）。

## 原型参考 (Prototype Reference)

- 原型链接：`epics/epic-stock-insight/prototypes/stock-insight.html`
- 关键交互点：
  - 预警列表「近7日日均销量」列：`x.x 件/日` + 小字「近7日 N 件」；无销量商品展示「暂无销量」。
  - 「预计售罸天数」列：有销量显示 `N 天`（已售罄 0 天 accent 色；超卖风险 warning 色）；无销量显示「—」。
  - 「建议补货量」列：`stock=0` 时 accent 色显示建议量；`replenish > 0` 时 primary 色显示；`replenish = 0` 时展示「无需补货」（R-STOCK-106 铁律）。
  - 老板视图：标题旁「纯只读 · 无配置入口」标识 + 全局库存健康度总览 3 卡片（预警商品数 / 已售罄数 / 超卖风险数）。
  - 口径脚注：「到货周期固定 7 天（MVP）· 无销量商品不计算售罸天数」；ZAPP 设计令牌（slate 色系、零第三方图表库、无圆角无阴影）。

## 业务规则 (Business Rules)

| 规则ID | 规则描述 | 触发条件 | 期望结果 | 备注 |
| --- | --- | --- | --- | --- |
| R-STOCK-101 | 近7日日均销量 = 近7日成交订单 `Σ(items.quantity)` ÷ 7 | 聚合销量速度 | 返回日均销量（件/日） | 复用 sales-dashboard 销量聚合底座 |
| R-STOCK-102 | 销量状态集：仅 `status ∈ {PAID, SHIPPED, COMPLETED}` 计入；CANCELLED / PENDING_PAYMENT 不计入 | 聚合销量 | 排除未成交/已取消订单 | 按订单 `paidAt` 落入近7日窗口 |
| R-STOCK-103 | 预计售罸天数 = `stock ÷ 日均销量`（日维度）；`stock=0` → 0 天 | 有销量商品 | 返回售罸天数（可小数） | 无销量不计算（R-STOCK-105） |
| R-STOCK-104 | 建议补货量 = `max(0, ⌈日均销量 × 7⌉ − stock)` | 有销量商品 | 返回建议补货量（件，向上取整） | 到货周期 MVP 固定 7 天（决策口径④） |
| R-STOCK-105 | 无销量商品展示「暂无销量」，不计算售罸天数/超卖风险；`stock ≤ 阈值` 仍按水位入列 | 近7日无成交订单 | 日均销量列显示「暂无销量」，天数列「—」、无风险 Badge | 决策口径③ |
| R-STOCK-106 | 无超卖风险 ⇔ 补货量公式结果为 0 ⇔ UI 展示「无需补货」 | 渲染建议补货量列 | 公式结果为 0 的行展示「无需补货」 | 口径铁律（原型裁决，不以演示区分度为优先） |
| R-STOCK-107 | 老板只读全局库存健康度总览：预警商品数 / 已售罄数 / 超卖风险数 | role=老板 进入库存预警 | 展示 3 卡片统计；无配置入口 | 老板只读最小权限（决策口径②） |

## 验收标准 (E2E 用户旅程)

### 旅程 1：运营查看补货建议（公式一致性） (Ref: L1-07 | SB-STAGE-06, SB-BACKSTAGE-06)
#### 场景：正常主流程——建议补货量与公式逐项吻合（真实业务数据）
- @e2e
- **GIVEN** 存在近7日真实成交订单（含 PAID/SHIPPED/COMPLETED，排除 CANCELLED/PENDING_PAYMENT）与库存数据：极简机械键盘(stock=3, 近7日 8 件)、无线办公鼠标(8, 14 件)、高清显示器(5, 2 件)、桌面收纳架(0, 28 件)
- **AND** 存在 `role=运营` 登录会话，已进入库存预警页（阈值=全局默认 10）
- **WHEN** 查看「近7日日均销量 / 预计售罸天数 / 建议补货量」列
- **THEN** 极简机械键盘：日均 1.2 件/日、售罸 2.5 天、建议补货量 6 件（`⌈1.2×7⌉ − 3`）
- **AND** 无线办公鼠标：日均 2.0 件/日、售罸 4 天、建议补货量 6 件（`⌈2.0×7⌉ − 8`）
- **AND** 桌面收纳架（已售罄）：日均 4.0 件/日、售罸 0 天、建议补货量 28 件（`⌈4.0×7⌉ − 0`）
- **AND** 高清显示器：日均 0.3 件/日、售罸 16.7 天、建议补货量 = 0 → UI 展示「无需补货」（无超卖风险 ⇔ 公式为 0 ⇔ 无需补货）
- **AND** 全部建议补货量与公式 `max(0, ⌈日均销量×7⌉ − stock)` 逐一吻合（E2E 断言与订单明细一致）

#### 场景：无销量商品处理（仍按水位入列，不计算天数/风险）
- @e2e
- **GIVEN** 某商品近7日无成交订单且 stock=5（≤ 全局阈值 10）；另有一健康水位商品（stock=40）不入列
- **WHEN** 查看预警列表
- **THEN** 无销量商品仍按 `stock ≤ 阈值` 入列预警，日均销量列显示「暂无销量」
- **AND** 售罸天数列显示「—」、无超卖风险 Badge（不计算天数/风险）
- **AND** 建议补货量列展示「无需补货」（公式结果为 0，符合 R-STOCK-106 铁律）

### 旅程 2：老板只读健康度总览 (Ref: L1-07 | SB-STAGE-06, SB-BACKSTAGE-06)
#### 场景：正常主流程——老板查看全局库存健康度总览
- @e2e
- **GIVEN** 存在 `role=老板` 登录会话（`user_1003`）与真实库存/订单数据（预警商品 5 项：含已售罄 1 项、超卖风险 2 项）
- **WHEN** 进入「库存预警」
- **THEN** 展示全局库存健康度总览：预警商品数 = 5、已售罄数 = 1、超卖风险数 = 2
- **AND** 预警列表可见（含已售罄置顶与超卖风险标识）
- **AND** 页面无任何阈值配置区（标题旁展示「纯只读 · 无配置入口」标识）

#### 场景：老板写阈值配置被拒
- @api
- **GIVEN** 存在 `role=老板` 登录会话
- **WHEN** 调用写阈值配置接口（如 `PUT /api/admin/stock-config`）
- **THEN** 返回 403（仅 `role=运营` 可写）
- **AND** 前端不渲染任何配置入口（老板只读最小权限）

## 治理映射对齐 (Governance Mapping)

- Source of Truth: docs/baseline/domain_model.html
- Bounded Context: `data-insights`（**扩展**，新增 `stock-insight` capability taxonomy，`bc-data-insights → cap-stock-insight` Governs 边）；`Shared / Cross`（`frontend-ui` 横切支撑）；只读消费 `Catalog Context`（`Product.stock` 库存事实）、`Order Context`（近7日订单 items.quantity 销量聚合来源）
- Capability Taxonomy: `stock-insight`（**新增 taxonomy**，data-insights BC，销量速度 / 售罸天数 / 补货量 / 健康度总览）；`frontend-ui`（**修改**，bc-shared → cap-ui，补货建议列 + 老板健康度总览视图）
- Related Process Nodes: L1-05 支付确认、L1-06 履约与完成（只读数据来源）；**L1-07 经营分析（只读支流）**——「库存洞察」支流内的销量速度聚合与健康度总览
- Related Service Blueprint Nodes: SB-STAGE-06（成功回流 / B 端聚合回查，数据来源）；SB-BACKSTAGE-01（`Product.stock` 库存事实来源，只读消费）；SB-BACKSTAGE-06（「库存数据聚合与补货建议」后台活动 + `stock-insight` 支撑能力节点，与 sales-dashboard 支撑节点并行，先例行 1046-1049）；SB-CUSTOMER-* 无变化
- Sync Assessment: **Yes** — 与 warning-list 同属 `stock-insight` capability（新增 taxonomy）与 SB-BACKSTAGE-06 后台活动扩展（Epic 级变化，理由同 idea.md 第 8 章）；按分层 Sync 机制，Epic 全部 Story 归档后统一执行 Baseline Sync

## 分析制品索引 (Analysis Artifacts)

- 故事详述: `epics/epic-stock-insight/analysis/narrative/story-stock-replenish-suggestion/narrative.md` — ❌ 未生成（本 Story 业务规则与 E2E 验收已完整，不额外生成）

## 交接状态 (Handoff Status)

- [x] 待开发交接 (openspec-handoff)
- [x] 已交接 (changeName: `story-stock-replenish-suggestion` 记录于 openspec/epic-stock-insight.story-list.json)
