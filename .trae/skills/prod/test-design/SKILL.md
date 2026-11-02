---
name: test-design
description: 需求侧测试设计（QA·分层）。把已确认 Story 的 E2E 验收映射为 @unit/@api/@e2e 分层测试用例与追溯矩阵，形成 test-design.md，作为 handoff 与开发侧 spec-design 的输入。使用场景：Story 已确认、交接开发前需要冻结测试设计时。
allowed-tools: Bash(git:*)
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "1.0"
---

测试设计是需求漏斗的**第 7 步（MUST）**，位于 Story 之后、handoff 之前。它把 `story.md` 的业务面 E2E 验收翻译成**可执行的分层测试契约**，让开发侧在 `spec-design` 打标签、`apply` 写测试时有唯一依据，避免"冰淇淋蛋卷"反模式（所有验证都堆到 E2E）。

## 产物

- `openspec-requirements/epics/<epic-key>/stories/<story-key>/test-design.md`
- 若一个 Epic 统一设计：`openspec-requirements/epics/<epic-key>/test-design.md`（需在 `storymap.md` 引用并标明覆盖的 Story）

## 输入

- 已确认的 `stories/<story-key>/story.md`（业务面冻结交付物）
- `epics/<epic-key>/storymap.md`（覆盖对账与 Story 清单）
- `epics/<epic-key>/idea.md`（候选 Capabilities / 架构影响）
- `docs/TESTING_STRATEGY.md`（分层定义、BDD 标签、E2E 步骤命名空间规范）
- `docs/baseline/business_process.html`、`service_blueprint.html`、`domain_model.html`

## 分层规则（强制）

- **`@unit`（~70%）**：纯领域逻辑、业务规则排列组合、状态机流转、金额/积分等计算与边界。
- **`@api`（~20%）**：路由鉴权、参数校验、HTTP 语义、Repository 持久化边界。
- **`@e2e`（~10%）**：跨端核心交易主链路（Happy Path）与用户可观察的 UI 反馈。
- 严禁把底层业务逻辑判断推给 `@e2e`；一个业务规则只应在其最低可验证层断言。

## 追溯矩阵（强制）

- 每个 Story 的每个 E2E 场景必须映射到 ≥1 个分层用例。
- 矩阵列：`Story | E2E Scenario | Case ID | 层(@unit/@api/@e2e) | 覆盖状态`。
- 存在 ❌ 未覆盖项时，必须**补设计用例**或**显式标注风险并说明理由**；禁止静默遗留。

## 步骤

1. **读上下文**：读已确认的 `story.md`、`storymap.md`、`idea.md`、`docs/TESTING_STRATEGY.md` 与治理基线。
2. **应用规则**：读 `openspec-requirements/config.yaml` 的 `rules.test-design`。
3. **场景分层**：逐个 Gherkin 场景判定最低可验证层并打标签（`@unit/@api/@e2e`）。
4. **用例设计**：为每个场景补正常/异常/边界用例；标注前置数据（动态建号优先，遵循 TESTING_STRATEGY 数据策略）。
5. **追溯对账**：生成 Story×Scenario→Case 的追溯矩阵，逐项标注覆盖状态。
6. **E2E 命名空间**：给出 E2E 场景的领域前缀与步骤命名建议，避免跨 Story ambiguous（遵循 TESTING_STRATEGY）。
7. **生成 test-design.md**：按 `openspec-requirements/templates/test-design.md` 产出。
8. **HITL**：产出后暂停确认；确认后才可进入 `/req:handoff`。

## 明确不做的事

- ❌ 不写测试代码（`apply` 阶段落实）
- ❌ 不生成 `specs/` / `design.md` / `tasks.md`
- ❌ 不替代开发侧 `spec-design` 的行为规格标签（那是落地执行层）

## Guardrails

- 只写需求侧测试设计制品，不写代码。
- 分层必须遵循 `docs/TESTING_STRATEGY.md`；追溯矩阵是强制步骤。
- 真实业务数据、全中文，拒绝空洞占位符。
- 产出后必须 HITL 确认；**未确认不得进入 handoff（强制门禁）**。
