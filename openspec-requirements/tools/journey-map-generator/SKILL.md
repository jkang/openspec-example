---
name: journey-map-generator
description: |
  根据业务流程描述，自动生成高颜值、专业级的体验旅程图（Journey Map）HTML。

  Triggers when user mentions:
  - "生成体验旅程图"
  - "generate journey map"
  - "体验旅程地图"
  - "customer journey map"
author: KK
---

# Journey Map Generator

同 `blueprint-map-generator` 架构相同，用于自动化还原 `AIJourneyMap` 产品体验地图的绘制。

> [!IMPORTANT]
> **双重输出规范 (Dual Output Standard)**: 
> 当你使用此 Skill 时，必须**同时**输出两个部分：
> 1. **结构化 YAML**: 用于下一步的自动化处理和数据存档。
> 2. **交互式 HTML**: 用于最终用户的直观审查与演示。
> 
> **输出路径与命名规范 (本仓库适配)**:
> - **目录**: 产物必须输出到需求侧工作区 `epics/<epic-key>/analysis/journey/`（`<epic-key>` 为需求侧 Epic key）。
> - **文件名**: 数据文件 `journey.yaml`，可视化文件 `journey.html`。
> 
> **视觉设计规范 (Visual Design Standard)**:
> - **样式风格**: 默认按照 `openspec-requirements/tools/design.md` 进行样式输出。
> - **底色模式**: 默认使用 **浅色底 (Light Mode)**。
> - **页面布局**: HTML 内容占据页面 **85%** 宽度，保持简洁的 Header 设计（参考简洁 Header 规范）。

---

## 数据结构（多层泳道）

旅程地图由若干**横向阶段 (Stage)** 组成，每个阶段内包含动作 (Actions)。
对每个动作，沿着时间线自上而下呈现以下视角维度：

| 层级 | 内容说明 | 视觉特性 |
|------|---------|---------|
| **阶段层 (Stage)** | 业务流程的宏观阶段划分 | 置顶、跨列合并 |
| **行为层 (Behavior)** | 用户在该节点下发生的具体操作或行为 | 白底卡片、绿边框交互感 |
| **触点层 (Touchpoint)** | 发生交互的系统或渠道及角色 | 灰色底色、微标签 |
| **情绪体验分 (Experience)** | 该触点/行为下用户的主观体验分 (1~10 分) | SVG 线条折线图、得分状态点分布 |
| **想法 (Thoughts)** | 用户真实的主观念头 | 气泡或引用文本块排列 |
| **痛点 / 机会 (PainPoints / AI)** | 总结出的问题，及应对的智能化机会 | 底部高亮预警块 |

---

## 工作流 SOP

### Step 1 · 解析输入
了解用户的业务场景或目标产品。自动识别出场景下的典型用户转化路径，拆解出至少 3 个阶段，每个阶段包含 1~3 个核心用户动作。(如果是产品分析，着重分析痛点并结合 AI 能力得出 aiusecase)。

### Step 2 · 推演 YAML
- 请严格遵循 `references/journey_prompts.md` 的要求（结构及数据契约规范）。
- 将推演的结果保存至 `epics/<epic-key>/analysis/journey/journey.yaml`。

### Step 3 · 编译输出 HTML
- 使用 Python 编译组件根据 YAML 数据生成最终的纯静态 HTML：
```bash
python3 openspec-requirements/tools/journey-map-generator/scripts/build_journey.py \
  epics/<epic-key>/analysis/journey/journey.yaml \
  epics/<epic-key>/analysis/journey/journey.html
```

### Step 4 · 最终交付
告知用户可以通过浏览器直接访问此脱水后的 HTML，所有图表与视觉层将被 1:1 无损渲染。

---

## 目录结构

```
journey-map-generator/
├── SKILL.md                        # 本指引说明
├── references/
│   ├── journey_prompts.md          # 核心 LLM Prompt 铁律、字段约束
│   └── schema.yaml                 # 标准 YAML 数据契约示例
├── templates/
│   └── journey_layout.html         # Jinja2 HTML/CSS 与排版引擎
├── scripts/
│   └── build_journey.py            # 核心编译分析及坐标轴计算器
└── examples/                       # 示例 YAML（数据契约参考，非产物目录；产物在 epics/<key>/analysis/journey/）
```
