# AGENTS.md (Agent 引导入口)

本文件为在此代码库中工作的 AI Agent 提供高层级的指导与路由。
我们践行 **规格驱动开发 (Spec-Driven Development, SDD)** 并严格遵循 **Harness Engineering (驾驭工程)** 原则。

黄金法则：**不要依赖聊天上下文；必须以代码库作为“唯一事实来源”。**

## 📚 治理与深链接 (Governance & Deep Links)

在编写任何代码或提出方案之前，你**必须**查阅相关的治理文档：

- **[SDD 工作流 SOP](docs/sops/sdd-workflow.md)**: `/opsx:` 指令的使用规则、5步探索法以及 HITL（人机协同）检查点。**开始任务前必读**。
- **[前端开发规范](FRONTEND.md)**: 严格的 UI 约束（扁平化设计、无圆角、slate 色系、真实数据）。
- **[后端架构指南](ARCHITECTURE.md)**: 适用于 Node.js 和 Python 的四层架构设计 (HTTP -> Service -> Domain -> Repo)。
- **[质量与评估标准](QUALITY_SCORE.md)**: 端到端 (E2E) 验证要求以及 "Start with 50%-ready" 理念。

## 🗂️ 唯一事实来源 (Single Source of Truth)

本项目由 OpenSpec (v1.8.0) 框架进行治理。
所有的需求、设计和任务都与代码一起进行版本控制：

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
