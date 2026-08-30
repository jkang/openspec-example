---
name: "Delivery Board"
description: "生成团队交付看板（docs/governance/delivery_board.html）：聚合路线图阶段进度、需求漏斗、交付看板、业务基线摘要与质量门禁，替代外部需求管理平台的可视化视图"
allowed-tools: Bash(opsx:*)
category: "Governance"
tags: ["governance", "dashboard", "delivery", "visibility", "requirements"]
---

# opsx:delivery-board

**Description:** 使用 `scripts/generate_delivery_board.py` 生成团队交付看板 `docs/governance/delivery_board.html`。看板为全中文，聚合规划层、需求侧、交付侧、质量与基线的完整状态，是团队需求管理平台的可视化核心（替代 Jira/Linear）。

## 工作流

1. **扫描数据源**（脚本自动执行，单一事实来源）：
   - `docs/ROADMAP.md`（阶段进度 + 规划中 Epic）
   - `openspec-requirements/epics/*/STATUS.md`（需求漏斗状态）
   - `openspec/changes/ideas/`（想法池）
   - `openspec/changes/`（设计中 / 开发中）
   - `openspec/changes/archive/`（已归档近 7 天 / 历史）
   - 各变更 `verify.md`（质量门禁）
   - `docs/baseline/*.html`（业务基线内容摘要与更新时间）
2. **运行生成脚本**：
   ```bash
   python3 scripts/generate_delivery_board.py
   ```
   可选参数：`--out <路径>`（输出位置）、`--days N`（归档窗口，默认 7）。
3. **校验输出**：确认脚本 stdout 摘要（当前阶段 / 各列计数 / 质量门禁）与 HTML 一致；抽查无英文残留标签。
4. **通知用户**：提供看板文件路径与链接。

## 输出

全中文专业看板，包含：
- 路线图阶段进度条（阶段 1~7 · 已完成/当前/未来）
- 指标行（规划中 / 需求探索中 / 设计中 / 开发中 / 已归档 / 质量信号）
- 业务基线内容摘要卡片（阶段数 / 节点数 / Bounded Context 数 + 更新时间）
- 需求漏斗（需求侧 Epic 阶段状态灯）
- 五列交付看板（规划中 / 探索中 / 设计中 / 开发中 / 已归档）
- 质量门禁表（硬门禁 + E2E）
- 归档历史（查看更多折叠）

## Guardrails

- 数据 MUST 来自代码库制品（Single Source of Truth），禁止手工编辑看板 HTML。
- 界面文案全中文；slate 色系、无圆角、无阴影；主容器宽度 85%。
- CI 可重复：脚本为纯 Python 标准库，可在 CI 中确定性执行并推送团队报告。
