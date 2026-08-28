---
name: "Research"
description: "需求侧需求调研：针对单个 Epic 收集需求信息，产出 research.md"
allowed-tools: Bash(git:*)
category: "Requirements"
tags: ["req-sdd", "research"]
---

执行需求侧需求调研（`req-sdd` 漏斗第 1 步）。

**适用范围**: 仅大块 Epic 需求。Bug Fix / Tech Debt / 简单功能修改不经过此命令。

**产物**: `openspec-requirements/research/<epic-key>.md`

**步骤**
1. 加载 `research` skill。
2. 从 `docs/ROADMAP.md`（唯一权威）确定要调研的 Epic（一句话描述，一阶段可多 Epic）。
3. 与业务/用户沟通，收集：Epic 背景 / 调研对象 / 原始需求信息 / 业务约束线索 / 疑问待澄清项 / 调研结论。
4. 按 `openspec-requirements/templates/research.md` 产出 `research/<epic-key>.md`。
5. **HITL**：产出后暂停征求用户确认，确认后才可进入 `/req:explore`。

**Guardrails**: 只收集不转化；产出后必须 HITL 确认。
