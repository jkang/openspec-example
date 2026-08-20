---
description: 统一同步所有业务基线文档 (Blueprint, Process Flow, Domain Model)
---

# /opsx:baseline/sync

统一同步并回流业务基线文档，将变更中的业务认知沉淀到全局规划层。

## 核心动作

1. **选择变更上下文**
   - 识别当前活跃的 change 名称。
   - 运行 `openspec status --change "<name>"` 获取变更路径。

2. **执行业务基线回流 (Baseline Sync)**
   - 依次调用以下辅助技能：
     - `openspec-baseline-blueprint`
     - `openspec-baseline-process-flow`
     - `openspec-baseline-domain-model`
   - 如果不需要更新，技能会输出显式 no-op 理由。

3. **自动化渲染与校验**
   - 调用 `openspec-baseline-render` 技能。
