---
name: openspec-baseline-journey
description: 维护业务基线中的 High-level Journey 文档。负责记录用户和运营的核心端到端旅程。
allowed-tools: Read, Write, SearchCodebase
license: MIT
metadata:
  author: openspec
  version: "1.0"
---

# openspec-baseline-journey

**目标**: 维护 `docs/baseline/high_level_journey.html`，确保它反映了系统当前支持的所有核心用户旅程。

## 工作流

1. **识别旅程变更**:
   - 在 `/opsx:sync` 过程中，阅读变更提案 `proposal.md` 和业务评审 `story.md`。
   - 识别是否有新的用户旅程（Buyer Journey）或运营旅程（Admin/Ops Journey）。
2. **定位基线位置**:
   - 阅读 `docs/baseline/high_level_journey.html`。
3. **应用回流**:
   - 直接修改 HTML 文件中内嵌的旅程步骤。
   - 更新文档末尾的 `Last Updated` 日期。
4. **验证一致性**:
   - 确保旅程步骤与 `story.md` 中的 E2E 场景描述保持逻辑一致。

## 输出规范

- 必须保持 Markdown 格式。
- 使用清晰的步骤列表 (1. 2. 3.)。
- 区分角色（买家、运营、财务等）。
