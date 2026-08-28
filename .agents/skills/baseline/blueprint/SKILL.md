---
name: blueprint
description: 维护业务基线中的 Service Blueprint 文档，追踪旅程阶段、泳道能力分布与 capability 状态。
allowed-tools: Read, Write, SearchCodebase
license: MIT
metadata:
  author: openspec
  version: "1.0"
---

# blueprint

> [!IMPORTANT]
> - 本 Skill 的输出规范必须以 `docs/baseline/service_blueprint.html` 与当前 `SKILL.md` 为唯一事实来源，不使用脱离基线事实的抽象模板。
> - 每次执行必须给出双重结果：1) 直接回写 `service_blueprint.html` 或输出显式 no-op；2) 输出结构化同步摘要，至少说明触发项、受影响锚点、capability 状态变化与证据来源。
> - 严禁回写 Markdown 中间层；严禁只修改可视文案而不同步 capability 分布、cross-stage support 或 capability mapping table。
> - 若调整本 Skill 的规则或输出口径，必须同步更新 `.trae/`、`.cursor/`、`.agents/` 下对应的 Skill/Command 入口。

**目标**: 维护 `docs/baseline/service_blueprint.html`，确保它准确展示阶段、泳道、capability 分布及其“已落地 / 规划中 / 横切支撑”状态。

## 角色定位

`service_blueprint.html` 不是普通的 Story Map，而是业务基线中的服务蓝图视图，用于把以下三个层次放到同一张图里：

- 买家视角的端到端旅程
- 运营视角的支撑活动
- 后台系统的核心活动与 capability 编排

它回答三个治理问题：

- 当前变更落在哪个旅程阶段
- 该阶段由哪些 capability 支撑
- 本次 change 是否改变了蓝图中的阶段、泳道、能力分布或状态

## 唯一事实来源

- `docs/baseline/service_blueprint.html`
- `docs/baseline/domain_model.html`
- `docs/baseline/business_process.html`
- `proposal.md`
- `specs/**/*.md`
- `design.md`
- `verify.md`

其中：

- `domain_model.html` 决定 capability taxonomy 与治理归属
- `business_process.html` 决定 L1/L2/L3 流程语义
- `service_blueprint.html` 决定阶段、泳道、能力分布与“已落地 / 规划中 / 横切支撑”的可视化表达

## 稳定锚点与引用规范

后续 planning artifacts 在引用 Service Blueprint 时，必须使用稳定锚点，而不是只写自然语言描述。

### Stage 引用

- `SB-STAGE-01` 触达与发现
- `SB-STAGE-02` 选购与加购
- `SB-STAGE-03` 结算确认
- `SB-STAGE-04` 提交订单
- `SB-STAGE-05` 模拟支付
- `SB-STAGE-06` 成功回流

### Lane 引用

- `SB-LANE-CUSTOMER` 客户视角 E2E 流程
- `SB-LANE-OPS` 电商运营层
- `SB-LANE-BACKSTAGE` 后台核心活动

### Cell 引用

每个泳道与阶段交叉点都必须使用稳定节点 ID：

- `SB-CUSTOMER-01` ... `SB-CUSTOMER-06`
- `SB-OPS-01` ... `SB-OPS-06`
- `SB-BACKSTAGE-01` ... `SB-BACKSTAGE-06`

推荐写法：

- `Service Blueprint Alignment: SB-STAGE-03, SB-CUSTOMER-03, SB-BACKSTAGE-03`

## Capability 约束

Service Blueprint 中出现的 capability 必须遵循以下规则：

- 优先复用 `domain_model.html` 中既有 taxonomy 名称
- 若出现未映射 capability，必须在 `proposal.md` 中标注为“新增 taxonomy”
- capability 的治理归属必须与 `domain_model.html` 一致
- 不允许在蓝图中发明与 proposal/specs 不一致的 capability 命名

状态口径：

- `已落地`：已有主 specs 或已验证实现证据
- `规划中`：治理上已识别，但尚未形成当前主规格或实现闭环
- `横切支撑`：跨多个阶段复用的共性能力

## Planning 阶段约束

### Explore / idea.md

必须识别：

- 受影响的 `SB-STAGE-*`
- 受影响的 `SB-<LANE>-*`
- 是否可能触发 Service Blueprint Sync

### Proposal / proposal.md

必须包含 `Service Blueprint Alignment` 章节，说明：

- 本次 change 主要影响哪些阶段
- 影响哪些泳道节点
- 是新增、修改还是仅复用现有 capability 布局

### 需求侧 Story（若 handoff）

需求侧 `story.md` 的 E2E 旅程必须同时映射：

- `business_process.html` 中的 L1/L2 节点
- `service_blueprint.html` 中的 `SB-STAGE-*` 与 `SB-CUSTOMER-*`

### Specs / specs/**/*.md

每个 capability spec 必须记录：

- 关联的 `SB-STAGE-*`
- 关联的 `SB-<LANE>-*`

如果某个 capability 只改变后台规则但不改变买家旅程，也必须至少引用对应 `SB-BACKSTAGE-*`。

### Design / design.md

必须包含 `Service Blueprint Sync Assessment`，明确：

- `Needs Sync: Yes / No`
- `Trigger Type`
- `Evidence Source`
- `Planned Baseline Update`

## 工作流

1. **收集蓝图增量**:
   - 在 `/opsx:sync` 过程中，读取上述输入，并按本文件中的锚点、状态与引用规范执行。
2. **判定是否需要回流**:
   - 判断是否命中以下任一触发项：
     - `SB-STAGE-*` 覆盖变化
     - `SB-<LANE>-*` capability 分布变化
     - capability 状态在“已落地 / 规划中 / 横切支撑”之间变化
     - 新增或修改跨阶段支撑能力
     - 需求侧 `story.md`（若 handoff）新增或修改了需要体现到蓝图的 E2E 旅程阶段映射
     - `proposal.md` 或 `specs/**/*.md` 引入新的 blueprint 引用节点
     - `design.md` 中 `Service Blueprint Sync Assessment` 写为 `Needs Sync: Yes`
   - 若未命中，必须输出显式 no-op 理由，并列出已检查的依据文件。
3. **定位蓝图节点**:
   - 阅读 `docs/baseline/service_blueprint.html`。
   - 使用稳定锚点 `SB-STAGE-*`、`SB-LANE-*`、`SB-<LANE>-*` 定位更新区域。
4. **应用蓝图回流**:
   - **阶段/泳道更新**: 调整受影响节点中的 capability 分布与描述。
   - **状态回流**: 将已验证通过且已有主 specs/实现证据的能力标记为“已落地”；仅治理识别但尚未形成主规格或实现闭环的能力标记为“规划中”。
   - **横切能力回流**: 若出现跨阶段支撑能力变化，需同步更新 cross-stage support section 与 capability mapping table。
5. **更新日期**:
   - 更新文档末尾的 `Last Updated` 日期。

## 输出契约

1. **双重输出**:
   - 更新 `docs/baseline/service_blueprint.html`。
   - 输出对应的蓝图结构化摘要，至少包含 `triggered / no-op`、受影响锚点、能力状态变化、证据来源。
2. **节点规范**:
   - 必须遵循本文件定义的节点、状态与引用规范。
3. **结构一致性**:
   - 必须保持阶段、泳道、cross-stage support 和 capability mapping table 的结构一致性。
4. **HTML 结构要求**:
   - **Header**: 包含 `title` (Service Blueprint) 和 `meta` (Baseline / Last Updated)。
   - **Intro Grid**: 包含 `Purpose` 和 `Legend`。
   - **Scope Summary**: 包含 `客户主线`、`运营主线` 和 `能力边界` 摘要。
   - **Board**: 包含 `stage-row` 和多个 `blueprint-row`。
   - **Cross-stage Support**: 展示跨阶段支撑能力的 `cross-card`。
   - **Capability Mapping Table**: `mapping-table` 展示 Capability 到治理归属的映射关系。
   - **Footnote**: 包含 `Source of truth` 说明。

## 更新方式

更新 `service_blueprint.html` 时必须：

- 优先直接修改 HTML 中的稳定结构与 capability 节点
- 保持既有阶段顺序与泳道顺序稳定
- 保持 capability taxonomy 与 `domain_model.html` 一致
- 更新 `Baseline / Last Updated` 日期
- 不得只改可视化文本而不改对应 capability 分布

## 视觉与设计标准

- **容器宽度**: 强制设为屏幕的 85% 或 `max-width: 1500px`。
- **风格**: 遵循 Slate-based 治理风格（`slate-900` 强调色，`slate-50` 背景）。
- **组件**: 严禁使用圆角 (`border-radius: 0 !important`)，禁止使用阴影 (`box-shadow: none !important`)。
- **状态表达**: 已落地能力使用实线边框，规划中能力使用虚线边框 (`border-style: dashed`)。
- **交互**: 点击 Capability 节点需高亮页面中所有同名节点。
- **防止报错**: 在 HTML 模板中使用 Jinja 变量生成内联样式时，必须使用 `{{ 'style="..."' }}` 格式。

## 最小结构要求

后续生成或重构 `service_blueprint.html` 时，至少保证以下结构稳定存在：

- Header / Purpose / Legend / Scope Summary
- 6 个 `SB-STAGE-*`
- 3 个 `SB-LANE-*`
- 18 个 `SB-<LANE>-<NN>` 交叉节点
- Cross-stage support section
- Capability mapping table
- capability 过滤交互
