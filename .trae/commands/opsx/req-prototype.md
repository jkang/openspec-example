---
name: "Req-Prototype"
description: "需求侧交互原型：为涉及 UI 的 Story 生成交互式 HTML 原型（极简 UI 规范）"
allowed-tools: Bash(git:*)
category: "Requirements"
tags: ["req-sdd", "prototype", "ui"]
---

为涉及 UI 的 Story 生成交互式 HTML 原型（`req-sdd` 漏斗，Story 之前）。

**产物**: `openspec-requirements/stories/<key>/prototypes/<capability>.html`

**步骤**
1. 加载 `req-prototype` skill。
2. 读 `storymap.md` 与对应 idea，确认涉及 UI。
3. 严格遵循 `docs/FRONTEND.md`：无圆角 / 无阴影 / slate 色系 / 真实业务数据 / 全中文 / Vue 3 (CDN) + Tailwind CSS (CDN)。
4. 产出后**必须暂停征求用户确认（HITL）**。
5. 确认后回填链接到对应 `story.md` 的「原型参考」。

**Guardrails**: 只写需求侧原型；产出后必须 HITL 确认；未确认原型不得交接。
