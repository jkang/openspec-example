---
name: delivery-board
description: 生成团队交付看板（docs/governance/delivery_board.html）——作为替代外部需求管理平台（Jira/Linear 等）的可视化核心，聚合路线图阶段进度、需求侧 Epic 漏斗、交付看板、业务基线内容摘要与质量门禁。Invoke when users or PMs need to see project progress and baseline health, or when CI needs to push the delivery report.
allowed-tools: Read, Write, SearchCodebase, Grep, LS, RunCommand
license: MIT
metadata:
  author: openspec
  version: "2.0"
---

# delivery-board（交付看板）

**Description:** 生成 `docs/governance/delivery_board.html`，把代码库中的规划、需求、交付、质量与基线信息聚合为一份**全中文、可交付团队查看**的专业看板。本项目不再依赖 Jira/Linear 等外部平台，看板即团队需求管理平台的可视化视图。

## 定位与数据契约

- **单一事实来源（Single Source of Truth）**：所有数据 MUST 从代码库制品读取，禁止从对话/记忆推断。
- **全中文界面**：看板展示文案全部使用中文（章节标题 / 指标 / 状态 / 徽章 / 按钮），仅保留领域术语（Epic / Story / Phase）与制品文件名（作为数据）。
- **生成脚本**：统一使用仓库根目录 `scripts/generate_delivery_board.py`（纯 Python 标准库、无第三方依赖、可在 CI 中确定性重复执行）。该脚本是看板的唯一生成入口，禁止手工编辑看板 HTML。

## 数据来源（唯一事实来源映射）

| 看板区块 | 数据来源 |
| :--- | :--- |
| 路线图阶段进度（阶段 1~N 状态，随 ROADMAP 动态） | `docs/ROADMAP.md`（当前阶段 / 未来阶段） |
| 规划中（待启动 Epic） | `docs/ROADMAP.md` 当前阶段 In Scope 中**尚未进入需求侧/交付侧**的 Epic |
| 需求漏斗（需求侧 Epic 阶段状态） | `openspec-requirements/epics/*/STATUS.md` + 各阶段制品存在性（research.md / idea.md / prototypes/ / storymap.md / stories/） |
| 探索中（想法池 + 需求侧活跃 Epic + 交付侧骨架） | `openspec/changes/ideas/idea.md` · 需求侧活跃 Epic · `openspec/changes/` 无 proposal 的变更 |
| 设计中 / 开发中 | `openspec/changes/<name>/` 中 proposal.md / design.md / tasks.md 的存在性推断 |
| 已归档（近 7 天）与归档历史 | `openspec/changes/archive/` 目录名前缀日期 |
| 质量门禁（硬门禁 + E2E） | 各变更 `verify.md`（兼容 `## Gates` 列表式与「验证矩阵」表格式两种写法） |
| 业务基线内容摘要（阶段数 / 节点数 / Bounded Context 数 + 更新时间） | `docs/baseline/service_blueprint.html` / `business_process.html` / `domain_model.html` |

## 工作流（Workflow）

1. **扫描工作区**：按上表读取所有数据源。
2. **运行生成脚本**：
   ```bash
   python3 scripts/generate_delivery_board.py
   # 可选：--out <路径> 指定输出；--days N 调整归档窗口（默认 7）
   ```
3. **校验输出**：
   - 脚本 stdout 会打印摘要（当前阶段 / 阶段进度 / 各列计数 / 质量门禁），与看板 HTML 一致。
   - 浏览器打开 `docs/governance/delivery_board.html` 抽查：数据正确、全中文、无英文残留标签。
4. **通知用户**：提供文件路径与链接。
5. **CI 推送（可选）**：见下方「CI 集成」。

## CI 集成（每跑一次 CI 推送团队报告）

生成脚本为纯标准库，可直接嵌入 CI。推荐 GitHub Actions 示例：

```yaml
# .github/workflows/delivery-board.yml
name: delivery-board
on:
  push:
    branches: [main]
  schedule:
    - cron: "0 8 * * 1"   # 每周一 08:00 生成团队周报
jobs:
  board:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: 生成交付看板
        run: python3 scripts/generate_delivery_board.py
      - name: 上传看板制品
        uses: actions/upload-artifact@v4
        with:
          name: delivery_board
          path: docs/governance/delivery_board.html
      - name: 部署到 GitHub Pages（可选）
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./docs/governance
```

若团队使用网页部署（GitHub Pages / 内网静态站），看板即为团队共享的交付状态页；若需即时推送（IM/邮件），可将脚本 stdout 摘要作为报告文本随 CI 通知发出。

## 看板信息架构

- **头部**：看板标题 + 项目名 + 当前阶段徽章 + 最后刷新时间。
- **路线图阶段进度**：阶段 1~N 状态条（已完成 / 当前 / 未来，随 ROADMAP 动态）+ 完成百分比。
- **指标行**：规划中 / 需求探索中 / 设计中 / 开发中 / 已归档（近 N 天）/ 质量信号。
- **业务基线**：三张内容摘要卡片（阶段数 / 节点数 / Bounded Context 数 + 更新时间 + 查看链接），不只是文件名。
- **需求漏斗**：需求侧 Epic 各阶段状态灯（调研 · 探索 · 原型 · 拆分 · 故事）+ 完成状态。
- **交付看板**：五列 Kanban（规划中 / 探索中 / 设计中 / 开发中 / 已归档近 N 天）。
- **质量门禁**：最近归档变更的硬门禁表（规格校验 / 后端测试 / Python / 前端构建 / E2E / 结论）。
- **归档历史**：更早归档折叠展示（查看更多）。
- **页脚**：框架版本 + 数据来源声明（保证可追溯性）。

## Guardrails

- **Single Source of Truth**：数据 MUST 来自代码库制品，禁止从对话推断；禁止手工编辑看板 HTML。
- **全中文**：界面文案一律中文；仅保留 Epic/Story/Phase 等领域术语与制品文件名。
- **Modern UI**：slate 色系（slate-50 背景 / slate-900 强调），无圆角（`border-radius: 0`）、无阴影。
- **Container Width**：主容器宽度强制为屏幕 **85%**。
- **CI 可重复**：生成脚本必须保持纯标准库、确定性输出（除时间戳外），确保 CI 每次生成结果可复现。
- **Privacy**：若在日志/制品中发现敏感凭据，不得写入看板。
