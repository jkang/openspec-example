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

**目标**: 维护 `docs/baseline/business_process.html`，确保它反映了系统核心业务流程的最新状态机和流转逻辑。

## 工作流

1. **分析流程变更**:
   - 在 `/opsx:sync` 过程中，阅读 `design.md` 中的架构图和 `specs/` 中的状态描述。
2. **定位流程定义**:
   - 阅读 `docs/baseline/business_process.html` 中的 `<script>` 标签内的 `const markdown` 或 `swimlaneData` 变量。
3. **应用回流**:
   - **内容更新**: 直接修改 HTML 文件中内嵌的 Markdown 字符串或 JS 数据。
4. **验证逻辑**:
   - 确保流程图与代码中的状态机实现保持逻辑一致。

## 输出规范

- 优先使用 Mermaid 流程图描述逻辑。
- 状态列表必须清晰列出每个状态的含义。
