---
name: storymap
description: 需求侧拆分（Storymap）。把大需求/复杂 idea 拆分为多个可独立交付的 Story，形成 storymap.md，并进行【覆盖对账】（Epic 每个承诺项都有 Story 承接）。使用场景：一个 Epic idea 需要拆成多个需求单元时。
allowed-tools: Bash(git:*)
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "2.0"
---

拆分是需求漏斗的**第 4 步**（原型之后）。一个 Epic idea 太大时，先拆成一个 **storymap**（多个 Story 的映射），再逐个深化为 story。

## 产物

- `openspec-requirements/epics/<epic-key>/storymap.md`

## 输入

- 已确认的 `epics/<epic-key>/idea.md`
- 已确认的 `epics/<epic-key>/prototypes/*.html`（若涉及 UI，Epic 整体原型）

## 拆分粒度原则

- **Story = 一个完整端到端功能**（如"用户注册"含 表单→校验→API→落库→自动登录 整条链路）。
- **不拆到行为/UI 细节级**，避免破坏上下文。
- 每个 Story 必须可独立交付、可独立验收。
- 三要素：角色 (Role) / 价值 (Value) / 目标 (Goal)。

## 覆盖对账（强制）

拆分**前**：
1. 读 `epics/<epic-key>/idea.md`，列出全部承诺项（In Scope + Exit Criteria + **候选 Capabilities** + B 端承诺）。

拆分**后**：
2. 逐项对账：每个承诺项必须有 ≥1 个 Story 承接。
3. 对账表写入 storymap 的「覆盖对账」章节：`承诺项 → 承接 Story → ✅/❌`。
4. **闭环校验**：存在 ❌ 未覆盖项时，必须**补拆 Story** 或**显式降级**（在 idea 中说明理由并同步 Exit Criteria）；严禁留下"承诺但不交付"的 capability。

## 步骤

1. **读上下文**：读已确认的 `epics/<epic-key>/idea.md`、`epics/<epic-key>/research.md` 与 `epics/<epic-key>/prototypes/*.html`（若 UI）。
2. **应用规则**：读 `openspec-requirements/config.yaml` 的 `rules.storymap`。
3. **生成 storymap.md**：按 `openspec-requirements/templates/storymap.md` 产出（拆分明细表 + 覆盖对账表 + 治理映射）。
4. **HITL**：产出后暂停确认，确认后每个 Story 可进入 story。

## Guardrails

- 只写需求侧拆分制品，不写代码。
- 覆盖对账是强制步骤，禁止跳过后直接产出拆分明细。
- 一个 Story 对应一个交付 change 为宜。
- 产出后必须 HITL 确认。
