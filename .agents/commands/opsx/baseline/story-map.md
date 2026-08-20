---
description: 维护业务基线中的 Story Map 文档
---

# /opsx:baseline/story-map

维护 `docs/baseline/service_blueprint.html`，追踪服务蓝图中的阶段覆盖、泳道能力分布与 capability 状态。

## 核心动作
1. 调用 `openspec-baseline-story-map` 技能。
2. 按 `.trae/skills/baseline/openspec-baseline-story-map/SERVICE_BLUEPRINT_STANDARD.md` 判断是否需要回写蓝图，必要时更新 `SB-STAGE-*`、`SB-<LANE>-*` 与 capability 状态。
3. 若无需更新，输出显式 no-op 理由。
4. 直接回写基线 HTML。
