---
name: "Arch"
description: "需求侧架构影响分析（OPT）：评估 Epic 对 Bounded Context / Capability / 四层架构 / 数据 / 渠道的影响，产出 architecture-impact.md"
allowed-tools: Bash(git:*)
category: "Requirements"
tags: ["req-sdd", "arch", "architecture-impact", "optional"]
---

可选执行需求侧架构影响分析（`req-sdd` 漏斗 OPT 步骤），把 `idea.md` 里的架构影响从"一节"升级为可独立确认的制品。

**适用范围**: 仅大块 Epic 需求（需求侧漏斗）。直走交付侧任务（Bug Fix / Tech Debt / 简单功能）**不走本步骤**，架构影响仍内联在 `proposal.md` 的 Impact 章节。

**时机**: 原型确认之后、`/req:storymap` 之前（涉及 UI 时在原型后；不涉及 UI 时在 explore 后）。

**产物**: `openspec-requirements/epics/<epic-key>/architecture-impact.md`

**步骤**
1. 加载 `arch-impact` skill。
2. 读已确认的 `idea.md`、`research.md`、`prototypes/*.html`（若 UI）、`docs/ARCHITECTURE.md`、`docs/FRONTEND.md` 与 `docs/baseline/*.html`。
3. 评估：Bounded Context / Capability 影响、四层架构（HTTP→Service→Domain→Repo）影响、数据与存储、Web/小程序渠道同源、API 契约、安全与权限、非功能（性能/可观测）、迁移与兼容。
4. 按 `openspec-requirements/templates/architecture-impact.md` 产出；**无实质影响时必须显式记录 no-op 及理由**，不得静默跳过。
5. **HITL**：产出后暂停确认；确认后才可进入 `/req:storymap`。

**Guardrails**: 只写需求侧架构分析制品，不写代码、不生成 specs/design/tasks；治理映射必须引用真实 `docs/baseline/*.html` 节点；产出后必须 HITL 确认。
