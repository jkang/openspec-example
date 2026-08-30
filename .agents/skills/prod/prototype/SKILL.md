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

**原型形态分两个分支**（按业务复杂度路由）：

| 分支 | 适用场景 | 技术形态 | 产物 |
| --- | --- | --- | --- |
| **A · HTML 原型（默认）** | 简单 UI（单角色、流程单一） | Vue 3 (CDN) + Tailwind CSS (CDN) 可交互 HTML | `epics/<key>/prototypes/<page>.html` |
| **B · 可工作原型** | 复杂业务（多角色协作 / 多流程编排 / 需真实数据交互验证） | React/Vue + Express 前后端一体化（`prototype-generator` 工具） | `epics/<key>/prototypes/working/mvp-prototype/` |

**前置（产品级）**：首个涉及 UI 的 Epic 原型前，用 `brand-design-system` 工具生成产品 design system（`docs/baseline/design-system/`），后续原型与开发统一引用其 tokens。

## 产物

- 分支 A：`openspec-requirements/epics/<epic-key>/prototypes/<page>.html`
- 分支 B：`openspec-requirements/epics/<epic-key>/prototypes/working/mvp-prototype/`
- 前置：`docs/baseline/design-system/`（产品级，一次生成）

## 步骤

1. **读上下文**：读已确认的 `epics/<epic-key>/idea.md`，确认涉及 UI。
2. **应用规则**：读 `openspec-requirements/config.yaml` 的 `rules.prototype` 与 `docs/FRONTEND.md`。
3. **分支决策**：判断业务复杂度——
   - 简单 UI → **分支 A**（Vue3+Tailwind CDN HTML，走下方"分支 A 生成"）。
   - 复杂业务（多角色/多流程/真实数据闭环）→ **分支 B**：按 `openspec-requirements/tools/prototype-generator/SKILL.md` 调用 `scaffold_mvp.py` 生成可工作原型；上游输入取 idea.md 的 To-Be 章节 + design-system tokens；完成后必须 `npm install && npm run dev` + curl API + 浏览器逐页验证。
4. **前置 design system（产品级，仅首次）**：若 `docs/baseline/design-system/` 尚不存在，先按 `openspec-requirements/tools/brand-design-system/SKILL.md` 生成（遵循 FRONTEND.md ZAPP 约束：暗黑高端背景 #08080E、语义令牌色彩、radius=0/2px、无阴影、无装饰 Emoji）。
5. **HITL**：产出后暂停确认，确认后方可进入 storymap 拆分。

## 分支 A 生成规范（HTML 原型）

   - 只允许圆角 rounded-none/rounded-sm（禁止大圆角），禁止 box-shadow 与 linear-gradient，禁止装饰性 Emoji
   - ZAPP 暗黑语义令牌（bg-background #08080E / bg-card #0F0F1C / border-border #222238 / text-foreground #EFEFFA；primary #C8FF00 荧光绿, accent #FF2D6B 热情粉, electric #3B6DFF, warning #FF9A00, success #00E5A0），1px 实线边框
   - 标题 font-display (Exo 2) uppercase font-black；价格 font-mono (JetBrains Mono) font-bold text-primary；标签 font-mono uppercase tracking-widest text-muted-foreground
   - 真实业务数据（严禁 foo/test 占位符），全中文

## 验证降级路径（浏览器不可用时）

- **首选**：通过浏览器验证原型（Chrome DevTools / webapp-testing）检查视觉约束与交互。
- **降级路径（若 MCP 浏览器实例不可用/被占用）**：
  1. 使用独立浏览器上下文（如 `--isolated`）重试；
  2. 仍不可用时，按 `docs/FRONTEND.md` 自检清单**人工/静态审查**：仅 `rounded-none`/`rounded-sm`（无大圆角）、无 `box-shadow`/`linear-gradient`、ZAPP 暗黑令牌（背景 `#08080E`、卡片 `#0F0F1C`、边框 `#222238`，主色 `#C8FF00`）、标题 `font-display font-black uppercase`、价格 `font-mono font-bold text-primary`、真实中文数据、无 foo/test 占位符、Vue3+Tailwind CDN 加载正常；
  3. 将审查结果与待用户确认项一并呈报（HITL 不因工具不可用而跳过）。

## Guardrails

- 只写需求侧原型，不写业务代码。
- 原型为 Epic 整体，一次完成，不按 Story 拆散。
- 分支 B 可工作原型仍须：ZAPP 暗黑令牌（design-system tokens）、真实中文数据、禁装饰 Emoji；圆角/阴影规则对可工作原型放宽（组件库默认样式）。
- 原型确认后是 UI 逻辑唯一事实来源。
- 涉及 UI 的 Epic 无已确认原型不得拆分/交接。
- 产出后必须 HITL 确认；**未确认不得进入下一阶段（强制门禁）**。
