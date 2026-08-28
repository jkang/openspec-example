---
name: research
description: 需求侧需求调研。针对【单个 Epic】收集需求信息（业务沟通/用户调研），产出 research.md。使用场景：一个 Epic 进入需求漏斗时，需要先做需求调研收集信息。
allowed-tools: Bash(git:*)
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "1.0"
---

需求调研是需求漏斗的**第 1 步**。它只负责**收集**，不负责转化（转化是 `explore` / idea 的职责）。

## 产物

- `openspec-requirements/epics/<epic-key>/research.md`（内嵌组成部分：访谈原始记录 / 原始需求信息 / 业务约束线索 / 疑问 / 结论）

## 步骤

1. **定位 Epic**：从 `docs/ROADMAP.md`（唯一权威）的阶段条目中确定要调研的 Epic（一句话描述，一个阶段可多 Epic）。
2. **创建 Epic 工作目录**：据调研结果确认 Epic key 后，创建 `openspec-requirements/epics/<epic-key>/` 目录——该 Epic 后续所有产物（idea/storymap/story/prototypes）都内聚在此目录下。
3. **读需求侧配置**：读 `openspec-requirements/config.yaml` 的 `rules.research`。
4. **收集调研信息**（与业务/用户沟通）：
   - Epic 背景（引用 ROADMAP 条目）
   - 调研对象（业务方/用户代表/沟通方式）
   - **访谈原始记录**（内嵌组成部分）：每条含 对象/时间方式/原始摘录/关键信号，保留一手证据
   - 原始需求信息（从访谈记录提炼的原始反馈，不做转化）
   - 业务约束与规则线索（硬性限制、隐含规则）
   - 疑问与待澄清项
   - 调研结论（是否足够支撑进入 explore）
5. **生成 research.md**：按 `openspec-requirements/templates/research.md` 产出。
6. **HITL**：产出后暂停征求用户确认，确认后才可进入 `explore`。

## Guardrails

- 只写需求侧调研制品，不写代码。
- 只收集，不转化（不写 To-Be 设计、不识别最终 capabilities——那是 explore 的事）。
- **访谈原始记录必须内嵌进 research.md**（不建独立文件），作为证据来源。
- 产出后必须 HITL 确认。
