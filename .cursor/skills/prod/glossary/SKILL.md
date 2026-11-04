---
name: glossary
description: 维护业务统一语言（GLOSSARY）。在需求讨论、explore、story 过程中挑战术语、消歧、锁定业务概念，产出 docs/baseline/GLOSSARY.md。使用场景：术语混用、同一概念多个叫法、业务规则命名不一致，或需要把领域语言固化到基线时。
allowed-tools: Read, Write, SearchCodebase, Grep
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "1.0"
---

Glossary 负责**统一语言**，不负责领域模型本身。领域模型（Bounded Context / Capability / Event Storming）的权威仍是 `docs/baseline/domain_model.html`。

## 产物

- `docs/baseline/GLOSSARY.md`（单上下文）
- 多上下文时：`GLOSSARY-MAP.md` + 各上下文术语表（按需）

## 步骤

1. **读上下文**：读 `research.md` / `idea.md` / `story.md` 与 `docs/baseline/domain_model.html`。
2. **挑战术语**：
   - 与既有 Glossary 冲突时立即指出；
   - 模糊/过载词提出精确候选（如「账户」是 Customer 还是 User？）。
3. **用具体场景压边界**：构造边界场景，迫使概念边界清晰。
4. **与代码/基线交叉核对**：发现矛盾时指出并以模型事实为准。
5. **即时写入**：术语一旦解析，立即更新 `GLOSSARY.md`，不批量补。
6. **HITL**：术语表变更后请用户确认。

## 规则

- 只收本项目特有术语；通用编程概念不收。
- 定义一两句话，定义「是什么」，不定义「怎么做」。
- 同一概念选一个主词，其余列入 `_Avoid_`。
- 不含实现细节（类名、表名、接口、代码结构）。
- 与 `domain_model.html` 冲突时，以模型事实为准并回写 Glossary。

## 不做

- 不维护 ADR（架构决策记录归 `lead` / `engineer`）。
- 不改 `domain_model.html`（由 `baseline/domain-model` 负责）。

## 参考

- `references/glossary-format.md`
- 模板：`openspec-requirements/templates/glossary.md`
