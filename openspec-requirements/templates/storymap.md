# Storymap: <Epic 名称> 需求拆分

> Epic Key: `<epic-key>`
> 关联调研: `epics/<epic-key>/research.md`
> 关联 Idea: `epics/<epic-key>/idea.md`
> 关联原型: `epics/<epic-key>/prototypes/*.html`（Epic 整体，若涉及 UI）
> 产出后需用户确认（HITL）

## 背景

- 要解决的业务问题：
- 引用结论：

## 业务主干（阶段 / 活动 / 触点 / 用户故事）

| 阶段 | 活动 | 触点 | 用户故事 | 优先级 |
| --- | --- | --- | --- | --- |
|  |  |  | 作为…我想…以便… | must / should / could |

## 交付 Story 拆分明细

> 交付 Story = 一个完整端到端功能，可独立交付、可独立验收；一个 Story 可承接多个用户故事。

| Story ID | 标题 | 角色 (Role) | 价值 (Value) | 目标 (Goal) | 承接用户故事 | 依赖 | 优先级 | 状态 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| story-<epic-key>-<功能> |  |  |  |  |  |  | P0 | ready |

## 支撑需求

| 支撑项 | 类型（技术/数据/合规） | 去向（交付侧） | 优先级 |
| --- | --- | --- | --- |
|  |  |  |  |

## 覆盖对账

| Epic 承诺项（来自 idea/research） | 承接 Story | 覆盖状态 |
| --- | --- | --- |
| Exit Criteria ① | story-<epic-key>-<功能> | ✅ / ❌ |
| Candidate Capability |  | ✅ / ❌ |
| In Scope: B 端 |  | ✅ / ❌ |

## 分析制品索引

- 用户故事地图可视化：`analysis/storymap/{storymap.yaml,storymap.html}` — 已生成 / 未生成

## 治理映射对齐

- Impacted Bounded Contexts：
- Impacted Process Nodes：
- Impacted Service Blueprint Nodes：
- Sync Assessment：

## 关联 Stories

- `epics/<epic-key>/stories/<story-key>/story.md`

> Story 状态由需求侧 `STATUS.md` 维护（ready / handoff / dev-in-progress / done）；storymap 仅记录初始状态。
