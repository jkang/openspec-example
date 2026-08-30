# AGENTS.md (Agent 引导入口)

本文件为在此代码库中工作的 AI Agent 提供高层级的指导与路由。
我们践行 **规格驱动开发 (Spec-Driven Development, SDD)** 并严格遵循 **Harness Engineering (驾驭工程)** 原则。

黄金法则：**不要依赖聊天上下文；必须以代码库作为“唯一事实来源”。**

### 🔄 跨工具一致性约束 (Cross-Tool Consistency)
为了确保在 Trae、Cursor 和其他 Agent 系统中拥有统一的开发体验，**任何对 SDD 工作流（skills/commands）的修改必须同时同步应用到以下三个目录**：
- `.trae/`: Trae 专属技能与指令。
- `.cursor/`: Cursor IDE 的规则与指令。
- `.agents/`: 通用 Agent 协作指令。
*严禁仅修改其中之一，这会导致不同 AI 工具间的协作漂移。*

### 🧑💻 SDD 团队角色 (Team Roles)

本项目以 4 人团队形态模拟最新软件团队，角色定义**跨工具同步**，各工具按自身机制加载：

| 角色 | 职责 | opencode（权威） | Cursor |
| :--- | :--- | :--- | :--- |
| **lead** (Tech Lead/架构师, primary) | 编排交付（含需求侧漏斗路由与 `/req:handoff` 交接）、架构设计、流程收尾，用户唯一入口 | `.opencode/agents/lead.md` | `.cursor/agents/lead.md` |
| **pm** (产品经理) | 产品定位/路线图、需求侧工作区（需求漏斗，仅 Epic）、需求调研/探索、业务评审 | `.opencode/agents/pm.md` | `.cursor/agents/pm.md` |
| **engineer** (全栈工程师) | 从 proposal 起步：行为规格 specs/技术设计/代码实施（需求侧原型由 pm 承担） | `.opencode/agents/engineer.md` | `.cursor/agents/engineer.md` |
| **qa** (质量工程师) | 验证门禁/对抗审查（含需求侧 req-sdd 制品质量兜底） | `.opencode/agents/qa.md` | `.cursor/agents/qa.md` |

- **同步规则**：任何对团队角色定义（职责、约束、协作契约）的修改，必须同步更新 2 处（`.opencode/agents/` 权威 + `.cursor/agents/` 格式适配副本）。
- **编排契约**：`lead` 是用户与团队的唯一对话入口，通过任务委派调度 pm/engineer/qa；每个 HITL 检查点（需求调研/探索/原型/Story/验证/Baseline Sync 确认）必须暂停征求用户确认。
- **唯一事实来源**：角色职责的权威内容以 `.opencode/agents/*.md` 为基准（含权限与 mode 配置），Cursor 副本为格式适配。

## 📚 治理与深链接 (Governance & Deep Links)

在编写任何代码或提出方案之前，你**必须**查阅相关的治理文档：

- **[SDD 工作流 SOP](docs/SOPS/SDD_WORKFLOW.md)**: `/opsx:` 与 `/req:` 指令的使用规则（含规划层 `/opsx:planning:product-vision`、`/opsx:planning:product-planning`；需求侧 `/req:research → explore → prototype → storymap → story → handoff`）、HITL（人机协同）检查点以及**任务类型 (Epic/Bug Fix/Tech Debt/简单功能) 的分支策略**与**分层同步 (Spec Sync change 级 / Baseline Sync Epic 级)** 机制。**开始任务前必读**。
- **[Service Blueprint 标准](.trae/skills/baseline/blueprint/SKILL.md)**: `service_blueprint.html` 的稳定锚点、引用方式、capability 口径与 sync 触发规则。凡是 planning artifacts 或 sync 涉及服务蓝图，必须先参考此文档。
- **[业务基线治理]**: 包含 `service_blueprint.html` (Story 矩阵/服务蓝图)、`business_process.html` (流程图)、`domain_model.html` (Event-Storming 模型) 与 `design-system/` (ZAPP 权威设计系统)。**位于 `docs/baseline/`**。
- **[治理映射约束]**: **核心准则**：`Bounded Contexts` (Baseline) 治理 `Capabilities` (Spec Layer)。在 Explore/Propose 阶段必须参考 `domain_model.html` 中的映射表来识别 Impact Capabilities。
- **[交付看板]**: `docs/governance/delivery_board.html` - 使用 `/opsx:governance:delivery-board` 生成，展示系统当前的交付状态与健康度。
- **[产品路线图](docs/ROADMAP.md)**: 高阶业务规划，明确当前项目所处阶段，指导 Explore 探索的边界。
- **[产品定位与价值主张](docs/PRODUCT.md)**: AI 决策准则、目标用户画像，确保构建“可视即价值”的极简电商。
- **[前端开发规范与验证闭环](docs/FRONTEND.md)**: 以 `docs/baseline/design-system/` (ZAPP 暗黑高端) 为**唯一 UI 事实来源**：语义令牌色彩、三字体、无圆角/无阴影、真实中文数据，以及通过浏览器验证视觉约束的闭环 SOP。
- **[后端架构指南](docs/ARCHITECTURE.md)**: 适用于 Node.js 和 Python 的四层架构设计 (HTTP -> Service -> Domain -> Repo)。
- **[质量与评估标准](docs/QUALITY_SCORE.md)**: 端到端 (E2E) 验证要求以及“代码即规范”的质量底线。
- **[自动化测试策略](docs/TESTING_STRATEGY.md)**: 分层测试金字塔与 Cucumber BDD 标签规范 (`@unit`, `@api`, `@e2e`)。

## 🗂️ 唯一事实来源 (Single Source of Truth)

本项目由 OpenSpec (v2.0) 框架进行治理。
所有的需求、设计和任务都与代码一起进行版本控制：

- `docs/PRODUCT.md`: **[全局规划]** 定义产品定位、价值主张、痛点及竞争优势。
- `docs/ROADMAP.md`: **[全局规划]** 定义滚动路线图、阶段边界及当前 Baseline（**唯一权威**，按阶段组织，每阶段条目即 Epic，需求侧只消费其 Epic 不扩范围）。
- `docs/baseline/`: **[业务基线]** 包含 Blueprint, Process Flow 和 Event-Storming Domain Model。这是系统认知的核心沉淀。
- `openspec/schemas/spec-driven.yaml`: **[Schema 优先]** 定义了开发侧所有制品的生成指令和格式约束，是开发侧工作流的最底层事实来源。
- `openspec-requirements/`: **[需求侧工作区]** 需求漏斗（仅大块 Epic），**以 Epic 为工作单元**：`epics/<epic-key>/research.md`（先调研→识别 Epic→创建目录）→ `idea.md` → `prototypes/` → `storymap.md` → `stories/<story-key>/story.md`（业务面冻结交付物）；Epic 完成后整个目录归档至 `archive/YYYY-MM-DD-<epic-key>/`。Schema 见 `openspec-requirements/schemas/req-sdd.yaml`，规则见 `openspec-requirements/config.yaml`。
- **适用范围路由**：大块 Epic 走需求侧漏斗（`/req:research` → `/req:explore` → `/req:prototype`(UI, Epic整体) → `/req:storymap` → `/req:story` → `/req:handoff`）；Bug Fix / Tech Debt / 简单功能修改**直走交付侧**（`/opsx:propose` 起）。
- **分层 Sync**：每个 change 只做 Spec Sync（`/opsx:sync`，change 级）；Baseline Sync（`/opsx:baseline/sync`）在 Epic 全部 Story 归档后统一执行。
- `openspec/changes/`: 活跃的执行计划 (提案 Proposal、设计 Design、任务 Tasks、原型 Prototypes)。开发侧从 proposal 起步（直走交付侧 `/opsx:propose`，或需求侧 `/req:handoff` 合成）；不再有独立的开发侧探索/Story 阶段。
- `openspec/changes/archive/`: 已完成并归档的执行计划。
- `openspec/specs/`: 主产品规格说明 (Gherkin 格式)。

## 🚀 启动与初始化 (Init & Start)

本项目采用多模块架构，统一通过 `init.sh` 脚本进行环境启动与验证。
严禁手动逐个切换目录执行命令，请使用以下标准入口：

```bash
./init.sh              # 查看帮助菜单与架构概览
./init.sh vue:start    # 启动 Vue 前端
./init.sh node:start   # 启动 Node.js 后端
./init.sh python:start # 启动 Python 后端
./init.sh test:all     # 运行全站后端的测试
```
