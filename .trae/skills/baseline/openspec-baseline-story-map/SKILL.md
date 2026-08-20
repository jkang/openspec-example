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

**目标**: 维护 `docs/baseline/service_blueprint.html`，确保它准确展示阶段、泳道、capability 分布及其“已落地 / 规划中 / 横切支撑”状态。

## 工作流

1. **收集蓝图增量**:
   - 在 `/opsx:sync` 过程中，读取 `proposal.md`、`story.md`、`specs/**/*.md`、`design.md`、`verify.md`，并参考 `docs/SOPS/SERVICE_BLUEPRINT_STANDARD.md`。
2. **判定是否需要回流**:
   - 判断是否命中以下任一触发项：
     - `SB-STAGE-*` 覆盖变化
     - `SB-<LANE>-*` capability 分布变化
     - capability 状态在“已落地 / 规划中 / 横切支撑”之间变化
     - 新增或修改跨阶段支撑能力
     - `design.md` 中 `Service Blueprint Sync Assessment` 写为 `Needs Sync: Yes`
   - 若未命中，必须输出显式 no-op 理由。
3. **定位蓝图节点**:
   - 阅读 `docs/baseline/service_blueprint.html`。
   - 使用稳定锚点 `SB-STAGE-*`、`SB-LANE-*`、`SB-<LANE>-*` 定位更新区域。
4. **应用蓝图回流**:
   - **阶段/泳道更新**: 调整受影响节点中的 capability 分布与描述。
   - **状态回流**: 将已验证通过且已有主 specs/实现证据的能力标记为“已落地”；仅治理识别但尚未形成主规格或实现闭环的能力标记为“规划中”。
   - **横切能力回流**: 若出现跨阶段支撑能力变化，需同步更新 cross-stage support section 与 capability mapping table。
5. **更新日期**:
   - 更新文档末尾的 `Last Updated` 日期。

## 输出规范

- 必须遵循 `docs/SOPS/SERVICE_BLUEPRINT_STANDARD.md` 的节点、状态与引用规范。
- 必须保持阶段、泳道、cross-stage support 和 capability mapping table 的结构一致性。
