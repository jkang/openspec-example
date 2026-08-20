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

1. **双重输出**: 同时更新 `docs/baseline/domain_model.html` 并输出对应的结构化数据描述。
2. **Event-Storming 约束**: 必须遵循 Event-Storming 视角的章节结构。
3. **术语一致性**: 使用清晰的术语，与代码中的领域对象保持一致。
4. **HTML 模板结构**:
   - **Header**: 包含 `page-title` (Domain Model) 和 `page-subtitle`。
   - **Board**: 主容器，包含 `hero-grid` (Purpose)。
   - **Sections**:
     - `1. Bounded Context Map`: 可视化映射图 + 关系表。
     - `2. Core Business Object State Machines`: 状态机可视化 + 规则表。
     - `3. Core Domain Object Relationship Graph`: 对象关系图 + 规则表。
     - `4. Event Storming Structure`: Command/Event/Policy/ReadModel 矩阵。
     - `5. Aggregate Catalog`: 聚合根、实体、值对象与不变量清单。
     - `6. Bounded Context -> Capability Mapping`: 治理层到契约层的映射图 + 表。
   - **Footer**: `footer-note` 包含 `Last Updated` 日期。

## 视觉与设计标准

- **容器宽度**: 强制设为屏幕的 85% 或 `max-width: 1360px`。
- **风格**: 遵循 Slate-based 治理风格（`slate-900` 强调色，`slate-50` 背景）。
- **组件**: 严禁使用圆角 (`border-radius: 0 !important`)，禁止使用阴影 (`box-shadow: none !important`)。
- **交互**: 确保 `cursor-pointer` 添加到所有可点击节点，点击节点需高亮相关关系。
- **防止报错**: 在 HTML 模板中使用 Jinja 变量生成内联样式时，必须使用 `{{ 'style="..."' }}` 格式。
