# 用户故事地图方法（Storymap）

## 四层骨架（Jeff Patton）

```
阶段 Stage → 活动 Activity → 触点 Touchpoint → 用户故事 User Story
```

- 用户故事格式：`作为[角色]，我想[动作]，以便[目的]`。
- 每个活动建议 2–5 个用户故事，保持平衡。
- 角色必须具体（潜在客户 / 注册用户 / 运营管理员），禁止泛称「用户」。
- 支撑需求 `supportingRequirements` 单独列出，不混入业务故事。

## 与交付 Story 的映射（关键）

**外部技能的故事是细粒度用户故事；本脚手架的 Story 是「可独立交付的端到端功能」。二者不是同一粒度。**

| 层 | 用途 |
| --- | --- |
| 阶段 / 活动 / 触点 | 业务旅程骨架，用于覆盖对账与可视化 |
| 用户故事（must/should/could） | 需求细节，映射 P0/P1/P2 |
| 交付 Story | 一个完整端到端功能，承接 1..N 个用户故事 |
| 支撑需求 | 技术/支撑项，交交付侧，不占需求侧 Story |

优先级映射：`must → P0`、`should → P1`、`could → P2`。

## 覆盖对账（强制，不可省略）

拆分前列出 Epic 承诺项（In Scope / Exit Criteria / B 端承诺 / 候选 Capability）；
拆分后逐项对账：`承诺项 → 承接 Story → ✅/❌`。存在 ❌ 必须补拆或显式降级。

## 切片建议

交付 Story 优先采用**垂直切片**（tracer bullet）：窄而完整地贯穿 UI → API → 数据 → 测试，完成即可演示或验收。横向按层切分不算合格 Story。

## 产物

- 主产物：`epics/<epic-key>/storymap.md`（本 skill assets 模板）
- 可视化：`analysis/storymap/{storymap.yaml,storymap.html}`（optional，仅审查辅助）
- 覆盖对账以 `storymap.md` 为唯一权威。
