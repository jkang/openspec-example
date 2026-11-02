---
name: "Handoff"
description: "需求侧 → 开发侧交接：读 story.md，创建开发侧 change 并合成 proposal.md，登记 epic 队列，回填状态"
allowed-tools: Bash(openspec:*)
category: "Workflow"
tags: ["req-sdd", "handoff", "proposal"]
---

需求侧 → 开发侧交接（`handoff` skill）。

**输入**: 已确认的 `openspec-requirements/epics/<epic-key>/stories/<story-key>/story.md`（业务面冻结交付物）与 `test-design.md`（分层测试设计，MUST）；`architecture-impact.md`（若已跑 OPT）

**步骤**
1. 加载 `handoff` skill。
2. 读需求侧 `story.md` 与 `test-design.md`，确认均已通过 HITL；`test-design.md` 缺失或未确认时**禁止交接**。
3. `openspec new change "<name>"` 创建开发侧 change。
4. **合成 `proposal.md`**：Why ← 用户场景；What ← 范围；Capabilities ← idea 候选 Capabilities；Process/Blueprint Alignment ← L1/L2/L3 与 SB-STAGE-*/SB-<LANE>-*；Impact ← `architecture-impact.md`（若存在）优先，否则 idea 的架构影响。链接需求侧 story.md 与 test-design.md 作为依据。
5. 开发侧 **story 阶段跳过**（业务评审已在需求侧完成）。
6. 若属 Epic：更新 `openspec/epic-<key>.story-list.json`（status=in_progress, changeName）。
7. 回填需求侧 `story.md` 交接状态（changeName），同步 storymap。
8. 进入开发侧流程：proposal → 按 capability 拆分生成 specs（Story-specs，`@unit/@api/@e2e` 标签与分层对齐 `test-design.md`）→ design → tasks → apply → verify → Spec Sync → archive。
9. **分层 Sync 提示**：若为 Epic 末 Story，提示 Epic 完成后执行需求侧 Epic 归档（`epics/<epic-key>/` → `archive/YYYY-MM-DD-<epic-key>/`）+ `/opsx:baseline/sync` 统一回流基线 + Roadmap 更新。

**Guardrails**: 只做交接 + 合成 proposal，不写业务代码；不重复需求侧已完成阶段；记录双向状态可追溯。
