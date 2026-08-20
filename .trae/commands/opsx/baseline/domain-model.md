---
description: 维护业务基线中的 Domain Model 文档 (Event-Storming 视角)
---

# /opsx:baseline/domain-model

维护 `docs/baseline/domain_model.html`，沉淀系统的领域模型基线。

## 核心动作
1. 调用 `openspec-baseline-domain-model` 技能。
2. 基于 `proposal.md`、`specs/**/*.md`、`design.md` 判断是否真的需要更新 `docs/baseline/domain_model.html`。
3. 若需要，同步 Domain Events、Commands、Policies、Bounded Context、BC -> Capability 映射，以及相关图和清单。
4. 若不需要，输出显式 no-op 理由，而不是静默跳过。
5. 直接回写基线 HTML。
