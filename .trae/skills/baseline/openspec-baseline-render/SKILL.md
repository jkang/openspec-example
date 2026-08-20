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

1. **容器宽度**: 页面主容器宽度强制设为屏幕的 85% 或符合特定基线文件的 `max-width` 约束。
2. **标准页眉**: 页眉采用左右分布简洁设计。左侧为 `Title` 与 `Subtitle`，右侧为 `Generator Info` 与 `Timestamp`。
3. **视觉一致性**: 校验所有基线文档是否遵循 Slate-based 风格（`slate-900` 强调色，无圆角，无阴影）。
4. **CDN 连通性**: 校验 Tailwind CSS 与各可视化库的 CDN 连通性。
5. **防止报错**: 校验 HTML 模板中的内联样式是否遵循 `{{ 'style="..."' }}` 格式。
