---
name: "Req-Planning"
description: "需求侧产品规划：产出 phase-plan.md 与一批 Epics"
allowed-tools: Bash(git:*)
category: "Requirements"
tags: ["req-sdd", "planning", "epics"]
---

执行需求侧产品规划（`req-sdd` 漏斗第 1 步）。

**适用范围**: 仅大块 Epic 需求。Bug Fix / Tech Debt / 简单功能修改不经过此命令。

**产物**:
- `openspec-requirements/planning/phase-plan.md`（只引用 `docs/ROADMAP.md`，不扩范围）
- `openspec-requirements/planning/epics/<key>/epic.md`（每个 Epic 一张卡片）

**步骤**
1. 加载 `req-planning` skill。
2. 读 `docs/ROADMAP.md`（唯一权威）、`docs/PRODUCT_SENSE.md`、`docs/baseline/*.html`、`openspec-requirements/config.yaml`。
3. 按 `openspec-requirements/templates/product-plan.md` 产出 `planning/phase-plan.md`。
4. 为每个 Epic 按 `openspec-requirements/templates/epic.md` 产出 `planning/epics/<key>/epic.md`。
5. **HITL**：产出后暂停征求用户确认，确认后才可进入 `/opsx:req-research`。

**Guardrails**: 只写需求侧规划制品；产出后必须 HITL 确认。
