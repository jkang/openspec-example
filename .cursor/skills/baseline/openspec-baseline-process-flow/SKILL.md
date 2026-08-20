---
name: openspec-baseline-process-flow
description: 维护业务基线中的 Core Business Process Flow 文档。负责记录核心业务逻辑的状态流转。
allowed-tools: Read, Write, SearchCodebase
license: MIT
metadata:
  author: openspec
  version: "1.0"
---

# openspec-baseline-process-flow

**目标**: 维护 `docs/baseline/business_process.html`，确保它反映了系统核心业务流程的 L1 (端到端价值流)、L2 (价值段协同流) 和 L3 (关键业务环节规则流)。

## 工作流

1. **分析流程变更**:
   - 在 `/opsx:sync` 过程中，阅读 `story.md` (识别 L1/L2 旅程) 和 `design.md` (识别 L3 规则环节)。
2. **定位流程定义**:
   - 阅读 `docs/baseline/business_process.html`。该文件采用直接 HTML/JS 维护，不通过 Markdown 转换。
3. **应用回流**:
   - **内容更新**: 使用 DOM 选择器逻辑或直接修改 HTML 文件中的结构化数据块。
   - **分层维护**: 
     - L1/L2 更新通常由 `story.md` 的业务变更驱动。
     - L3 更新由 `specs/design.md` 的详细规则逻辑驱动。
4. **验证逻辑**:
   - 确保流程节点 ID (如 L1-04) 在文档中存在且锚点正确。

## 输出规范

- 必须遵循分层建模口径：L1 (价值流) -> L2 (协同流) -> L3 (规则流)。
- 核心逻辑展示采用卡片式泳道图 (CSS Grid)。
