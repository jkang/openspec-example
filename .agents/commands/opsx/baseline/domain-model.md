---
description: 维护业务基线中的 Domain Model 文档 (Event-Storming 视角)
---

# /opsx:baseline/domain-model

维护 `docs/baseline/DOMAIN_MODEL.md`，沉淀系统的领域模型基线。

## 核心动作
1. 调用 `openspec-baseline-domain-model` 技能。
2. 同步 Domain Events, Commands 和 Bounded Context 变更。
3. 回写基线 Markdown 并自动触发渲染。
