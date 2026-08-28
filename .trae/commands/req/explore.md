---
name: "Explore"
description: "需求侧探索：把调研信息转化为产品设计思路，产出 idea.md（含 To-Be Process/Journey 与候选 Capabilities）"
allowed-tools: Bash(git:*)
category: "Requirements"
tags: ["req-sdd", "explore", "idea"]
---

执行需求侧探索（`req-sdd` 漏斗第 2 步），把已确认的调研信息转化为产品设计思路。

**适用范围**: 仅大块 Epic 需求。若确认为 Bug Fix / Tech Debt / 简单功能修改，引导直走交付侧。

**产物**: `openspec-requirements/ideas/<idea-key>.md`

**步骤**
1. 加载 `explore` skill。
2. 读已确认的 `research/<epic-key>.md`、`docs/ROADMAP.md`、`docs/baseline/*.html`、`openspec-requirements/config.yaml`。
3. 转化产出 idea.md：澄清业务意图 / **To-Be Process** / **To-Be Journey** / 产品设计思路 / 任务类型路由 / **候选 Capabilities**（对齐 domain_model）/ 治理映射 / 拆分建议 / 架构影响。
4. **B/C 双端视角（强约束）**。
5. 按 `openspec-requirements/templates/idea.md` 产出。
6. **HITL**：产出后暂停确认，确认后才可进入 `/req:prototype`（若 UI）或 `/req:storymap`。

**Guardrails**: 只写需求侧制品；候选 Capabilities 是强约束；产出后必须 HITL 确认。
