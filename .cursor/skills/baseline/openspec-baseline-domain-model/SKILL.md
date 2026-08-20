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
   - 在 `/opsx:sync` 过程中，阅读 `proposal.md`、全部 delta `specs/**/*.md`、同步后的主 `openspec/specs/**/*.md`、`story.md`（若存在）与 `design.md`。
   - 识别是否存在以下任一 Domain Model 变更触发项：
     - 新增、修改、移除 `Bounded Context` 或 `BC -> Capability` 映射
     - 新增、修改、移除 capability taxonomy
     - 新增、修改、移除 Domain Event / Command / Policy
     - Aggregate、状态机、对象关系、业务不变量变化
   - 以 `design.md` 中的 `Domain Model Sync Assessment` 作为优先判定输入；若写明 `Needs Sync: Yes`，必须执行回流；若写明 `No`，也需校验是否与 specs/proposal 中的事实一致。
2. **定位模型基线**:
   - 阅读 `docs/baseline/domain_model.html`。
3. **应用回流**:
   - **需要回流时**:
     - **内容更新**: 直接修改 HTML 文件中内嵌的 Event Storming 数据或 JS 状态机定义。
     - **治理同步**: 确保 Bounded Context 与 Capability 的映射表得到更新。
     - **图与清单同步**: 同步更新图形节点、关系线、状态机、对象关系和规范清单，不允许只改其一。
   - **无需回流时**:
     - 输出显式 no-op 结论，说明为什么本次变更无需更新 `docs/baseline/domain_model.html`。
4. **Event-Storming 约束**:
   - 严禁将其写成纯数据库表结构，必须体现业务事件驱动的特性。

## 输出规范

- 必须遵循 Event-Storming 视角的章节结构。
- 使用清晰的术语，与代码中的领域对象保持一致。
