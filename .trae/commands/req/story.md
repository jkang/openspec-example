---
name: "Story"
description: "需求侧 Story 交付物（业务面）：产出 story.md，作为 handoff 合成开发侧 proposal 的输入"
allowed-tools: Bash(git:*)
category: "Requirements"
tags: ["req-sdd", "story", "deliverable"]
---

深化已确认的 Story 为冻结交付物 `story.md`（业务面）。

**适用范围**: `req-sdd` 漏斗第 5 步。需求侧只产业务面；行为规格（Story-specs）由开发侧在 proposal 后生成。

**产物**: `openspec-requirements/stories/<story-key>/story.md`

**步骤**
1. 加载 `story` skill。
2. 读已确认的 `ideas/<idea-key>.md`、`storymaps/<epic-key>/storymap.md`、`prototypes/<epic-key>/*.html`（若 UI 且已确认）。
3. 按 `openspec-requirements/templates/story.md` 产出（纯业务面）：用户场景（B/C 双端）/ 范围 / 业务规则表 / E2E 验收（映射 L1/L2 与 SB-STAGE-*/SB-CUSTOMER-*）/ 治理映射 / 交接状态。
4. **UI 门禁**：涉及 UI 的 Story，无已确认的 Epic 整体原型 → 禁止勾选「待开发交接」，先跑 `/req:prototype`。
5. **HITL**：产出后暂停确认。
6. 确认后提示 `/req:handoff` 交接给开发侧。

**Guardrails**: 不生成 specs/（那是开发侧的活）；不写代码；产出后必须 HITL 确认。
