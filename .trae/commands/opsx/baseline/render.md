---
description: 校验业务基线 HTML 文档
---

# /opsx:baseline/render

校验 `docs/baseline/` 下的 HTML 基线文档，刷新可视化索引并确保页面结构完整性。

## 核心动作
1. 调用 `openspec-baseline-render` 技能。
2. 检查 HTML 基线文档的结构与引用完整性。
3. 废弃 Markdown 转换逻辑，直接维护 HTML 可视化视图。
