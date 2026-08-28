---
name: req-prototype
description: 需求侧交互原型。为涉及 UI 的 Story 生成交互式 HTML 原型，遵循极简 UI 规范。使用场景：需求包含前端 UI 变更，需要原型供 PM/用户确认时。
allowed-tools: Bash(git:*)
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "1.0"
---

原型用于前端需求的验证。是 UI 交互逻辑的**唯一事实来源**（需求侧）。

## 产物

- `openspec-requirements/stories/<key>/prototypes/<capability>.html`

## 步骤

1. **读上下文**：读 `storymap.md` 与对应的 idea，确认涉及 UI。
2. **应用规则**：读 `openspec-requirements/config.yaml` 的 `rules.prototype` 与 `docs/FRONTEND.md`。
3. **生成原型**：Vue 3 (CDN) + Tailwind CSS (CDN) 的可交互 HTML。
   - 禁止圆角（rounded-none）、禁止阴影（shadow-none）、禁止装饰性 Emoji
   - slate 色系（slate-50 背景 / slate-200 边框 / slate-900 强调色），1px 实线边框
   - 真实业务数据（严禁 foo/test 占位符），全中文
4. **HITL**：产出后暂停确认，确认后方可进入 story。

## Guardrails

- 只写需求侧原型，不写业务代码。
- 原型确认后是 UI 逻辑唯一事实来源。
- 产出后必须 HITL 确认。
