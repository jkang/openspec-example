---
name: req-planning
description: 需求侧产品规划。维护 openspec-requirements 的产品规划层，产出本阶段 phase-plan.md 与一批 Epics。使用场景：PM 需要做产品规划、产出 Epic 卡片、对齐 ROADMAP 时。
allowed-tools: Bash(git:*)
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "2.0"
---

产品规划是需求漏斗的**源**。规划产物是一批 Epics，作为后续 Explore 的边界。

## 产物

- `openspec-requirements/planning/phase-plan.md` —— 阶段计划（**只引用** `docs/ROADMAP.md`，不扩范围）
- `openspec-requirements/planning/epics/<key>/epic.md` —— 一个 Epic 卡片

## 步骤

1. **读上下文**：读 `docs/ROADMAP.md`（**唯一权威**）、`docs/PRODUCT_SENSE.md` 与 `docs/baseline/*.html`。
2. **读需求侧配置**：读 `openspec-requirements/config.yaml`，应用 `rules.product-plan` 与 `rules.epic`。
3. **生成 phase-plan.md**：按 `openspec-requirements/templates/product-plan.md` 产出本阶段规划，明确阶段目标、价值承诺、Explore 护栏、Epics 清单、Exit Criteria。**只引用 `docs/ROADMAP.md`，不擅自扩范围**。
4. **生成 Epic 卡片**：为每个规划出的 Epic 在 `planning/epics/<key>/epic.md` 生成卡片，声明目标/范围/Exit Criteria/治理映射/单选拆分状态。
5. **HITL**：产出后暂停征求用户确认。

## 治理约束

- 每个 Epic 必须引用 `docs/baseline/domain_model.html`（Bounded Contexts）、`business_process.html`（L1/L2/L3）、`service_blueprint.html`（SB-STAGE-*/SB-<LANE>-*）。
- B/C 双端视角；真实业务数据，拒绝空洞占位符。
- 若规划需要扩大全局 Roadmap 范围，必须先走 `/opsx:product-planning` 更新 `docs/ROADMAP.md`（HITL），不得在需求侧 phase-plan 中自行扩范围。

## Guardrails

- 只写需求侧规划制品，不写代码。
- 产品规划产出 Epics，不直接产出需求单元（那是 storymap → story 的事）。
- 产出后必须 HITL 确认。
