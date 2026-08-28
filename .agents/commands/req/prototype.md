---
name: "Prototype"
description: "需求侧交互原型（Epic 整体）：为涉及 UI 的 Epic 生成交互式 HTML 原型，在需求拆分之前一次完成"
allowed-tools: Bash(git:*)
category: "Requirements"
tags: ["req-sdd", "prototype", "ui"]
---

为涉及 UI 的 Epic 生成交互式 HTML 原型（`req-sdd` 漏斗第 3 步，在 storymap 之前，Epic 整体一次完成）。

**产物**: `openspec-requirements/epics/<epic-key>/prototypes/<capability>.html`

**步骤**
1. 加载 `prototype` skill。
2. 读 `ideas/<idea-key>.md`，确认涉及 UI。
3. 严格遵循 `docs/FRONTEND.md`：无圆角 / 无阴影 / slate 色系 / 真实业务数据 / 全中文 / Vue 3 (CDN) + Tailwind CSS (CDN)。
4. **产出后必须暂停征求用户确认（HITL）**。
5. 确认后进入 `/req:storymap`（拆分出的 Story 共享此 Epic 整体原型）。

**Guardrails**: 只写需求侧原型（Epic 整体，不按 Story 拆散）；产出后必须 HITL 确认；未确认原型不得拆分/交接。
