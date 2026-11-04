---
name: "Story"
description: "需求侧 Story 交付物（业务面）：产出 story.md，作为 handoff 合成开发侧 proposal 的输入"
allowed-tools: Bash(git:*)
category: "Requirements"
tags: ["req-sdd", "story", "deliverable"]
---

深化已确认的 Story 为冻结交付物 `story.md`（业务面）。

**适用范围**: `req-sdd` 漏斗第 6 步。需求侧只产业务面；行为规格（Story-specs）由开发侧在 proposal 后生成。

**产物**: `openspec-requirements/epics/<epic-key>/stories/<story-key>/story.md`

**步骤**
1. 加载 `story` skill。
2. 读已确认的 `epics/<epic-key>/idea.md`、`epics/<epic-key>/storymap.md`、`epics/<epic-key>/prototypes/*.html`（若 UI 且已确认）与 `epics/<epic-key>/architecture-impact.md`（若已跑 OPT）。
3. 业务规则/验收标准有歧义时加载 `grilling` skill；术语不一致时加载 `glossary` skill。
4. 按 `openspec-requirements/templates/story.md` 与 `story/references/story-narrative.md` 产出（纯业务面）：用户场景（B/C 双端）/ 范围 / 叙事五段（核心描述 / 角色画像 / 交互逻辑 / 验收标准 / 业务价值）/ 业务规则表 / E2E 验收（映射 L1/L2 与 SB-STAGE-*/SB-CUSTOMER-*）/ 治理映射 / 交接状态。
5. **UI 门禁**：涉及 UI 的 Story，无已确认的 Epic 整体原型 → 禁止勾选「待开发交接」，先跑 `/req:prototype`；不新造 Story 级原型作为 SSOT。
6. **HITL**：产出后暂停确认。
7. 确认后先执行 `/req:test-design`（MUST，分层测试用例 + 追溯矩阵）；test-design 确认后再 `/req:handoff` 交接给开发侧。

**Guardrails**: 不生成 specs/（那是开发侧的活）；不写代码；产出后必须 HITL 确认。
