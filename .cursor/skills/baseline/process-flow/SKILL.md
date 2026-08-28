---
name: process-flow
description: 维护业务基线中的 Core Business Process Flow 文档，沉淀 L1/L2/L3 分层流程。
allowed-tools: Read, Write, SearchCodebase
license: MIT
metadata:
  author: openspec
  version: "1.0"
---

# process-flow

> [!IMPORTANT]
> - 本 Skill 的输出规范必须以 `docs/baseline/business_process.html` 的现有分层定义为准，不使用脱离业务基线的抽象模板。
> - 每次执行必须给出双重结果：1) 直接回写 `business_process.html` 或输出显式 no-op；2) 输出结构化同步摘要，至少说明受影响的 L1/L2/L3 节点、规则变化与证据来源。
> - 严禁回写 Markdown 中间层；严禁只改说明文字而不更新对应的节点、规则表或锚点。
> - 若调整本 Skill 的规则或输出口径，必须同步更新 `.trae/`、`.cursor/`、`.agents/` 下对应的 Skill/Command 入口。

**目标**: 维护 `docs/baseline/business_process.html`，确保它反映系统核心业务流程的 L1 (端到端价值流)、L2 (价值段协同流) 和 L3 (关键业务环节规则流)。

## 唯一事实来源

- `docs/baseline/business_process.html`
- `story.md`
- `specs/**/*.md`
- `design.md`

## 工作流

1. **分析流程变更**:
   - 在 `/opsx:sync` 过程中，阅读 `story.md` 识别 L1/L2 旅程变化，阅读 `design.md` 与 `specs/**/*.md` 识别 L3 规则环节变化。
2. **定位流程定义**:
   - 阅读 `docs/baseline/business_process.html`。该文件采用直接 HTML/JS 维护，不通过 Markdown 转换。
3. **应用回流**:
   - **内容更新**: 使用 DOM 选择器逻辑或直接修改 HTML 文件中的结构化数据块。
   - **分层维护**:
     - L1/L2 更新通常由 `story.md` 的业务变更驱动。
     - L3 更新由 `design.md` 与 `specs/**/*.md` 的详细规则逻辑驱动。
4. **验证逻辑**:
   - 确保流程节点 ID (如 `L1-04`) 在文档中存在且锚点正确。
   - 若本次变更不影响流程分层、节点或规则，必须输出显式 no-op 理由。

## 输出契约

1. **双重输出**:
   - 更新 `docs/baseline/business_process.html`。
   - 输出对应的流程结构化摘要，至少包含 `triggered / no-op`、受影响的 L1/L2/L3 节点、变更规则与证据来源。
2. **分层建模**:
   - 必须遵循 L1 (价值流) -> L2 (协同流) -> L3 (规则流) 的分层口径。
3. **HTML 结构要求**:
   - **Header**: 包含 `title` (Business Process Baseline) 和 `subtitle`。
   - **Intro Grid**: 包含 `Purpose` 和 `Modeling Lens`。
   - **Section: 分层建模规范**: 展示 L1/L2/L3 的定义卡片 (`level-card`)。
   - **Section: L1 端到端价值流**: 卡片式价值流图 (`stream-stage`)。
   - **Section: L2 价值段展开**: 泳道图 (`swimlane-grid`)，包含角色泳道和活动卡片 (`activity-card`)。
   - **Section: L3 环节展开**: 步骤卡片 (`step-card`) + 规则表 (`rule-table`)。
   - **Footer**: `footer-note` 包含建模原则。

## 视觉与设计标准

- **容器宽度**: 强制设为屏幕的 85% 或 `max-width: 1480px`。
- **布局**: 核心逻辑展示采用卡片式泳道图 (CSS Grid)。
- **风格**: 遵循 Slate-based 治理风格（`slate-900` 强调色，`slate-50` 背景）。
- **组件**: 严禁使用圆角 (`border-radius: 0 !important`)，禁止使用阴影 (`box-shadow: none !important`)。
- **泳道色标**: 不同泳道使用统一的左侧边框色标。
- **防止报错**: 在 HTML 模板中使用 Jinja 变量生成内联样式时，必须使用 `{{ 'style="..."' }}` 格式。
