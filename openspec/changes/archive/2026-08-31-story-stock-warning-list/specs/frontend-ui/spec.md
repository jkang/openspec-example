# frontend-ui Specification (Delta)

> 增量文件：追加于主 specs `openspec/specs/frontend-ui/spec.md`（本 change 对既有能力的修改）。基准：确认原型 `openspec-requirements/epics/epic-stock-insight/prototypes/stock-insight.html`（Epic 整体，已 HITL 确认）。治理归属：`bc-shared → cap-ui`（Cross-Context 横切支撑）。

## ADDED Requirements

### Requirement: B 端库存预警视图

系统 SHALL 在 B 端运营后台提供「库存预警」视图（复用既有运营后台单屏布局：左侧导航 + 右侧内容区；导航项归入「经营分析」分组、与「销售看板」并列），包含：**预警列表**（8 列：商品名/当前库存/预警阈值（覆盖值标「覆盖」、全局值标「全局」）/近7日日均销量/预计售罄天数/超卖风险标识/建议补货量/状态）+「预警中 / 健康水位」**Tabs** 切换 + 已售罄/超卖风险 **Badge** + 排序口径脚注（「排序：已售罄置顶 · 其余按预计售罄天数升序（最紧迫在前）」）。所有视觉遵循 ZAPP 语义令牌（`--warning` `#FF9A00` 低库存警示、`bg-accent` 已售罄、`bg-success` 库存充足、`font-mono` 数字/标签、`bg-background` 地面、`bg-card`/`border-border` 面板、无圆角无阴影、真实中文数据）。

- **Priority**: P0
- **Rationale**: 「可视即价值」——运营进入即见低库存清单与紧迫度排序，兑现 Phase 5「售罄前主动预警」（与确认原型完全对齐）。

#### Scenario: 运营进入库存预警视图渲染预警列表
- @e2e
- **GIVEN** 运营已登录 B 端后台且存在预警商品数据
- **WHEN** 运营点击「经营分析 / 库存预警」导航项
- **THEN** 导航项「库存预警」以左侧 3px 实线 + `bg-primary` 高亮（与「销售看板」并列）
- **AND** 预警列表展示 8 列（商品名/当前库存/预警阈值/近7日日均销量/预计售罄天数/超卖风险标识/建议补货量/状态）
- **AND** 预警阈值列对覆盖值标注「覆盖」（`--warning`）、对全局值标注「全局」
- **AND** 表格底部展示排序脚注「排序：已售罄置顶 · 其余按预计售罄天数升序（最紧迫在前）」
- **AND** 页面任意元素无圆角/阴影，边框为 1px `border-border`，地面 `bg-background`、面板 `bg-card`

#### Scenario: 预警中/健康水位 Tabs 切换
- @e2e
- **GIVEN** 运营位于库存预警视图且存在预警商品与健康水位商品
- **WHEN** 运营点击「健康水位」Tab
- **THEN** 列表切换为健康水位商品（如桌面拾音氛围灯 stock=40，不入列预警）
- **AND** 点击「预警中」Tab 恢复预警列表，Tab 计数与列表项数一致

#### Scenario: 已售罄与超卖风险 Badge 渲染
- @e2e
- **GIVEN** 预警列表存在已售罄商品与超卖风险商品
- **THEN** 已售罄商品（stock=0）行展示 accent「已售罄」Badge 且置顶
- **AND** 超卖风险商品行展示 `--warning` 琥珀「超卖风险」Badge 与「低库存」状态
- **AND** 无风险预警商品展示普通「低库存」状态（1px `border-border` 标签）

#### Scenario: 空状态反馈中文化
- @unit
- **GIVEN** 预警列表当前 Tab 无数据
- **THEN** 空状态展示中文「当前无预警商品 · 全部商品处于健康水位」（或「当前无健康水位商品 · 全部商品已入列预警」）
- **AND** 不出现任何英文占位文案

### Requirement: 库存预警入口角色可见性

系统 SHALL 按当前会话真实角色决定「库存预警」导航入口可见性（对齐 R-DASH-006 看板角色门禁）：仅 `role=运营 / 老板` 会话下「经营分析」分组显示「库存预警」入口；`role=客户 / 客服` 或未登录会话 SHALL NOT 显示该入口。

- **Priority**: P0
- **Rationale**: 库存数据属经营敏感信息，入口可见性由真实角色驱动（与「销售看板」同一门禁语义）。

#### Scenario: 运营与老板可见库存预警入口
- @e2e
- **GIVEN** 运营（或老板）角色会话已登录 B 端后台
- **WHEN** 查看左侧导航「经营分析」分组
- **THEN** 分组下同时显示「销售看板」与「库存预警」入口
- **AND** 点击「库存预警」可进入预警视图

#### Scenario: 客户与客服不可见库存预警入口
- @e2e
- **GIVEN** 客服（或客户）角色会话已进入 B 端后台
- **WHEN** 查看左侧导航「经营分析」分组
- **THEN** 分组下不显示「库存预警」入口（仅「销售看板」可见性按既有规则）

### Requirement: 阈值配置区交互（运营写 / 老板只读）

系统 SHALL 按角色渲染阈值配置区（对齐原型）：

- **运营**：顶部「全局默认阈值」输入 +「保存配置」按钮；保存成功后展示「✓ 已保存 · 阈值已即时生效」（`text-success`，3 秒后消失）；预警列表行内对覆盖阈值商品展示**商品级覆盖阈值编辑框**（`aria-label=商品级覆盖阈值`），修改后保存即时生效并刷新列表；配置区标注「仅运营可配置 · 即时生效」。
- **老板**：无配置区；标题旁展示「纯只读 · 无配置入口」标识（`font-mono` 边框标签）；展示**全局库存健康度总览卡片**框架（预警商品数 / 已售罄数 / 超卖风险数，`--primary`/`--accent`/`--warning` 数值色）。
- 所有输入 `type=number min=0`；非法输入（负数）由校验拦截。

- **Priority**: P0
- **Rationale**: 配置写入口仅运营可见 = 前端侧最小权限表达；保存反馈让运营确认「即时生效」（story.md 旅程 1 场景 2 验收）。

#### Scenario: 运营保存全局阈值显示即时生效反馈
- @e2e
- **GIVEN** 运营位于库存预警视图，全局默认阈值输入框当前为 10
- **WHEN** 运营将全局默认阈值改为 20 并点击「保存配置」
- **THEN** 页面展示「✓ 已保存 · 阈值已即时生效」
- **AND** 预警列表按新阈值 20 即时刷新（无刷新页面操作）

#### Scenario: 运营行内编辑商品级覆盖阈值
- @e2e
- **GIVEN** 预警列表存在商品「无线办公鼠标」（全局阈值 10 入列）
- **WHEN** 运营在行内覆盖阈值输入框（`aria-label=商品级覆盖阈值`）填入 5 并保存
- **THEN** 列表立即刷新：无线办公鼠标（8 > 5）移出预警列表
- **AND** 该行阈值标注变为「覆盖」（5）

#### Scenario: 老板视图无配置入口且展示只读标识
- @e2e
- **GIVEN** 老板角色会话已登录并进入库存预警视图
- **THEN** 页面 SHALL NOT 渲染「保存配置」按钮与任何阈值输入框
- **AND** 标题旁展示「纯只读 · 无配置入口」标识
- **AND** 展示全局库存健康度总览卡片（预警商品数 / 已售罄数 / 超卖风险数）

<details>
<summary>View UI Prototype Code（库存预警视图核心交互，节选自确认原型）</summary>

```html
<!-- 运营：阈值配置区（仅运营可见） -->
<section v-if="role === '运营'" class="bg-card border border-border p-6 mb-6">
  <div class="flex items-end gap-5">
    <div>
      <span class="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">全局默认阈值</span>
      <div class="flex items-center gap-2">
        <input type="number" min="0" v-model.number="globalThreshold" aria-label="全局默认阈值" name="global-threshold"
          class="w-28 bg-muted border border-border px-4 py-2.5 font-mono text-sm font-bold text-foreground">
        <span class="font-mono text-xs text-muted-foreground">件</span>
      </div>
      <p class="font-mono text-[10px] text-muted-foreground mt-1.5 opacity-70">未设置覆盖的商品以此为准 · 修改后列表即时刷新</p>
    </div>
    <button @click="saveConfig" class="bg-primary text-primary-foreground font-display font-bold uppercase tracking-wide px-6 py-2.5 text-sm">保存配置</button>
  </div>
  <div class="text-right">
    <p class="font-mono text-[10px] uppercase tracking-widest text-warning mb-1">仅运营可配置 · 即时生效</p>
    <p v-if="savedFlag" class="font-mono text-[10px] font-bold text-success mt-1.5">✓ 已保存 · 阈值已即时生效</p>
  </div>
</section>

<!-- 预警列表：Tabs + 8 列表头 -->
<div class="flex border border-border">
  <button @click="activeTab = 'warning'" :class="activeTab === 'warning' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
    class="px-5 py-2 font-display font-bold text-xs uppercase tracking-wide">预警中 · {{ warningList.length }}</button>
  <button @click="activeTab = 'healthy'" :class="activeTab === 'healthy' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted'"
    class="px-5 py-2 font-display font-bold text-xs uppercase tracking-wide">健康水位 · {{ healthyList.length }}</button>
</div>

<!-- 状态 Badge：已售罄 accent / 超卖风险 warning / 低库存 outline / 库存充足 success -->
<span v-if="p.stock === 0" class="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest uppercase bg-accent text-accent-foreground">已售罄</span>
<span v-else-if="p.risk" class="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest uppercase bg-warning text-warning-foreground">低库存</span>
<span v-else-if="p.listed" class="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest uppercase border border-border text-foreground">低库存</span>
<span v-else class="inline-flex items-center px-2 py-0.5 font-mono text-[10px] font-bold tracking-widest uppercase bg-success text-success-foreground">库存充足</span>

<!-- 口径脚注 -->
<p class="font-mono text-[10px] text-muted-foreground">排序：已售罄置顶 · 其余按预计售罄天数升序（最紧迫在前）</p>
```
</details>

## Governance Mapping

- **Bounded Context**: Shared / Cross（`domain_model.html` 映射表：`bc-shared → cap-ui`，Cross-Context）；被 `data-insights`（新增 `stock-insight` capability）只读消费展示
- **Capability Taxonomy**: `frontend-ui`（修改：新增「库存预警」视图 + 阈值配置表单，无新增 taxonomy）
- **Process Alignment**: `L1-07` 经营分析（只读支流，扩展：库存洞察平行支流视图）；`L2`/`L3` 交易节点零改动；`L1-05/L1-06` 为只读数据来源（视图消费侧）
- **Service Blueprint**: `SB-STAGE-06`（成功回流 / B 端聚合回查，预警数据展示）；`SB-OPS-03`（运营配置与预警界面，参照既有运营界面先例）；`SB-BACKSTAGE-06`（后台「库存数据聚合」接口消费）；`SB-CUSTOMER-*` 无变化
- **实现版本**: Frontend（B 端运营后台库存预警视图）
