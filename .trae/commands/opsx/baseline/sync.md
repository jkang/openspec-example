---
description: 统一同步所有业务基线文档 (Blueprint, Process Flow, Domain Model)
---

# /opsx:baseline/sync

统一同步并回流业务基线文档，将变更中的业务认知沉淀到全局规划层。

## 核心动作

1. **选择变更上下文**
   - 识别当前活跃的 change 名称。如果无法推断，请询问用户。
   - 运行 `openspec status --change "<name>" --json` 获取变更路径。

2. **执行业务基线回流 (Baseline Sync)**
   - 依次调用以下辅助技能：
     - `blueprint`: 维护 `docs/baseline/service_blueprint.html`。
     - `process-flow`: 维护 `docs/baseline/business_process.html`。
     - `domain-model`: 维护 `docs/baseline/domain_model.html`。
   - **判定逻辑**:
     - 每个技能内部会根据 `proposal.md`、`specs` 和 `design.md` 中的 `Sync Assessment` 自动判断是否需要更新。
     - 如果不需要更新，技能会输出显式 no-op 理由。

3. **自动化渲染与校验**
   - 调用 `render` 技能。
   - 检查 `docs/baseline/` 下 HTML 文档的结构完整性，刷新可视化索引。

## 使用场景
- 在手动修改了 `design.md` 后，希望立即刷新基线视图。
- 在 `/opsx:sync` (规格同步) 之后，确保基线文档已达到最新状态。
- 定期维护基线文档的渲染一致性。
