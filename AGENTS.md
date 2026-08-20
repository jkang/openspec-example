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

## 📚 治理与深链接 (Governance & Deep Links)

在编写任何代码或提出方案之前，你**必须**查阅相关的治理文档：

- **[SDD 工作流 SOP](docs/SOPS/SDD_WORKFLOW.md)**: `/opsx:` 指令的使用规则（含 `/opsx:product-sense`, `/opsx:product-planning`, `/opsx:story` 业务评审指令）、6步探索法、HITL（人机协同）检查点以及**四大任务类型 (Epic/Story/Bug Fix/Tech Debt) 的分支策略**与**业务基线同步 (Baseline Sync)** 机制。**开始任务前必读**。
- **[Service Blueprint 标准](docs/SOPS/SERVICE_BLUEPRINT_STANDARD.md)**: `service_blueprint.html` 的稳定锚点、引用方式、capability 口径与 sync 触发规则。凡是 planning artifacts 或 sync 涉及服务蓝图，必须先参考此文档。
- **[业务基线治理]**: 包含 `service_blueprint.html` (Story 矩阵/服务蓝图)、`business_process.html` (流程图) 和 `domain_model.html` (Event-Storming 模型)。**位于 `docs/baseline/`**。
- **[治理映射约束]**: **核心准则**：`Bounded Contexts` (Baseline) 治理 `Capabilities` (Spec Layer)。在 Explore/Propose 阶段必须参考 `domain_model.html` 中的映射表来识别 Impact Capabilities。
- **[交付看板]**: `docs/governance/delivery_board.html` - 使用 `/opsx:delivery-board` 生成，展示系统当前的交付状态与健康度。
- **[产品路线图](docs/ROADMAP.md)**: 高阶业务规划，明确当前项目所处阶段，指导 Explore 探索的边界。
- **[产品感与业务导向](docs/PRODUCT_SENSE.md)**: AI 决策准则、目标用户画像，确保构建“可视即价值”的极简电商。
- **[前端开发规范与验证闭环](docs/FRONTEND.md)**: 包含极简 UI 约束（无圆角、slate 色系、真实数据），以及通过浏览器验证视觉约束的闭环 SOP。
- **[后端架构指南](docs/ARCHITECTURE.md)**: 适用于 Node.js 和 Python 的四层架构设计 (HTTP -> Service -> Domain -> Repo)。
- **[质量与评估标准](docs/QUALITY_SCORE.md)**: 端到端 (E2E) 验证要求以及“代码即规范”的质量底线。
- **[自动化测试策略](docs/TESTING_STRATEGY.md)**: 分层测试金字塔与 Cucumber BDD 标签规范 (`@unit`, `@api`, `@e2e`)。

## 🗂️ 唯一事实来源 (Single Source of Truth)

本项目由 OpenSpec (v2.0) 框架进行治理。
所有的需求、设计和任务都与代码一起进行版本控制：

- `docs/PRODUCT_SENSE.md`: **[全局规划]** 定义产品灵魂、痛点及竞争优势。
- `docs/ROADMAP.md`: **[全局规划]** 定义滚动路线图、阶段边界及当前 Baseline。
- `docs/baseline/`: **[业务基线]** 包含 Story Map, Process Flow 和 Event-Storming Domain Model。这是系统认知的核心沉淀。
- `openspec/schemas/spec-driven.yaml`: **[Schema 优先]** 定义了所有制品的生成指令和格式约束，是工作流的最底层事实来源。
- `openspec/changes/ideas/`: 通过 `/opsx:explore` 产生的原始想法。
- `openspec/changes/`: 活跃的执行计划 (提案 Proposal、设计 Design、任务 Tasks、原型 Prototypes)。
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
