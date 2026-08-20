---
name: openspec-baseline-story-map
description: 维护业务基线中的 Story Map 文档。负责追踪 Story 在不同旅程步骤和发布阶段的分布。
allowed-tools: Read, Write, SearchCodebase
license: MIT
metadata:
  author: openspec
  version: "1.0"
---

# openspec-baseline-story-map

**目标**: 维护 `docs/baseline/service_blueprint.html`，确保它准确展示阶段、泳道、capability 分布及其“已落地 / 规划中 / 横切支撑”状态。

## 工作流

1. **收集蓝图增量**:
   - 在 `/opsx:sync` 过程中，读取 `proposal.md`、`story.md`、`specs/**/*.md`、`design.md`、`verify.md`，并参考 `.trae/skills/baseline/openspec-baseline-story-map/SERVICE_BLUEPRINT_STANDARD.md`。
2. **判定是否需要回流**:
   - 判断是否命中以下任一触发项：
     - `SB-STAGE-*` 覆盖变化
     - `SB-<LANE>-*` capability 分布变化
     - capability 状态在“已落地 / 规划中 / 横切支撑”之间变化
     - 新增或修改跨阶段支撑能力
     - `design.md` 中 `Service Blueprint Sync Assessment` 写为 `Needs Sync: Yes`
   - 若未命中，必须输出显式 no-op 理由。
3. **定位蓝图节点**:
   - 阅读 `docs/baseline/service_blueprint.html`。
   - 使用稳定锚点 `SB-STAGE-*`、`SB-LANE-*`、`SB-<LANE>-*` 定位更新区域。
4. **应用蓝图回流**:
   - **阶段/泳道更新**: 调整受影响节点中的 capability 分布与描述。
   - **状态回流**: 将已验证通过且已有主 specs/实现证据的能力标记为“已落地”；仅治理识别但尚未形成主规格或实现闭环的能力标记为“规划中”。
   - **横切能力回流**: 若出现跨阶段支撑能力变化，需同步更新 cross-stage support section 与 capability mapping table。
5. **更新日期**:
   - 更新文档末尾的 `Last Updated` 日期。

## 输出规范

1. **双重输出**: 同时更新 `docs/baseline/service_blueprint.html` 并输出对应的蓝图结构化数据。
2. **节点规范**: 必须遵循 `.trae/skills/baseline/openspec-baseline-story-map/SERVICE_BLUEPRINT_STANDARD.md` 的节点、状态与引用规范。
3. **结构一致性**: 必须保持阶段、泳道、cross-stage support 和 capability mapping table 的结构一致性。
4. **HTML 模板结构**:
   - **Header**: 包含 `title` (Service Blueprint) 和 `meta` (Baseline / Last Updated)。
   - **Intro Grid**: 包含 `Purpose` (蓝图目标) 和 `Legend` (图例：已落地、规划中、横切支撑)。
   - **Scope Summary**: 包含 `客户主线`、`运营主线` 和 `能力边界` 摘要。
   - **Board**: 主蓝图，包含 `stage-row` (阶段) 和多个 `blueprint-row` (泳道：客户视角、电商运营层、后台核心活动)。
   - **Cross-stage Support**: 展示跨阶段支撑能力的 `cross-card`。
   - **Capability Mapping Table**: `mapping-table` 展示 Capability 到治理归属的映射关系。
   - **Footnote**: 包含 `Source of truth` 说明。

## 视觉与设计标准

- **容器宽度**: 强制设为屏幕的 85% 或 `max-width: 1500px`。
- **风格**: 遵循 Slate-based 治理风格（`slate-900` 强调色，`slate-50` 背景）。
- **组件**: 严禁使用圆角 (`border-radius: 0 !important`)，禁止使用阴影 (`box-shadow: none !important`)。
- **状态表达**: 已落地能力使用实线边框，规划中能力使用虚线边框 (`border-style: dashed`)。
- **交互**: 点击 Capability 节点需高亮页面中所有同名节点。
- **防止报错**: 在 HTML 模板中使用 Jinja 变量生成内联样式时，必须使用 `{{ 'style="..."' }}` 格式。
