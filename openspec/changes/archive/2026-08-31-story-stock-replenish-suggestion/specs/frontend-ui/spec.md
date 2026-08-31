# frontend-ui Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/frontend-ui/spec.md`（本 change 对既有能力的增量修改）。基准：Story 1 已建立「B 端库存预警视图」（8 列列表/Tabs/Badge）、「库存预警入口角色可见性」、「阈值配置区交互（运营写 / 老板只读）」Requirement；本 delta **只追加**补货建议列、日均销量/售罄天数列的单元格渲染行为与老板健康度总览的完整数据渲染，**不重复声明**既有列头/入口/配置区交互。治理归属：`bc-shared → cap-ui`（Cross-Context 横切支撑）。

## ADDED Requirements

### Requirement: 补货建议列渲染（R-STOCK-106 口径铁律）

系统 SHALL 将库存预警视图「建议补货量」列由 Story 1 的「—」占位替换为**真实计算值渲染**（数据来自 `GET /api/admin/dashboard/stock` 的 `replenish` 字段，前端不做 mock 计算）：

- `replenish > 0` → 显示 `{{ replenish }} 件`（`text-primary` 主色）。
- `replenish = 0` → 展示「无需补货」（`text-muted-foreground`）——**口径铁律（R-STOCK-106）**：无超卖风险 ⇔ 补货量公式结果为 0 ⇔ 展示「无需补货」，不以演示区分度为优先。
- `stock = 0`（已售罄）→ 显示 `{{ replenish }} 件`（`text-accent` accent 色，已售罄仍按公式给出建议量）。
- 表格顶部口径说明 SHALL 更新为真实公式：「超卖风险 = 预计售罄天数 &lt; 7 天 · 建议补货量 = max(0, ⌈日均销量×7⌉ − 当前库存)」（移除 Story 1「建议补货量待『补货建议』Story 补齐（P1）」占位文案）。
- 表格底部脚注保留：「到货周期固定 7 天（MVP）· 无销量商品不计算售罄天数」。

- **Priority**: P1
- **Rationale**: 「可视即价值」——运营从"拍脑袋补货"转向"销量速度驱动"（story.md 关键目标）；R-STOCK-106 铁律要求公式结果为 0 时展示「无需补货」而非数字 0（原型裁决，原型 `stock-insight.html` 建议补货量列三种渲染分支）。

#### Scenario: 建议补货量列三种渲染分支（R-STOCK-106）
- @e2e
- **GIVEN** 运营位于库存预警视图且存在预警商品数据：键盘(replenish=6)、显示器(replenish=0)、收纳架(stock=0, replenish=28)
- **WHEN** 运营查看「建议补货量」列
- **THEN** 极简机械键盘行显示「6 件」（`text-primary`）
- **AND** 高清显示器行显示「无需补货」（`text-muted-foreground`，公式结果为 0，R-STOCK-106 铁律）
- **AND** 桌面收纳架（已售罄）行显示「28 件」（`text-accent`）
- **AND** 标题旁口径说明展示「建议补货量 = max(0, ⌈日均销量×7⌉ − 当前库存)」，脚注保留「到货周期固定 7 天（MVP）」

### Requirement: 近7日日均销量与预计售罄天数单元格渲染

系统 SHALL 明确「近7日日均销量」与「预计售罄天数」两列的单元格渲染行为（对齐原型，数据来自 API `dailyAvg`/`daysToSellout` 字段，Story 1 已渲染列头与基础值，本 Requirement 固化单元格语义）：

- **近7日日均销量列**：有销量（`dailyAvg > 0`）→ 主值 `{{ dailyAvg }} 件/日`（`font-mono font-bold`，1 位小数）+ 小字「近7日 {{ sales7d }} 件」（`text-muted-foreground`）；无销量（`dailyAvg = 0`）→ 展示「暂无销量」（`text-muted-foreground`）。
- **预计售罄天数列**：有销量 → `{{ daysToSellout }} 天`（`font-mono font-bold`；已售罄 `stock=0` → `text-accent`；超卖风险 → `text-warning`；其余 `text-foreground`）；无销量 → 「—」（`text-muted-foreground`）。
- **无销量语义（R-STOCK-105）**：无销量商品不计算售罄天数与超卖风险（天数列「—」、无「超卖风险」Badge），但 `stock ≤ 阈值` 仍按水位入列预警。

- **Priority**: P1
- **Rationale**: 数值链（日均销量 → 售罄天数 → 补货量）是补货决策的可读性基础；无销量「暂无销量 / —」口径与 story.md 原型一致。

#### Scenario: 日均销量与售罄天数单元格渲染（含无销量）
- @e2e
- **GIVEN** 运营位于库存预警视图，存在有销量商品（键盘 dailyAvg=1.2、售罄 2.5 天）与无销量商品（stock=5 无订单）
- **WHEN** 运营查看「近7日日均销量」与「预计售罄天数」列
- **THEN** 极简机械键盘行显示「1.2 件/日」+ 小字「近7日 8 件」，售罄天数列显示「2.5 天」
- **AND** 无销量商品行日均销量列显示「暂无销量」、售罄天数列显示「—」、无「超卖风险」Badge
- **AND** 无销量商品仍按 `stock ≤ 阈值` 位于预警列表（R-STOCK-105 仍按水位入列）

### Requirement: 老板全局库存健康度总览（API 数据渲染）

系统 SHALL 将老板视图「全局库存健康度总览」卡片由 Story 1 的**前端 computed 统计框架**升级为**消费 API `healthOverview` 字段的完整渲染**（数据来源 `GET /api/admin/dashboard/stock`，后端权威口径、前端只读渲染）：

- **3 卡片**：预警商品数（`warningCount`，`text-primary`）/ 已售罄数（`soldOutCount`，`text-accent`）/ 超卖风险数（`riskCount`，`text-warning`），卡片副文案保留（「库存 ≤ 阈值 已入列监控」/「库存为 0 · 最需关注」/「售罄天数不足 7 天到货周期」）。
- 卡片区头部保留「全局库存健康度总览 · 只读」标题与「到货周期 7 天 · 数据来自近7日销量」说明。
- 仅 `role=老板` 视图渲染（运营视图不展示该卡片区，展示阈值配置区）。
- 老板视图 SHALL NOT 渲染任何阈值配置入口（复用 Story 1 既有约束）。

- **Priority**: P1
- **Rationale**: 老板一眼看到库存健康度（断货与压资金双向权衡）——story.md 关键目标；healthOverview 由后端聚合保证口径与预警列表同源一致（前端只读渲染，杜绝前后端统计漂移）。

#### Scenario: 老板健康度总览卡片数值与 API 一致
- @e2e
- **GIVEN** 老板角色会话已登录并进入库存预警视图（预警 4 项：含已售罄 1 项、超卖风险 2 项）
- **WHEN** 老板查看「全局库存健康度总览」
- **THEN** 预警商品数卡片显示 4（与 API `healthOverview.warningCount` 一致）
- **AND** 已售罄数卡片显示 1（`healthOverview.soldOutCount`）、超卖风险数卡片显示 2（`healthOverview.riskCount`）
- **AND** 页面无阈值配置入口（「纯只读 · 无配置入口」标识 + 无「保存配置」按钮与阈值输入框）

<details>
<summary>View UI Prototype Code（补货建议列 / 日均销量·售罄天数 / 健康度总览，节选自确认原型）</summary>

```html
<!-- 近7日日均销量：x.x 件/日 + 小字近7日 N 件；无销量 → 暂无销量 -->
<template v-if="p.dailyAvg > 0">
  <div class="font-mono font-bold text-foreground">{{ fmtAvg(p.dailyAvg) }} 件/日</div>
  <div class="font-mono text-[10px] text-muted-foreground mt-0.5">近7日 {{ p.sales7d }} 件</div>
</template>
<span v-else class="font-mono text-xs text-muted-foreground">暂无销量</span>

<!-- 预计售罄天数：N 天（已售罄 accent / 超卖风险 warning）；无销量 → — -->
<span v-if="p.dailyAvg > 0" class="font-mono font-bold" :class="daysColor(p)">{{ fmtDay(p.daysToSellout) }}</span>
<span v-else class="font-mono text-xs text-muted-foreground">—</span>

<!-- 建议补货量：replenish>0 primary / replenish=0 无需补货（R-STOCK-106 铁律）/ stock=0 accent -->
<template v-if="p.stock === 0">
  <span class="font-mono font-bold text-accent">{{ p.replenish }} 件</span>
</template>
<template v-else-if="p.replenish > 0">
  <span class="font-mono font-bold text-primary">{{ p.replenish }} 件</span>
</template>
<span v-else class="font-mono text-xs text-muted-foreground">无需补货</span>

<!-- 口径脚注（补货建议真实公式） -->
<p class="font-mono text-[10px] text-muted-foreground">到货周期固定 7 天（MVP）· 无销量商品不计算售罄天数</p>
```
</details>

## Governance Mapping

- **Bounded Context**: Shared / Cross（`domain_model.html` 映射表：`bc-shared → cap-ui`，Cross-Context）；被 `data-insights`（`stock-insight` capability）只读消费展示
- **Capability Taxonomy**: `frontend-ui`（修改：补货建议列真实渲染 + 日均销量/售罄天数单元格 + 老板健康度总览 API 渲染，无新增 taxonomy）
- **Process Alignment**: `L1-07` 经营分析（只读支流，扩展：库存洞察视图补货建议列与健康度总览渲染）；`L2`/`L3` 交易节点零改动；`L1-05/L1-06` 为只读数据来源（视图消费侧）
- **Service Blueprint**: `SB-STAGE-06`（成功回流 / B 端聚合回查，补货建议与健康度数据展示）；`SB-OPS-05`（B 端库存预警界面：补货建议列 + 老板健康度卡片）；`SB-BACKSTAGE-06`（后台「库存数据聚合与补货建议」接口消费）；`SB-CUSTOMER-*` 无变化
- **实现版本**: Frontend（B 端运营后台库存预警视图：建议补货量列三种渲染分支、日均销量/售罄天数单元格、老板健康度总览 API 渲染）
