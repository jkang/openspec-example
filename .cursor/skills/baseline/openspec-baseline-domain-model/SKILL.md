---
name: openspec-baseline-domain-model
description: 维护业务基线中的 Domain Model 文档。采用 Event-Storming 视角描述领域知识。
allowed-tools: Read, Write, SearchCodebase
license: MIT
metadata:
  author: openspec
  version: "1.0"
---

# openspec-baseline-domain-model

**目标**: 维护 `docs/baseline/domain_model.html`，基于 Event-Storming 与 DDD 视角沉淀系统的领域模型基线。

## 工作流

1. **提取领域知识**:
   - 在 `/opsx:sync` 过程中，阅读 `specs/domain-model/spec.md` 和 `design.md`。
   - 识别新增的 Domain Events, Commands, 或新的 Bounded Context。
2. **定位模型基线**:
   - 阅读 `docs/baseline/domain_model.html`。
3. **应用回流**:
   - **内容更新**: 直接修改 HTML 文件中内嵌的 Event Storming 数据或 JS 状态机定义。
   - **治理同步**: 确保 Bounded Context 与 Capability 的映射表得到更新。
4. **Event-Storming 约束**:
   - 严禁将其写成纯数据库表结构，必须体现业务事件驱动的特性。

## 输出规范

- 必须遵循 Event-Storming 视角的章节结构。
- 使用清晰的术语，与代码中的领域对象保持一致。
