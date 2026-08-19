---
description: 维护业务基线中的 Story Map 文档
---

# /opsx:baseline/story-map

维护 `docs/baseline/STORY_MAP.md`，追踪 Story 在不同发布阶段的实现状态。

## 核心动作
1. 调用 `openspec-baseline-story-map` 技能。
2. 将已验证的 Story 移动至 Implemented 列，或登记新的规划 Story。
3. 回写基线 Markdown 并自动触发渲染。
