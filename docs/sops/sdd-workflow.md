# OpenSpec SDD Workflow SOP (v1.8.0)

本文档定义了 OpenSpec-Practice 项目的规格驱动开发 (Spec-Driven Development, SDD) 标准操作程序。所有参与此项目的 AI Agent 必须严格遵循本流程。

## 核心阶段与指令

项目统一使用 `/opsx:` 前缀指令（由 Trae 技能提供）。

### 1. 探索阶段 (Explore)
- **指令**: `/opsx:explore`
- **目标**: 在没有任何制品前，通过对话澄清需求，探索代码库，权衡方案。
- **强制约束 (Hard Constraint)**:
  - 必须严格遵循“结构化 5 步法”。
  - **唯一输出**: 必须生成 `openspec/changes/ideas/idea.md` 作为后续提案的唯一源头。
  - 不得在没有 `idea.md` 的情况下跳过此阶段进入提案。

### 2. 提案阶段 (Propose)
- **指令**: `/opsx:propose <name>`
- **目标**: 根据 `idea.md` 生成变更提案，包含原型、设计、规格和任务。
- **强制约束 (Hard Constraint) - HITL 检查点**:
  - 在生成 Prototype (交互式 UI 原型) 和 Specs 后，**必须触发强制 HITL (Human-In-The-Loop) 检查点**（例如通过 AskUserQuestion 工具）。
  - 必须获得用户的显式授权后，方可继续生成 Design 和 Tasks 阶段产物。
  - **事实来源**: Prototype 必须作为 UI 规范的“唯一事实来源”，相关交互场景必须提取至 Specs 中。

### 3. 应用阶段 (Apply)
- **指令**: `/opsx:apply`
- **目标**: 基于生成的 `tasks.md` 逐项实施代码变更。
- **工作流**: 
  - 动态读取 `tasks.md` 中的复选框，完成一项则将 `- [ ]` 标记为 `- [x]`。
  - **质量要求**: Apply 阶段必须包含全链路验证 (E2E) 任务块，严禁在未调通跨端交互的情况下关闭任务。

### 4. 同步阶段 (Sync)
- **指令**: `/opsx:sync`
- **目标**: 在归档前，将增量规格 (delta specs) 同步合并入主规格 (main specs)。
- **逻辑约束**: 确保在同步过程中正确初始化主规格中的 `Purpose` 字段。

### 5. 归档阶段 (Archive)
- **指令**: `/opsx:archive`
- **目标**: 将已完成的变更移至归档目录。
- **流程**:
  - 归档操作前必须确保已经触发过 `sync`，否则拒绝归档。
  - 移动路径: `openspec/changes/<name>/` -> `openspec/changes/archive/YYYY-MM-DD-<name>/`。

## 异常处理与防漂移
- 如果发现指令定义与 Schema (如 `openspec/schemas/spec-driven.yaml`) 发生逻辑漂移，Agent 应优先遵循 Schema 的定义，并提醒用户更新 Skill 指令。
- **MANDATORY CHECK**: 如果直接收到 `/opsx:propose`，但 `idea.md` 不存在或未达标，必须强制退回 `/opsx:explore` 阶段。
