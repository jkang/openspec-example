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

**目标**: 维护 `docs/baseline/service_blueprint.html`，确保它准确展示了每个 Journey Step 下已实现和计划中的 Story。

## 工作流

1. **收集 Story 增量**:
   - 在 `/opsx:sync` 过程中，读取 `story.md` 和 `verify.md`。
2. **定位 Journey Step**:
   - 确定当前变更属于哪个高层旅程步骤（如“商品浏览”、“营销结算”）。
3. **更新矩阵状态**:
   - 阅读 `docs/baseline/service_blueprint.html`。
   - **已实现回流**: 将本次已验证通过的 Story 填入 HTML 中的 `Implemented` 数据部分。
   - **规划回流**: 如果本次变更识别了后续任务，将其填入 `Current Phase` 或 `+1 Month` 数据部分。
4. **更新日期**:
   - 更新文档末尾的 `Last Updated` 日期。

## 输出规范

- 必须保持表格矩阵结构。
- 使用简洁的 Story 简述（3-5 字）。
