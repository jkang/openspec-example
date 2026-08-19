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

**目标**: 将 `docs/baseline/` 下的 Markdown 文件渲染为同目录下的 HTML 文件，提供可视化阅读能力。

## 工作流

1. **识别待渲染文档**:
   - 确定是渲染全部 (`all`) 还是指定文档。
2. **执行渲染**:
   - 使用 `python3 scripts/render_baseline.py [path_to_md]` 命令进行渲染。
   - 如果是 `all`，直接运行 `python3 scripts/render_baseline.py`。
3. **输出路径**:
   - `docs/baseline/NAME.md` -> `docs/baseline/NAME.html`。
4. **触发时机**:
   - 每次 `/opsx:sync` 完成 baseline 回写后自动触发。
   - 用户手动执行 `/opsx:baseline/render` 时触发。

## 技术要求

- 使用 CDN 引入 Tailwind CSS。
- 使用 CDN 引入 Mermaid.js。
- 保持界面极度整洁，隐藏不必要的装饰元素。
