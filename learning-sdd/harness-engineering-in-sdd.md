# Harness Engineering 与 OpenSpec 的深度融合实践

本文档总结了 `openspec-practice` 项目是如何将 **Harness Engineering (驾驭工程)** 理念与 **OpenSpec 规格驱动开发 (SDD)** 框架深度结合的。

## 1. 什么是 Harness Engineering？

Harness Engineering 是由 OpenAI 提出的一种 Agent-first 开发范式。它的核心思想是：**“不要依赖 Agent 的聊天上下文或聪明才智，而是通过在代码库中建立明确的‘物理护栏’（文档、脚本、架构约定）来驾驭 AI，迫使其产出符合预期的结果。”**

在本项目中，我们通过“根目录定规矩，深层目录落细节”的策略实现了这一目标：
- **`AGENTS.md`**: 全局导航宪法，AI 被唤醒后的绝对第一入口。
- **`init.sh`**: 屏蔽底层架构复杂度，提供统一的环境和验证编排入口。
- **`docs/`**: 包含 `FRONTEND.md`（UI约束）、`ARCHITECTURE.md`（后端依赖约束）、`PRODUCT_SENSE.md`（业务导向）等系统事实。

## 2. OpenSpec 的天然 Harness 属性

OpenSpec 框架本身就是极佳的 Harness 实践工具，它填补了“需求”与“代码”之间的鸿沟：

1. **唯一事实来源 (Single Source of Truth)**：
   传统的 Harness 通常需要手写 `feature_list.json`，而 OpenSpec 的 `openspec/specs/` 目录直接将 Gherkin 格式的业务规则变成了版本控制的一部分。代码必须与 Spec 对齐。
2. **状态与进度追踪 (Progress Tracking)**：
   不需要全局的 `claude-progress.md`，OpenSpec 的 `openspec/changes/<change-name>/tasks.md` 动态记录了当前执行计划的每一个步骤，AI 在 Apply 阶段自动勾选，粒度更细，且绑定到特定变更。
3. **结构化工作流 (Structured Workflow)**：
   通过 `/opsx:explore` -> `propose` -> `apply` -> `archive`，将开发流程机械化。AI 不能“随心所欲”地写代码，必须先经过 Prototype 验证（强制 HITL 人机检查点），才能进入实现阶段。

## 3. 融合后的“双重护栏”体系

在这个项目中，Harness 与 OpenSpec 形成了一个**双重护栏体系**，让项目具备了极高的可维护性和可防漂移性：

| 护栏类型 | 职责范围 | 实现载体 |
| :--- | :--- | :--- |
| **工程护栏 (Harness)** | 规定 **怎么写 (How)**。解决代码风格、架构分层、UI 审美、测试验证标准。 | `docs/ARCHITECTURE.md`, `docs/FRONTEND.md`, `docs/sops/ui-validation-loop.md` |
| **业务护栏 (OpenSpec)** | 规定 **写什么 (What)**。解决业务规则、需求状态、执行步骤。 | `openspec/specs/`, `openspec/changes/`, `tasks.md` |

## 4. 总结：最佳实践范式

通过将通用工程脚手架（如 `init.sh`, `AGENTS.md`）放在根目录，将领域知识和架构契约收拢至 `docs/`，并将所有的业务流转委托给 `openspec/`，本项目成功地展示了如何构建一个**能够长期安全驾驭 AI Agent 且不引发逻辑漂移的现代化电商代码库**。
