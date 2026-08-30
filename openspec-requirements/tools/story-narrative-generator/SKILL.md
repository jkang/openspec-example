---
name: story-narrative-generator
description: |
  根据用户故事 (User Story) 及其上下文，自动生成专业、结构化的“故事详述 (Story Narrative)”文档。

  Triggers when user mentions:
  - "生成故事详述"
  - "Story 详述"
  - "generate story narrative"
  - "细化这个用户故事"
author: KK
---

# Story Narrative Generator

该技能致力于将简短的用户故事转化为深度、可执行的需求文档，帮助团队消除沟通歧义。

> [!IMPORTANT]
> **双重输出规范 (Dual Output Standard)**: 
> 当你使用此 Skill 时，必须**同时**输出两个部分：
> 1. **结构化 YAML**: 用于下一步的自动化处理和数据存档。
> 2. **交互式 HTML**: 用于最终用户的直观审查与演示。
> 
> **输出路径与命名规范 (本仓库适配)**:
> - **目录**: 产物必须输出到需求侧工作区 `epics/<epic-key>/analysis/narrative/<story-key>/`（`<epic-key>` 为需求侧 Epic key，`<story-key>` 为 Story ID）。
> - **文件名**: 故事详述文档 `narrative.md`（Markdown 为主；如需可视化可额外输出 `narrative.html`）。
> 
> **视觉设计规范 (Visual Design Standard)**:
> - **样式风格**: 默认按照 `openspec-requirements/tools/design.md` 进行样式输出。
> - **底色模式**: 默认使用 **浅色底 (Light Mode)**。
> - **页面布局**: HTML 内容占据页面 **85%** 宽度，保持简洁的 Header 设计（参考简洁 Header 规范）。


## 快速使用

### 1. 提供故事
输入一段用户故事，例如：“作为管理员，我想在后台禁用违规账号，以便维护社区氛围。”

### 2. 生成详述
LLM 会根据故事生成包含以下模块的 Markdown 文档：
- **核心描述**: 细化后的 As-a/I-want/So-that 结构。
- **角色画像**: 深入分析该故事涉及的用户特征与痛点。
- **验收标准 (AC)**: 采用 Given/When/Then 或列表形式定义的边界条件。
- **交互逻辑**: 关键 UI 元素的行为与异常处理。
- **业务价值**: 该故事对业务指标的具体贡献。

## 核心逻辑
- **上下文关联**: 自动推断故事在产品全景中的位置（如：管理后台 vs. C端）。
- **AC 自动生成**: 基于场景推导核心流程、边界流程与异常流。
- **结构化输出**: 严格遵循专业 PRD 的叙事风格。

## 提示词规范 (Prompt)
详见 `references/prompt_zh.md`。
