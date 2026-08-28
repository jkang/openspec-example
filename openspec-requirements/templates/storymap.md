# Storymap: <Epic 名称> 需求拆分

> Epic Key: `<epic-key>`
> 关联调研: `epics/<epic-key>/research.md`
> 关联 Idea: `epics/<epic-key>/idea.md`
> 关联原型: `epics/<epic-key>/prototypes/*.html`（Epic 整体，若涉及 UI）
> 产出后需用户确认（HITL）

<!--
storymap 用于把大需求（Epic 级）拆分为多个可独立交付的 Story。
每个 Story 对应 epics/<epic-key>/stories/<story-key>/story.md（业务面交付物）。
要求：拆分必须【覆盖完整】（Epic 每个承诺项都要有 Story 承接），粒度取【完整端到端功能】。
-->

## 需求背景 (Background)
<!-- 用 1-2 句话说明该大需求要解决的业务问题（引用 research/idea 结论）。 -->

## 拆分粒度原则 (Granularity)
<!--
- Story = 一个【完整端到端功能】的粒度（如"用户注册"含 表单→校验→API→落库→自动登录 整条链路）。
- 不拆到行为/UI 细节级，避免破坏上下文。
- 每个 Story 必须可独立交付、可独立验收。
- 三要素：角色 (Role) / 价值 (Value) / 目标 (Goal)。
-->

## Story 拆分明细

| Story ID | 标题 | 角色 (Role) | 价值 (Value) | 目标 (Goal) | 依赖 | 优先级 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| story-xxx-01 |  |  |  |  |  | P0 | planned |
| story-xxx-02 |  |  |  |  |  | P0 | planned |

## 覆盖对账 (Coverage Reconciliation)
<!--
⚠️ 强制步骤：拆分前先列出 Epic 的承诺项（来自 idea/research 的 In Scope + Exit Criteria + 候选 Capabilities）；拆分后逐项对账。
每个 Epic 承诺项（In Scope / Exit Criteria / B 端与 C 端 / 候选 Capability）必须有 ≥1 个 Story 承接。
对账结果写入下表；若有承诺项无 Story 承接，必须补拆 Story 或显式降级（说明理由）。
-->

| Epic 承诺项（来自 idea/research） | 承接 Story | 覆盖状态 |
| --- | --- | --- |
| Exit Criteria ① ... | story-xxx-01 | ✅ 覆盖 / ❌ 未覆盖 |
| Candidate Capability: ... | story-xxx-02 | ✅ 覆盖 / ❌ 未覆盖 |
| In Scope: B 端 ... | story-xxx-03 | ✅ 覆盖 / ❌ 未覆盖 |

## 治理映射对齐
<!--
- Impacted Bounded Contexts: [...]（新增需显式标注）
- Impacted Process Nodes: [...]
- Impacted Service Blueprint Nodes: [...]
- Sync Assessment: [Yes/No + 原因]
-->

## 关联 Stories
<!--
- epics/<epic-key>/stories/<story-key>/story.md
-->
