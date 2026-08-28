---
name: explore
description: 需求侧探索（Explore）。把调研信息【转化】为产品设计思路，产出 idea.md（含 To-Be Process / To-Be Journey 业务设计与候选 Capabilities 识别）。使用场景：需求调研完成后，需要把调研信息转化为产品设计思路时。
allowed-tools: Bash(git:*)
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "2.0"
---

探索是需求漏斗的**第 2 步**。它把调研信息**转化**为产品设计思路。**本 skill 仅用于大块 Epic 需求**；Bug Fix / Tech Debt / 简单功能修改应直走交付侧。

## 产物

- `openspec-requirements/epics/<epic-key>/idea.md`

## 输入

- 已确认的 `openspec-requirements/epics/<epic-key>/research.md`（需求调研纪要）

## 探索步骤

1. **读上下文**：读已确认的 `epics/<epic-key>/research.md` 与 `docs/ROADMAP.md`。
2. **应用规则**：读 `openspec-requirements/config.yaml` 的 `rules.explore`。
3. **转化产出 idea.md**（按 `templates/idea.md`）：
   - **澄清业务意图**：目的、范围、业务规则（含 B 端视角：后台配置/生命周期/权限）。
   - **To-Be Process**：目标业务流程设计（可引用 L1/L2 节点），与现状差异点。
   - **To-Be Journey**：目标用户体验旅程（用户动作/系统反应/情绪/触点）。
   - **产品设计思路**：业务逻辑流转与用户价值。
   - **任务类型确认与路由**：Epic / Feature / Bug Fix / Tech Debt。Bug Fix / Tech Debt / 简单功能 → **不继续需求漏斗**，引导直走交付侧。
   - **候选 Capabilities（关键）**：参考 `docs/baseline/domain_model.html` 的 BC→Capability 映射，识别新增/修改 Capability（新增标"新增 taxonomy"及理由）。这是 handoff 合成 proposal 与开发侧 specs/<capability>/ 落位的依据。
   - **治理映射对齐**：`business_process.html`（L1/L2/L3）、`service_blueprint.html`（SB-STAGE-*/SB-<LANE>-*）。
   - **需求拆分建议 + 架构影响分析**。
4. **HITL**：产出后暂停确认，确认后才可进入 prototype（若 UI）或 storymap。

## Guardrails

- 只写需求侧制品，不写代码。
- 探索是思考与转化，不是实现。
- B/C 双端视角（强约束）；To-Be Process / To-Be Journey 是必填章节。
- 候选 Capabilities 是强约束（否则 handoff/specs 无 capability 依据）。
- 任务类型路由是强约束：小需求不得滞留需求漏斗。
- 产出后必须 HITL 确认；**未确认不得进入下一阶段（强制门禁）**。
