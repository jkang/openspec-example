---
name: "Handoff"
description: "需求侧 → 开发侧交接：读 story.md，创建开发侧 change 并合成 proposal.md，登记 epic 队列，回填状态"
allowed-tools: Bash(openspec:*)
category: "Workflow"
tags: ["req-sdd", "handoff", "proposal"]
---

需求侧 → 开发侧交接（`openspec-handoff` skill）。

**输入**: 已确认的 `openspec-requirements/stories/<key>/story.md`（业务面冻结交付物）

**步骤**
1. 加载 `openspec-handoff` skill。
2. 读需求侧 `story.md`，确认已通过 HITL。
3. `openspec new change "<name>"` 创建开发侧 change。
4. **合成 `proposal.md`**：Why ← 用户场景；What ← 范围；Capabilities ← 治理映射 taxonomy；Process/Blueprint Alignment ← L1/L2/L3 与 SB-STAGE-*/SB-<LANE>-*；Impact ← 架构影响。链接需求侧 story.md 作为业务评审依据。
5. 开发侧 **story 阶段跳过**（业务评审已在需求侧完成）。
6. 若属 Epic：更新 `openspec/epic-<key>.story-list.json`（status=in_progress, changeName）。
7. 回填需求侧 `story.md` 交接状态（changeName），同步 epic/storymap 状态。
8. 进入开发侧流程：proposal → 按 capability 拆分生成 specs（Story-specs）→ design → tasks → apply → verify → sync → archive。

**Guardrails**: 只做交接 + 合成 proposal，不写业务代码；不重复需求侧已完成阶段；记录双向状态可追溯。
