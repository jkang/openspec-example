---
name: "Test-Design"
description: "需求侧测试设计（QA·分层）：把 Story E2E 验收映射为 @unit/@api/@e2e 分层用例与追溯矩阵，产出 test-design.md"
allowed-tools: Bash(git:*)
category: "Requirements"
tags: ["req-sdd", "test-design", "testing", "qa"]
---

执行需求侧测试设计（`req-sdd` 漏斗第 7 步，MUST），把已确认 Story 的 E2E 验收拆成**分层测试用例 + 追溯矩阵**。

**时机**: Story 已确认之后、`/req:handoff` 之前。`test-design.md` 是 handoff 合成 proposal 与开发侧 `spec-design`（BDD 打标签）的输入。

**产物**: `openspec-requirements/epics/<epic-key>/stories/<story-key>/test-design.md`（若一个 Epic 统一设计，可落 `epics/<epic-key>/test-design.md` 并在 storymap 引用）

**步骤**
1. 加载 `test-design` skill。
2. 读已确认的 `stories/<story-key>/story.md`、`epics/<epic-key>/storymap.md`、`idea.md`、`docs/TESTING_STRATEGY.md` 与 `docs/baseline/*.html`。
3. **分层映射**：按测试金字塔把每个 Gherkin 场景归层——纯领域规则 → `@unit`（~70%）；路由/鉴权/持久化边界 → `@api`（~20%）；跨端核心交易主链路 → `@e2e`（~10%）。严禁把底层业务判断推给 `@e2e`。
4. **测试用例清单**：为每个场景给出正常/异常/边界用例（Case ID、层、关联 Story/Scenario、Given/When/Then 摘要）。
5. **追溯矩阵（强制）**：Story E2E 场景 → 分层用例 → 层 → 覆盖状态（✅/❌）；存在 ❌ 必须补用例或显式标注风险。
6. 按 `openspec-requirements/templates/test-design.md` 产出。
7. **HITL**：产出后暂停确认；确认后才可进入 `/req:handoff`。

**Guardrails**: 本阶段只做**测试设计（用例与追溯）**，不写测试代码、不生成 specs/design/tasks；分层必须遵循 `docs/TESTING_STRATEGY.md`；产出后必须 HITL 确认；未确认不得交接。
