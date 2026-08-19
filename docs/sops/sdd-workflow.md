# OpenSpec SDD Workflow SOP (v1.8.0)

本文档定义了 OpenSpec-Practice 项目的规格驱动开发 (Spec-Driven Development, SDD) 标准操作程序。所有参与此项目的 AI Agent 必须严格遵循本流程。

## 核心阶段与指令

项目统一使用 `/opsx:` 前缀指令（由 Trae 技能提供）。

### 1. 探索阶段 (Explore)
- **指令**: `/opsx:explore`
- **目标**: 在没有任何制品前，通过对话澄清需求，探索代码库，权衡方案。
- **强制约束 (Hard Constraint)**:
  - 必须严格遵循“结构化 6 步法”。
  - **任务类型确认 (Task Classification)**: 在探索过程中，必须与用户确认该 idea 属于以下哪种类型，并据此决定后续的实施策略：
    1. **Epic (大块模糊需求)**: 如“优惠券结算”。策略：拆分为多个具体的 Feature 级 idea，可能需要更新产品路线图 (Roadmap)，不直接进入 Proposal。
    2. **Feature (具体功能修改)**: 如“结算成功提示 UI 优化”。策略：标准的完整 SDD 流程 (Proposal -> Prototype -> Specs -> Design -> Tasks)。
    3. **Bug Fix (缺陷修复)**: 如“结算时总是展示 server failure”。策略：若无 UI 变更则跳过 Prototype，Specs 仅关注受影响的场景修改，Design 聚焦于根本原因分析 (Root Cause Analysis)。
    4. **Tech Debt (技术债/纯技术任务)**: 如“补充 e2e 测试”或“纯后端重构”。策略：跳过 Prototype，通常在 `.openspec.yaml` 中设置 `skip_specs: true` (因无外部行为变更)，Design 聚焦于重构方案。
  - **唯一输出**: 必须生成 `openspec/changes/ideas/idea.md` 作为后续提案的唯一源头。
  - 不得在没有 `idea.md` 的情况下跳过此阶段进入提案。

### 2. 提案阶段 (Propose)
- **指令**: `/opsx:propose <name>`
- **目标**: 根据 `idea.md` 生成变更提案，包含原型、设计、规格和任务。
- **BDD 测试分层防腐**: 在生成 `spec.md` 时，必须为每个 Gherkin Scenario 打上测试标签 (`@unit`, `@api`, 或 `@e2e`)，严格遵循[自动化测试策略](../TESTING_STRATEGY.md)。
- **强制约束 (Hard Constraint) - HITL 检查点**:
  - 在生成 Prototype (交互式 UI 原型) 和 Specs 后，**必须触发强制 HITL (Human-In-The-Loop) 检查点**（例如通过 AskUserQuestion 工具）。
  - 必须获得用户的显式授权后，方可继续生成 Design 和 Tasks 阶段产物。
  - **事实来源**: Prototype 必须作为 UI 规范的“唯一事实来源”，相关交互场景必须提取至 Specs 中。

### 3. 应用阶段 (Apply)
- **指令**: `/opsx:apply`
- **目标**: 基于生成的 `tasks.md` 逐项实施代码变更。
- **工作流**: 
  - 动态读取 `tasks.md` 中的复选框，完成一项则将 `- [ ]` 标记为 `- [x]`。
  - **测试驱动实现 (TDD/BDD)**: 必须严格按照 `spec.md` 上的标签 (`@unit`, `@api`, `@e2e`) 编写对应的测试代码。对于 `@e2e` 任务，必须在全局 `e2e-tests/` 目录中完成 Cucumber 步骤。
  - **质量要求**: Apply 阶段必须包含全链路验证 (E2E) 任务块，严禁在未调通跨端交互的情况下关闭任务。

### 4. 同步阶段 (Sync)
- **指令**: `/opsx:sync`
- **目标**: 在归档前，将增量规格 (delta specs) 同步合并入主规格 (main specs)。
- **逻辑约束**: 确保在同步过程中正确初始化主规格中的 `Purpose` 字段。

### 5. 归档阶段 (Archive)
- **指令**: `/opsx:archive`
- **目标**: 将已完成的变更（包含测试）移至归档目录。
- **流程**:
  - **全局 BDD 测试门禁**: 归档前必须运行 `init.sh e2e:run`，确保全局 Cucumber 测试通过。
  - 归档操作前必须确保已经触发过 `sync`，否则拒绝归档。
  - **技术债清理与登记**: 在归档前，必须检视本次变更中是否引入了技术债（如临时绕过鉴权、硬编码数据等）。如果是，需在变更文档中或通过提交新任务来跟踪这些技术债，禁止隐式留存。
  - 移动路径: `openspec/changes/<name>/` -> `openspec/changes/archive/YYYY-MM-DD-<name>/`。

## 异常处理与防漂移
- 如果发现指令定义与 Schema (如 `openspec/schemas/spec-driven.yaml`) 发生逻辑漂移，Agent 应优先遵循 Schema 的定义，并提醒用户更新 Skill 指令。
- **MANDATORY CHECK**: 如果直接收到 `/opsx:propose`，但 `idea.md` 不存在或未达标，必须强制退回 `/opsx:explore` 阶段。
