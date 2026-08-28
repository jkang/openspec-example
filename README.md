# OpenSpec Practise: SDD 端到端演练场与脚手架

本项目是一个基于 **规格驱动开发 (Spec-Driven Development, SDD)** 的端到端研发实践库，为产品经理与研发团队提供一套衔接 **产品规划 → 需求调研 → 探索 → 原型 → 需求拆分 → Story 业务面 → 开发交付** 的 **完整 SDD 脚手架**（需求侧 `openspec-requirements/` + 交付侧 `openspec/` 两级解耦）。

我们通过 AI4SE（AI for Software Engineering）的实践，将研发流程从 L3 (Human in the Loop) 推向 L4 (Human on the Loop)，解决需求断链与知识漂移的痛点。

---

## 📋 目录
1. [核心价值：为什么需要端到端 SDD？](#1-核心价值为什么需要端到端-sdd)
2. [方案全貌：四层架构与治理闭环](#2-方案全貌四层架构与治理闭环)
3. [快速启动与示例项目实践](#3-快速启动与示例项目实践)
4. [落地指引：如何迁移与扩展到新项目](#4-落地指引如何迁移与扩展到新项目)
5. [成熟度定义：L3 与 L4](#5-成熟度定义l3-与-l4)
6. [目录导航与资源](#6-目录导航与资源)

---

## 1. 核心价值：为什么需要端到端 SDD？

在 AI 编程时代，最大的痛点不再是“写代码”，而是 **“需求工程的断链”**：
- **输入不稳定**：产品规划与研发执行脱节。
- **分析无落点**：业务规则散落在会议和聊天记录中，导致“知识漂移”。
- **高昂返工成本**：原型未确认即进入开发，导致 Spec 偏离真实意图。
- **规模化失控**：多 Epic/Story 并行时缺乏统一需求漏斗与覆盖对账。

**核心目标**：
- **消除幻觉**：通过结构化的规格约束 AI，防止代码偏离业务逻辑。
- **快速验证**：利用 `/req:prototype` 对 Epic 整体生成可交互原型，在写代码前完成验收。
- **知识沉淀**：让业务资产随开发自然沉淀回 **业务基线 (Baseline)**，拒绝一次性文档。
- **两级解耦**：需求侧（PM 主导，仅 Epic）与交付侧（Engineer 主导，从 proposal 起步）隔离，各司其职。

---

## 2. 方案全貌：四层架构与治理闭环

我们定义了四层架构，确保从宏观规划到微观执行的端到端可追溯性：

| 层级 | 核心工件 | 作用 |
| :--- | :--- | :--- |
| **Planning Baseline** | `PRODUCT_SENSE.md`, `ROADMAP.md` | 提供方向、范围和优先级边界（ROADMAP 按阶段组织，每阶段条目即 Epic） |
| **Business Baseline** | `domain_model.html`, `business_process.html`, `service_blueprint.html` | 提供稳定的业务边界与流程参照 (L1/L2/L3) |
| **Requirements 需求侧** | `epics/<epic-key>/`（research/idea/prototypes/storymap/stories） | 需求漏斗：调研 → 探索 → 原型 → 拆分 → Story（业务面冻结交付物），PM 主导，仅 Epic |
| **Working Loop 交付侧** | `proposal.md`, `specs/`, `design.md`, `tasks.md`, `verify.md` | 确保实现遵循契约，并将认知沉淀回基线，Engineer 主导 |

### 🔄 Working Loop (端到端大循环)
流程遵循：`规划基线 -> 需求调研 (/req:research，识别 Epic) -> 探索 (/req:explore) -> 原型 (/req:prototype，Epic 整体) -> 拆分 (/req:storymap) -> Story (/req:story) -> 交接 (/req:handoff，合成 proposal) -> 开发实施 -> Spec Sync (/opsx:sync，change 级) -> 归档 (/opsx:archive) -> Epic 收尾 Baseline Sync (/opsx:baseline/sync，Epic 级)`。

- **大块 Epic**：走需求侧漏斗（`/req:` 命令空间），交付侧从 proposal 起步。
- **Bug Fix / Tech Debt / 简单功能**：直走交付侧（`/opsx:propose` 起），不走需求漏斗。

---

## 3. 快速启动与示例项目实践

本项目预置了一个完整的 **极简电商系统** 作为演练场，涵盖 Node.js、Python 和 Vue 3 实现。

### 🚀 快速启动
```bash
# 1. 环境初始化与查看帮助
./init.sh

# 2. 启动电商示例环境
./init.sh vue:start    # 启动 Vue 前端
./init.sh node:start   # 启动 Node.js 后端
```

### 🛠️ AI 指令实战
在 Trae 或 Cursor 的 AI 侧边栏输入以下指令开启 SDD 之旅：
- **明确方向**：`/opsx:planning:product-sense` 确立产品灵魂。
- **需求调研（Epic）**：`/req:research "调研用户账户体系需求"` 产出 `epics/<key>/research.md`。
- **需求探索（Epic）**：`/req:explore` 将调研转化为产品设计思路（To-Be + 候选 Capabilities）。
- **需求拆分（Epic）**：`/req:storymap` 拆分为多个 Story（覆盖对账）。
- **发起变更（直走交付侧）**：`/opsx:propose <change-name>` 生成提案。
- **同步回流**：`/opsx:sync` 将 change 的 delta specs 合并回主规格。

---

## 4. 落地指引：如何迁移与扩展到新项目

如果你希望在其他业务项目中启用这套脚手架，请遵循以下步骤：

### 4.1 第一步：引入基础引擎
1. 拷贝 `.trae/`, `.cursor/`, `.agents/`, `openspec/`, `openspec-requirements/` 以及 `docs/` 模板到目标项目。
2. 修改 `openspec/config.yaml` 与 `openspec-requirements/config.yaml` 中的项目名称与路径定位。
3. 执行 `mkdir -p docs/baseline openspec/changes openspec-requirements/epics openspec-requirements/archive` 初始化目录。

### 4.2 第二步：重写并初始化业务基线
1. **清空并重写** `PRODUCT_SENSE.md` 与 `ROADMAP.md`（每阶段条目即 Epic）。
2. **初始化基线**：在 `docs/baseline/` 中录入当前系统真实的领域模型与流程。

### 4.3 第三步：执行首个 Epic 闭环（需求侧）
通过 `/req:research` 发起首个 Epic 调研 → `/req:explore` → `/req:prototype` → `/req:storymap` → `/req:story` → `/req:handoff` 交接给开发侧。

### 4.4 第四步：交付侧闭环与归档
`/opsx:spec-design` → `/opsx:apply` → `/opsx:verify` → `/opsx:sync`（change 级）→ `/opsx:archive`；Epic 全部 Story 完成后需求侧 Epic 归档 + `/opsx:baseline/sync`（Epic 级）。

---

## 5. 成熟度定义：L3 与 L4

- **L3：Human in the Loop**
  - **特点**：人工确认是关键门禁，AI 不能跳过确认断点。
  - **核心**：需求调研确认、探索确认、原型确认、Story 验收确认、Verify 结果确认、Baseline Sync 确认。
- **L4：Human on the Loop**
  - **特点**：AI 在明确护栏（Baseline、门禁策略）内自治，人负责监督与异常裁决。
  - **核心**：稳定的 Baseline、自动化的质量看板、任务自治。

---

## 6. 目录导航与资源

### 📂 目录结构
```text
├── .agents/ / .trae/ / .cursor/  # AI 指令与 SDD 规则集 (护栏)
│   └── skills/
│       ├── prod/                 # 需求侧 skill（research/explore/prototype/storymap/story/handoff + product-sense/product-planning/delivery-board）
│       ├── opsx/                 # 交付侧 skill（propose/spec-design/apply-change/verify/sync-specs/archive-change/update-change/prototype）
│       └── baseline/             # 业务基线 skill（blueprint/domain-model/process-flow/render）
├── openspec/            # SDD 交付侧引擎工作区
│   ├── specs/           # 主规格说明书 (基线沉淀区)
│   └── changes/         # 活跃变更闭环区 (活跃迭代)
├── openspec-requirements/  # 需求侧工作区（以 Epic 为工作单元）
│   ├── epics/           # 活跃 Epic 目录（research/idea/prototypes/storymap/stories）
│   └── archive/         # 已完成 Epic 归档
├── docs/                # 治理与基线文档
│   ├── baseline/        # 核心业务基线 (Domain Model / Process Flow / Blueprint)
│   ├── PRODUCT_SENSE.md # 产品定位
│   └── ROADMAP.md       # 迭代路线图（每阶段条目即 Epic）
├── ecommerce/           # 示例系统实现 (Node.js/Python/Vue)
└── init.sh              # 统一工程入口
```

### 📚 学习资源
- [SDD 完整版提案](./learning-sdd/ai4se-sdd-proposal.md)
- [OpenSpec 综合手册](./learning-sdd/openspec-user-manual.md)
- [v2.0 升级解析](./learning-sdd/openspec-v2.0-upgrade.md)

---

## 🔗 链接
- [OpenSpec 官方文档](https://github.com/Fission-AI/OpenSpec)
- [CHANGELOG](./CHANGELOG.md)
