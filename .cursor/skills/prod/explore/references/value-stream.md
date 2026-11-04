# L1 价值流（可选）

## 用途

先看清业务的端到端经营主线，再据 Epic 圈定聚焦范围。为 To-Be Process / To-Be Journey 提供 As-Is 骨架，避免直接跳到方案。

产物模板：`openspec-requirements/templates/value-stream.md`

## 结构

```
价值流（1 条主线）
└── 价值段（横向列）
    └── 业务环节（列内竖排卡）
```

- 价值段名 = 〔部门/岗位 ·〕业务对象(名词) + 业务动作(动词)
- 单客户生命周期业务通常只有 1 条主价值流；不要把价值段误拆成独立价值流
- 聚焦范围：同一价值段内**相邻连续**的聚焦环节整体圈成一组

## 业务纯净性

L1 是业务地图，与解决方案解耦。除原始需求原话外，业务内容不得出现：
智能×× / 智慧×× / AI / 大模型 / Agent / 机器人 / 自动化 / 具体系统与产品名。

## 与 To-Be 的边界

- 本方法只做 **As-Is 价值流与聚焦范围**。
- To-Be 流程用 `references/to-be-process.md`。
- 现有 `business-process-deep-analyzer`（tools/）为 L1/L2 业务分析版，可作为可视化补充，不替代本骨架。

## 使用时机

- `explore` 阶段**可选**，不阻塞漏斗。
- 产物落位 `epics/<epic-key>/analysis/value-stream/value-stream.md`，并在 `idea.md` 引用。
