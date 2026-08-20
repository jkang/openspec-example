---
name: openspec-baseline-render
description: 校验并刷新业务基线 HTML 文档，确保索引、链接与可视化结构完整。
allowed-tools: Read, Write, RunCommand
license: MIT
metadata:
  author: openspec
  version: "1.0"
---

# openspec-baseline-render

> [!IMPORTANT]
> - 本 Skill 的职责是校验和刷新 `docs/baseline/` 下直接维护的 HTML 基线文档，不再承担 Markdown -> HTML 的渲染职责。
> - 每次执行必须给出双重结果：1) HTML 完整性检查与必要刷新；2) 结构化校验摘要，至少说明检查范围、发现的问题、修复项或 no-op 结论。
> - 校验口径必须复用各 baseline 文档现有的结构定义与视觉规范，不能用抽象模板覆盖具体基线页面。
> - 若调整本 Skill 的规则或输出口径，必须同步更新 `.trae/`、`.cursor/`、`.agents/` 下对应的 Skill/Command 入口。

**目标**: 校验 `docs/baseline/` 下的 HTML 基线文档，刷新可视化索引并确保页面结构完整性。

## 工作流

1. **识别基线文档**:
   - `docs/baseline/service_blueprint.html` (Service Blueprint)
   - `docs/baseline/business_process.html` (L1/L2/L3 Process Flow)
   - `docs/baseline/domain_model.html` (Event-Storming 看板)
2. **执行校验与刷新**:
   - 检查 HTML 页面是否包含最新的结构化数据锚点。
   - 刷新基线文档之间的交叉引用链接。
   - 验证 CSS Grid、状态机和交互高亮等可视化逻辑是否正常。
3. **废弃说明**:
   - 不再执行 `python3 scripts/render_baseline.py`，基线现在是直接维护的 HTML。
4. **触发时机**:
   - 每次 `/opsx:sync` 完成基线回写后自动触发，确保持久化后的基线可访问。
   - 用户手动执行 `/opsx:baseline/render` 时执行完整性检查。

## 输出契约

1. **双重输出**:
   - 对基线 HTML 执行必要的完整性刷新。
   - 输出结构化校验摘要，至少包含检查文件、校验项、发现问题、修复项或 no-op 说明。
2. **校验范围**:
   - 页面主容器宽度是否符合 85% 或各自 `max-width` 约束。
   - 页眉是否保持简洁的左右分布结构。
   - 基线文档是否遵循 Slate-based 风格（`slate-900` 强调色，无圆角，无阴影）。
   - 基线之间的交叉引用与稳定锚点是否可用。
   - HTML 模板中的内联样式是否遵循 `{{ 'style="..."' }}` 格式。
3. **技术约束**:
   - 若发现问题，优先直接修复 HTML 本身或其索引引用。
   - 不得重新引入 Markdown 转换链路。
