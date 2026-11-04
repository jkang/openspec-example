---
name: explore
description: 需求侧探索（Explore）。把调研信息【转化】为产品设计思路，产出 idea.md（含 To-Be Process / To-Be Journey 业务设计与候选 Capabilities）；可选问题定义、As-Is 价值流、To-Be 泳道、竞品对标。使用场景：需求调研完成后，需要把调研信息转化为产品设计思路时。
allowed-tools: Bash(git:*)
license: MIT
compatibility: 需求侧工作流 (req-sdd)
metadata:
  author: sdd-team
  version: "2.1"
---

探索是需求漏斗的**第 2 步**。它把调研信息**转化**为产品设计思路。**本 skill 仅用于大块 Epic 需求**；Bug Fix / Tech Debt / 简单功能修改应直走交付侧。

## 产物

- `openspec-requirements/epics/<epic-key>/idea.md`
- 可选（均不阻塞漏斗）：
  - `analysis/problem/problem-definition.md`（问题定义 8 要素）
  - `analysis/value-stream/value-stream.md`（L1 价值流 + 聚焦范围）
  - `analysis/to-be/`（To-Be 流程泳道，复杂 Epic）
  - `analysis/competitor/competitor.md`（竞品与参考案例）

输出契约见 `assets/manifest.yaml`（模板统一引用 `openspec-requirements/templates/`）。

## 输入

- 已确认的 `openspec-requirements/epics/<epic-key>/research.md`（需求调研纪要）

## 探索步骤

1. **读上下文**：读已确认的 `epics/<epic-key>/research.md` 与 `docs/ROADMAP.md`。
2. **应用规则**：读 `openspec-requirements/config.yaml` 的 `rules.explore`。
3. **可选：盘问澄清**：业务意图、B/C 双端规则或 To-Be 边界含糊时，加载 `grilling` skill 分轮问清；同时用 `glossary` skill 锁定关键术语。
4. **转化产出 idea.md**（按 `templates/idea.md`）：
   - **澄清业务意图**：目的、范围、业务规则（含 B 端视角：后台配置/生命周期/权限）。
   - **可选：问题定义**：按 `references/problem-definition.md` 做 8 要素定义，为 Exit Criteria 提供可量化依据；产物 `analysis/problem/`。
   - **可选：L1 价值流**：按 `references/value-stream.md` 梳理 As-Is 价值流与聚焦范围；产物 `analysis/value-stream/`。
   - **To-Be Process**：按 `references/to-be-process.md` 设计目标流程（L3→L5、人机分工、HITL 焦点、异常链路），与现状差异点；复杂 Epic 产物 `analysis/to-be/`。
   - **To-Be Journey**：目标用户体验旅程（用户动作/系统反应/情绪/触点）。
   - **可选：竞品与参考案例**：按 `references/competitor-benchmark.md` 在原型前做外部对标与设计取舍；产物 `analysis/competitor/`。
   - **产品设计思路**：业务逻辑流转与用户价值。
   - **任务类型确认与路由**：Epic / Feature / Bug Fix / Tech Debt。Bug Fix / Tech Debt / 简单功能 → **不继续需求漏斗**，引导直走交付侧。
   - **候选 Capabilities（关键）**：参考 `docs/baseline/domain_model.html` 的 BC→Capability 映射，识别新增/修改 Capability（新增标"新增 taxonomy"及理由）。这是 handoff 合成 proposal 与开发侧 specs/<capability>/ 落位的依据。
   - **治理映射对齐**：`business_process.html`（L1/L2/L3）、`service_blueprint.html`（SB-STAGE-*/SB-<LANE>-*）。
   - **需求拆分建议 + 架构影响分析**。
   - **可选分析增强（tools/）**：调用 `openspec-requirements/tools/` 下 AI4PM 需求工程工具，为 idea.md 生成结构化分析与可视化（产物落位 `epics/<key>/analysis/`，idea.md「分析制品索引」引用）：
     - `osm-map-generator` → `analysis/osm/`（Epic 目标-策略-度量，Exit Criteria 度量锚点）
      - `business-process-deep-analyzer` → `analysis/process/`（As-Is L1/L2 业务分析与痛点；不是 To-Be）
     - `journey-map-generator` → `analysis/journey/`（To-Be Journey 可视化，mode: to-be）
     - 均为 **optional**：缺省不影响进入下一阶段；生成后纳入本次 HITL 确认范围。
5. **HITL**：产出后暂停确认。确认后：涉及 UI 先进入 prototype；随后进入 `/req:arch`（架构影响，OPT，推荐）；最后进入 storymap。跳过原型时可直接进入 `/req:arch` 或 storymap。idea.md 的"架构影响"章节是 `/req:arch` 的输入草稿。

## Guardrails

- 只写需求侧制品，不写代码。
- 探索是思考与转化，不是实现。
- B/C 双端视角（强约束）；To-Be Process / To-Be Journey 是必填章节。
- 问题定义、价值流、To-Be 泳道、竞品对标均为 **optional**，不得因未做而阻塞漏斗。
- As-Is 与 To-Be 必须分清：价值流/L3L4 是 As-Is，To-Be 是目标泳道，禁止混标。
- 候选 Capabilities 是强约束（否则 handoff/specs 无 capability 依据）。
- 任务类型路由是强约束：小需求不得滞留需求漏斗。
- 产出后必须 HITL 确认；**未确认不得进入下一阶段（强制门禁）**。
