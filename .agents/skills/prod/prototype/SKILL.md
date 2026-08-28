---
name: prototype
description: 需求侧交互原型（Epic 整体）。为涉及 UI 的 Epic 生成交互式 HTML 原型，在需求拆分之前完成，一次覆盖整个 Epic。使用场景：需求包含前端 UI 变更，需要原型供 PM/用户确认时。
allowed-tools: Bash(git:*)
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "2.0"
---

原型用于前端需求的验证，是 UI 交互逻辑的**唯一事实来源**（需求侧）。

**关键定位**：原型针对 **Epic 整体** 设计（一次完成），在**需求拆分（storymap）之前**完成——有了 idea 后，先对 Epic 整体做原型，再拆分 Story。拆分出的每个 Story 共享该 Epic 整体原型。

## 产物

- `openspec-requirements/epics/<epic-key>/prototypes/<capability>.html`

## 步骤

1. **读上下文**：读已确认的 `epics/<epic-key>/idea.md`，确认涉及 UI。
2. **应用规则**：读 `openspec-requirements/config.yaml` 的 `rules.prototype` 与 `docs/FRONTEND.md`。
3. **生成原型（Epic 整体）**：Vue 3 (CDN) + Tailwind CSS (CDN) 的可交互 HTML。
   - 禁止圆角（rounded-none）、禁止阴影（shadow-none）、禁止装饰性 Emoji
   - slate 色系（slate-50 背景 / slate-200 边框 / slate-900 强调色），1px 实线边框
   - 真实业务数据（严禁 foo/test 占位符），全中文
4. **HITL**：产出后暂停确认，确认后方可进入 storymap 拆分。

## 验证降级路径（浏览器不可用时）

- **首选**：通过浏览器验证原型（Chrome DevTools / webapp-testing）检查视觉约束与交互。
- **降级路径（若 MCP 浏览器实例不可用/被占用）**：
  1. 使用独立浏览器上下文（如 `--isolated`）重试；
  2. 仍不可用时，按 `docs/FRONTEND.md` 自检清单**人工/静态审查**：无圆角（`border-radius:0`）、无阴影（`box-shadow:none`）、slate 色系（#f8fafc/#e2e8f0/#0f172a）、真实中文数据、无 foo/test 占位符、Vue3+Tailwind CDN 加载正常；
  3. 将审查结果与待用户确认项一并呈报（HITL 不因工具不可用而跳过）。

## Guardrails

- 只写需求侧原型，不写业务代码。
- 原型为 Epic 整体，一次完成，不按 Story 拆散。
- 原型确认后是 UI 逻辑唯一事实来源。
- 涉及 UI 的 Epic 无已确认原型不得拆分/交接。
- 产出后必须 HITL 确认；**未确认不得进入下一阶段（强制门禁）**。
