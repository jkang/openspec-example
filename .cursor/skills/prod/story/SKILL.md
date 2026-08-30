---
name: story
description: 需求侧 Story 交付物（业务面）。把已确认的 Story 深化为冻结交付物 story.md（用户场景 + 业务规则 + E2E 验收 + 治理映射），作为 handoff 合成开发侧 proposal 的输入。使用场景：拆分出的 Story 深化为可交给开发的业务面交付物时。
allowed-tools: Bash(git:*)
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "2.0"
---

Story 是需求侧**唯一冻结交付物（业务面）**。开发侧经 `/req:handoff`（skill: handoff）以本 Story 为输入合成 `proposal.md`，随后按 capability 拆分生成行为规格 specs（Story-specs）。

**需求侧不生成 specs/** —— 行为规格一律由开发侧在 proposal 之后产出。

## 产物

- `openspec-requirements/epics/<epic-key>/stories/<story-key>/story.md`（业务面冻结交付物）

## 步骤

1. **读上下文**：读已确认的 `epics/<epic-key>/idea.md`、`epics/<epic-key>/storymap.md`、以及 `epics/<epic-key>/prototypes/*.html`（若 UI 且已确认）。
2. **应用规则**：读 `openspec-requirements/config.yaml` 的 `rules.story`。
3. **生成 story.md**：按 `openspec-requirements/templates/story.md` 产出（纯业务面）：
   - 用户场景（C 端 + B 端视角）/ 范围
   - 业务规则表
   - E2E 验收标准（Given/When/Then，映射 L1/L2 与 SB-STAGE-*/SB-CUSTOMER-*）
   - 治理映射对齐（Bounded Context / L3 / SB-<LANE>-*，新增 taxonomy 显式标注）
   - 若涉及 UI：引用【已确认】的 Epic 整体原型 `epics/<epic-key>/prototypes/<capability>.html`
4. **可选分析增强（tools/）**：调用 `openspec-requirements/tools/story-narrative-generator/SKILL.md` 生成故事详述（角色画像/交互逻辑/AC/业务价值），产物 `epics/<key>/analysis/narrative/<story-key>/narrative.md`，story.md「分析制品索引」引用。仅作业务面质量增强，**不生成行为规格 specs**（由开发侧在 proposal 后产出）。
5. **UI 门禁**：涉及 UI 的 Story，若无已确认的 Epic 整体原型 → **禁止**勾选「待开发交接」，提示先跑 `prototype`（Epic 整体）。
6. **HITL**：产出后暂停确认。
7. **交接**：确认后提示执行 `/req:handoff`（合成开发侧 proposal）。

## 明确不做的事

- ❌ 不生成 `specs/`（行为规格由开发侧在 proposal 后生成）
- ❌ 不写代码 / design / tasks

## Guardrails

- 只写需求侧业务面制品，不写代码。
- Story 是需求侧冻结交付物，开发侧不重复 explore/prototype/story。
- 拒绝空洞占位符；真实业务数据、全中文。
- 产出后必须 HITL 确认；**未确认不得进入下一阶段（强制门禁）**。
