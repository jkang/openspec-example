---
name: req-research
description: 需求侧探索（Explore）。把业务/用户的原始反馈结构化为一篇 idea.md，澄清意图、对齐 Roadmap、确认任务类型与治理映射。使用场景：收到 Epic 级原始需求/反馈，需要探索并沉淀 idea 时。
allowed-tools: Bash(git:*)
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "2.0"
---

探索是需求漏斗的第 3 步。把原始反馈变成一篇**确认过的 idea.md**。**本 skill 仅用于大块 Epic 需求**；Bug Fix / Tech Debt / 简单功能修改应直走交付侧。

## 产物

- `openspec-requirements/ideas/<idea-key>.md`

## 结构化 6 步法

1. **澄清业务意图**：目的、范围、业务规则（含 B 端视角：后台配置/生命周期/权限）。
2. **Roadmap 对齐**：引用 `docs/ROADMAP.md` 当前阶段目标，记录对齐说明。
3. **业务设计思路**：业务逻辑流转与用户价值优先。
4. **任务类型确认与路由**：Epic / Feature / Bug Fix / Tech Debt。
   - ⚠️ 若为 **Bug Fix / Tech Debt / 简单功能修改**：**不继续需求漏斗**，引导用户直走交付侧（`openspec/changes/` 标准流程）。
5. **治理映射对齐**：读 `docs/baseline/domain_model.html`（Bounded Contexts）、`business_process.html`（L1/L2/L3）、`service_blueprint.html`（SB-STAGE-*/SB-<LANE>-*）。
6. **需求拆分建议 + 架构影响分析**。

## 步骤

1. **读上下文**：读已确认的 Epic 卡片（`planning/epics/<key>/epic.md`）与 `docs/ROADMAP.md`。
2. **应用规则**：读 `openspec-requirements/config.yaml` 的 `rules.idea`。
3. **生成 idea.md**：按 `openspec-requirements/templates/idea.md` 产出，填写全部 7 章节。
4. **HITL**：产出后暂停确认，确认后才可进入 storymap。

## Guardrails

- 只写需求侧制品，不写代码。
- 探索是思考，不是实现。
- B/C 双端视角（强约束）。
- 任务类型路由是强约束：小需求不得滞留需求漏斗。
- 产出后必须 HITL 确认。
