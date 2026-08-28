---
name: SDD Workflow SOP
purpose: 定义规格驱动开发的标准操作程序与指令规则
updated_at: 2026-08-28
---

# OpenSpec SDD Workflow SOP (v2.0)

本文档定义了 OpenSpec-Practice 项目的规格驱动开发 (Spec-Driven Development, SDD) 标准操作程序。所有参与此项目的 AI Agent 必须严格遵循本流程。

## 需求侧工作区 (Requirements Workspace) - `openspec-requirements/`

需求阶段独立于 `openspec/`（开发侧），形成 **`openspec-requirements/`** 需求侧工作区，供 PM 完成「需求调研 → 探索 → 原型(Epic整体) → 需求拆分 → Story」的需求漏斗，产出可交给开发的**冻结交付物（Story，业务面）**。

> 与 `openspec/` 平级目录，互相隔离。规划（roadmap·每阶段多 Epic）在 `docs/ROADMAP.md` 已有，需求侧直接消费。存量 17 个归档 change + 2 个 story-list 与 `openspec/specs/` 主规格**完全不动**。

### 适用范围路由（关键）

| 需求类型 | 路径 |
| --- | --- |
| 大块 Epic（跨多能力、需拆分、需产品规划对齐） | ✅ 走需求侧漏斗 → `/req:handoff` |
| 简单功能修改（如单个 UI 优化） | ⛔ 直走交付侧（`/opsx:propose` 起） |
| Bug Fix | ⛔ 直走交付侧（精简规格，UI 变更才原型） |
| Tech Debt / 重构 | ⛔ 直走交付侧（可 `skip_specs`） |

### 需求漏斗（命令空间 `/req:`）

```
Research (research.md)              ← research/<epic-key>.md  (针对单个 Epic 收集需求，HITL)
   │  ▼
Explore (idea.md)                   ← ideas/<idea-key>.md  (调研→产品设计思路 + To-Be 设计 + 候选 Capabilities，HITL)
   │  ▼
{涉及 UI?} ──是──▶ Prototype (Epic整体)  ← prototypes/<epic-key>/*.html  (HITL)
   │ 否（跳过原型）／ 原型完成
   ▼
Storymap (storymap.md)              ← storymaps/<epic-key>/  (覆盖对账·端到端粒度，HITL)
   │  ▼
Story (story.md)                    ← stories/<story-key>/  (业务面冻结交付物，HITL)
   │  ▼
handoff                            ← 交接 → 合成开发侧 proposal → specs/design/tasks/apply/verify
```

### 阶段产物与指令

- **① 需求调研** `/req:research`）：产出 `research/<epic-key>.md`。针对 `docs/ROADMAP.md` 中的单个 Epic 收集需求信息（背景/对象/原始反馈/约束/疑问/结论）。**只收集不转化**。产出后需 HITL 确认。
- **② 探索** `/req:explore`）：产出 `ideas/<idea-key>.md`。把调研信息**转化**为产品设计思路：澄清意图 / **To-Be Process** / **To-Be Journey** / 产品设计思路 / 任务类型路由 / **候选 Capabilities**（对齐 `domain_model.html`）/ 治理映射 / 拆分建议 / 架构影响。产出后需 HITL 确认。
- **③ 原型（Epic 整体）** `/req:prototype`）：若涉及 UI，在拆分前对 **Epic 整体**产出 `prototypes/<epic-key>/*.html`，遵循 `docs/FRONTEND.md` 极简规范，产出后需 HITL 确认。**UI 门禁**：涉及 UI 的 Epic 无已确认原型不得拆分/交接。
- **④ 需求拆分** `/req:storymap`）：产出 `storymaps/<epic-key>/storymap.md`。**覆盖对账（强制）**：Epic 每个承诺项（In Scope / Exit Criteria / B 端承诺 / 候选 Capability）必须有 ≥1 个 Story 承接；粒度取**完整端到端功能**（不拆到行为/UI 细节级）。产出后需 HITL 确认。
- **⑤ 需求单元** `/req:story`）：产出 `stories/<story-key>/story.md` = 需求侧唯一冻结交付物（**业务面**）。含用户场景（B/C 双端）、业务规则表、E2E 验收（Given/When/Then，映射 L1/L2 与 SB-STAGE-*/SB-CUSTOMER-*）、治理映射（Bounded Context / L3 / SB-<LANE>-*）。**不含行为规格**（specs 由开发侧在 proposal 后按 capability 拆分生成）。产出后需 HITL 确认。

### 交接边界 (Handoff)

- **指令**: `/req:handoff`（技能 `handoff`）
- **目标**: 读取已确认的 `story.md`（业务面），在开发侧 `openspec/changes/<name>/` 创建 change 并**合成 `proposal.md`**（Why/What/**Capabilities ← idea 候选 Capabilities**/Process & Blueprint Alignment/Impact），开发侧**从 proposal 起步**，随后按 capability 拆分生成行为规格 specs → design → tasks → apply → verify → Spec Sync → archive。
- **强制约束**:
  - 开发侧**不重复** explore / 需求拆分 / prototype / story 输出（均已前移到需求侧）。
  - 行为规格（Story-specs）由开发侧在 proposal 之后按 capability 拆分生成，需求侧不生成 specs/。
  - 若开发中发现需求缺口，回关 `openspec-requirements` 的 `research/explore/storymap/story` skill，不擅自改需求侧规划。
  - 若属 Epic：登记 `openspec/epic-<key>.story-list.json`（status=in_progress, changeName），保持 Epic 队列单轨。
  - 交接时在需求侧 `story.md` 回填交接状态（changeName），同步更新 `storymap.md`。
  - **分层 Sync**：每个 change 只做 Spec Sync；Baseline Sync 在 Epic 全部 Story 归档后由 `/opsx:baseline/sync` 统一执行。

### 需求侧 Schema

- **`req-sdd`**：定义于 `openspec-requirements/schemas/req-sdd.yaml`（version 3），是需求侧制品格式与生成指令的唯一事实来源。`openspec-requirements/config.yaml`（`schema: req-sdd`）为规则来源。
- Schema 优先：若 SOP 描述与 `req-sdd` schema 冲突，以 Schema 为准。
- **验证兜底**：需求侧不受 `openspec` CLI validate 覆盖，制品质量由 QA 对抗审查兜底；涉及治理锚点必须真实引用 `docs/baseline/*.html`。

## 核心阶段与指令

项目统一使用 `/opsx:` 前缀指令（由 Trae 技能提供）。

### 0. 规划层 (Planning Layer) - 全局治理
在进入具体的变更开发前，必须明确产品感与路线图。规划层产出全局上下文，注入所有后续指令。

- **指令**: `/opsx:planning:product-sense`（skill: `prod/product-sense`）
  - **目标**: 维护 `docs/PRODUCT_SENSE.md`，明确 Elevator Pitch 和产品原则。
- **指令**: `/opsx:planning:product-planning`（skill: `prod/product-planning`）
  - **目标**: 维护 `docs/ROADMAP.md`，执行每月滚动计划。**ROADMAP 按阶段组织，每阶段条目即 Epic（一句话描述），一阶段可多 Epic**。
- **业务基线管理 (Auxiliary Baseline Command)**:
  - **指令**: `/opsx:baseline/sync` - 统一同步并回流所有业务基线文档 (Blueprint, Process Flow, Domain Model) 并刷新渲染。
  - **指令**: `/opsx:governance:delivery-board`（skill: `prod/delivery-board`）- 生成可视化交付看板 `docs/governance/delivery_board.html`。
- **补充治理文档**:
  - `.trae/skills/baseline/openspec-baseline-blueprint/SKILL.md` - 定义 `service_blueprint.html` 的稳定锚点、Planning 阶段引用方式、capability 口径与 Sync 触发/No-op 规则。
- **Skill 组织（按域子目录）**:
  - `prod/`：产品/需求侧（research/explore/prototype/storymap/story/handoff + product-sense/product-planning/delivery-board）
  - `opsx/`：交付侧（propose/spec-design/apply-change/verify/sync-specs/archive-change/update-change/explore/prototype/story）
  - `baseline/`：业务基线（openspec-baseline-*，保留前缀）
  - 三目录同步：`.agents/`、`.trae/`、`.cursor/` 下 skills/ 结构一致。
- **强制约束**:
  - 规划层产物是全局上下文，将自动注入所有后续指令。
  - 必须包含“未来 +1, +2 个月”的滚动预测。

### SDD 动态分支工作流
为确保各类型任务的遵循性，OpenSpec 流程根据任务类型进行动态分支。请所有参与项目的 AI Agent **严格根据下方流程图中的条件分支**执行必须步骤和可选步骤：

```mermaid
graph TD
    A[产品感 /opsx:product-sense] --> B[路线图规划 /opsx:product-planning]
    B --> C((上下文注入 config.yaml))

    C --> D((探索阶段 /opsx:explore))
    D --> E{确认任务类型}

    E -->|史诗| EP1[拆解为多个功能条目]
    EP1 --> EP2[生成 openspec/epic-KEY.story-list.json]
    EP2 --> EP3((等待启动具体功能条目))

    E -->|功能| F1[提案 /opsx:propose]
    F1 --> F2{涉及 UI 变更?}
    F2 -->|是| F3[原型 /opsx:prototype]
    F3 --> F4{视觉/交互确认?}
    F4 -->|否| F3
    F4 -->|是| F5[业务故事评审 /opsx:Story]
    F2 -->|否| F5
    F5 --> F6[规格与设计与任务清单 /opsx:spec-design]

    E -->|缺陷修复| B1[提案 /opsx:propose]
    B1 --> B2{涉及 UI 变更?}
    B2 -->|是| B3[原型 /opsx:prototype]
    B3 --> B4{视觉/交互确认?}
    B4 -->|否| B3
    B4 -->|是| B5[规格与设计与任务清单（含根因分析） /opsx:spec-design]
    B2 -->|否| B5

    E -->|技术债| T1[提案 /opsx:propose]
    T1 --> T2{有外部行为变更?}
    T2 -->|是| T3[规格与设计与任务清单 /opsx:spec-design]
    T2 -->|否| T4[配置 skip_specs: true]
    T4 --> T5[设计与任务清单 /opsx:spec-design]

    F6 --> U((实施阶段 /opsx:apply))
    B5 --> U
    T3 --> U
    T5 --> U

    U --> V((验证门禁))
    V --> W{需要更新规划?}
    W -->|是| X[更新规划 /opsx:update]
    X --> U
    W -->|否| Y[同步规格 /opsx:sync]

    Y --> Z[归档 /opsx:archive]
    Z --> AA((完成))
```

### 1. 探索阶段 (Explore)
- **指令**: `/opsx:explore`
- **目标**: 在没有任何制品前，通过对话澄清需求，探索代码库，权衡方案。
- **强制约束 (Hard Constraint)**:
  - 必须严格遵循“结构化 6 步法”。
  - **任务类型确认 (Task Classification)**: 必须确认是史诗、功能、缺陷修复还是技术债。
  - **治理映射对齐**: 必须参考 `docs/baseline/domain_model.html` 识别 `Impacted Bounded Contexts`，参考 `docs/baseline/business_process.html` 识别受影响的 `L1/L2/L3` 流程节点，并参考 `docs/baseline/service_blueprint.html` 与 `.trae/skills/baseline/openspec-baseline-blueprint/SKILL.md` 识别受影响的 `SB-STAGE-*` 与 `SB-<LANE>-*` 节点。
  - **规划对齐 (Roadmap Alignment)**: 在 `ideas/idea.md` 中必须显式写一段“与当前阶段目标对齐说明”，引用 `docs/ROADMAP.md` 中的目标。
  - **史诗治理**: 如果是史诗，必须在 `openspec/` 目录下创建一个 `epic-<key>.story-list.json` 文件作为执行队列。
  - **唯一输出**: 必须生成 `ideas/idea.md` (相对于变更目录) 作为后续提案的唯一源头。
  - 不得在没有 `ideas/idea.md` 的情况下跳过此阶段进入提案。
  
### 2. 提案阶段 (Propose)
- **指令**: `/opsx:propose <name>`
- **目标**: 根据 `idea.md` 生成变更提案 `proposal.md`。
- **强制约束 (Hard Constraint)**:
  - 必须基于 `idea.md` 的任务类型明确后续路径。
  - **治理映射引用**: `proposal.md` 中的 `Capabilities` 必须与 `Domain Model` 映射对齐，且必须显式列出受影响的 `Bounded Contexts`。
  - **Taxonomy 扩展约束**: 如果 proposal 中出现 `domain_model.html` 尚未收录的 capability 或边界映射，必须明确标记为“新增 taxonomy”并说明理由。
  - **流程对齐约束**: 必须包含 `Process Alignment` 章节明确受影响的流程节点 ID。
  - **蓝图对齐约束**: 必须包含 `Service Blueprint Alignment` 章节，显式引用受影响的 `SB-STAGE-*` 与 `SB-<LANE>-*` 节点，并说明是新增、修改还是复用既有蓝图结构。
  - 对于史诗类型，生成提案后应停止，等待拆分。
  - 对于功能类型，引导用户进入下一步（涉及 UI 先 `/opsx:prototype` 并完成确认，再 `/opsx:Story`，随后进入 `/opsx:spec-design`；不涉及 UI 则直接 `/opsx:Story`，随后进入 `/opsx:spec-design`）。
  - 对于缺陷修复类型，引导用户进入下一步（涉及 UI 先 `/opsx:prototype` 并完成确认，随后进入 `/opsx:spec-design`；不涉及 UI 则直接进入 `/opsx:spec-design`，并在设计中包含根因分析）。
  - 对于技术债类型，引导用户进入下一步（若有外部行为变更则进入 `/opsx:spec-design`；若无外部行为变更则配置 `skip_specs: true`，生成设计与任务清单后再进入 `/opsx:apply`）。
  
### 3. 原型验证阶段 (Prototype) - 可选
- **指令**: `/opsx:prototype <name>`
- **目标**: 为功能或涉及 UI 变更的缺陷修复生成交互式 HTML 原型。
- **强制约束 (Hard Constraint) - HITL 检查点**:
  - 生成原型后，必须通过 `AskUserQuestion` 获取人类确认。
  - 原型是 UI 逻辑的唯一事实来源，确认后方可进入下一步。

### 4. 业务评审阶段 (Story)
- **指令**: `/opsx:Story <name>`
- **目标**: 生成端到端的验收文档 `story.md`。
- **强制约束 (Hard Constraint)**:
  - **时机**: 必须在提案之后执行；若涉及 UI，必须在原型确认后执行。
  - **内容**: 必须包含跨模块的 E2E 旅程及业务规则表。验收标准应优先参考流程基线中的 `L1/L2` 节点。
  - **蓝图引用**: 每条 E2E 旅程必须同时映射到 `service_blueprint.html` 中的 `SB-STAGE-*` 与 `SB-CUSTOMER-*` 节点。
  - **HITL 检查点**: 生成后必须由用户确认验收标准，方可进入模块规格设计。

### 5. 规范与设计阶段 (Spec-Design)
- **指令**: `/opsx:spec-design <name>`
- **目标**: 一口气生成 `specs`、`design.md` 和 `tasks.md`。
- **BDD 测试分层防腐**: 在生成 `spec.md` 时，必须为每个 Gherkin Scenario 打上测试标签 (`@unit`, `@api`, 或 `@e2e`)，严格遵循[自动化测试策略](../TESTING_STRATEGY.md)。
- **强制约束 (Hard Constraint)**:
  - 必须参考已确认的 `proposal.md` 和 `prototype.html` (若有)。如果存在 `story.md`，必须确保 specs 与其 E2E 验收标准一致。
  - **治理追溯**: 每个 Capability Spec 必须显式引用 `docs/baseline/domain_model.html` 中的治理来源，记录其所属 `Bounded Context` 与 capability taxonomy。
  - **流程追溯**: 每个 Capability Spec 必须注明其对应的流程节点（尤其是 `L3` 规则环节）。
  - **蓝图追溯**: 每个 Capability Spec 必须显式记录关联的 `SB-STAGE-*` 与 `SB-<LANE>-*` 节点。
  - **同步预判**: `design.md` 必须包含 `Service Blueprint Sync Assessment`，明确判断本次变更是否需要在 `sync` 阶段回写 `docs/baseline/service_blueprint.html`，以及触发原因。
  - **同步预判**: `design.md` 必须包含 `Domain Model Sync Assessment`，明确判断本次变更是否需要在 `sync` 阶段回写 `docs/baseline/domain_model.html`，以及触发原因。
  - 生成的任务清单必须包含 E2E 验证步骤。

### 6. 应用阶段 (Apply)
- **指令**: `/opsx:apply`
- **目标**: 基于生成的 `tasks.md` 逐项实施代码变更。
- **工作流**: 
  - 动态读取 `tasks.md` 中的复选框，完成一项则将 `- [ ]` 标记为 `- [x]`。
  - **测试驱动实现 (TDD/BDD)**: 必须严格按照 `spec.md` 上的标签 (`@unit`, `@api`, `@e2e`) 编写对应的测试代码。对于 `@e2e` 任务，必须在全局 `e2e-tests/` 目录中完成 Cucumber 步骤。
  - **强制门禁 (Hard Gates)**: 开始实现前必须通过 `openspec validate --change "<name>"`，并在 `openspec/changes/<name>/verify.md` 初始化验证证据
  - **强制门禁 (Hard Gates)**: 全部任务勾选完成后必须运行 `/opsx:verify <name>`，确保 Node 测试、Python 测试与前端构建均为 PASS，并将结果写入 `verify.md`
  - **建议门禁 (Soft Gates)**: E2E 建议运行 `./init.sh e2e:run`，失败时必须在 `verify.md` 记录失败摘要与原因

### 7. 更新阶段 (Update) - 可选
- **指令**: `/opsx:update`
- **目标**: 当实施过程中发现需要修改规划（如 specs 或 design）时使用。
- **原则**: 先修改规格/设计，通过验证后，再继续 `/opsx:apply`。

### 8. 同步阶段 (Sync) - 分层 Sync

> **分层原则**：Spec Sync 与 Baseline Sync 解耦。Spec Sync 在**每个 change 归档前**执行（保证后续 Story 依赖最新 specs）；Baseline Sync 在 **Epic 所有 Story 归档后**统一执行（避免单个 Story 中间态污染 baseline，Roadmap 判定需 Epic Exit Criteria 全达成）。

#### 8.1 Spec Sync（change 级）
- **指令**: `/opsx:sync`
- **目标**: 在归档前，将增量规格 (delta specs) 同步合并入主规格 (main specs)。**仅做 Spec Sync，不做 Baseline Sync。**
- **核心动作**: 将 `openspec/changes/<name>/specs/` 下的变更同步至 `openspec/specs/`。

#### 8.2 Baseline Sync（Epic 级）
- **指令**: `/opsx:baseline/sync`（或手动执行 baseline 辅助技能）
- **时机**: **Epic 全部 Story 归档完成后**统一执行；需求侧 Epic 收尾时触发。
- **目标**: 将 Epic 沉淀的认知回流至 `docs/baseline/` 下的 HTML 基线文档。
- **核心动作**:
  1. **Service Blueprint Sync 判定**: 必须判断是否需要回写 `docs/baseline/service_blueprint.html`。当且仅当存在以下任一变化时执行回流：
     - 受影响的旅程阶段 (`SB-STAGE-*`) 发生新增、移除或覆盖变化
     - 受影响的泳道节点 (`SB-<LANE>-*`) 中 capability 分布发生新增、移除或重排
     - capability 状态在"已落地 / 规划中 / 横切支撑"之间发生变化
     - 新增或修改跨阶段支撑能力
     - `story.md`、`specs` 或 `design.md` 引入新的 blueprint 引用节点
     - `design.md` 中的 `Service Blueprint Sync Assessment` 明确写为 `Needs Sync: Yes`
     - **显式 No-op**: 如果以上信号均不存在，必须明确记录"无需更新 Service Blueprint"及理由，而不是静默跳过。
  2. **Domain Model Sync 判定**: 必须判断是否需要回写 `docs/baseline/domain_model.html`。当且仅当存在以下任一变化时执行回流：
     - `Bounded Context` 边界或 `BC -> Capability` 映射变化
     - 新增、修改、移除 capability taxonomy
     - 新增、修改、移除 Domain Event / Command / Policy
     - Aggregate、状态机、对象关系、业务不变量发生变化
     - **显式 No-op**: 如果以上信号均不存在，必须明确记录"无需更新 Domain Model"及理由，而不是静默跳过。
  3. **Auto Render**: 同步完成后自动刷新基线文档的可视化索引。
- **HITL**: Baseline Sync 是粗粒度收尾动作，执行结果需用户确认。

### 9. 归档阶段 (Archive)
- **指令**: `/opsx:archive`
- **目标**: 将已完成的变更（包含测试）移至归档目录。
- **流程**:
  - **全局 BDD 测试门禁**: 归档前必须运行 `init.sh e2e:run`，确保全局 Cucumber 测试通过。
  - 归档前必须确保已经完成过 Spec Sync（`/opsx:sync`）。
  - **技术债登记**: 登记本次变更遗留的技术债。
  - 移动路径: `openspec/changes/<name>/` -> `openspec/changes/archive/YYYY-MM-DD-<name>/`。
  - **Epic 队列同步**: 归档完成后必须更新对应 `epic-*.story-list.json` 中该 Story 的状态为 `done`；若所有 Story 均已 `done`，将该 `story-list.json` 一并归档至 `openspec/changes/archive/`（文件名加 `YYYY-MM-DD-` 前缀），保留 Epic 交付记录，禁止直接删除。**Epic 收尾后**提示执行 `Baseline Sync`（8.2）+ Roadmap 更新。

## Epic 队列管理 (Backlog Management)

当 Explore 阶段识别为 Epic 时，引入 `openspec/epic-<key>.story-list.json` 进行跨 change 编排。

### 1. JSON 结构规范
```json
{
  "epicKey": "coupon-system",
  "title": "优惠券系统升级",
  "description": "描述该 Epic 的整体目标",
  "stories": [
    {
      "id": "story-coupon-create",
      "title": "优惠券创建",
      "description": "描述该 Story 的业务范围",
      "status": "planned",
      "changeName": null,
      "priority": "high"
    }
  ],
  "updatedAt": "2026-08-21T00:00:00Z"
}
```
字段说明：`id` 为 Story 唯一标识（用于跨 change 编排）；`changeName` 在 Propose 启动时记录对应 change 名称；`status` 取值 `planned` / `in_progress` / `done`。

### 2. 状态流转
- **Explore**: 创建文件，登记所有拆解出的 Story，状态为 `planned`。
- **Propose**: AI 自动读取第一个 `planned` 状态的 Story 并建议启动。启动后更新状态为 `in_progress` 并记录 `changeName`。
- **Archive**: 每次 Story 归档完成后，AI 必须更新该 Story 状态为 `done`（即更新 progress），并提示下一个 `planned` 任务。同时执行孤儿对账：若存在 `in_progress` 状态的 Story 但其 `changeName` 对应的 change 已归档（不再是活跃 change），一并修正为 `done`。
- **Epic 完成归档**: 当所有 Story 状态均为 `done` 时，AI 必须将该 `story-list.json` 归档至 `openspec/changes/archive/YYYY-MM-DD-epic-<key>.story-list.json`（保留 Epic 交付记录，禁止删除），并宣布 Epic 完成。

## 异常处理与防漂移
- **Schema 优先**: `openspec/schemas/spec-driven.yaml` 是每个制品的生成说明 (Instruction) 和内容格式的唯一事实来源。如果 SOP 描述与 Schema 有出入，请以 Schema 为准。
- **MANDATORY CHECK**: 如果直接收到 `/opsx:propose`，但 `idea.md` 不存在或未达标，必须强制退回 `/opsx:explore` 阶段。
