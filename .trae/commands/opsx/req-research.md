---
name: "Req-Research"
description: "需求侧探索：把原始反馈结构化为一篇 idea.md（结构化 6 步法）"
allowed-tools: Bash(git:*)
category: "Requirements"
tags: ["req-sdd", "explore", "idea"]
---

执行需求侧探索（`req-sdd` 漏斗第 3 步），产出确认过的 `idea.md`。

**适用范围**: 仅大块 Epic 需求。若确认为 Bug Fix / Tech Debt / 简单功能修改，引导直走交付侧。

**产物**: `openspec-requirements/ideas/<idea-key>.md`

**步骤**
1. 加载 `req-research` skill。
2. 读已确认的 Epic 卡片（`planning/epics/<key>/epic.md`）、`docs/ROADMAP.md`、`docs/baseline/*.html`、`openspec-requirements/config.yaml`。
3. 执行结构化 6 步法（澄清意图 / Roadmap 对齐 / 业务设计 / 任务类型路由 / 治理映射 / 拆分建议）。
4. **B/C 双端视角（强约束）**。
5. 按 `openspec-requirements/templates/idea.md` 产出。
6. **HITL**：产出后暂停确认，确认后才可进入 `/opsx:req-breakdown`。

**Guardrails**: 只写需求侧制品；任务类型路由是强约束；产出后必须 HITL 确认。
