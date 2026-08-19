# OpenSpec SDD Workflow SOP (v1.8.0)

本文档定义了 OpenSpec-Practice 项目的规格驱动开发 (Spec-Driven Development, SDD) 标准操作程序。所有参与此项目的 AI Agent 必须严格遵循本流程。

## 核心阶段与指令

项目统一使用 `/opsx:` 前缀指令（由 Trae 技能提供）。

### SDD 动态分支工作流 (Workflow Branching)
为确保各类型任务的遵循性，OpenSpec 流程根据任务类型 (Task Type) 进行动态分支。请所有参与项目的 AI Agent **严格根据下方流程图中的条件分支**执行必须步骤和可选步骤：

```mermaid
graph TD
    Start((Explore 阶段)) --> Type{确认任务类型}

    %% Epic 分支
    Type -->|Epic 大块需求| Epic_Split[拆解为具体 Feature]
    Epic_Split --> Epic_Roadmap[更新 Roadmap]
    Epic_Roadmap --> End_Epic((结束探索，暂不开发))

    %% Feature 分支
    Type -->|Feature 具体功能| F_Prop[Proposal 提案]
    F_Prop --> F_Proto[Prototype UI原型]
    F_Proto --> F_Spec[Specs 行为规范]
    F_Spec --> F_Des[Design 技术设计]
    F_Des --> Tasks[Tasks 任务清单]

    %% Bug Fix 分支
    Type -->|Bug Fix 缺陷修复| B_Prop[Proposal 提案]
    B_Prop --> B_UI{涉及 UI 变更?}
    B_UI -->|是| F_Proto
    B_UI -->|否| B_Spec[Specs 仅修正现有场景]
    B_Spec --> B_Des[Design 根本原因分析 RCA]
    B_Des --> Tasks

    %% Tech Debt 分支
    Type -->|Tech Debt 技术债| T_Prop[Proposal 提案]
    T_Prop --> T_Spec{有外部行为变更?}
    T_Spec -->|是| F_Spec
    T_Spec -->|否| T_Skip[配置 skip_specs: true]
    T_Skip --> T_Des[Design 重构与架构方案]
    T_Des --> Tasks

    Tasks --> Apply((Apply 实施阶段))
    
    Apply --> Update_Opt{需要修改计划?}
    Update_Opt -->|是| Update[Update 更新规划]
    Update --> Apply
    Update_Opt -->|否| Sync[Sync 同步规格]
    
    Sync --> Archive[Archive 归档]
    Archive --> Done((完成))
    
    classDef mandatory fill:#e1f5fe,stroke:#333,stroke-width:2px;
    classDef optional fill:#fff3e0,stroke:#333,stroke-width:1px,stroke-dasharray: 5 5;
    class F_Proto,B_UI,T_Spec,T_Skip,Update_Opt,Update optional;
```

### 1. 探索阶段 (Explore)
- **指令**: `/opsx:explore`
- **目标**: 在没有任何制品前，通过对话澄清需求，探索代码库，权衡方案。
- **强制约束 (Hard Constraint)**:
  - 必须严格遵循“结构化 6 步法”。
  - **任务类型确认 (Task Classification)**: 必须确认是 Epic, Feature, Bug Fix 还是 Tech Debt。
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

### 4. 更新阶段 (Update) - 可选
- **指令**: `/opsx:update`
- **目标**: 在实施过程中，如果发现原计划不合理，修正相关的 Specs、Design 或 Tasks。
- **约束**: 禁止直接修改代码以绕过规格，必须先更新规格再写代码。

### 5. 同步阶段 (Sync)
- **指令**: `/opsx:sync`
- **目标**: 在归档前，将增量规格 (delta specs) 同步合并入主规格 (main specs)。
- **逻辑约束**: 确保在同步过程中正确初始化主规格中的 `Purpose` 字段。

### 6. 归档阶段 (Archive)
- **指令**: `/opsx:archive`
- **目标**: 将已完成的变更（包含测试）移至归档目录。
- **流程**:
  - **全局 BDD 测试门禁**: 归档前必须运行 `init.sh e2e:run`，确保全局 Cucumber 测试通过。
  - 归档操作前必须确保已经触发过 `sync`，否则拒绝归档。
  - **技术债清理与登记**: 在归档前，必须检视本次变更中是否引入了技术债（如临时绕过鉴权、硬编码数据等）。如果是，需在变更文档中或通过提交新任务来跟踪这些技术债，禁止隐式留存。
  - 移动路径: `openspec/changes/<name>/` -> `openspec/changes/archive/YYYY-MM-DD-<name>/`。

## 异常处理与防漂移
- **Schema 优先**: `openspec/schemas/spec-driven.yaml` 是每个制品的生成说明 (Instruction) 和内容格式的唯一事实来源。如果 SOP 描述与 Schema 有出入，请以 Schema 为准。
- **MANDATORY CHECK**: 如果直接收到 `/opsx:propose`，但 `idea.md` 不存在或未达标，必须强制退回 `/opsx:explore` 阶段。
