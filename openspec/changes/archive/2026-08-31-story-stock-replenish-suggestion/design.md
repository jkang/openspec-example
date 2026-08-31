# Design: story-stock-replenish-suggestion

> 关联 proposal：`openspec/changes/story-stock-replenish-suggestion/proposal.md`
> 关联需求侧：story.md（R-STOCK-101~107 + E2E 旅程 1/2）/ 原型 `stock-insight.html`（Epic 整体，已确认）
> 关联 specs：`specs/stock-insight/spec.md`（增量）、`specs/frontend-ui/spec.md`（增量）
> 依赖底座：Story 1 `story-stock-warning-list`（已归档 2026-08-31）——`requireRoleStrict` 门禁、stock-config 阈值配置、`StockInsightService` 三源聚合、`dailyAvg`/`daysToSellout`/`risk` 字段、前端库存预警视图（建议补货量列「—」占位）

## Context (上下文)

本 change 在 Story 1 已建成的库存预警底座上**增量扩展补货建议行为**（见 proposal.md - Why/What）：`GET /api/admin/dashboard/stock` 响应追加 `replenish`（建议补货量）与 `healthOverview`（老板健康度总览）字段；前端「建议补货量」列由「—」占位替换为真实计算值（R-STOCK-106 铁律：replenish=0 → 「无需补货」），并补齐日均销量/售罄天数单元格渲染与老板健康度卡片 API 渲染。

**关键口径分析（数值链自洽性）**：story.md 冻结验收数值「键盘 8 件 → 日均 1.2 → 售罄 2.5 天 → 建议补货量 6 件」要求 `dailyAvg` 按**向上取整到 0.1**（`ceil(8/7×10)/10 = 1.2`）聚合返回；若沿用 Story 1 的 round3 口径（1.143/2.625），显示为 1.1/2.6，与需求侧验收不符。本设计将数值链统一到 ceil 口径（见决策 1）。

约束：预警聚合保持**只读**（本 Epic 唯一写操作仍为阈值配置）；金额/库存整型（补货量取整件）；Domain 层零外部依赖；前端与确认原型完全对齐（ZAPP 语义令牌，无圆角无阴影，全中文）。

## Domain Boundary Impact (领域边界影响)

- **`data-insights`（扩展既有 capability，非新增 taxonomy）**：`stock-insight` capability 追加「补货建议」行为（`replenish`/`healthOverview` 计算）。**归属理由**：与 Story 1 同源——销量速度聚合是"经营分析"只读域的另一面（对交易数据只读消费、服务运营/老板决策），延续 `bc-data-insights → cap-stock-insight` Governs 边（Story 1 已声明新增，`domain_model.html` mappingGraph 行 970 后待 Epic 归档统一回流）；`healthOverview` 是老板决策 ReadModel 的统计视图，天然属只读洞察域。
- **Catalog Context（只读消费）**：`Product.stock` 库存事实来源（`domain_model.html` aggregateCatalog 行 888）；不变量 `stock ≥ 0` 与库存扣减时机（行 864）零改动——补货量仅计算不落库。
- **Order Context（只读消费）**：近7日订单销量聚合来源，继续复用 `aggregateSales`/`buildProductRanking` 底座（`SALES_STATUSES = {PAID, SHIPPED, COMPLETED}` 状态集 + `paidAt` 窗口）；订单状态流转语义零改动。
- **Shared / Cross（修改）**：`frontend-ui` 横切支撑扩展——补货建议列三种渲染分支、日均销量/售罄天数单元格、老板健康度总览 API 渲染（`bc-shared → cap-ui`）。
- **User Context（零改动）**：复用 `user_1003`（role=老板）种子与既有 `requireRoleStrict` 门禁；无新角色/账号变更。

## Process Delta (流程影响)

- 交易主流程（L1-01~L1-06）**零改动**；L3 交易规则节点（L3-01~L3-06，下单结算）**零改动**。
- **L1-07 经营分析（只读支流）扩展**：「库存洞察」支流内新增**销量速度聚合**（近7日日均销量 → 预计售罄天数 → 建议补货量，数值链）与**老板全局健康度总览**（预警/已售罄/超卖风险三计数）。数据来源为 L1-05 支付确认（PAID 订单 `paidAt` 时间归属）与 L1-06 履约与完成（Product.stock 扣减事实 + SHIPPED/COMPLETED 订单）。
- 不修改任何 L2/L3 节点的进入/退出条件；L1-07 的 owner（Data Insights BC / Order BC 只读消费 / User BC 角色门禁）不变。

## Service Blueprint Sync Assessment (服务蓝图同步评估)

- **Needs Sync: No**（本 change 级；Epic 级需 Sync——理由如下）
- **触发项（Epic 级 Yes，理由写清）**：分层 Sync 机制（change 级只做 Spec Sync `/opsx:sync`；Baseline Sync `/opsx:baseline/sync` 在 Epic `epic-stock-insight` 全部 Story 归档后统一执行）。本 change 为 Epic 的 P1 Story 之一，单 Story 不触发基线回写，但该 Epic 完整交付后 `service_blueprint.html` 需要更新：
  1. **SB-BACKSTAGE-06**（行 1026，后台核心活动）既有「库存数据聚合」活动语义扩展为「库存数据聚合与**补货建议**」（activity-list 追加日均销量/售罄天数/建议补货量/健康度聚合条目；`stock-insight` 支撑 capability 节点补充补货建议语义）。
  2. **SB-STAGE-06**（行 554，成功回流）B 端聚合回查语义扩展（库存预警 + 补货建议回查）。
  3. **SB-OPS-05**（行 830，B 端运营/老板视角）补充补货建议列与健康度总览交互语义。
- **计划更新部位**：`docs/baseline/service_blueprint.html` 的 SB-BACKSTAGE-06 activity-list + capability-desc、SB-STAGE-06 stage-note、SB-OPS-05 activity-list。
- **Evidence Source**：proposal.md「Service Blueprint Alignment」、story.md 旅程映射、specs 各能力 Governance Mapping。

## Domain Model Sync Assessment (领域模型同步评估)

- **Needs Sync: No**（本 change 级；Epic 级需 Sync——理由如下）
- **触发项（Epic 级 Yes，理由写清）**：本 change 与 Story 1 同属 `stock-insight` capability 的 Epic 级结构变化，按分层 Sync 在 Epic 全部 Story 归档后统一执行 `domain_model.html` 更新：
  1. **capability taxonomy `stock-insight` 回流**（Story 1 已声明新增但基线未回流）：mappingGraph 增加节点 `cap-stock-insight` + 边 `bc-data-insights → cap-stock-insight`（Governs，规则含"库存预警聚合与补货建议，只读消费 Product.stock 与订单销量"）。
  2. **Policy 新增**（policies 表，参照行 869/870）：`DataInsights 补货建议口径`——dailyAvg 向上取整 0.1；售罄天数 = stock ÷ dailyAvg（无销量 null、stock=0 → 0）；建议补货量 = max(0, ⌈dailyAvg×7⌉ − stock)（到货周期 7 天）；无超卖风险 ⇔ 补货量 0 ⇔ 「无需补货」。
  3. **ReadModel 语义补充**：既有 `Operator 库存看板`（行 877，运营查看销量与补货状态）在 Epic 归档后可补充"补货建议/健康度总览"语义（可选增强，非强制）。
  4. **User Aggregate 角色 invariant 滞后修复**：行 926 invariant 仍写 `role ∈ {客户, 运营, 客服}`，需补 `老板`（Story 1 已声明）。
- **计划更新部位**：`docs/baseline/domain_model.html` 的 mappingGraph nodes/edges、policies、readModels、User aggregate 角色 invariant。
- **Evidence Source**：proposal.md「Impacted Bounded Contexts」、story.md「治理映射对齐 - Sync Assessment: Yes」、specs Governance Mapping。

## Goals / Non-Goals

- **Goals**：补货量公式与 story.md 验收数值逐项吻合（键盘 6/鼠标 6/收纳架 28/显示器 0→「无需补货」）；数值链口径统一（dailyAvg 向上取整 0.1 → 售罄天数 → 补货量自洽）；`healthOverview` 后端权威聚合、老板卡片 API 渲染；无销量语义（暂无销量 / — / 无需补货）完整；仅读聚合零写操作；前端与原型完全对齐（ZAPP 令牌、无圆角无阴影、真实中文数据）。
- **Non-Goals**：不做自动补货执行（触发采购/下单）；不做安全库存/个性化到货周期（P2）；不做 PENDING_PAYMENT 占用纳入判定（P2）；不做 C 端改动；不修改既有 `dailyAvg`/`daysToSellout` 的**业务语义**（仅收窄舍入口径，风险/排序结论不变）；不新增配置项与写接口。

## Decisions (技术决策)

1. **数值口径统一：dailyAvg 向上取整到 0.1 件/日（对齐 story.md 冻结验收）**。`StockInsightService.aggregate()` 聚合时 `dailyAvg = Math.ceil((sales7d / 7) × 10) / 10`（键盘 8/7 → 1.2、鼠标 2.0、收纳架 4.0、显示器 2/7 → 0.3）；后续 `daysToSellout = stock ÷ dailyAvg`（键盘 3/1.2 = 2.5、显示器 5/0.3 ≈ 16.67 → 显示 16.7）、`risk`（2.5/4 < 7 风险、16.7 ≥ 7 无风险）、`replenish = max(0, ⌈dailyAvg×7⌉ − stock)`（6/6/28/0）全链自洽。**替代方案**：保留 Story 1 round3 口径（1.143/2.625）——每日均显示 1.1、售罄 2.6，与 story.md「1.2/2.5」验收不符，弃用；直接用整数 sales7d 算补货量（`max(0, sales7d−stock)`）——键盘得 5 件，与冻结验收 6 件不符，弃用。**影响面**：需同步更新 2 处既有 @unit 断言（`stockInsight.spec.js` dailyAvg 8/7≈1.143→1.2、daysToSellout 2.625→2.5）；E2E 区间断言（within 2.4~2.8）与风险/排序断言不受影响；前端 `formatStockAvg`/`formatStockDay`（toFixed(1)）无需改动。
2. **补货量/健康度下沉 Domain + Service 增量扩展（四层架构不变）**。Domain 层 `src/domain/stock.js` 新增纯函数 `suggestReplenish(stock, dailyAvg) = max(0, Math.ceil(dailyAvg*7) − stock)`（零外部依赖；无销量 dailyAvg=0 → `ceil(0)=0` → `max(0, −stock)=0` 天然落 0，无需特判；@unit 直接测）。Service 层 `aggregate()` 增量：items 追加 `replenish`；响应顶层追加 `healthOverview = { warningCount, soldOutCount, riskCount }`（对**入列预警项**统计，与列表同源同口径，对齐 Story 1 前端 computed 语义）。**替代方案**：前端 computed 计算 replenish/healthOverview——弃用：需求侧要求后端权威口径（R-STOCK-101~107 为 API 语义），且与 E2E 数值断言可验证性冲突。
3. **前端只读渲染：建议补货量列三分支 + 健康度卡片消费 API**。建议补货量列按原型三分支渲染：`stock=0` → accent 建议量；`replenish>0` → primary 数量；`replenish=0` → 「无需补货」（R-STOCK-106 铁律，`text-muted-foreground`）；老板健康度卡片由 Story 1 的「前端 computed 框架」替换为**消费 `healthOverview` 字段**（后端权威，前端只读渲染 3 卡片）；标题说明更新为真实公式（移除「待 P1 补齐」占位）。数据全部来自 API，前端不做 mock 计算。
4. **E2E 扩展既有 `stock_warning.feature`（不新建 feature）**。补货建议属同一「库存预警」视图、同一数据种子（`STOCK_BASELINE`/`SALES_QTY` 与 `stockWarningSetupScenarioData`/`stockWarningSetupBossData` 构造辅助直接复用），在既有 feature 新增 4 场景（补货建议公式一致 / 无销量处理 / 老板健康度数值 / 老板写阈值配置 403），步骤沿用 `stock_warning_` 命名空间。**替代方案**：新建 `stock_replenish.feature` + 独立 steps——弃用：同一视图重复搭建数据基建，且 `Before` hook 每场景 reset 后端，共享 feature 无隔离风险。

## 架构图

```mermaid
flowchart LR
    subgraph FE[Frontend · App.vue 库存预警视图]
        C1[建议补货量列<br/>replenish>0 primary / =0 无需补货 / stock=0 accent]
        C2[日均销量·售罄天数列<br/>x.x 件/日 + 近7日 N 件 / N 天·超卖warning / 暂无销量·—]
        C3[老板健康度总览<br/>healthOverview 三卡片]
    end

    subgraph HTTP[HTTP 层 · server.js]
        R1[GET /api/admin/dashboard/stock<br/>requireRoleStrict 运营/老板·未登录401]
    end

    subgraph SVC[Service 层 · StockInsightService]
        S1[aggregate 三源组装<br/>dailyAvg ceil0.1 口径]
        S2[replenish + healthOverview<br/>增量计算]
    end

    subgraph DOM[Domain 层 · 纯函数]
        D1[suggestReplenish<br/>max(0, ceil(dailyAvg×7) − stock)]
        D2[daysToSellout / isOversellRisk<br/>Story 1 既有底座]
    end

    subgraph REPO[Repo 层]
        P[Product.stock 只读]
        O[近7日销量 aggregateSales 只读]
        Cfg[stock-config.json 只读]
    end

    C1 & C2 & C3 --> R1
    R1 --> S1 --> D1 & D2
    S1 --> P & O & Cfg
    S2 --> S1
```

## Risks / Trade-offs

- **dailyAvg 舍入口径变更的既有断言回归** → Story 1 @unit 断言（dailyAvg 1.143 / daysToSellout 2.625）需同步更新为 ceil 口径（1.2/2.5）。缓解：tasks 显式列出「同步更新既有断言」任务并跑 `./init.sh node:test` 全量回归；E2E 区间断言（2.4~2.8 含 2.5）与前端 toFixed(1) 显示天然兼容。
- **ceil 口径对风险判定的边界漂移** → `daysToSellout` 变小（更易判风险）。缓解：4 个种子商品结论不翻转；语义变更已记录 design 决策 1；边界商品由 P2「安全库存/个性化到货周期」覆盖。
- **healthOverview 统计口径边缘（风险商品不入列）** → 若某商品 `risk=true` 但 `stock > 有效阈值`（不入列），不进入 riskCount。缓解：MVP 接受（对齐 Story 1 前端 computed 语义），healthOverview 定义明确「对入列预警项统计」，spec 已固化。
- **浮点计算** → 补货量 `Math.ceil` 结果取整件返回（整数），无浮点金额参与；`stock`/`sales7d` 均为整数源，计算路径无金额浮点风险。
- **前端「无需补货」误读为缺陷** → R-STOCK-106 铁律在 spec/tasks 双重声明；标题口径说明更新为真实公式，脚注保留「到货周期固定 7 天（MVP）」。

## Open Questions

- 无（story.md 决策口径①~⑧与 R-STOCK-101~107 已定稿；数值链歧义已在 design 决策 1 解决；E2E 验收与业务规则完整，实现按本 design 决策执行）。
