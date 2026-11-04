# To-Be Process 设计（As-Is → To-Be）

## 边界（必须先分清）

| 视角 | 方法 | 时机 |
| --- | --- | --- |
| As-Is | 价值流（L1）+ 现状泳道（L3/L4）+ 痛点 | explore 前段 |
| To-Be | 本方法：目标泳道（L3→L5） | explore 后段 |

禁止把 As-Is 泳道直接标成 To-Be；两者的角色、任务与人工闸门必须显式不同。

## To-Be 泳道结构

- 列 = 业务阶段（L3）
- 行 = 角色泳道
- 格 = 可执行任务（L5），标注：执行主体（人/AI/系统）、输入、输出、规则依据、异常分支
- 每个阶段标注 HITL 焦点：哪些决策必须由人确认、哪些可自动执行、失败如何回退

## 硬规则

1. To-Be 必须能逐条对回 As-Is 的痛点；无对应关系的设计删除。
2. 必须写出人机分工与人工闸门，不能只画「自动化」。
3. 必须写出异常链路与失败兜底。
4. 治理锚点：引用 `business_process.html` 的 L1/L2/L3 与 `service_blueprint.html` 的 SB-STAGE-*/SB-<LANE>-*。

## 使用时机

- `explore` 阶段**可选**，不阻塞漏斗。
- 复杂 Epic 建议做；简单 Epic 可在 `idea.md` 用文字流程表达。
- 产物落位 `epics/<epic-key>/analysis/to-be/`，并在 `idea.md` 引用。
