---
name: openspec-baseline-render
description: 将业务基线 Markdown 文档渲染为可交互的 HTML 视图。
allowed-tools: Read, Write, RunCommand
license: MIT
metadata:
  author: openspec
  version: "1.0"
---

# openspec-baseline-render

**目标**: 校验 `docs/baseline/` 下的 HTML 基线文档，刷新可视化索引并确保页面结构完整性。

## 工作流

1. **识别基线文档**:
   - `docs/baseline/service_blueprint.html` (Story Map)
   - `docs/baseline/business_process.html` (L1/L2/L3 Process Flow)
   - `docs/baseline/domain_model.html` (Event-Storming看板)
2. **执行校验与刷新**:
   - 检查 HTML 页面是否包含最新的结构化数据锚点。
   - 刷新基线文档之间的交叉引用链接。
   - 验证 CSS Grid 与状态机可视化的渲染逻辑是否正常。
3. **废弃说明**:
   - 不再执行 `python3 scripts/render_baseline.py`，基线现在是直接维护的 HTML。
4. **触发时机**:
   - 每次 `/opsx:sync` 完成基线回写后自动触发，确保持久化后的基线可访问。
   - 用户手动执行 `/opsx:baseline/render` 时执行完整性检查。

## 技术要求

- 确保页面占据 85% 宽度，Header 简洁专业。
- 校验 Tailwind CSS 与各可视化库的 CDN 连通性。
