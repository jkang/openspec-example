---
name: "Storymap"
description: "需求侧拆分：把 Epic idea 拆为多个 Story，含覆盖对账，产出 storymap.md"
allowed-tools: Bash(git:*)
category: "Requirements"
tags: ["req-sdd", "storymap", "breakdown"]
---

执行需求侧拆分（`req-sdd` 漏斗第 5 步），产出带**覆盖对账**的 `storymap.md`。

**产物**: `openspec-requirements/epics/<epic-key>/storymap.md`

**步骤**
1. 加载 `storymap` skill。
2. 读已确认的 `epics/<epic-key>/idea.md`、`epics/<epic-key>/research.md`、`epics/<epic-key>/prototypes/*.html`（若 UI）与 `epics/<epic-key>/architecture-impact.md`（若已跑 OPT）。
3. 先按 `storymap/references/story-map-method.md` 建业务主干：阶段 → 活动 → 触点 → 用户故事（must/should/could）。
4. **拆分前列出 Epic 承诺项清单**（In Scope + Exit Criteria + 候选 Capabilities + B 端承诺）。
5. 拆分交付 Story：**每个 Story 是完整端到端功能**（可承接多个用户故事；不拆到行为/UI 细节级），含 Role-Value-Goal 三要素、依赖、优先级；must→P0、should→P1、could→P2。
6. **拆分后逐项对账**：每个承诺项必须有 ≥1 个 Story 承接；未覆盖则补拆或显式降级。
7. 按 `openspec-requirements/templates/storymap.md` 产出（业务主干 + 拆分明细表 + 覆盖对账表 + 治理映射）。
8. **HITL**：产出后暂停确认，确认后每个 Story 可进入 `/req:story`。

**Guardrails**: 覆盖对账是强制步骤；主干与交付 Story 是两个粒度；优先垂直切片；产出后必须 HITL 确认。
